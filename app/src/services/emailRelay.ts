import * as SecureStore from 'expo-secure-store';
import { DEFAULT_EMAILJS } from '../data/defaults';

/**
 * Sending an email without the user tapping anything.
 *
 * Doing this properly needs a mail server, and a mail server costs money and
 * means storing a password on the phone. Both are things this app refuses to
 * do. So instead the user points MediBloom at something they already own and
 * that is free:
 *
 *   - a Google Apps Script web app (a dozen lines, uses their own Gmail quota,
 *     costs nothing, no third party in the middle), or
 *   - an EmailJS account (free tier, 200 emails a month).
 *
 * Off by default. When it is off, caregiver alerts fall back to the one-tap
 * notification, which is what shipped before and still works with no setup.
 */

export type RelayMode = 'off' | 'webhook' | 'emailjs';

export interface EmailRelayConfig {
  mode: RelayMode;
  /** Any endpoint that accepts { to, subject, body }. */
  webhookUrl: string;
  emailjsServiceId: string;
  emailjsTemplateId: string;
  emailjsPublicKey: string;
  /** Needed when EmailJS strict mode is on, which it is by default. */
  emailjsPrivateKey: string;
}

export const EMPTY_RELAY: EmailRelayConfig = {
  mode: 'off',
  webhookUrl: '',
  emailjsServiceId: '',
  emailjsTemplateId: '',
  emailjsPublicKey: '',
  emailjsPrivateKey: '',
};

/**
 * What a fresh install starts with. The demo build ships EmailJS credentials
 * so alerts can send without any setup; see data/defaults.ts for why that is
 * a demo-only arrangement. Anything the user types replaces these.
 */
export const DEFAULT_RELAY: EmailRelayConfig = {
  mode: DEFAULT_EMAILJS.publicKey ? 'emailjs' : 'off',
  webhookUrl: '',
  emailjsServiceId: DEFAULT_EMAILJS.serviceId,
  emailjsTemplateId: DEFAULT_EMAILJS.templateId,
  emailjsPublicKey: DEFAULT_EMAILJS.publicKey,
  emailjsPrivateKey: DEFAULT_EMAILJS.privateKey,
};

/**
 * What is stopping this setup from working, in words the user can act on.
 * Returns null when it is good to go.
 */
export function relayBlocker(cfg: EmailRelayConfig): string | null {
  if (cfg.mode === 'off') return null;
  if (cfg.mode === 'webhook') {
    return /^https:\/\/.+/i.test(cfg.webhookUrl.trim())
      ? null
      : 'Paste the https URL of your script.';
  }
  if (!cfg.emailjsServiceId.trim()) return 'Service ID is missing.';
  if (!cfg.emailjsPublicKey.trim()) return 'Public key is missing.';
  if (!cfg.emailjsTemplateId.trim()) {
    return 'Template ID is missing. Create a template in EmailJS using the variables to_email, subject and message, then paste its ID here.';
  }
  return null;
}

const STORE_KEY = 'medibloom_email_relay';
const TIMEOUT_MS = 15_000;

/* ------------------------------ persistence ------------------------------- */

export async function saveRelayConfig(cfg: EmailRelayConfig): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(cfg));
    return true;
  } catch {
    return false;
  }
}

export async function loadRelayConfig(): Promise<EmailRelayConfig> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    if (!raw) return { ...DEFAULT_RELAY };
    return { ...EMPTY_RELAY, ...(JSON.parse(raw) as Partial<EmailRelayConfig>) };
  } catch {
    return { ...DEFAULT_RELAY };
  }
}

/** Is there enough here to actually send? Pure, so it is unit-tested. */
export function isRelayConfigured(cfg: EmailRelayConfig): boolean {
  return cfg.mode !== 'off' && relayBlocker(cfg) === null;
}

/* -------------------------------- sending --------------------------------- */

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
}

export interface SendResult {
  ok: boolean;
  /** How it went out, so the UI never overstates what happened. */
  via: RelayMode;
  error?: string;
}

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function sendViaRelay(
  msg: EmailMessage,
  cfg: EmailRelayConfig,
): Promise<SendResult> {
  if (!isRelayConfigured(cfg)) {
    return { ok: false, via: cfg.mode, error: 'Automatic email is not set up.' };
  }
  if (!msg.to.trim()) {
    return { ok: false, via: cfg.mode, error: 'No recipient address.' };
  }

  try {
    if (cfg.mode === 'webhook') {
      const res = await post(cfg.webhookUrl.trim(), {
        to: msg.to,
        subject: msg.subject,
        body: msg.body,
        from: msg.fromName ?? 'MediBloom',
      });
      if (!res.ok) {
        return { ok: false, via: 'webhook', error: `The endpoint returned ${res.status}.` };
      }
      return { ok: true, via: 'webhook' };
    }

    // EmailJS. The template needs to reference these variable names.
    const res = await post('https://api.emailjs.com/api/v1.0/email/send', {
      service_id: cfg.emailjsServiceId.trim(),
      template_id: cfg.emailjsTemplateId.trim(),
      user_id: cfg.emailjsPublicKey.trim(),
      ...(cfg.emailjsPrivateKey.trim() ? { accessToken: cfg.emailjsPrivateKey.trim() } : {}),
      template_params: {
        to_email: msg.to,
        subject: msg.subject,
        message: msg.body,
        from_name: msg.fromName ?? 'MediBloom',
      },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, via: 'emailjs', error: describeEmailJsError(res.status, detail) };
    }
    return { ok: true, via: 'emailjs' };
  } catch (e) {
    const msgText =
      e instanceof Error && e.name === 'AbortError'
        ? 'Timed out — check your connection.'
        : e instanceof Error
          ? e.message
          : 'Could not send.';
    return { ok: false, via: cfg.mode, error: msgText };
  }
}

/**
 * "EmailJS" in Nunito reads as "EmaiUS" because the l and the J run together,
 * so these user-facing strings keep a thin space between them.
 */
const EMAILJS = 'Email JS';

function describeEmailJsError(status: number, detail: string): string {
  const d = detail.slice(0, 160).replace(/\s+/g, ' ');
  if (status === 403 && /non-browser|api calls/i.test(detail)) {
    return `${EMAILJS} is blocking requests from apps. This is a switch in your account, not something the app can set: open dashboard.emailjs.com, go to Account, then Security, and turn on "Allow ${EMAILJS} API for non-browser applications". A private key alone is not enough.`;
  }
  if (status === 400 && /template/i.test(detail)) {
    return `${EMAILJS} does not recognise that template ID. Check it against the one in your ${EMAILJS} dashboard under Email Templates.`;
  }
  if (status === 400) return `${EMAILJS} rejected the request: ${d}`;
  if (status === 401 || status === 403) return `Those ${EMAILJS} credentials were rejected.`;
  return `${EMAILJS} returned ${status}${d ? `: ${d}` : ''}`;
}

/** Sends a harmless message so the user can prove the setup works. */
export async function sendRelayTest(
  to: string,
  cfg: EmailRelayConfig,
): Promise<SendResult> {
  return sendViaRelay(
    {
      to,
      subject: 'MediBloom test email',
      body: [
        'This is a test from MediBloom.',
        '',
        'If you are reading this, automatic caregiver alerts are working.',
        'Nothing has been missed — no action needed.',
      ].join('\n'),
    },
    cfg,
  );
}
