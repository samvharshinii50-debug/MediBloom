import type { DetectedInteraction, DoseLogEntry, Medicine } from '../data/types';
import { combine, parseTimeKey } from './scheduleEngine';

export interface AdherenceStats {
  /** 0..100, rounded. */
  ratePercent: number;
  taken: number;
  missed: number;
  skipped: number;
  pending: number;
  total: number;
  /** Consecutive days, counting back from today, with no missed dose. */
  streakDays: number;
}

/**
 * Every insight is derived from clear rules over the user's own logs — this is
 * deliberately NOT a model. Each one carries the reason it fired so the app can
 * explain itself if asked.
 */
export interface Insight {
  id: string;
  text: string;
  /** Higher wins when choosing the single insight to show. */
  priority: number;
}

const DAY_MS = 86_400_000;

export function computeAdherence(entries: DoseLogEntry[]): AdherenceStats {
  const taken = entries.filter((e) => e.status === 'taken').length;
  const missed = entries.filter((e) => e.status === 'missed').length;
  const skipped = entries.filter((e) => e.status === 'skipped').length;
  const pending = entries.filter((e) => e.status === 'pending').length;
  const total = entries.length;

  // Pending doses are not failures yet, so they are excluded from the rate.
  const settled = taken + missed + skipped;
  const ratePercent = settled === 0 ? 100 : Math.round((taken / settled) * 100);

  return { ratePercent, taken, missed, skipped, pending, total, streakDays: computeStreak(entries) };
}

/** Consecutive days back from the most recent logged day with zero missed doses. */
export function computeStreak(entries: DoseLogEntry[], today = new Date()): number {
  if (entries.length === 0) return 0;

  const missedByDate = new Set(
    entries.filter((e) => e.status === 'missed').map((e) => e.date),
  );
  const loggedDates = new Set(entries.map((e) => e.date));

  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Walk backwards while days have log entries and none were missed.
  for (let i = 0; i < 400; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(
      cursor.getDate(),
    ).padStart(2, '0')}`;

    if (!loggedDates.has(key)) {
      // No doses scheduled that day — skip it without breaking the streak,
      // but don't count it either.
      if (i === 0) {
        cursor.setTime(cursor.getTime() - DAY_MS);
        continue;
      }
      break;
    }
    if (missedByDate.has(key)) break;
    streak++;
    cursor.setTime(cursor.getTime() - DAY_MS);
  }

  return streak;
}

type Bucket = 'morning' | 'afternoon' | 'evening';

function bucketOf(time: string): Bucket {
  const { hours } = parseTimeKey(time);
  if (hours < 12) return 'morning';
  if (hours < 17) return 'afternoon';
  return 'evening';
}

/** Which part of the day the user misses most, when the pattern is real. */
export function weakestTimeOfDay(
  entries: DoseLogEntry[],
): { bucket: Bucket; missRate: number } | null {
  const stats: Record<Bucket, { settled: number; missed: number }> = {
    morning: { settled: 0, missed: 0 },
    afternoon: { settled: 0, missed: 0 },
    evening: { settled: 0, missed: 0 },
  };

  for (const e of entries) {
    if (e.status === 'pending') continue;
    const b = bucketOf(e.scheduledTime);
    stats[b].settled++;
    if (e.status === 'missed') stats[b].missed++;
  }

  let worst: { bucket: Bucket; missRate: number } | null = null;
  for (const b of ['morning', 'afternoon', 'evening'] as Bucket[]) {
    // Need a few data points before claiming a pattern exists.
    if (stats[b].settled < 3) continue;
    const rate = stats[b].missed / stats[b].settled;
    if (rate > 0 && (!worst || rate > worst.missRate)) {
      worst = { bucket: b, missRate: rate };
    }
  }
  return worst;
}

/** Per-medicine adherence, worst first. */
export function adherenceByMedicine(
  medicines: Medicine[],
  entries: DoseLogEntry[],
): Array<{ medicine: Medicine; ratePercent: number; settled: number }> {
  return medicines
    .map((m) => {
      const mine = entries.filter((e) => e.medicineId === m.id && e.status !== 'pending');
      const taken = mine.filter((e) => e.status === 'taken').length;
      return {
        medicine: m,
        ratePercent: mine.length === 0 ? 100 : Math.round((taken / mine.length) * 100),
        settled: mine.length,
      };
    })
    .sort((a, b) => a.ratePercent - b.ratePercent);
}

/**
 * Generates candidate insights, highest priority first.
 * Returns an empty array when there genuinely is nothing to say — the UI shows
 * an honest empty state rather than inventing filler.
 */
export function generateInsights(
  medicines: Medicine[],
  entries: DoseLogEntry[],
  interactions: DetectedInteraction[],
  now = new Date(),
): Insight[] {
  const out: Insight[] = [];
  const stats = computeAdherence(entries);

  const severe = interactions.filter((i) => i.rule.severity === 'severe');
  if (severe.length > 0) {
    const first = severe[0];
    out.push({
      id: 'severe-interaction',
      priority: 100,
      text: `${first.medicineA.name} and ${first.medicineB.name} need a look — worth asking your pharmacist about before your next dose.`,
    });
  }

  const weak = weakestTimeOfDay(entries);
  if (weak && weak.missRate >= 0.2) {
    const label =
      weak.bucket === 'morning'
        ? 'morning'
        : weak.bucket === 'afternoon'
          ? 'afternoon'
          : 'evening';
    out.push({
      id: 'weak-time',
      priority: 80,
      text: `Your ${label} doses slip more than the rest. Try moving that reminder 10 minutes earlier.`,
    });
  }

  if (stats.streakDays >= 7) {
    out.push({
      id: 'streak',
      priority: 70,
      text: `${stats.streakDays} days in a row without a missed dose — that consistency is exactly what makes these medicines work.`,
    });
  }

  const byMed = adherenceByMedicine(medicines, entries).filter((x) => x.settled >= 3);
  const worstMed = byMed[0];
  if (worstMed && worstMed.ratePercent < 80) {
    out.push({
      id: 'weak-medicine',
      priority: 60,
      text: `${worstMed.medicine.name} is the one you miss most (${worstMed.ratePercent}% taken). Keeping it somewhere you'll see it helps.`,
    });
  }

  if (stats.ratePercent >= 90 && stats.total >= 5) {
    out.push({
      id: 'good-rate',
      priority: 40,
      text: `You've taken ${stats.ratePercent}% of your doses on time. That's genuinely good going.`,
    });
  }

  if (medicines.length >= 5) {
    out.push({
      id: 'polypharmacy',
      priority: 30,
      text: `You're tracking ${medicines.length} medicines. Bring this list to your next appointment so your doctor sees the whole picture.`,
    });
  }

  return out.sort((a, b) => b.priority - a.priority);
}

/** The single insight for the home card, or null when there is nothing honest to say. */
export function topInsight(
  medicines: Medicine[],
  entries: DoseLogEntry[],
  interactions: DetectedInteraction[],
  now = new Date(),
): Insight | null {
  const all = generateInsights(medicines, entries, interactions, now);
  return all.length > 0 ? all[0] : null;
}

/** Every dose on one day, named, for the tap-a-square detail panel. */
export function dayDetail(
  entries: DoseLogEntry[],
  medicines: Medicine[],
  dateKey: string,
): Array<{ medicineName: string; colorTag: string; time: string; status: DoseLogEntry['status'] }> {
  const byId = new Map(medicines.map((m) => [m.id, m]));
  return entries
    .filter((e) => e.date === dateKey)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
    .map((e) => {
      const m = byId.get(e.medicineId);
      return {
        medicineName: m?.name ?? 'Removed medicine',
        colorTag: m?.colorTag ?? '#B5A8C4',
        time: e.scheduledTime,
        status: e.status,
      };
    });
}

/**
 * This week against last week, so the number means something.
 * `delta` is null until there is enough of last week to compare against.
 */
export function weekComparison(
  entries: DoseLogEntry[],
  today = new Date(),
): { thisWeek: number; lastWeek: number | null; delta: number | null } {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const inRange = (from: Date, to: Date) => {
    const a = key(from);
    const b = key(to);
    return entries.filter((e) => e.date >= a && e.date <= b && e.status !== 'pending');
  };

  const rate = (list: DoseLogEntry[]) =>
    list.length === 0 ? null : Math.round((list.filter((e) => e.status === 'taken').length / list.length) * 100);

  const thisWeekList = inRange(new Date(start.getTime() - 6 * DAY_MS), start);
  const lastWeekList = inRange(new Date(start.getTime() - 13 * DAY_MS), new Date(start.getTime() - 7 * DAY_MS));

  const thisWeek = rate(thisWeekList) ?? 0;
  const lastWeek = rate(lastWeekList);

  return { thisWeek, lastWeek, delta: lastWeek === null ? null : thisWeek - lastWeek };
}

/** Day-by-day taken/missed/skipped counts for the heatmap. */
export function dailyBreakdown(
  entries: DoseLogEntry[],
  days: number,
  today = new Date(),
): Array<{ date: string; taken: number; missed: number; skipped: number; total: number }> {
  const out: Array<{
    date: string;
    taken: number;
    missed: number;
    skipped: number;
    total: number;
  }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    const mine = entries.filter((e) => e.date === key);
    out.push({
      date: key,
      taken: mine.filter((e) => e.status === 'taken').length,
      missed: mine.filter((e) => e.status === 'missed').length,
      skipped: mine.filter((e) => e.status === 'skipped').length,
      total: mine.length,
    });
  }
  return out;
}
