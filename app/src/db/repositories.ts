import { getDb } from './database';
import { DEFAULT_AI, hasBundledCredentials } from '../data/defaults';
import type {
  AppSettings,
  DoseLogEntry,
  DoseStatus,
  Medicine,
} from '../data/types';

/** Row shapes as SQLite returns them (booleans/arrays are encoded). */
interface MedicineRow {
  id: string;
  name: string;
  generic: string;
  dosage: string;
  unit: string;
  times: string;
  startDate: string;
  endDate: string | null;
  colorTag: string;
  notes: string | null;
  active: number;
  createdAt: string;
}

interface DoseRow {
  id: string;
  medicineId: string;
  date: string;
  scheduledTime: string;
  status: string;
  actedAt: string | null;
  caregiverNotified: number;
}

function toMedicine(r: MedicineRow): Medicine {
  return {
    id: r.id,
    name: r.name,
    generic: r.generic,
    dosage: r.dosage,
    unit: r.unit,
    times: JSON.parse(r.times) as string[],
    startDate: r.startDate,
    endDate: r.endDate,
    colorTag: r.colorTag,
    notes: r.notes,
    active: r.active === 1,
    createdAt: r.createdAt,
  };
}

function toDose(r: DoseRow): DoseLogEntry {
  return {
    id: r.id,
    medicineId: r.medicineId,
    date: r.date,
    scheduledTime: r.scheduledTime,
    status: r.status as DoseStatus,
    actedAt: r.actedAt,
    caregiverNotified: r.caregiverNotified === 1,
  };
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------- medicines ------------------------------- */

export const medicinesRepo = {
  async all(): Promise<Medicine[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<MedicineRow>(
      'SELECT * FROM medicines ORDER BY active DESC, createdAt DESC',
    );
    return rows.map(toMedicine);
  },

  async active(): Promise<Medicine[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<MedicineRow>(
      'SELECT * FROM medicines WHERE active = 1 ORDER BY createdAt ASC',
    );
    return rows.map(toMedicine);
  },

  async byId(id: string): Promise<Medicine | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<MedicineRow>(
      'SELECT * FROM medicines WHERE id = ?',
      [id],
    );
    return row ? toMedicine(row) : null;
  },

  async insert(m: Omit<Medicine, 'id' | 'createdAt'>): Promise<Medicine> {
    const db = await getDb();
    const record: Medicine = { ...m, id: newId(), createdAt: new Date().toISOString() };
    await db.runAsync(
      `INSERT INTO medicines
       (id, name, generic, dosage, unit, times, startDate, endDate, colorTag, notes, active, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.name,
        record.generic,
        record.dosage,
        record.unit,
        JSON.stringify(record.times),
        record.startDate,
        record.endDate,
        record.colorTag,
        record.notes,
        record.active ? 1 : 0,
        record.createdAt,
      ],
    );
    return record;
  },

  async setActive(id: string, active: boolean): Promise<void> {
    const db = await getDb();
    await db.runAsync('UPDATE medicines SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
  },

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM medicines WHERE id = ?', [id]);
  },
};

/* -------------------------------- doses ---------------------------------- */

export const doseRepo = {
  async forDate(date: string): Promise<DoseLogEntry[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<DoseRow>(
      'SELECT * FROM dose_log WHERE date = ? ORDER BY scheduledTime ASC',
      [date],
    );
    return rows.map(toDose);
  },

  async since(startDate: string): Promise<DoseLogEntry[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<DoseRow>(
      'SELECT * FROM dose_log WHERE date >= ? ORDER BY date ASC, scheduledTime ASC',
      [startDate],
    );
    return rows.map(toDose);
  },

  /**
   * Creates the row for a scheduled dose if it does not already exist.
   * Safe to call repeatedly — the unique index makes this idempotent.
   */
  async ensure(medicineId: string, date: string, scheduledTime: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR IGNORE INTO dose_log (id, medicineId, date, scheduledTime, status, actedAt, caregiverNotified)
       VALUES (?, ?, ?, ?, 'pending', NULL, 0)`,
      [newId(), medicineId, date, scheduledTime],
    );
  },

  async setStatus(id: string, status: DoseStatus): Promise<void> {
    const db = await getDb();
    await db.runAsync('UPDATE dose_log SET status = ?, actedAt = ? WHERE id = ?', [
      status,
      status === 'pending' ? null : new Date().toISOString(),
      id,
    ]);
  },

  async markCaregiverNotified(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('UPDATE dose_log SET caregiverNotified = 1 WHERE id = ?', [id]);
  },

  /** Pending doses whose scheduled moment is already in the past. */
  async pendingBefore(isoDateTime: string): Promise<DoseLogEntry[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<DoseRow>(
      `SELECT * FROM dose_log
       WHERE status = 'pending' AND (date || 'T' || scheduledTime) < ?
       ORDER BY date ASC, scheduledTime ASC`,
      [isoDateTime],
    );
    return rows.map(toDose);
  },
};

/* ------------------------------- settings -------------------------------- */

export const DEFAULT_SETTINGS: AppSettings = {
  profileName: '',
  largerText: false,
  theme: 'system',
  voiceRemindersEnabled: false,
  emailRemindersEnabled: false,
  emailAddress: '',
  lastEmailDigestDate: '',
  caregiverEnabled: false,
  caregiverName: '',
  caregiverEmail: '',
  caregiverThresholdHours: 2,
  onboarded: false,
  // The demo build ships a key, so cloud assist is on out of the box. Every
  // answer still falls back to the on-device engine, and Settings explains
  // exactly what leaves the phone. A build with no bundled key starts off.
  aiEnabled: hasBundledCredentials(),
  aiProvider: DEFAULT_AI.provider,
  aiModel: DEFAULT_AI.model,
  aiOcrAssist: hasBundledCredentials(),
};

export const settingsRepo = {
  async load(): Promise<AppSettings> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings',
    );
    const result: AppSettings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if (row.key in result) {
        try {
          (result as unknown as Record<string, unknown>)[row.key] = JSON.parse(row.value);
        } catch {
          // A malformed row must never take the app down — keep the default.
        }
      }
    }
    return result;
  },

  async save(patch: Partial<AppSettings>): Promise<void> {
    const db = await getDb();
    for (const [key, value] of Object.entries(patch)) {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, JSON.stringify(value)],
      );
    }
  },
};
