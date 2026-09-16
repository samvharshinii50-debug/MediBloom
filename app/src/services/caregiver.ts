import * as MailComposer from 'expo-mail-composer';
import * as Notifications from 'expo-notifications';
import type { AppSettings, DoseLogEntry, Medicine } from '../data/types';
import { combine } from '../engines/scheduleEngine';
import { CHANNEL_ID, formatTime } from './notifications';
import {
  isRelayConfigured,
  loadRelayConfig,
  sendViaRelay,
  type EmailRelayConfig,
} from './emailRelay';

/**
 * Pure detection: which pending doses are overdue past the caregiver threshold
 * and have not already triggered an alert. Split out from delivery so it can be
 * tested without touching mail or notifications.
 */
export function dosesNeedingCaregiverAlert(
  entries: DoseLogEntry[],
  thresholdHours: number,
  now: Date,
): DoseLogEntry[] {
  const cutoffMs = thresholdHours * 60 * 60 * 1000;
  return entries.filter((e) => {
    if (e.status !== 'pending') return false;
    if (e.caregiverNotified) return false;
    const scheduled = combine(e.date, e.scheduledTime).getTime();
    return now.getTime() - scheduled >= cutoffMs;
  });
}

export function buildAlertSubject(patientName: string, medicine: Medicine): string {
  const who = patientName || 'Someone you care for';
  return `${who} may have missed a dose of ${medicine.name}`;
}

export function buildAlertBody(
  patientName: string,
  caregiverName: string,
  medicine: Medicine,
  entry: DoseLogEntry,
  thresholdHours: number,
): string {
  const who = patientName || 'The person you care for';
  const greeting = caregiverName ? `Hi ${caregiverName},` : 'Hello,';
  return [
    greeting,
    '',
    `${who} hasn't marked this dose as taken in MediBloom:`,
    '',
    `  Medicine: ${medicine.name} ${medicine.dosage} ${medicine.unit}`,
    `  Scheduled: ${formatTime(entry.scheduledTime)} on ${entry.date}`,
    `  Still not marked after: ${thresholdHours} hour${thresholdHours === 1 ? '' : 's'}`,
    '',
    'It may simply be that they took it and forgot to tap. A quick check-in would help.',
    '',
    'Sent automatically by MediBloom. This is not medical advice — in an emergency,',
    'contact your local emergency number.',
  ].join('\n');
}

export interface AlertOutcome {
  delivered: boolean;
  /** How it went out, so the UI can be honest about what actually happened. */
  via: 'auto' | 'composer' | 'prompt' | 'skipped';
  reason?: string;
}

/**
 * Raises a caregiver alert for one overdue dose.
 *
 * If the user has set up a free email relay of their own, this sends on its
 * own and tells them it went. If they haven't, it falls back to a high-priority
 * notification carrying a fully pre-filled email — one tap sends it, nothing is
 * typed. Either way the alert reaches someone, which is the part that matters.
 */
export async function raiseCaregiverAlert(
  settings: AppSettings,
  medicine: Medicine,
  entry: DoseLogEntry,
  relay?: EmailRelayConfig,
): Promise<AlertOutcome> {
  if (!settings.caregiverEnabled || !settings.caregiverEmail) {
    return { delivered: false, via: 'skipped', reason: 'Caregiver alerts are off.' };
  }

  const subject = buildAlertSubject(settings.profileName, medicine);
  const body = buildAlertBody(
    settings.profileName,
    settings.caregiverName,
    medicine,
    entry,
    settings.caregiverThresholdHours,
  );

  // Preferred path: the user's own relay sends it with no interaction at all.
  const cfg = relay ?? (await loadRelayConfig());
  if (isRelayConfigured(cfg)) {
    const sent = await sendViaRelay(
      { to: settings.caregiverEmail, subject, body, fromName: 'MediBloom' },
      cfg,
    );
    if (sent.ok) {
      // Still tell the user, so an email never goes out behind their back.
      await postSilentNotice(
        'Caregiver alerted',
        `${settings.caregiverName || settings.caregiverEmail} was emailed about ${medicine.name} from ${formatTime(entry.scheduledTime)}.`,
      );
      return { delivered: true, via: 'auto' };
    }
    // Sending failed — fall through to the one-tap prompt rather than losing it.
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Let ${settings.caregiverName || 'your caregiver'} know?`,
        body: `${medicine.name} from ${formatTime(entry.scheduledTime)} is still unmarked. Tap to send the alert.`,
        data: {
          kind: 'caregiver-alert',
          to: settings.caregiverEmail,
          subject,
          body,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: CHANNEL_ID,
      },
    });
    return { delivered: true, via: 'prompt' };
  } catch (e) {
    return {
      delivered: false,
      via: 'skipped',
      reason: e instanceof Error ? e.message : 'Could not raise the alert.',
    };
  }
}

/** A quiet "this happened" notice. Best-effort; never throws. */
async function postSilentNotice(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    /* the alert already went out; the notice is a courtesy */
  }
}

/** Opens the device mail app with everything already filled in. */
export async function openPrefilledAlert(
  to: string,
  subject: string,
  body: string,
): Promise<AlertOutcome> {
  try {
    const available = await MailComposer.isAvailableAsync();
    if (!available) {
      return { delivered: false, via: 'skipped', reason: 'No mail app is set up on this device.' };
    }
    const result = await MailComposer.composeAsync({
      recipients: [to],
      subject,
      body,
    });
    return {
      delivered: result.status === MailComposer.MailComposerStatus.SENT,
      via: 'composer',
      reason: result.status,
    };
  } catch (e) {
    return {
      delivered: false,
      via: 'skipped',
      reason: e instanceof Error ? e.message : 'Could not open the mail app.',
    };
  }
}
