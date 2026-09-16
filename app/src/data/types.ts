/** Severity of a drug-drug interaction. Ordered: severe > moderate > mild. */
export type Severity = 'severe' | 'moderate' | 'mild';

/** One well-established drug-drug interaction between two generic drugs. */
export interface InteractionRule {
  /** Lowercase generic name, e.g. "warfarin". */
  a: string;
  /** Lowercase generic name, e.g. "ibuprofen". */
  b: string;
  severity: Severity;
  /** Plain-language explanation of what happens. One or two sentences, no jargon. */
  explanation: string;
  /** Concrete action the user can take. One or two sentences. */
  guidance: string;
  /**
   * Optional safer alternative for drug `b` (the one usually easier to swap).
   * Drives the "Smart Swap" UI. Lowercase generic name.
   */
  swapFor?: string;
  /** Why the swap is safer. Shown next to the swap chips. */
  swapReason?: string;
}

/** Maps a brand or alternate spelling to its canonical lowercase generic name. */
export interface DrugSynonym {
  /** What the user might type or what OCR might read, lowercase. */
  alias: string;
  /** Canonical lowercase generic name. */
  generic: string;
}

export type DoseStatus = 'pending' | 'taken' | 'missed' | 'skipped';

export interface Medicine {
  id: string;
  /** What the user typed / chose, preserving their capitalisation. */
  name: string;
  /** Lowercase canonical generic used for interaction matching. */
  generic: string;
  dosage: string;
  unit: string;
  /** "HH:MM" 24h strings, e.g. ["08:00", "13:00"]. */
  times: string[];
  /** ISO date "YYYY-MM-DD". */
  startDate: string;
  /** ISO date or null for open-ended. */
  endDate: string | null;
  colorTag: string;
  notes: string | null;
  active: boolean;
  createdAt: string;
}

export interface DoseLogEntry {
  id: string;
  medicineId: string;
  /** ISO date "YYYY-MM-DD". */
  date: string;
  /** "HH:MM" scheduled time. */
  scheduledTime: string;
  status: DoseStatus;
  /** ISO timestamp when acted on, null if still pending. */
  actedAt: string | null;
  /** True once a caregiver alert has gone out for this dose (prevents duplicates). */
  caregiverNotified: boolean;
}

/** A detected interaction between two medicines the user is actually taking. */
export interface DetectedInteraction {
  rule: InteractionRule;
  medicineA: Medicine;
  medicineB: Medicine;
}

export interface AppSettings {
  profileName: string;
  largerText: boolean;
  theme: 'light' | 'dark' | 'system';
  voiceRemindersEnabled: boolean;
  emailRemindersEnabled: boolean;
  emailAddress: string;
  /** Date key of the last daily digest, so it goes out once a day at most. */
  lastEmailDigestDate: string;
  caregiverEnabled: boolean;
  caregiverName: string;
  caregiverEmail: string;
  /** Hours a dose may stay pending before the caregiver is alerted. */
  caregiverThresholdHours: number;
  onboarded: boolean;

  /**
   * Optional cloud assist. Off by default and never required — the app answers
   * from its own rules with the network off. The API key itself is not stored
   * here; it lives in the device keystore.
   */
  aiEnabled: boolean;
  aiProvider: 'groq' | 'gemini' | 'openrouter';
  aiModel: string;
  /** Let the model take a second pass at prescription text the parser wasn't sure about. */
  aiOcrAssist: boolean;
}

/** One medicine parsed out of a prescription, before the user confirms it. */
export interface ParsedMedicine {
  /** Raw text as read, kept so the user can see what we actually saw. */
  rawText: string;
  name: string;
  generic: string | null;
  dosage: string;
  unit: string;
  frequencyLabel: string;
  times: string[];
  /** 0..1. Below CONFIDENCE_THRESHOLD the UI asks the user to confirm. */
  confidence: number;
  /** Candidate generics when the read was ambiguous, best first. */
  suggestions: string[];
}
