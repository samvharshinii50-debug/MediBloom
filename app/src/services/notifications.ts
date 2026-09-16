import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Medicine } from '../data/types';
import { formatClock, parseTimeKey } from '../engines/scheduleEngine';

/** Re-exported so existing callers keep the name they already use. */
export const formatTime = formatClock;

export const DOSE_CATEGORY = 'medibloom.dose';
export const CHANNEL_ID = 'medibloom-reminders';

export const ACTION_TAKEN = 'TAKEN';
export const ACTION_SNOOZE = 'SNOOZE';
export const ACTION_SKIP = 'SKIP';

export const SNOOZE_MINUTES = 10;

/** Data ridden along with every reminder so the tap handler knows what it was for. */
export interface DosePayload {
  medicineId: string;
  medicineName: string;
  dosage: string;
  unit: string;
  time: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let initialised = false;

/**
 * Sets up the Android channel and the action buttons.
 * Safe to call more than once; only the first call does work.
 */
export async function initNotifications(): Promise<boolean> {
  if (initialised) return true;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Medicine reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,

      });
    }

    await Notifications.setNotificationCategoryAsync(DOSE_CATEGORY, [
      {
        identifier: ACTION_TAKEN,
        buttonTitle: 'Mark taken',
        options: { opensAppToForeground: false },
      },
      {
        identifier: ACTION_SNOOZE,
        buttonTitle: `Snooze ${SNOOZE_MINUTES}m`,
        options: { opensAppToForeground: false },
      },
      {
        identifier: ACTION_SKIP,
        buttonTitle: 'Skip',
        options: { opensAppToForeground: false },
      },
    ]);

    initialised = true;
    return true;
  } catch {
    // Notifications failing must never stop the app from opening.
    return false;
  }
}

export async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/** Removes every scheduled reminder. Called before a full reschedule. */
export async function cancelAll(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    /* nothing scheduled, or the module is unavailable — both are fine */
  }
}

/**
 * Rebuilds the whole reminder schedule from the active medicines.
 * One repeating daily notification per medicine per time.
 */
export async function rescheduleAll(medicines: Medicine[]): Promise<number> {
  await initNotifications();
  await cancelAll();

  let scheduled = 0;
  for (const m of medicines) {
    if (!m.active) continue;
    for (const time of m.times) {
      const { hours, minutes } = parseTimeKey(time);
      const payload: DosePayload = {
        medicineId: m.id,
        medicineName: m.name,
        dosage: m.dosage,
        unit: m.unit,
        time,
      };

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Time for ${m.name}`,
            body: `${m.dosage} ${m.unit} · scheduled for ${formatTime(time)}`,
            categoryIdentifier: DOSE_CATEGORY,
            data: payload as unknown as Record<string, unknown>,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hours,
            minute: minutes,
            channelId: CHANNEL_ID,
          },
        });
        scheduled++;
      } catch {
        // One bad entry shouldn't abort the rest of the schedule.
      }
    }
  }
  return scheduled;
}

/** Re-fires a single reminder a few minutes out, for the Snooze action. */
export async function snooze(payload: DosePayload): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Still due: ${payload.medicineName}`,
        body: `${payload.dosage} ${payload.unit} · snoozed from ${formatTime(payload.time)}`,
        categoryIdentifier: DOSE_CATEGORY,
        data: payload as unknown as Record<string, unknown>,

      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: SNOOZE_MINUTES * 60,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    /* snooze is best-effort */
  }
}

/** Fires a reminder immediately — used to prove the pipeline during a demo. */
export async function fireTestReminder(medicineName = 'Metformin'): Promise<void> {
  await initNotifications();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Time for ${medicineName}`,
      body: '500 mg · this is a test reminder',
      categoryIdentifier: DOSE_CATEGORY,
      data: {
        medicineId: '__test__',
        medicineName,
        dosage: '500',
        unit: 'mg',
        time: '13:00',
      },

    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      channelId: CHANNEL_ID,
    },
  });
}

