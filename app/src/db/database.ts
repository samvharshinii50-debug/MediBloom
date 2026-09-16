import * as SQLite from 'expo-sqlite';

const DB_NAME = 'medibloom.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Opens (once) and migrates the local database.
 * Everything the app knows lives here — there is no server.
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      generic TEXT NOT NULL,
      dosage TEXT NOT NULL,
      unit TEXT NOT NULL,
      times TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT,
      colorTag TEXT NOT NULL,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dose_log (
      id TEXT PRIMARY KEY NOT NULL,
      medicineId TEXT NOT NULL,
      date TEXT NOT NULL,
      scheduledTime TEXT NOT NULL,
      status TEXT NOT NULL,
      actedAt TEXT,
      caregiverNotified INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (medicineId) REFERENCES medicines (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_dose_unique
      ON dose_log (medicineId, date, scheduledTime);
    CREATE INDEX IF NOT EXISTS idx_dose_date ON dose_log (date);
    CREATE INDEX IF NOT EXISTS idx_dose_status ON dose_log (status);
    CREATE INDEX IF NOT EXISTS idx_med_active ON medicines (active);
  `);
}

/** Wipes every table. Used by "erase everything" and by tests. */
export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM dose_log;
    DELETE FROM medicines;
    DELETE FROM settings;
  `);
}

/** Test seam: forget the cached handle so a fresh one is opened next call. */
export function __resetDbHandleForTests(): void {
  dbPromise = null;
}
