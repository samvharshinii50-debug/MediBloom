import {
  toDateKey, toTimeKey, combine, isActiveOn, scheduledDosesFor,
  doseUiState, relativeLabel, nextDose, parseTimeKey,
} from '../src/engines/scheduleEngine';
import {
  computeAdherence, computeStreak, weakestTimeOfDay, adherenceByMedicine,
  generateInsights, topInsight, dailyBreakdown,
} from '../src/engines/insightEngine';
import { dosesNeedingCaregiverAlert, buildAlertBody, buildAlertSubject } from '../src/services/caregiver';
import type { DoseLogEntry, Medicine, DoseStatus } from '../src/data/types';

function med(over: Partial<Medicine> = {}): Medicine {
  return {
    id: 'm1', name: 'Warfarin', generic: 'warfarin', dosage: '5', unit: 'mg',
    times: ['09:00'], startDate: '2026-01-01', endDate: null, colorTag: '#E85D8A',
    notes: null, active: true, createdAt: '2026-01-01T00:00:00.000Z', ...over,
  };
}

function dose(over: Partial<DoseLogEntry> = {}): DoseLogEntry {
  return {
    id: `d-${Math.random()}`, medicineId: 'm1', date: '2026-03-04',
    scheduledTime: '09:00', status: 'pending', actedAt: null,
    caregiverNotified: false, ...over,
  };
}

describe('date and time keys', () => {
  it('formats a local date without drifting into UTC', () => {
    expect(toDateKey(new Date(2026, 2, 4))).toBe('2026-03-04');
    expect(toDateKey(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('formats times zero-padded', () => {
    expect(toTimeKey(new Date(2026, 2, 4, 9, 5))).toBe('09:05');
    expect(toTimeKey(new Date(2026, 2, 4, 21, 0))).toBe('21:00');
  });

  it('round-trips through combine', () => {
    const d = combine('2026-03-04', '21:30');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(4);
    expect(d.getHours()).toBe(21);
    expect(d.getMinutes()).toBe(30);
  });

  it('parses time keys', () => {
    expect(parseTimeKey('08:45')).toEqual({ hours: 8, minutes: 45 });
  });
});

describe('isActiveOn', () => {
  it('respects the start date', () => {
    const m = med({ startDate: '2026-03-04' });
    expect(isActiveOn(m, '2026-03-03')).toBe(false);
    expect(isActiveOn(m, '2026-03-04')).toBe(true);
  });

  it('respects the end date', () => {
    const m = med({ startDate: '2026-01-01', endDate: '2026-03-04' });
    expect(isActiveOn(m, '2026-03-04')).toBe(true);
    expect(isActiveOn(m, '2026-03-05')).toBe(false);
  });

  it('ignores inactive medicines', () => {
    expect(isActiveOn(med({ active: false }), '2026-03-04')).toBe(false);
  });
});

describe('scheduledDosesFor', () => {
  it('expands each time of day', () => {
    const m = med({ times: ['08:00', '20:00'] });
    expect(scheduledDosesFor([m], '2026-03-04')).toHaveLength(2);
  });

  it('returns them in time order', () => {
    const m = med({ times: ['20:00', '08:00'] });
    const out = scheduledDosesFor([m], '2026-03-04');
    expect(out[0].time).toBe('08:00');
  });

  it('skips as-needed medicines with no times', () => {
    expect(scheduledDosesFor([med({ times: [] })], '2026-03-04')).toHaveLength(0);
  });
});

describe('doseUiState', () => {
  const at = (h: number, m = 0) => new Date(2026, 2, 4, h, m);

  it('is upcoming before the scheduled time', () => {
    expect(doseUiState(dose(), at(8))).toBe('upcoming');
  });

  it('is due inside the grace window', () => {
    expect(doseUiState(dose(), at(9, 30))).toBe('due');
  });

  it('becomes missed after the grace window', () => {
    expect(doseUiState(dose(), at(11))).toBe('missed');
  });

  it('honours an explicit status', () => {
    expect(doseUiState(dose({ status: 'taken' }), at(23))).toBe('taken');
    expect(doseUiState(dose({ status: 'skipped' }), at(23))).toBe('skipped');
  });
});

describe('relativeLabel', () => {
  it('counts forward and back', () => {
    expect(relativeLabel(dose(), new Date(2026, 2, 4, 7, 0))).toBe('in 2h');
    expect(relativeLabel(dose(), new Date(2026, 2, 4, 11, 0))).toBe('2h ago');
    expect(relativeLabel(dose(), new Date(2026, 2, 4, 9, 0))).toBe('due now');
  });
});

describe('nextDose', () => {
  it('picks the soonest pending dose still ahead', () => {
    const entries = [
      dose({ id: 'a', scheduledTime: '08:00' }),
      dose({ id: 'b', scheduledTime: '13:00' }),
      dose({ id: 'c', scheduledTime: '21:00' }),
    ];
    expect(nextDose(entries, new Date(2026, 2, 4, 10))?.id).toBe('b');
  });

  it('returns null once the day is done', () => {
    expect(nextDose([dose({ scheduledTime: '08:00' })], new Date(2026, 2, 4, 23))).toBeNull();
  });

  it('ignores doses already acted on', () => {
    const entries = [dose({ id: 'a', scheduledTime: '13:00', status: 'taken' })];
    expect(nextDose(entries, new Date(2026, 2, 4, 10))).toBeNull();
  });
});

describe('computeAdherence', () => {
  it('reports 100% when nothing has been settled yet', () => {
    expect(computeAdherence([]).ratePercent).toBe(100);
  });

  it('excludes still-pending doses from the rate', () => {
    const entries = [
      dose({ status: 'taken' }), dose({ status: 'taken' }),
      dose({ status: 'missed' }), dose({ status: 'pending' }),
    ];
    const s = computeAdherence(entries);
    expect(s.taken).toBe(2);
    expect(s.missed).toBe(1);
    expect(s.pending).toBe(1);
    // 2 taken of 3 settled
    expect(s.ratePercent).toBe(67);
  });
});

describe('computeStreak', () => {
  const today = new Date(2026, 2, 4);

  it('is zero with no history', () => {
    expect(computeStreak([], today)).toBe(0);
  });

  it('counts consecutive clean days', () => {
    const entries = [
      dose({ date: '2026-03-04', status: 'taken' }),
      dose({ date: '2026-03-03', status: 'taken' }),
      dose({ date: '2026-03-02', status: 'taken' }),
    ];
    expect(computeStreak(entries, today)).toBe(3);
  });

  it('breaks on a missed day', () => {
    const entries = [
      dose({ date: '2026-03-04', status: 'taken' }),
      dose({ date: '2026-03-03', status: 'missed' }),
      dose({ date: '2026-03-02', status: 'taken' }),
    ];
    expect(computeStreak(entries, today)).toBe(1);
  });
});

describe('weakestTimeOfDay', () => {
  it('stays silent without enough data', () => {
    expect(weakestTimeOfDay([dose({ status: 'missed', scheduledTime: '21:00' })])).toBeNull();
  });

  it('spots a genuine evening pattern', () => {
    const entries: DoseLogEntry[] = [];
    for (let i = 0; i < 5; i++) entries.push(dose({ scheduledTime: '21:00', status: 'missed' }));
    for (let i = 0; i < 5; i++) entries.push(dose({ scheduledTime: '08:00', status: 'taken' }));
    expect(weakestTimeOfDay(entries)?.bucket).toBe('evening');
  });

  it('reports nothing when everything is taken', () => {
    const entries: DoseLogEntry[] = [];
    for (let i = 0; i < 6; i++) entries.push(dose({ status: 'taken' }));
    expect(weakestTimeOfDay(entries)).toBeNull();
  });
});

describe('adherenceByMedicine', () => {
  it('ranks the worst first', () => {
    const meds = [med({ id: 'good' }), med({ id: 'bad' })];
    const entries = [
      dose({ medicineId: 'good', status: 'taken' }),
      dose({ medicineId: 'good', status: 'taken' }),
      dose({ medicineId: 'bad', status: 'missed' }),
      dose({ medicineId: 'bad', status: 'taken' }),
    ];
    expect(adherenceByMedicine(meds, entries)[0].medicine.id).toBe('bad');
  });
});

describe('generateInsights', () => {
  it('says nothing rather than inventing filler', () => {
    expect(generateInsights([], [], [])).toEqual([]);
    expect(topInsight([], [], [])).toBeNull();
  });

  it('leads with a severe interaction when one exists', () => {
    const a = med({ id: 'w', name: 'Warfarin', generic: 'warfarin' });
    const b = med({ id: 'i', name: 'Ibuprofen', generic: 'ibuprofen' });
    const interactions = [{
      rule: {
        a: 'warfarin', b: 'ibuprofen', severity: 'severe' as const,
        explanation: 'x', guidance: 'y',
      },
      medicineA: a, medicineB: b,
    }];
    const top = topInsight([a, b], [], interactions);
    expect(top?.id).toBe('severe-interaction');
  });

  it('never returns an insight with empty text', () => {
    const entries: DoseLogEntry[] = [];
    for (let i = 0; i < 8; i++) entries.push(dose({ status: 'taken' }));
    for (const ins of generateInsights([med()], entries, [])) {
      expect(ins.text.trim().length).toBeGreaterThan(5);
    }
  });
});

describe('dailyBreakdown', () => {
  it('returns one entry per requested day, oldest first', () => {
    const out = dailyBreakdown([], 7, new Date(2026, 2, 4));
    expect(out).toHaveLength(7);
    expect(out[0].date).toBe('2026-02-26');
    expect(out[6].date).toBe('2026-03-04');
  });
});

describe('caregiver alert detection', () => {
  const now = new Date(2026, 2, 4, 12, 0);

  it('ignores doses that are not overdue enough', () => {
    const entries = [dose({ scheduledTime: '11:00' })]; // 1h ago
    expect(dosesNeedingCaregiverAlert(entries, 2, now)).toHaveLength(0);
  });

  it('flags a dose past the threshold', () => {
    const entries = [dose({ scheduledTime: '09:00' })]; // 3h ago
    expect(dosesNeedingCaregiverAlert(entries, 2, now)).toHaveLength(1);
  });

  it('never alerts twice for the same dose', () => {
    const entries = [dose({ scheduledTime: '09:00', caregiverNotified: true })];
    expect(dosesNeedingCaregiverAlert(entries, 2, now)).toHaveLength(0);
  });

  it('ignores doses already taken or skipped', () => {
    const statuses: DoseStatus[] = ['taken', 'skipped', 'missed'];
    for (const status of statuses) {
      const entries = [dose({ scheduledTime: '09:00', status })];
      expect(dosesNeedingCaregiverAlert(entries, 2, now)).toHaveLength(0);
    }
  });

  it('writes an alert that names the medicine and stays non-clinical', () => {
    const subject = buildAlertSubject('Ananya', med());
    const body = buildAlertBody('Ananya', 'Rohan', med(), dose(), 2);
    expect(subject).toContain('Warfarin');
    expect(body).toContain('Rohan');
    expect(body).toContain('Warfarin');
    expect(body.toLowerCase()).toContain('not medical advice');
  });
});
