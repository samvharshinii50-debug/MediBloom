import type { AppSettings, DoseLogEntry, Medicine } from '../data/types';
import { formatClock, friendlyDate, toDateKey } from '../engines/scheduleEngine';
import {
  isRelayConfigured, sendViaRelay, type EmailRelayConfig,
} from './emailRelay';

/**
 * The daily email reminder.
 *
 * Android will not let an app wake itself up reliably enough to send mail at a
 * fixed hour without a paid push service, and there is no MediBloom server to
 * do it from. So the digest goes out at most once a day, the first time the app
 * is opened that day. That is an honest compromise rather than a promise the
 * app cannot keep — the notification reminders are the ones that fire on time.
 */

export interface Digest {
  subject: string;
  body: string;
}

/** Pure: what the email actually says. Split out so it can be tested. */
export function buildDigest(
  settings: AppSettings,
  medicines: Medicine[],
  entries: DoseLogEntry[],
  now = new Date(),
): Digest | null {
  const todayKey = toDateKey(now);
  const yesterdayKey = toDateKey(new Date(now.getTime() - 86_400_000));
  const byId = new Map(medicines.map((m) => [m.id, m]));

  const today = entries
    .filter((e) => e.date === todayKey)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const missedYesterday = entries.filter(
    (e) => e.date === yesterdayKey && e.status === 'missed',
  );

  // Nothing scheduled and nothing to flag is not worth an email.
  if (today.length === 0 && missedYesterday.length === 0) return null;

  const name = settings.profileName || 'there';
  const line = (e: DoseLogEntry) => {
    const m = byId.get(e.medicineId);
    const mark = e.status === 'taken' ? '[x]' : e.status === 'pending' ? '[ ]' : '[-]';
    return `  ${mark} ${formatClock(e.scheduledTime)}  ${m?.name ?? 'Medicine'} ${m?.dosage ?? ''} ${m?.unit ?? ''}`.trimEnd();
  };

  const parts: string[] = [
    `Hi ${name},`,
    '',
    `Your medicines for ${friendlyDate(todayKey, now).toLowerCase()}:`,
    '',
  ];

  if (today.length > 0) {
    parts.push(...today.map(line));
  } else {
    parts.push('  Nothing scheduled today.');
  }

  if (missedYesterday.length > 0) {
    parts.push('', 'Still unmarked from yesterday:');
    parts.push(
      ...missedYesterday.map((e) => {
        const m = byId.get(e.medicineId);
        return `  - ${m?.name ?? 'Medicine'} at ${formatClock(e.scheduledTime)}`;
      }),
    );
  }

  parts.push(
    '',
    'Open MediBloom to mark them off.',
    '',
    'Sent by MediBloom. This is not medical advice — in an emergency,',
    'contact your local emergency number.',
  );

  return {
    subject: `MediBloom — your medicines for ${friendlyDate(todayKey, now).toLowerCase()}`,
    body: parts.join('\n'),
  };
}

export interface DigestOutcome {
  sent: boolean;
  /** Why not, when it did not go — surfaced nowhere but useful in tests. */
  reason?: string;
}

/** Decides whether today's digest is owed, and sends it if so. */
export async function maybeSendDailyDigest(
  settings: AppSettings,
  medicines: Medicine[],
  entries: DoseLogEntry[],
  relay: EmailRelayConfig,
  now = new Date(),
): Promise<DigestOutcome> {
  if (!settings.emailRemindersEnabled) return { sent: false, reason: 'Email reminders are off.' };
  if (!settings.emailAddress.trim()) return { sent: false, reason: 'No email address set.' };
  if (!isRelayConfigured(relay)) return { sent: false, reason: 'Automatic email is not set up.' };

  const todayKey = toDateKey(now);
  if (settings.lastEmailDigestDate === todayKey) {
    return { sent: false, reason: "Today's digest already went out." };
  }

  const digest = buildDigest(settings, medicines, entries, now);
  if (!digest) return { sent: false, reason: 'Nothing worth emailing about today.' };

  const res = await sendViaRelay(
    { to: settings.emailAddress.trim(), subject: digest.subject, body: digest.body },
    relay,
  );
  return res.ok ? { sent: true } : { sent: false, reason: res.error };
}
