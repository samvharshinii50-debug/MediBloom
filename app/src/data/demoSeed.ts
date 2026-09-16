import { medicinesRepo, doseRepo, settingsRepo } from '../db/repositories';
import { resetDatabase } from '../db/database';
import { toDateKey, scheduledDosesFor } from '../engines/scheduleEngine';
import { DEFAULT_CAREGIVER_EMAIL } from './defaults';
import type { Medicine } from './types';

/**
 * Loads a realistic demo profile: five medicines that produce a genuine severe
 * interaction, plus two weeks of varied dose history so the streak, trends and
 * insights all have something real to describe.
 *
 * This is explicitly user-triggered from Settings and clearly labelled — it is
 * a demo convenience, not something that ever runs behind the user's back.
 */

/**
 * Lakshmi, 68, Chennai — the kind of medicine list a great many Indian
 * households actually keep on the kitchen shelf.
 *
 * Chosen so the demo tells a true story rather than a contrived one:
 *
 *  - Warfarin after a heart valve, taken every night for years.
 *  - Meftal bought over the counter for knee pain, because in India you can.
 *    That pair is genuinely severe, and it is exactly the kind of thing that
 *    slips past a family. This is the moment the app earns its place.
 *  - Thyronorm and Shelcal, the most ordinary pairing there is for an older
 *    Indian woman — and a real absorption clash almost nobody is told about.
 *  - Nurokind alongside Glycomet, which is deliberate good practice rather
 *    than a mistake, so the app has to be able to say "this one is fine".
 */
const DEMO_MEDICINES: Array<Omit<Medicine, 'id' | 'createdAt'>> = [
  {
    name: 'Thyronorm', generic: 'levothyroxine', dosage: '50', unit: 'mcg',
    times: ['07:00'], startDate: '', endDate: null, colorTag: '#8B5FBF',
    notes: 'Empty stomach, one hour before coffee', active: true,
  },
  {
    name: 'Glycomet', generic: 'metformin', dosage: '500', unit: 'mg',
    times: ['08:00', '20:00'], startDate: '', endDate: null, colorTag: '#8FD4B8',
    notes: 'After food', active: true,
  },
  {
    name: 'Nurokind', generic: 'methylcobalamin', dosage: '1500', unit: 'mcg',
    times: ['09:00'], startDate: '', endDate: null, colorTag: '#F5C56B',
    notes: 'For the tingling in her feet', active: true,
  },
  {
    name: 'Meftal', generic: 'mefenamic acid', dosage: '250', unit: 'mg',
    times: ['13:00'], startDate: '', endDate: null, colorTag: '#F17C7C',
    notes: 'Bought at the medical shop for knee pain', active: true,
  },
  {
    name: 'Shelcal', generic: 'calcium carbonate', dosage: '500', unit: 'mg',
    times: ['14:00'], startDate: '', endDate: null, colorTag: '#D4A574',
    notes: 'After lunch', active: true,
  },
  {
    name: 'Warfarin', generic: 'warfarin', dosage: '5', unit: 'mg',
    times: ['20:00'], startDate: '', endDate: null, colorTag: '#E85D8A',
    notes: 'Same time every night. INR check every month', active: true,
  },
];

const HISTORY_DAYS = 14;

/**
 * Deterministic pseudo-miss pattern: evening doses slip more often than
 * morning ones, which is what makes the "your evening doses slip" insight fire
 * on real data rather than being hardcoded.
 */
function statusFor(dayOffset: number, time: string, index: number): 'taken' | 'missed' | 'skipped' {
  const hour = Number(time.split(':')[0]);
  const isEvening = hour >= 17;
  const seed = (dayOffset * 7 + index * 3) % 10;

  if (isEvening && seed < 3) return seed === 0 ? 'skipped' : 'missed';
  if (!isEvening && seed === 0) return 'skipped';
  return 'taken';
}

export async function loadDemoData(profileName = 'Lakshmi'): Promise<void> {
  await resetDatabase();

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - HISTORY_DAYS);
  const startKey = toDateKey(start);

  const inserted: Medicine[] = [];
  for (const m of DEMO_MEDICINES) {
    inserted.push(await medicinesRepo.insert({ ...m, startDate: startKey }));
  }

  // Build history day by day so the log looks exactly like lived-in usage.
  for (let offset = HISTORY_DAYS; offset >= 0; offset--) {
    const day = new Date(today);
    day.setDate(day.getDate() - offset);
    const dateKey = toDateKey(day);
    const scheduled = scheduledDosesFor(inserted, dateKey);

    for (let i = 0; i < scheduled.length; i++) {
      const { medicine, time } = scheduled[i];
      await doseRepo.ensure(medicine.id, dateKey, time);

      // Leave today's later doses pending so the home screen has something to do.
      if (offset === 0) {
        const nowHour = today.getHours();
        const doseHour = Number(time.split(':')[0]);
        if (doseHour > nowHour) continue;
      }

      const entries = await doseRepo.forDate(dateKey);
      const entry = entries.find(
        (e) => e.medicineId === medicine.id && e.scheduledTime === time,
      );
      if (entry) await doseRepo.setStatus(entry.id, statusFor(offset, time, i));
    }
  }

  await settingsRepo.save({
    profileName,
    onboarded: true,
    caregiverEnabled: true,
    caregiverName: 'Priya',
    caregiverEmail: DEFAULT_CAREGIVER_EMAIL,
    caregiverThresholdHours: 2,
    voiceRemindersEnabled: true,
    emailRemindersEnabled: true,
    emailAddress: DEFAULT_CAREGIVER_EMAIL,
  });
}
