import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { doseRepo, medicinesRepo, settingsRepo, DEFAULT_SETTINGS } from '../db/repositories';
import { resetDatabase } from '../db/database';
import type {
  AppSettings, DetectedInteraction, DoseLogEntry, DoseStatus, Medicine,
} from '../data/types';
import { checkInteractions } from '../engines/interactionEngine';
import { computeAdherence, topInsight, type AdherenceStats, type Insight } from '../engines/insightEngine';
import { scheduledDosesFor, toDateKey } from '../engines/scheduleEngine';
import { rescheduleAll } from '../services/notifications';
import { dosesNeedingCaregiverAlert, raiseCaregiverAlert } from '../services/caregiver';
import { loadRelayConfig } from '../services/emailRelay';
import { maybeSendDailyDigest } from '../services/emailDigest';
import { toDateKey as dateKey } from '../engines/scheduleEngine';

const HISTORY_DAYS = 30;

interface StoreValue {
  ready: boolean;
  settings: AppSettings;
  medicines: Medicine[];
  todayDoses: DoseLogEntry[];
  historyDoses: DoseLogEntry[];
  interactions: DetectedInteraction[];
  adherence: AdherenceStats;
  insight: Insight | null;

  addMedicine: (m: Omit<Medicine, 'id' | 'createdAt'>) => Promise<void>;
  addMedicines: (list: Array<Omit<Medicine, 'id' | 'createdAt'>>) => Promise<void>;
  removeMedicine: (id: string) => Promise<void>;
  markDose: (doseId: string, status: DoseStatus) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  eraseEverything: () => Promise<void>;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [todayDoses, setTodayDoses] = useState<DoseLogEntry[]>([]);
  const [historyDoses, setHistoryDoses] = useState<DoseLogEntry[]>([]);

  // Guards against two refreshes racing and writing stale state.
  const refreshToken = useRef(0);

  const refresh = useCallback(async () => {
    const token = ++refreshToken.current;

    const [loadedSettings, activeMeds] = await Promise.all([
      settingsRepo.load(),
      medicinesRepo.active(),
    ]);

    // Make sure today's scheduled doses exist in the log before reading it.
    const todayKey = toDateKey(new Date());
    for (const { medicine, time } of scheduledDosesFor(activeMeds, todayKey)) {
      await doseRepo.ensure(medicine.id, todayKey, time);
    }

    const since = new Date();
    since.setDate(since.getDate() - HISTORY_DAYS);
    const [today, history] = await Promise.all([
      doseRepo.forDate(todayKey),
      doseRepo.since(toDateKey(since)),
    ]);

    if (token !== refreshToken.current) return; // a newer refresh won

    setSettings(loadedSettings);
    setMedicines(activeMeds);
    setTodayDoses(today);
    setHistoryDoses(history);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh().catch(() => setReady(true)); // never leave the app stuck on a splash
  }, [refresh]);

  /* ----------------------------- derived ------------------------------- */

  const interactions = useMemo(() => checkInteractions(medicines), [medicines]);
  const adherence = useMemo(() => computeAdherence(historyDoses), [historyDoses]);
  const insight = useMemo(
    () => topInsight(medicines, historyDoses, interactions),
    [medicines, historyDoses, interactions],
  );

  /* ----------------------------- actions ------------------------------- */

  const syncReminders = useCallback(async () => {
    const active = await medicinesRepo.active();
    await rescheduleAll(active);
  }, []);

  const addMedicine = useCallback(
    async (m: Omit<Medicine, 'id' | 'createdAt'>) => {
      await medicinesRepo.insert(m);
      await refresh();
      await syncReminders();
    },
    [refresh, syncReminders],
  );

  const addMedicines = useCallback(
    async (list: Array<Omit<Medicine, 'id' | 'createdAt'>>) => {
      for (const m of list) await medicinesRepo.insert(m);
      await refresh();
      await syncReminders();
    },
    [refresh, syncReminders],
  );

  const removeMedicine = useCallback(
    async (id: string) => {
      await medicinesRepo.remove(id);
      await refresh();
      await syncReminders();
    },
    [refresh, syncReminders],
  );

  const markDose = useCallback(
    async (doseId: string, status: DoseStatus) => {
      await doseRepo.setStatus(doseId, status);
      await refresh();
    },
    [refresh],
  );

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      await settingsRepo.save(patch);
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const eraseEverything = useCallback(async () => {
    await resetDatabase();
    await rescheduleAll([]);
    await refresh();
  }, [refresh]);

  /* ------------------- caregiver watch (foreground) --------------------- */

  useEffect(() => {
    if (!ready || !settings.caregiverEnabled) return;

    let cancelled = false;
    const check = async () => {
      try {
        const now = new Date();
        const overdue = dosesNeedingCaregiverAlert(
          historyDoses,
          settings.caregiverThresholdHours,
          now,
        );
        if (overdue.length === 0) return;

        // Read the relay setup once per sweep rather than once per dose.
        const relay = await loadRelayConfig();

        for (const dose of overdue) {
          const med = medicines.find((m) => m.id === dose.medicineId);
          if (!med) continue;
          const outcome = await raiseCaregiverAlert(settings, med, dose, relay);
          if (outcome.delivered) await doseRepo.markCaregiverNotified(dose.id);
          if (cancelled) return;
        }
      } catch {
        // A failed alert must not take the app down.
      }
    };

    check();
    const timer = setInterval(check, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ready, settings, historyDoses, medicines]);

  /* ---------------- daily email digest (once a day, on open) ------------- */

  useEffect(() => {
    if (!ready || !settings.emailRemindersEnabled) return;
    if (settings.lastEmailDigestDate === dateKey(new Date())) return;

    let cancelled = false;
    (async () => {
      try {
        const relay = await loadRelayConfig();
        const outcome = await maybeSendDailyDigest(settings, medicines, todayDoses, relay);
        if (outcome.sent && !cancelled) {
          const today = dateKey(new Date());
          await settingsRepo.save({ lastEmailDigestDate: today });
          setSettings((prev) => ({ ...prev, lastEmailDigestDate: today }));
        }
      } catch {
        // A failed digest must never take the app down.
      }
    })();

    return () => {
      cancelled = true;
    };
    // Deliberately keyed on the flag and the marker rather than the whole
    // settings object, so this does not re-fire on every unrelated edit.
  }, [
    ready, settings.emailRemindersEnabled, settings.emailAddress,
    settings.lastEmailDigestDate, medicines, todayDoses,
  ]);

  const value: StoreValue = {
    ready, settings, medicines, todayDoses, historyDoses,
    interactions, adherence, insight,
    addMedicine, addMedicines, removeMedicine, markDose,
    updateSettings, eraseEverything, refresh,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside AppStoreProvider');
  return ctx;
}
