import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { useStore } from './state/AppStore';
import { doseRepo } from './db/repositories';
import { toDateKey } from './engines/scheduleEngine';
import {
  ACTION_SKIP, ACTION_SNOOZE, ACTION_TAKEN, snooze, type DosePayload,
} from './services/notifications';
import { openPrefilledAlert } from './services/caregiver';

/**
 * Connects notification taps and action buttons back to the database.
 * Renders nothing — it exists purely for its effects, and lives inside the
 * store provider so it can refresh the UI after acting.
 */
export function NotificationBridge() {
  const { refresh, settings, todayDoses } = useStore();

  /* Read the reminder aloud when it arrives, if the user asked for that. */
  useEffect(() => {
    if (!settings.voiceRemindersEnabled) return;

    const sub = Notifications.addNotificationReceivedListener((notification) => {
      try {
        const data = notification.request.content.data as Partial<DosePayload>;
        if (!data?.medicineName) return;
        Speech.speak(
          `Time for ${data.medicineName}, ${data.dosage ?? ''} ${data.unit ?? ''}`.trim(),
          { rate: 0.95 },
        );
      } catch {
        /* speech is a nicety, never a failure path */
      }
    });
    return () => sub.remove();
  }, [settings.voiceRemindersEnabled]);

  /* Handle the action buttons and taps. */
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      try {
        const data = response.notification.request.content.data as Record<string, unknown>;

        // Caregiver alert: open the pre-written email.
        if (data?.kind === 'caregiver-alert') {
          await openPrefilledAlert(
            String(data.to ?? ''),
            String(data.subject ?? 'MediBloom alert'),
            String(data.body ?? ''),
          );
          return;
        }

        const payload = data as unknown as DosePayload;
        if (!payload?.medicineId || payload.medicineId === '__test__') return;

        const action = response.actionIdentifier;
        const today = toDateKey(new Date());

        if (action === ACTION_SNOOZE) {
          await snooze(payload);
          return;
        }

        if (action === ACTION_TAKEN || action === ACTION_SKIP) {
          await doseRepo.ensure(payload.medicineId, today, payload.time);
          const entries = await doseRepo.forDate(today);
          const match = entries.find(
            (e) => e.medicineId === payload.medicineId && e.scheduledTime === payload.time,
          );
          if (match) {
            await doseRepo.setStatus(match.id, action === ACTION_TAKEN ? 'taken' : 'skipped');
            await refresh();
          }
        }
      } catch {
        // A failed notification action must never crash the app.
      }
    });

    return () => sub.remove();
  }, [refresh, todayDoses]);

  return null;
}
