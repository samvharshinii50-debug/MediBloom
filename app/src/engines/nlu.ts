/**
 * A small, honest natural-language layer.
 *
 * There is no model here and no network call. It normalises what the user
 * typed, works out *when* they mean, works out *what* they are asking, and
 * hands both to the assistant engine. That is enough to answer real questions
 * like "what did I have today" or "did I take my metformin yesterday morning"
 * without sending a single byte off the phone.
 *
 * Every function is pure so the whole thing is unit-testable.
 */

import { toDateKey } from './scheduleEngine';

/* ------------------------------ normalising ------------------------------ */

/** Common typing shortcuts and misspellings, applied before anything else. */
const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bwhat's\b/g, 'what is'],
  [/\bwhats\b/g, 'what is'],
  [/\bwho's\b/g, 'who is'],
  [/\bi'?ve\b/g, 'i have'],
  [/\bi'?m\b/g, 'i am'],
  [/\bdon'?t\b/g, 'do not'],
  [/\bdidn'?t\b/g, 'did not'],
  [/\bhaven'?t\b/g, 'have not'],
  [/\bcan'?t\b/g, 'can not'],
  [/\bisn'?t\b/g, 'is not'],
  [/\bshouldn'?t\b/g, 'should not'],
  [/\bwon'?t\b/g, 'will not'],
  [/\bu\b/g, 'you'],
  [/\br\b/g, 'are'],
  [/\bpls\b|\bplz\b/g, 'please'],
  [/\bmeds?\b/g, 'medicine'],
  [/\bmedication[s]?\b/g, 'medicine'],
  [/\btablets?\b|\bpills?\b/g, 'medicine'],
  [/\btoday'?s\b/g, 'today'],
  [/\btmrw\b|\btmr\b/g, 'tomorrow'],
  [/\byest\b/g, 'yesterday'],
];

export function normalise(text: string): string {
  let t = text.toLowerCase().trim();
  for (const [re, to] of CONTRACTIONS) t = t.replace(re, to);
  // Keep letters, digits and spaces; everything else becomes a gap.
  t = t.replace(/[^a-z0-9\s]/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

export function tokens(text: string): string[] {
  return normalise(text).split(' ').filter(Boolean);
}

/* ------------------------------- timeframe ------------------------------- */

export type PartOfDay = 'morning' | 'afternoon' | 'evening';

export interface Timeframe {
  /** How to name it back to the user, e.g. "today", "last week". */
  label: string;
  /** Inclusive date keys, "YYYY-MM-DD". */
  from: string;
  to: string;
  /** Set when the user narrowed to a part of the day. */
  partOfDay?: PartOfDay;
  /** False when we defaulted to today because they did not say. */
  explicit: boolean;
}

const DAY_MS = 86_400_000;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function shift(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

/** Midnight today, so date arithmetic never drifts on a DST boundary. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function partOfDayIn(text: string): PartOfDay | undefined {
  if (/\bmorning\b/.test(text)) return 'morning';
  if (/\bafternoon\b/.test(text)) return 'afternoon';
  if (/\bevening\b|\bnight\b|\btonight\b/.test(text)) return 'evening';
  return undefined;
}

/**
 * Works out the window the user means. Returns `explicit: false` with today's
 * window when they did not say — the caller decides whether to mention it.
 */
export function parseTimeframe(text: string, now = new Date()): Timeframe {
  const t = normalise(text);
  const today = startOfDay(now);
  const todayKey = toDateKey(today);
  const part = partOfDayIn(t);

  const at = (d: Date, label: string): Timeframe => ({
    label,
    from: toDateKey(d),
    to: toDateKey(d),
    partOfDay: part,
    explicit: true,
  });

  if (/\byesterday\b/.test(t) || /\blast night\b/.test(t)) {
    return {
      ...at(shift(today, -1), 'yesterday'),
      // "last night" is an evening question even without the word evening.
      partOfDay: /\blast night\b/.test(t) ? 'evening' : part,
    };
  }

  if (/\bday before yesterday\b/.test(t)) return at(shift(today, -2), 'the day before yesterday');

  const daysAgo = t.match(/\b(\d+)\s+days?\s+ago\b/);
  if (daysAgo) {
    const n = Math.min(Number(daysAgo[1]), 365);
    return at(shift(today, -n), n === 1 ? 'yesterday' : `${n} days ago`);
  }

  if (/\blast week\b/.test(t)) {
    // The previous Monday-to-Sunday block, which is what people mean.
    const monThis = shift(today, -((today.getDay() + 6) % 7));
    const monLast = shift(monThis, -7);
    return {
      label: 'last week',
      from: toDateKey(monLast),
      to: toDateKey(shift(monLast, 6)),
      partOfDay: part,
      explicit: true,
    };
  }

  if (/\bthis week\b/.test(t)) {
    const mon = shift(today, -((today.getDay() + 6) % 7));
    return { label: 'this week', from: toDateKey(mon), to: todayKey, partOfDay: part, explicit: true };
  }

  if (/\b(past|last)\s+(7|seven)\s+days\b|\bthis past week\b/.test(t)) {
    return {
      label: 'the last 7 days',
      from: toDateKey(shift(today, -6)),
      to: todayKey,
      partOfDay: part,
      explicit: true,
    };
  }

  if (/\b(past|last)\s+(30|thirty)\s+days\b|\blast month\b|\bthis month\b|\bpast month\b/.test(t)) {
    return {
      label: 'the last 30 days',
      from: toDateKey(shift(today, -29)),
      to: todayKey,
      partOfDay: part,
      explicit: true,
    };
  }

  if (/\b(past|last)\s+(2|two)\s+weeks?\b|\bfortnight\b/.test(t)) {
    return {
      label: 'the last 2 weeks',
      from: toDateKey(shift(today, -13)),
      to: todayKey,
      partOfDay: part,
      explicit: true,
    };
  }

  // "on monday" / "last friday" — the most recent one that has already happened.
  for (let i = 0; i < WEEKDAYS.length; i++) {
    if (!new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(t)) continue;
    let back = (today.getDay() - i + 7) % 7;
    if (back === 0) back = /\blast\b/.test(t) ? 7 : 0;
    const d = shift(today, -back);
    return at(d, back === 0 ? 'today' : `${WEEKDAYS[i][0].toUpperCase()}${WEEKDAYS[i].slice(1)}`);
  }

  if (/\btomorrow\b/.test(t)) return at(shift(today, 1), 'tomorrow');
  if (/\btoday\b|\bso far\b|\bright now\b|\bcurrently\b/.test(t)) return at(today, 'today');

  // Nothing said — assume today but flag that we assumed it.
  return { label: 'today', from: todayKey, to: todayKey, partOfDay: part, explicit: false };
}

/** Is this date key inside the window? */
export function withinTimeframe(dateKey: string, tf: Timeframe): boolean {
  return dateKey >= tf.from && dateKey <= tf.to;
}

/** Which third of the day a "HH:MM" belongs to. */
export function partOfDayOf(time: string): PartOfDay {
  const h = Number(time.slice(0, 2));
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

/* -------------------------------- intents -------------------------------- */

export type Intent =
  | 'greeting'
  | 'thanks'
  | 'help'
  | 'privacy'
  | 'dosesTaken'
  | 'dosesPending'
  | 'nextDose'
  | 'didITake'
  | 'listMedicines'
  | 'scheduleQuery'
  | 'medicineInfo'
  | 'adherence'
  | 'streak'
  | 'interactionsMine'
  | 'pairCheck'
  | 'severityMeaning'
  | 'whatShouldIDo'
  | 'missedAdvice'
  | 'foodTiming'
  | 'sideEffects'
  | 'caregiverHelp'
  | 'howTo'
  | 'unknown';

interface Pattern {
  intent: Intent;
  re: RegExp;
  weight: number;
}

/**
 * Weighted patterns rather than a single if-chain, so a sentence that hits two
 * intents resolves to the stronger one instead of whichever was written first.
 */
const PATTERNS: Pattern[] = [
  /* social ---------------------------------------------------------------- */
  { intent: 'greeting', re: /^(hi|hello|hey|yo|hii+|namaste|good (morning|afternoon|evening))\b/, weight: 10 },
  { intent: 'thanks', re: /\b(thanks|thank you|thx|ty|appreciate it|nice one)\b/, weight: 9 },
  { intent: 'help', re: /\b(help|what can you do|what do you do|options|commands|how do you work)\b/, weight: 7 },
  { intent: 'privacy', re: /\b(privacy|private|my data|send my data|internet|offline|online|cloud|server|track me)\b/, weight: 6 },

  /* dose log -------------------------------------------------------------- */
  // Past tense only. "what can I take" is a permission question about a new
  // medicine, not a request for the dose log, and matching both on a bare
  // "what ... take" sent someone asking about knee pain their breakfast list.
  { intent: 'dosesTaken', re: /\b(what|which|show|list|tell me)\b.*\b(had|taken|took)\b/, weight: 9 },
  { intent: 'dosesTaken', re: /\bwhat did i (have|take|took)\b/, weight: 12 },
  { intent: 'dosesTaken', re: /\bwhat have i (had|taken)\b/, weight: 12 },
  { intent: 'dosesTaken', re: /\b(my|todays?|yesterdays?)\s+(medicine|dose|doses)\b/, weight: 6 },
  { intent: 'dosesTaken', re: /\b(dose|doses|medicine) (log|history|record)\b/, weight: 8 },
  // "how many did I take" is a count over the log, not a yes/no about one
  // medicine, so it has to outrank the did-i-take patterns it also matches.
  { intent: 'dosesTaken', re: /\bhow many (did|have) i (take|taken|had)\b/, weight: 14 },

  { intent: 'dosesPending', re: /\b(left|remaining|still|pending|due|owe|outstanding|yet to)\b/, weight: 8 },
  { intent: 'dosesPending', re: /\bwhat is left\b|\banything left\b|\bwhat do i still\b/, weight: 11 },
  { intent: 'dosesPending', re: /\b(am i|are we) done\b|\bfinished for (the day|today)\b/, weight: 9 },

  { intent: 'nextDose', re: /\b(next|upcoming|coming up)\b/, weight: 8 },
  { intent: 'nextDose', re: /\bwhen is my next\b|\bwhat is next\b/, weight: 12 },

  { intent: 'didITake', re: /\bdid i (take|have|miss|skip)\b/, weight: 12 },
  { intent: 'didITake', re: /\bhave i (taken|had|missed)\b/, weight: 11 },

  /* the list -------------------------------------------------------------- */
  { intent: 'listMedicines', re: /\b(what|which|list|show|all|tell me)\b.*\b(medicine|medicines|am i on|i take|i am taking)\b/, weight: 8 },
  { intent: 'listMedicines', re: /\bwhat am i (taking|on)\b/, weight: 12 },
  { intent: 'listMedicines', re: /\bhow many medicine/, weight: 10 },
  { intent: 'listMedicines', re: /\bmy medicine list\b|\blist my medicine/, weight: 12 },

  { intent: 'scheduleQuery', re: /\b(when|what time|schedule|timing|timings|remind)\b/, weight: 7 },
  { intent: 'scheduleQuery', re: /\bwhat time (do|should) i\b/, weight: 11 },

  /* numbers --------------------------------------------------------------- */
  { intent: 'adherence', re: /\b(adherence|compliance|score|percent|percentage|rate|how am i doing|how did i do|progress|consistent|consistency)\b/, weight: 9 },
  { intent: 'adherence', re: /\bhow (am|was) i\b/, weight: 9 },
  { intent: 'streak', re: /\bstreak\b|\bdays in a row\b|\bhow many days\b/, weight: 10 },

  /* safety ---------------------------------------------------------------- */
  { intent: 'interactionsMine', re: /\b(any|my|mine|all)\b.*\b(interact|interaction|clash|conflict|react|reaction|problem|danger|risk|unsafe)\b/, weight: 10 },
  { intent: 'interactionsMine', re: /\bshow my interaction/, weight: 12 },
  { intent: 'interactionsMine', re: /\bis it safe\b|\bam i safe\b/, weight: 7 },
  { intent: 'pairCheck', re: /\b(with|and|together|combine|mix|alongside|same time)\b/, weight: 4 },
  { intent: 'pairCheck', re: /\bcan i take\b/, weight: 10 },
  { intent: 'pairCheck', re: /\b(what|which) (can|should) i take\b/, weight: 12 },
  // Someone describing a symptom wants advice, not their dose history.
  { intent: 'pairCheck', re: /\b(hurt|hurting|hurts|pain|painful|ache|aching|sore|fever|headache|cramps?)\b/, weight: 9 },
  { intent: 'severityMeaning', re: /\b(severe|moderate|mild)\b.*\b(mean|means|meaning|what is)\b/, weight: 12 },
  { intent: 'severityMeaning', re: /\bwhat (does|is) (severe|moderate|mild)\b/, weight: 13 },
  { intent: 'whatShouldIDo', re: /\bwhat should i do\b|\bwhat do i do\b|\bhow do i fix\b|\bwhat now\b|\bhow to handle\b/, weight: 12 },

  { intent: 'missedAdvice', re: /\b(missed|forgot|forget|skipped|did not take|late|double dose|catch up)\b/, weight: 9 },
  // "I forgot my dose, what do I do" must not be answered with interaction
  // guidance — it has to outrank whatShouldIDo, which it also matches.
  { intent: 'missedAdvice', re: /\b(missed|forgot|forget|skipped)\b.*\b(what|should|do)\b/, weight: 14 },
  { intent: 'foodTiming', re: /\b(food|meal|eat|eating|empty stomach|before|after|milk|water|alcohol|coffee)\b/, weight: 6 },
  { intent: 'sideEffects', re: /\b(side effect|side effects|reaction|dizzy|nausea|headache|rash|feel sick|drowsy|sleepy)\b/, weight: 10 },
  { intent: 'caregiverHelp', re: /\b(caregiver|carer|family|daughter|son|alert someone|tell someone|emergency contact)\b/, weight: 9 },

  /* using the app --------------------------------------------------------- */
  { intent: 'howTo', re: /\bhow (do|can) i\b.*\b(add|upload|scan|delete|remove|change|set|export|erase)\b/, weight: 11 },
  { intent: 'howTo', re: /\b(add a medicine|upload a prescription|scan a prescription|change the time|erase everything)\b/, weight: 10 },
];

export interface Classification {
  intent: Intent;
  score: number;
  /** Every intent that matched, strongest first — useful for debugging. */
  all: Array<{ intent: Intent; score: number }>;
}

export function classify(text: string): Classification {
  const t = normalise(text);
  const scores = new Map<Intent, number>();

  for (const p of PATTERNS) {
    if (!p.re.test(t)) continue;
    scores.set(p.intent, (scores.get(p.intent) ?? 0) + p.weight);
  }

  const all = [...scores.entries()]
    .map(([intent, score]) => ({ intent, score }))
    .sort((a, b) => b.score - a.score);

  if (all.length === 0) return { intent: 'unknown', score: 0, all: [] };
  return { intent: all[0].intent, score: all[0].score, all };
}

/** True when the question is negative-framed ("what did I miss"). */
export function asksAboutMisses(text: string): boolean {
  return /\b(miss|missed|skip|skipped|forgot|forget)\b/.test(normalise(text));
}
