/**
 * Optional pre-filled credentials.
 *
 * ────────────────────────────────────────────────────────────────────────────
 *  THESE ARE EMPTY ON PURPOSE. DO NOT COMMIT REAL KEYS HERE.
 *
 *  An APK is a zip and this repository is public — anything written below ends
 *  up readable by anyone who downloads either one.
 *
 *  You do not need to fill these in. The app works without them:
 *
 *    • Cloud assist  — leave blank and the assistant answers from its own
 *      rules, offline. To switch it on, open Settings → Smarter answers and
 *      paste a free key from Groq, Google AI Studio or OpenRouter. It is
 *      stored in the Android keystore, never in the source.
 *
 *    • Automatic email — leave blank and caregiver alerts arrive as a
 *      notification with the email already written, one tap from sending.
 *      To send automatically, set it up in Settings → Automatic email.
 *
 *  If you want a personal build that starts pre-configured, paste your values
 *  below, build, and then put them back to '' before committing. Run
 *  `bash scripts/check-secrets.sh` first — it will stop you.
 * ────────────────────────────────────────────────────────────────────────────
 */

/** Groq, Google AI Studio or OpenRouter — used only for the optional cloud assist. */
export const DEFAULT_AI = {
  provider: 'groq' as const,
  apiKey: '',
  model: 'openai/gpt-oss-120b',
};

/** EmailJS — used only to send caregiver alerts without a mail app. */
export const DEFAULT_EMAILJS = {
  serviceId: '',
  templateId: '',
  publicKey: '',
  privateKey: '',
};

/** Pre-fills the caregiver field on a fresh install. Leave blank in the repo. */
export const DEFAULT_CAREGIVER_EMAIL = '';

/** True when a build is carrying credentials it should not be shared with. */
export function hasBundledCredentials(): boolean {
  return DEFAULT_AI.apiKey.length > 0 || DEFAULT_EMAILJS.publicKey.length > 0;
}
