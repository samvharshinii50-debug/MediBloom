/** Minimal stand-ins so modules that import Expo packages can be unit tested. */

export const SchedulableTriggerInputTypes = {
  DAILY: 'daily',
  TIME_INTERVAL: 'timeInterval',
} as const;

export const AndroidImportance = { MAX: 5 } as const;
export const AndroidNotificationVisibility = { PUBLIC: 1 } as const;
export const MailComposerStatus = { SENT: 'sent', CANCELLED: 'cancelled' } as const;

export async function scheduleNotificationAsync() { return 'stub-id'; }
export async function cancelAllScheduledNotificationsAsync() { /* noop */ }
export async function setNotificationChannelAsync() { /* noop */ }
export async function setNotificationCategoryAsync() { /* noop */ }
export async function getPermissionsAsync() { return { granted: true }; }
export async function requestPermissionsAsync() { return { granted: true }; }
export function setNotificationHandler() { /* noop */ }
export function addNotificationReceivedListener() { return { remove() {} }; }
export function addNotificationResponseReceivedListener() { return { remove() {} }; }

export async function isAvailableAsync() { return true; }
export async function composeAsync() { return { status: 'sent' }; }

export function speak() { /* noop */ }

export async function openDatabaseAsync() {
  throw new Error('SQLite is not available in unit tests');
}

export async function getInfoAsync() { return { exists: false }; }
export async function readAsStringAsync() { return ''; }

/** In-memory stand-in for the device keystore, so persistence is testable. */
const keystore = new Map<string, string>();
export async function setItemAsync(key: string, value: string) { keystore.set(key, value); }
export async function getItemAsync(key: string) { return keystore.get(key) ?? null; }
export async function deleteItemAsync(key: string) { keystore.delete(key); }
export function __clearKeystore() { keystore.clear(); }

export default {
  scheduleNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  isAvailableAsync,
  composeAsync,
};
