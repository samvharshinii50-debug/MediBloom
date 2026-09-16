import type { Medicine, DoseLogEntry } from '../data/types';

/** "YYYY-MM-DD" for a Date, in local time (never UTC — doses are local events). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "HH:MM" for a Date, local time. */
export function toTimeKey(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function parseTimeKey(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(':');
  return { hours: Number(h), minutes: Number(m) };
}

/**
 * "09:00" -> "9:00 AM". Lives here rather than in the notification service so
 * the pure engines can use it without pulling in a native module.
 */
export function formatClock(time: string): string {
  const { hours, minutes } = parseTimeKey(time);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "2026-09-15" -> { weekday: "Mon", day: 15, month: "Sep" }. */
export function describeDate(dateKey: string): {
  weekday: string;
  day: number;
  month: string;
} {
  const [y, mo, d] = dateKey.split('-').map(Number);
  const date = new Date(y, mo - 1, d);
  return { weekday: WEEKDAY_SHORT[date.getDay()], day: d, month: MONTH_SHORT[mo - 1] };
}

/** "Mon 15 Sep", or "Today" / "Yesterday" when it is one of those. */
export function friendlyDate(dateKey: string, today = new Date()): string {
  if (dateKey === toDateKey(today)) return 'Today';
  const y = new Date(today.getTime() - 86_400_000);
  if (dateKey === toDateKey(y)) return 'Yesterday';
  const { weekday, day, month } = describeDate(dateKey);
  return `${weekday} ${day} ${month}`;
}

/** Combines a date key and time key into a local Date. */
export function combine(dateKey: string, timeKey: string): Date {
  const [y, mo, d] = dateKey.split('-').map(Number);
  const { hours, minutes } = parseTimeKey(timeKey);
  return new Date(y, mo - 1, d, hours, minutes, 0, 0);
}

/** Is this medicine meant to be taken on this date? */
export function isActiveOn(medicine: Medicine, dateKey: string): boolean {
  if (!medicine.active) return false;
  if (dateKey < medicine.startDate) return false;
  if (medicine.endDate && dateKey > medicine.endDate) return false;
  return true;
}

/** Every (medicine, time) pair that should exist in the log for a given day. */
export function scheduledDosesFor(
  medicines: Medicine[],
  dateKey: string,
): Array<{ medicine: Medicine; time: string }> {
  const out: Array<{ medicine: Medicine; time: string }> = [];
  for (const m of medicines) {
    if (!isActiveOn(m, dateKey)) continue;
    for (const time of m.times) {
      out.push({ medicine: m, time });
    }
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

export type DoseUiState = 'taken' | 'skipped' | 'missed' | 'due' | 'upcoming';

/**
 * How a pending dose should read in the UI right now.
 * `missed` only applies once it is more than `graceMinutes` past due —
 * before that it is still actionable and shows as `due`.
 */
export function doseUiState(
  entry: DoseLogEntry,
  now: Date,
  graceMinutes = 60,
): DoseUiState {
  if (entry.status === 'taken') return 'taken';
  if (entry.status === 'skipped') return 'skipped';
  if (entry.status === 'missed') return 'missed';

  const scheduled = combine(entry.date, entry.scheduledTime);
  const diffMinutes = (now.getTime() - scheduled.getTime()) / 60000;
  if (diffMinutes < 0) return 'upcoming';
  if (diffMinutes <= graceMinutes) return 'due';
  return 'missed';
}

/** Human countdown like "in 5h 12m" / "due now" / "2h ago". */
export function relativeLabel(entry: DoseLogEntry, now: Date): string {
  const scheduled = combine(entry.date, entry.scheduledTime);
  const diffMs = scheduled.getTime() - now.getTime();
  const absMin = Math.round(Math.abs(diffMs) / 60000);

  if (absMin < 1) return 'due now';
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  const parts = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
  return diffMs > 0 ? `in ${parts}` : `${parts} ago`;
}

/** Next dose still to come today (or null when the day is done). */
export function nextDose(
  entries: DoseLogEntry[],
  now: Date,
): DoseLogEntry | null {
  const upcoming = entries
    .filter((e) => e.status === 'pending')
    .filter((e) => combine(e.date, e.scheduledTime).getTime() >= now.getTime())
    .sort(
      (a, b) =>
        combine(a.date, a.scheduledTime).getTime() -
        combine(b.date, b.scheduledTime).getTime(),
    );
  return upcoming[0] ?? null;
}

/** Frequency preset -> default times, matching the Add Medicine screen. */
export const FREQUENCY_PRESETS: Record<string, string[]> = {
  'Once daily': ['09:00'],
  'Twice daily': ['09:00', '21:00'],
  '3x daily': ['08:00', '14:00', '20:00'],
  'As needed': [],
};
