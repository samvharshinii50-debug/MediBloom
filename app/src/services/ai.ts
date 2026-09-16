import * as SecureStore from 'expo-secure-store';
import { DEFAULT_AI } from '../data/defaults';
import type { DetectedInteraction, DoseLogEntry, Medicine } from '../data/types';
import { computeAdherence } from '../engines/insightEngine';
import { formatClock, toDateKey } from '../engines/scheduleEngine';

/**
 * Optional cloud assist.
 *
 * MediBloom answers everything on-device by default and that never changes.
 * This module is the opt-in extra: the user brings a key from a provider with
 * a genuinely free tier, and the assistant can then handle phrasing the rule
 * engine doesn't cover. It is off unless the user turns it on, it degrades to
 * the on-device engine on any error, and the key only ever lives in the
 * device keystore.
 *
 * No key is bundled with the app. There is no MediBloom server.
 */

export type AiProvider = 'groq' | 'gemini' | 'openrouter';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

export interface ProviderInfo {
  label: string;
  /** Where to get a free key, shown in Settings. */
  keyUrl: string;
  defaultModel: string;
  /** One honest line about the free tier. */
  freeNote: string;
}

export const AI_PROVIDERS: Record<AiProvider, ProviderInfo> = {
  groq: {
    label: 'Groq',
    keyUrl: 'console.groq.com/keys',
    defaultModel: DEFAULT_AI.model,
    freeNote: 'Free tier, no card required. Fastest of the three.',
  },
  gemini: {
    label: 'Google AI Studio',
    keyUrl: 'aistudio.google.com/apikey',
    defaultModel: 'gemini-2.0-flash',
    freeNote: 'Free tier with a generous daily limit. No card required.',
  },
  openrouter: {
    label: 'OpenRouter',
    keyUrl: 'openrouter.ai/keys',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    freeNote: 'Models ending in :free cost nothing. No card required.',
  },
};

const TIMEOUT_MS = 20_000;
const KEY_STORE_NAME = 'medibloom_ai_key';

/* ------------------------------- key storage ------------------------------ */

export async function saveApiKey(key: string): Promise<boolean> {
  try {
    if (key) await SecureStore.setItemAsync(KEY_STORE_NAME, key);
    else await SecureStore.deleteItemAsync(KEY_STORE_NAME);
    return true;
  } catch {
    return false;
  }
}

/**
 * The key the user typed, or the demo key baked into the build if they have
 * not typed one. Anything they enter wins from then on.
 */
export async function loadApiKey(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(KEY_STORE_NAME);
    if (stored !== null) return stored;
  } catch {
    // keystore unavailable — fall through to the bundled default
  }
  return DEFAULT_AI.apiKey;
}

/* ------------------------------ the request ------------------------------- */

/** fetch with a hard timeout — a hung request must not freeze the chat. */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Reasoning models (gpt-oss and friends) think before they answer, and every
 * step costs seconds the user spends staring at a spinner. These answers are
 * short factual reads off a data block that is handed to the model, so "low"
 * is the right trade for a chat box. Raise it if answers ever look careless.
 */
const REASONING_EFFORT = 'low';

/** Groq and OpenRouter both speak the OpenAI chat shape. */
async function callOpenAiShaped(
  endpoint: string,
  cfg: AiConfig,
  turns: ChatTurn[],
): Promise<string> {
  const isReasoning = /gpt-oss|o[134]-|reason/i.test(cfg.model);

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: turns,
      temperature: 0.3,
      // gpt-oss wants max_completion_tokens; older models want max_tokens.
      ...(isReasoning
        ? { max_completion_tokens: 900, reasoning_effort: REASONING_EFFORT }
        : { max_tokens: 400 }),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(describeHttpError(res.status, detail));
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string; reasoning?: string } }>;
  };
  const message = json.choices?.[0]?.message;
  // A reasoning model can spend its whole budget thinking and return empty
  // content. Falling back to the reasoning text beats showing nothing.
  const text = (message?.content ?? '').trim() || (message?.reasoning ?? '').trim();
  if (!text) throw new Error('The model returned an empty answer.');
  return text;
}

async function callGemini(cfg: AiConfig, turns: ChatTurn[]): Promise<string> {
  const system = turns.filter((t) => t.role === 'system').map((t) => t.content).join('\n\n');
  const rest = turns.filter((t) => t.role !== 'system');

  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': cfg.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: rest.map((t) => ({
          role: t.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: t.content }],
        })),
        generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(describeHttpError(res.status, detail));
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!text) throw new Error('The model returned an empty answer.');
  return text;
}

/** Turns an HTTP failure into something a non-developer can act on. */
function describeHttpError(status: number, detail: string): string {
  if (status === 401 || status === 403) return 'That key was rejected. Check you pasted all of it.';
  if (status === 404) return 'That model name was not found for this provider.';
  if (status === 429) return "You've hit the free-tier rate limit. Try again in a minute.";
  if (status >= 500) return 'The provider is having trouble right now.';
  const trimmed = detail.slice(0, 140).replace(/\s+/g, ' ');
  return `Request failed (${status})${trimmed ? `: ${trimmed}` : ''}`;
}

async function complete(cfg: AiConfig, turns: ChatTurn[]): Promise<string> {
  switch (cfg.provider) {
    case 'groq':
      return callOpenAiShaped('https://api.groq.com/openai/v1/chat/completions', cfg, turns);
    case 'openrouter':
      return callOpenAiShaped('https://openrouter.ai/api/v1/chat/completions', cfg, turns);
    case 'gemini':
      return callGemini(cfg, turns);
    default:
      throw new Error('Unknown provider.');
  }
}

/* ------------------------------ the context ------------------------------- */

export interface AiSnapshot {
  medicines: Medicine[];
  entries: DoseLogEntry[];
  interactions: DetectedInteraction[];
  profileName: string;
  now?: Date;
}

/**
 * A compact, factual picture of the user's data.
 *
 * Deliberately small: the last 7 days only, no identifiers, no free-text notes
 * beyond what the user typed themselves. The model is told to answer from this
 * and nothing else.
 */
export function buildContextBlock(snap: AiSnapshot): string {
  const now = snap.now ?? new Date();
  const todayKey = toDateKey(now);
  const weekAgo = toDateKey(new Date(now.getTime() - 6 * 86_400_000));
  const byId = new Map(snap.medicines.map((m) => [m.id, m]));

  const meds = snap.medicines.map(
    (m) =>
      `- ${m.name} (generic: ${m.generic}) ${m.dosage} ${m.unit}, times: ${
        m.times.length > 0 ? m.times.map(formatClock).join(', ') : 'as needed'
      }${m.notes ? `, note: ${m.notes}` : ''}`,
  );

  const today = snap.entries
    .filter((e) => e.date === todayKey)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
    .map((e) => `- ${byId.get(e.medicineId)?.name ?? 'unknown'} at ${formatClock(e.scheduledTime)}: ${e.status}`);

  const week = snap.entries.filter((e) => e.date >= weekAgo);
  const stats = computeAdherence(week);
  const overall = computeAdherence(snap.entries);

  const clashes = snap.interactions.map(
    (d) =>
      `- ${d.medicineA.name} + ${d.medicineB.name}: ${d.rule.severity}. ${d.rule.explanation} Guidance: ${d.rule.guidance}${
        d.rule.swapFor ? ` Safer alternative: ${d.rule.swapFor} (${d.rule.swapReason ?? ''})` : ''
      }`,
  );

  return [
    `Today is ${todayKey}, local time ${formatClock(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    )}.`,
    snap.profileName ? `The user's name is ${snap.profileName}.` : '',
    '',
    `MEDICINES (${snap.medicines.length}):`,
    meds.length > 0 ? meds.join('\n') : '- none added yet',
    '',
    "TODAY'S DOSE LOG:",
    today.length > 0 ? today.join('\n') : '- nothing scheduled today',
    '',
    'ADHERENCE:',
    `- last 7 days: ${stats.taken} taken, ${stats.missed} missed, ${stats.skipped} skipped (${stats.ratePercent}%)`,
    `- last 30 days: ${overall.ratePercent}%, current streak ${overall.streakDays} days`,
    '',
    'FLAGGED INTERACTIONS:',
    clashes.length > 0 ? clashes.join('\n') : '- none detected in the current list',
  ]
    .filter((l) => l !== '')
    .join('\n');
}

const SYSTEM_PROMPT = `You are MediBloom's in-app assistant, talking to someone about their own medicines.

Rules you must not break:
- Answer ONLY from the DATA block you are given. If the answer is not in it, say you don't have that and suggest asking their pharmacist.
- Never invent a dose, a time, a medicine, a side effect or an interaction. Never suggest starting, stopping or changing a dose.
- You are not a doctor and must not diagnose. For anything clinical, point to their pharmacist or doctor. For breathing trouble, swelling or chest pain, say to call emergency services.
- Keep it to 3 sentences or fewer, warm and plain. No markdown, no bullet points, no headings.
- Use the times and names exactly as they appear in the DATA block.`;

/* --------------------------------- calls ---------------------------------- */

export interface AiResult {
  text: string | null;
  error?: string;
}

/**
 * Asks the model the user's question with their data attached.
 * Returns `{ text: null, error }` on any failure so the caller can quietly
 * fall back to the on-device engine.
 */
export async function askAi(
  question: string,
  snap: AiSnapshot,
  cfg: AiConfig,
): Promise<AiResult> {
  if (!cfg.apiKey) return { text: null, error: 'No key saved.' };
  try {
    const text = await complete(cfg, [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `DATA:\n${buildContextBlock(snap)}\n\nQUESTION: ${question}` },
    ]);
    return { text };
  } catch (e) {
    return { text: null, error: e instanceof Error ? e.message : 'Could not reach the provider.' };
  }
}

/**
 * Second pass over OCR text. The on-device parser runs first and always wins on
 * anything it is confident about; this only helps with the lines it wasn't.
 * Returns raw JSON text for the caller to validate — never trusted blindly.
 */
export async function structureOcrText(
  ocrText: string,
  cfg: AiConfig,
): Promise<AiResult> {
  if (!cfg.apiKey) return { text: null, error: 'No key saved.' };
  try {
    const text = await complete(cfg, [
      {
        role: 'system',
        content:
          'You read prescription text and return JSON only. Output a JSON array, nothing else — no prose, no code fences. Each element: {"name": string, "dosage": string, "unit": string, "frequency": "Once daily"|"Twice daily"|"3x daily"|"As needed"}. Use only drug names actually present in the text. If a field is not stated, use an empty string. If there are no medicines, return [].',
      },
      { role: 'user', content: ocrText.slice(0, 4000) },
    ]);
    return { text };
  } catch (e) {
    return { text: null, error: e instanceof Error ? e.message : 'Could not reach the provider.' };
  }
}

/**
 * A fuller explanation of one interaction, on demand.
 *
 * The bundled rule is always shown first and is what the app stands behind.
 * This adds detail for someone who taps "Tell me more" — what to watch for,
 * why it happens, what to ask a pharmacist. With no network the caller simply
 * keeps the bundled text, which is why this is an extra rather than the source.
 */
export async function explainInteraction(
  nameA: string,
  nameB: string,
  severity: string,
  bundledExplanation: string,
  bundledGuidance: string,
  cfg: AiConfig,
): Promise<AiResult> {
  if (!cfg.apiKey) return { text: null, error: 'No key saved.' };
  try {
    const text = await complete(cfg, [
      {
        role: 'system',
        content:
          'You explain one drug interaction to a patient, in plain English. Four sentences at most. Cover what actually happens in the body, the specific signs to watch for, and what to ask their doctor or pharmacist. Never tell them to start, stop or change a dose. Never contradict the reference text you are given. No markdown, no lists, no headings.',
      },
      {
        role: 'user',
        content: `Medicines: ${nameA} and ${nameB}\nSeverity: ${severity}\nReference: ${bundledExplanation} ${bundledGuidance}\n\nExplain this to the patient.`,
      },
    ]);
    return { text };
  } catch (e) {
    return { text: null, error: e instanceof Error ? e.message : 'Could not reach the provider.' };
  }
}

/** Strips code fences and pulls the first JSON array out of a model reply. */
export function extractJsonArray(text: string): unknown[] | null {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** One cheap round-trip so the user can confirm the key works before relying on it. */
export async function testAiConnection(cfg: AiConfig): Promise<{ ok: boolean; message: string }> {
  if (!cfg.apiKey) return { ok: false, message: 'Paste your key first.' };
  try {
    const text = await complete(cfg, [
      { role: 'system', content: 'Reply with exactly: ready' },
      { role: 'user', content: 'ping' },
    ]);
    return { ok: true, message: `Connected to ${AI_PROVIDERS[cfg.provider].label} — replied "${text.slice(0, 24)}".` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not connect.' };
  }
}
