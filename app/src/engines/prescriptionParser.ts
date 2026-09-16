import { KNOWN_GENERICS } from '../data/interactions';
import { resolveGeneric } from '../data/drugSynonyms';
import type { ParsedMedicine } from '../data/types';
import { FREQUENCY_PRESETS } from './scheduleEngine';

/** Below this the UI asks the user to confirm before anything is saved. */
export const CONFIDENCE_THRESHOLD = 0.72;

const DOSE_RE =
  /(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|units?|%)\b/i;

/** Dosage-form prefixes that appear on prescriptions but aren't part of the name. */
const FORM_PREFIX_RE =
  /^\s*(?:\d+[.)]\s*)?(?:tab\.?|tabs?\.?|cap\.?|caps?\.?|syp\.?|syrup|inj\.?|injection|tablet|capsule|sachet|susp\.?)\s+/i;

/** Lines that are never medicines — headers, footers, patient details. */
const NOISE_RE = new RegExp(
  [
    'hospital', 'clinic', 'centre', 'center', 'medical', 'department', 'consultant',
    'patient', 'age\\s*/', 'sex', 'date', 'diagnosis', 'impression', 'advice',
    'signature', 'reg\\.?\\s*no', 'ph:', 'phone', 'opd', 'file no', 'ip\\s*/',
    'prescription', 'medications? advised', 'prescribed', 'follow up', 'review',
    'sample', 'demo', 'not a real', 'dispensed', 'pharmacy', 'nursing',
    'counselling', 'notes', 'www\\.', '@', 'road', 'street', 'avenue', 'lane',
  ].join('|'),
  'i',
);

interface FrequencyMatch {
  label: string;
  times: string[];
}

/** Maps a free-text frequency phrase to concrete reminder times. */
export function parseFrequency(text: string): FrequencyMatch | null {
  const t = text.toLowerCase();

  if (/\b(sos|prn|as needed|if needed|when required)\b/.test(t)) {
    return { label: 'As needed', times: [] };
  }
  if (/\b(once|1\s*time)\s*(a\s*)?week(ly)?\b|\bweekly\b/.test(t)) {
    return { label: 'Once weekly', times: ['09:00'] };
  }

  const wantsNight = /\b(night|bedtime|hs|dinner|evening)\b/.test(t);
  const wantsMorning = /\b(morning|breakfast|empty stomach|before food|am)\b/.test(t);

  if (/\b(four times|4\s*times|qid|qds)\b/.test(t)) {
    return { label: '4x daily', times: ['06:00', '12:00', '18:00', '22:00'] };
  }
  if (/\b(three times|3\s*times|thrice|tds|tid)\b/.test(t)) {
    return { label: '3x daily', times: ['08:00', '14:00', '20:00'] };
  }
  if (/\b(twice|two times|2\s*times|bd|bid)\b/.test(t)) {
    return { label: 'Twice daily', times: ['09:00', '21:00'] };
  }
  if (/\b(once|one tablet once|1\s*time|od|daily|every day|each day)\b/.test(t)) {
    if (wantsNight) return { label: 'Once daily', times: ['21:00'] };
    if (wantsMorning) return { label: 'Once daily', times: ['08:00'] };
    return { label: 'Once daily', times: ['09:00'] };
  }

  return null;
}

/** Classic Levenshtein, used only for short drug names so the cost is trivial. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * Closest known generics for a garbled read, best first.
 * This is what turns an unreadable "Ator statin" into a "did you mean
 * Atorvastatin?" prompt instead of a silent wrong guess.
 */
export function suggestGenerics(input: string, limit = 3): string[] {
  const cleaned = input.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length < 3) return [];

  const scored: Array<{ name: string; score: number }> = [];
  for (const generic of KNOWN_GENERICS) {
    const d = levenshtein(cleaned, generic);
    const maxLen = Math.max(cleaned.length, generic.length);
    const similarity = 1 - d / maxLen;
    // Also reward a shared prefix — OCR usually gets the start of a word right.
    const prefix = sharedPrefixLength(cleaned, generic);
    const score = similarity + (prefix >= 4 ? 0.15 : 0);
    if (similarity >= 0.45 || prefix >= 5) scored.push({ name: generic, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.name);
}

function sharedPrefixLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

/** Words that appear beside drug names but are never part of one. */
const STOPWORDS = new Set([
  'once', 'twice', 'thrice', 'daily', 'day', 'days', 'week', 'weeks', 'weekly',
  'month', 'months', 'morning', 'night', 'evening', 'afternoon', 'bedtime',
  'before', 'after', 'with', 'without', 'food', 'meals', 'meal', 'breakfast',
  'lunch', 'dinner', 'empty', 'stomach', 'continue', 'continued', 'stop',
  'tablet', 'tablets', 'capsule', 'capsules', 'sachet', 'syrup', 'injection',
  'tab', 'cap', 'syp', 'inj', 'susp', 'one', 'two', 'three', 'four', 'times',
  'time', 'needed', 'required', 'pain', 'sos', 'prn', 'od', 'bd', 'bid', 'tds',
  'tid', 'qid', 'qds', 'hs', 'duration', 'strength', 'medicine', 'drug',
  'directions', 'frequency', 'maximum', 'max', 'minimum', 'min', 'and', 'the',
  'for', 'per', 'take', 'taken', 'disturbed', 'sleep', 'headache', 'sunday',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
]);

/** Strips dose, form prefix and trailing directions, leaving candidate words. */
function cleanLine(line: string): string {
  return line
    .replace(FORM_PREFIX_RE, ' ')
    .replace(new RegExp(DOSE_RE.source, 'gi'), ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Finds the drug name inside a prescription line.
 *
 * Lines arrive in wildly different shapes — table rows, numbered lists, free
 * text — so rather than assuming a position, this scans the line's word n-grams
 * for something the synonym table recognises, longest first so that
 * "calcium carbonate" wins over "calcium".
 */
export function extractDrugName(line: string): { name: string; generic: string | null } {
  const cleaned = cleanLine(line);
  const words = cleaned.split(' ').filter((w) => w.length > 0);

  // Try 3-, then 2-, then 1-word windows.
  for (const size of [3, 2, 1]) {
    for (let i = 0; i + size <= words.length; i++) {
      const window = words.slice(i, i + size);
      if (window.every((w) => STOPWORDS.has(w.toLowerCase()))) continue;
      const phrase = window.join(' ');
      const generic = resolveGeneric(phrase);
      if (generic) return { name: phrase, generic };
    }
  }

  // Nothing recognised — hand back the most drug-like word so the fuzzy
  // suggester still has something to work with.
  const candidates = words.filter(
    (w) => w.length >= 4 && !STOPWORDS.has(w.toLowerCase()) && /^[A-Za-z]/.test(w),
  );
  const best = candidates.sort((a, b) => b.length - a.length)[0] ?? '';
  return { name: best, generic: null };
}

/**
 * Turns raw OCR text from a prescription into candidate medicines.
 * Never throws — a bad scan yields an empty list, not a crash.
 */
export function parsePrescription(rawText: string): ParsedMedicine[] {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedMedicine[] = [];
  const seenGenerics = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const doseMatch = line.match(DOSE_RE);
    if (!doseMatch) continue;

    const { name: namePart, generic } = extractDrugName(line);
    if (namePart.length < 3) continue;

    // A line carrying a dose-like number but which is obviously letterhead
    // (an address, a registration number) is dropped unless it names a drug.
    if (!generic && NOISE_RE.test(line)) continue;

    // Frequency may live on this line or the next couple — prescriptions vary.
    const contextLines = [line, lines[i + 1] ?? '', lines[i + 2] ?? ''];
    let freq: FrequencyMatch | null = null;
    for (const ctx of contextLines) {
      freq = parseFrequency(ctx);
      if (freq) break;
    }

    const dosage = doseMatch[1];
    const unit = doseMatch[2].toUpperCase() === 'IU' ? 'IU' : doseMatch[2].toLowerCase();

    // Confidence: resolving the name matters most, then dose, then frequency.
    let confidence = 0.2;
    if (generic) confidence += 0.55;
    if (dosage) confidence += 0.15;
    if (freq) confidence += 0.1;

    const suggestions = generic ? [] : suggestGenerics(namePart);
    // A close fuzzy match is worth a little confidence, but stays under the
    // threshold on purpose so the user is still asked to confirm.
    if (!generic && suggestions.length > 0) confidence += 0.15;

    const displayName = generic
      ? generic.charAt(0).toUpperCase() + generic.slice(1)
      : namePart;

    const key = (generic ?? namePart).toLowerCase();
    if (seenGenerics.has(key)) continue;
    seenGenerics.add(key);

    results.push({
      rawText: line,
      name: displayName,
      generic,
      dosage,
      unit,
      frequencyLabel: freq?.label ?? 'Once daily',
      times: freq?.times ?? ['09:00'],
      confidence: Math.min(1, Number(confidence.toFixed(2))),
      suggestions,
    });
  }

  return results;
}

export function needsConfirmation(m: ParsedMedicine): boolean {
  return m.confidence < CONFIDENCE_THRESHOLD || m.generic === null;
}

/** One entry as the optional cloud pass returns it, before any validation. */
export interface AiParsedItem {
  name?: unknown;
  dosage?: unknown;
  unit?: unknown;
  frequency?: unknown;
}

const AI_CONFIDENCE = 0.7; // deliberately under the threshold: still needs a human yes

/**
 * Folds an optional cloud reading into the on-device result.
 *
 * The local parser stays authoritative — anything it resolved confidently is
 * left completely alone. The cloud pass may only do two things: suggest a
 * generic for a line the parser could not resolve, and add a medicine the
 * parser missed entirely. Everything it contributes lands below the confidence
 * threshold, so the user still has to confirm it. Rubbish in the model's reply
 * is dropped rather than trusted.
 */
export function mergeAiSuggestions(
  parsed: ParsedMedicine[],
  aiItems: unknown[],
): ParsedMedicine[] {
  const out = parsed.map((p) => ({ ...p }));
  const known = new Set(out.map((p) => (p.generic ?? p.name).toLowerCase()));

  for (const raw of aiItems) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as AiParsedItem;

    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (name.length < 3 || name.length > 60) continue;

    const generic = resolveGeneric(name);
    // A name the bundled reference has never heard of is not evidence of
    // anything — we will not invent a medicine on a model's say-so.
    if (!generic) continue;

    // Case 1: fill in a blank on a line the local parser already found.
    const unresolved = out.find(
      (p) => p.generic === null && levenshtein(p.name.toLowerCase(), name.toLowerCase()) <= 4,
    );
    if (unresolved) {
      unresolved.generic = generic;
      unresolved.name = generic.charAt(0).toUpperCase() + generic.slice(1);
      unresolved.suggestions = [
        generic,
        ...unresolved.suggestions.filter((s) => s !== generic),
      ].slice(0, 4);
      unresolved.confidence = Math.max(unresolved.confidence, AI_CONFIDENCE);
      known.add(generic);
      continue;
    }

    // Case 2: a medicine the local parser did not pick up at all.
    if (known.has(generic)) continue;
    known.add(generic);

    const dosage = typeof item.dosage === 'string' ? item.dosage.replace(/[^\d.]/g, '') : '';
    const unitRaw = typeof item.unit === 'string' ? item.unit.trim() : '';
    const unit = /^(mg|mcg|ml|iu|g)$/i.test(unitRaw)
      ? unitRaw.toUpperCase() === 'IU' ? 'IU' : unitRaw.toLowerCase()
      : 'mg';

    const freqLabel = typeof item.frequency === 'string' ? item.frequency.trim() : '';
    const times = FREQUENCY_PRESETS[freqLabel] ?? FREQUENCY_PRESETS['Once daily'];

    out.push({
      rawText: `${name}${dosage ? ` ${dosage} ${unit}` : ''} · read with cloud assist`,
      name: generic.charAt(0).toUpperCase() + generic.slice(1),
      generic,
      dosage,
      unit,
      frequencyLabel: FREQUENCY_PRESETS[freqLabel] ? freqLabel : 'Once daily',
      times,
      confidence: AI_CONFIDENCE,
      suggestions: [generic],
    });
  }

  return out;
}
