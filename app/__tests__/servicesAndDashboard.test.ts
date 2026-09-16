import {
  EMPTY_RELAY, isRelayConfigured, loadRelayConfig, saveRelayConfig,
  type EmailRelayConfig,
} from '../src/services/emailRelay';
import { extractJsonArray, buildContextBlock } from '../src/services/ai';
import { mergeAiSuggestions, needsConfirmation, CONFIDENCE_THRESHOLD } from '../src/engines/prescriptionParser';
import { buildDigest, maybeSendDailyDigest } from '../src/services/emailDigest';
import { DEFAULT_SETTINGS } from '../src/db/repositories';
import { dayDetail, weekComparison } from '../src/engines/insightEngine';
import { describeDate, friendlyDate, formatClock } from '../src/engines/scheduleEngine';
import { checkInteractions } from '../src/engines/interactionEngine';
import type { DoseLogEntry, DoseStatus, Medicine, ParsedMedicine } from '../src/data/types';

function med(over: Partial<Medicine> = {}): Medicine {
  return {
    id: 'm1', name: 'Warfarin', generic: 'warfarin', dosage: '5', unit: 'mg',
    times: ['09:00'], startDate: '2026-01-01', endDate: null, colorTag: '#E85D8A',
    notes: null, active: true, createdAt: '2026-01-01T00:00:00.000Z', ...over,
  };
}

function dose(
  medicineId: string, date: string, time: string, status: DoseStatus,
): DoseLogEntry {
  return {
    id: `${medicineId}-${date}-${time}`, medicineId, date, scheduledTime: time,
    status, actedAt: null, caregiverNotified: false,
  };
}

/* ------------------------------ email relay ------------------------------- */

describe('isRelayConfigured', () => {
  it('is false when off', () => {
    expect(isRelayConfigured(EMPTY_RELAY)).toBe(false);
  });

  it('requires an https webhook url', () => {
    const base: EmailRelayConfig = { ...EMPTY_RELAY, mode: 'webhook' };
    expect(isRelayConfigured({ ...base, webhookUrl: '' })).toBe(false);
    expect(isRelayConfigured({ ...base, webhookUrl: 'not a url' })).toBe(false);
    expect(isRelayConfigured({ ...base, webhookUrl: 'http://insecure.example' })).toBe(false);
    expect(isRelayConfigured({ ...base, webhookUrl: 'https://script.google.com/macros/s/abc/exec' })).toBe(true);
  });

  it('requires the three mandatory EmailJS fields', () => {
    const base: EmailRelayConfig = { ...EMPTY_RELAY, mode: 'emailjs' };
    expect(isRelayConfigured({ ...base, emailjsServiceId: 'a' })).toBe(false);
    expect(isRelayConfigured({
      ...base, emailjsServiceId: 'a', emailjsTemplateId: 'b', emailjsPublicKey: 'c',
    })).toBe(true);
  });

  it('ignores whitespace-only values', () => {
    expect(isRelayConfigured({ ...EMPTY_RELAY, mode: 'webhook', webhookUrl: '   ' })).toBe(false);
  });
});

describe('relay config persistence', () => {
  it('round-trips through the keystore', async () => {
    const cfg: EmailRelayConfig = {
      ...EMPTY_RELAY, mode: 'webhook', webhookUrl: 'https://example.com/send',
    };
    expect(await saveRelayConfig(cfg)).toBe(true);
    expect(await loadRelayConfig()).toEqual(cfg);
  });

  it('returns a safe default when nothing is stored', async () => {
    await saveRelayConfig(EMPTY_RELAY);
    const loaded = await loadRelayConfig();
    expect(loaded.mode).toBe('off');
  });
});

/* --------------------------------- ai ------------------------------------- */

describe('extractJsonArray', () => {
  it('parses a bare array', () => {
    expect(extractJsonArray('[{"name":"Metformin"}]')).toEqual([{ name: 'Metformin' }]);
  });

  it('strips code fences, which models add whether you ask or not', () => {
    expect(extractJsonArray('```json\n[{"name":"Aspirin"}]\n```')).toEqual([{ name: 'Aspirin' }]);
  });

  it('pulls the array out of surrounding chatter', () => {
    expect(extractJsonArray('Sure! Here you go:\n[1,2,3]\nHope that helps.')).toEqual([1, 2, 3]);
  });

  it('returns null rather than throwing on rubbish', () => {
    expect(extractJsonArray('no json here')).toBeNull();
    expect(extractJsonArray('[unclosed')).toBeNull();
    expect(extractJsonArray('{"not":"an array"}')).toBeNull();
    expect(extractJsonArray('')).toBeNull();
  });
});

describe('buildContextBlock', () => {
  const NOW = new Date(2026, 8, 16, 14, 30);
  const meds = [med(), med({ id: 'm2', name: 'Ibuprofen', generic: 'ibuprofen', dosage: '400' })];
  const snap = {
    medicines: meds,
    entries: [dose('m1', '2026-09-16', '09:00', 'taken')],
    interactions: checkInteractions(meds),
    profileName: 'Ananya',
    now: NOW,
  };

  it('states the date so the model does not guess at "today"', () => {
    expect(buildContextBlock(snap)).toContain('Today is 2026-09-16');
  });

  it('includes the medicines, the log and the flagged pairs', () => {
    const block = buildContextBlock(snap);
    expect(block).toContain('Warfarin');
    expect(block).toContain('9:00 AM: taken');
    expect(block).toMatch(/severe/);
  });

  it('is honest about an empty database', () => {
    const block = buildContextBlock({ ...snap, medicines: [], entries: [], interactions: [] });
    expect(block).toContain('none added yet');
    expect(block).toContain('nothing scheduled today');
  });
});

/* --------------------------- ai prescription merge ------------------------ */

function parsed(over: Partial<ParsedMedicine> = {}): ParsedMedicine {
  return {
    rawText: 'Tab Metformin 500mg', name: 'Metformin', generic: 'metformin',
    dosage: '500', unit: 'mg', frequencyLabel: 'Once daily', times: ['09:00'],
    confidence: 0.9, suggestions: [], ...over,
  };
}

describe('mergeAiSuggestions', () => {
  it('leaves a confident local read completely alone', () => {
    const local = [parsed()];
    expect(mergeAiSuggestions(local, [{ name: 'Metformin', dosage: '850' }])).toEqual(local);
  });

  it('fills in a generic the local parser could not resolve', () => {
    const local = [parsed({ name: 'Metfornin', generic: null, confidence: 0.35, suggestions: [] })];
    const out = mergeAiSuggestions(local, [{ name: 'Metformin' }]);
    expect(out).toHaveLength(1);
    expect(out[0].generic).toBe('metformin');
    expect(out[0].name).toBe('Metformin');
  });

  it('keeps an AI-assisted read under the confirm threshold', () => {
    const local = [parsed({ name: 'Metfornin', generic: null, confidence: 0.35 })];
    const out = mergeAiSuggestions(local, [{ name: 'Metformin' }]);
    expect(out[0].confidence).toBeLessThan(CONFIDENCE_THRESHOLD);
    expect(needsConfirmation(out[0])).toBe(true);
  });

  it('adds a medicine the local parser missed entirely', () => {
    const out = mergeAiSuggestions([], [
      { name: 'Aspirin', dosage: '75', unit: 'mg', frequency: 'Once daily' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].generic).toBe('aspirin');
    expect(out[0].dosage).toBe('75');
    expect(out[0].rawText).toMatch(/cloud assist/);
  });

  it('refuses to invent a medicine the bundled reference has never heard of', () => {
    expect(mergeAiSuggestions([], [{ name: 'Fictionalozide' }])).toHaveLength(0);
  });

  it('does not duplicate a medicine already found locally', () => {
    const out = mergeAiSuggestions([parsed()], [{ name: 'Metformin' }]);
    expect(out).toHaveLength(1);
  });

  it('throws nothing at malformed model output', () => {
    const junk = [null, undefined, 42, 'string', {}, { name: 5 }, { name: '' }, { name: 'a' }];
    expect(() => mergeAiSuggestions([parsed()], junk)).not.toThrow();
    expect(mergeAiSuggestions([parsed()], junk)).toHaveLength(1);
  });

  it('falls back to sane defaults for a bad unit or frequency', () => {
    const out = mergeAiSuggestions([], [
      { name: 'Aspirin', dosage: '75mg', unit: 'buckets', frequency: 'whenever' },
    ]);
    expect(out[0].unit).toBe('mg');
    expect(out[0].dosage).toBe('75');
    expect(out[0].frequencyLabel).toBe('Once daily');
  });
});

/* ------------------------------- dashboard -------------------------------- */

describe('dayDetail', () => {
  const meds = [med(), med({ id: 'm2', name: 'Metformin', generic: 'metformin', colorTag: '#8FD4B8' })];
  const entries = [
    dose('m1', '2026-09-16', '09:00', 'taken'),
    dose('m2', '2026-09-16', '08:00', 'missed'),
    dose('m2', '2026-09-15', '08:00', 'taken'),
  ];

  it('returns that day only, in time order', () => {
    const out = dayDetail(entries, meds, '2026-09-16');
    expect(out.map((d) => d.time)).toEqual(['08:00', '09:00']);
    expect(out[0].medicineName).toBe('Metformin');
    expect(out[0].status).toBe('missed');
  });

  it('carries the colour tag through for the dot', () => {
    expect(dayDetail(entries, meds, '2026-09-16')[0].colorTag).toBe('#8FD4B8');
  });

  it('does not crash on a dose whose medicine was deleted', () => {
    const out = dayDetail([dose('gone', '2026-09-16', '09:00', 'taken')], meds, '2026-09-16');
    expect(out[0].medicineName).toBe('Removed medicine');
  });

  it('returns an empty list for a day with nothing on it', () => {
    expect(dayDetail(entries, meds, '2026-01-01')).toEqual([]);
  });
});

describe('weekComparison', () => {
  const TODAY = new Date(2026, 8, 16);

  it('reports this week against last week', () => {
    const entries = [
      // this week: 2 of 2
      dose('m1', '2026-09-15', '09:00', 'taken'),
      dose('m1', '2026-09-16', '09:00', 'taken'),
      // last week: 1 of 2
      dose('m1', '2026-09-08', '09:00', 'taken'),
      dose('m1', '2026-09-09', '09:00', 'missed'),
    ];
    const out = weekComparison(entries, TODAY);
    expect(out.thisWeek).toBe(100);
    expect(out.lastWeek).toBe(50);
    expect(out.delta).toBe(50);
  });

  it('returns a null delta when there is no last week to compare with', () => {
    const out = weekComparison([dose('m1', '2026-09-16', '09:00', 'taken')], TODAY);
    expect(out.lastWeek).toBeNull();
    expect(out.delta).toBeNull();
  });

  it('ignores pending doses, which are not failures yet', () => {
    const out = weekComparison([
      dose('m1', '2026-09-16', '09:00', 'taken'),
      dose('m1', '2026-09-16', '21:00', 'pending'),
    ], TODAY);
    expect(out.thisWeek).toBe(100);
  });

  it('handles an empty log', () => {
    expect(weekComparison([], TODAY)).toEqual({ thisWeek: 0, lastWeek: null, delta: null });
  });
});

/* ------------------------------ email digest ------------------------------ */

describe('buildDigest', () => {
  const NOW = new Date(2026, 8, 16, 7, 0);
  const meds = [med({ id: 'm1', name: 'Warfarin' }), med({ id: 'm2', name: 'Metformin', dosage: '500' })];
  const settings = { ...DEFAULT_SETTINGS, profileName: 'Ananya', emailAddress: 'a@example.com' };

  it('lists the day with a checkbox per dose', () => {
    const d = buildDigest(settings, meds, [
      dose('m1', '2026-09-16', '09:00', 'pending'),
      dose('m2', '2026-09-16', '08:00', 'taken'),
    ], NOW);
    expect(d).not.toBeNull();
    expect(d!.body).toContain('Hi Ananya,');
    expect(d!.body).toContain('[x] 8:00 AM  Metformin');
    expect(d!.body).toContain('[ ] 9:00 AM  Warfarin');
  });

  it('orders the day by time', () => {
    const d = buildDigest(settings, meds, [
      dose('m1', '2026-09-16', '21:00', 'pending'),
      dose('m2', '2026-09-16', '08:00', 'pending'),
    ], NOW)!;
    expect(d.body.indexOf('8:00 AM')).toBeLessThan(d.body.indexOf('9:00 PM'));
  });

  it("flags yesterday's misses", () => {
    const d = buildDigest(settings, meds, [
      dose('m1', '2026-09-16', '09:00', 'pending'),
      dose('m2', '2026-09-15', '08:00', 'missed'),
    ], NOW)!;
    expect(d.body).toContain('Still unmarked from yesterday');
    expect(d.body).toContain('Metformin at 8:00 AM');
  });

  it('always carries the not-medical-advice line', () => {
    const d = buildDigest(settings, meds, [dose('m1', '2026-09-16', '09:00', 'pending')], NOW)!;
    expect(d.body).toMatch(/not medical advice/);
  });

  it('sends nothing when there is nothing to say', () => {
    expect(buildDigest(settings, meds, [], NOW)).toBeNull();
  });

  it('falls back to a neutral greeting with no name', () => {
    const d = buildDigest(
      { ...settings, profileName: '' }, meds,
      [dose('m1', '2026-09-16', '09:00', 'pending')], NOW,
    )!;
    expect(d.body).toContain('Hi there,');
  });
});

describe('maybeSendDailyDigest', () => {
  const NOW = new Date(2026, 8, 16, 7, 0);
  const meds = [med()];
  const entries = [dose('m1', '2026-09-16', '09:00', 'pending')];
  const relay: EmailRelayConfig = {
    ...EMPTY_RELAY, mode: 'webhook', webhookUrl: 'https://example.com/send',
  };
  const on = { ...DEFAULT_SETTINGS, emailRemindersEnabled: true, emailAddress: 'a@example.com' };

  it('skips when email reminders are off', async () => {
    const out = await maybeSendDailyDigest(DEFAULT_SETTINGS, meds, entries, relay, NOW);
    expect(out).toEqual({ sent: false, reason: 'Email reminders are off.' });
  });

  it('skips without an address', async () => {
    const out = await maybeSendDailyDigest({ ...on, emailAddress: '  ' }, meds, entries, relay, NOW);
    expect(out.sent).toBe(false);
    expect(out.reason).toMatch(/No email address/);
  });

  it('skips when no relay is set up, rather than pretending it sent', async () => {
    const out = await maybeSendDailyDigest(on, meds, entries, EMPTY_RELAY, NOW);
    expect(out.sent).toBe(false);
    expect(out.reason).toMatch(/not set up/);
  });

  it('sends at most once a day', async () => {
    const out = await maybeSendDailyDigest(
      { ...on, lastEmailDigestDate: '2026-09-16' }, meds, entries, relay, NOW,
    );
    expect(out.sent).toBe(false);
    expect(out.reason).toMatch(/already went out/);
  });

  it('skips a day with nothing on it', async () => {
    const out = await maybeSendDailyDigest(on, meds, [], relay, NOW);
    expect(out.sent).toBe(false);
    expect(out.reason).toMatch(/Nothing worth emailing/);
  });
});

describe('date formatting for the dashboard', () => {
  it('describes a date key', () => {
    expect(describeDate('2026-09-16')).toEqual({ weekday: 'Wed', day: 16, month: 'Sep' });
    expect(describeDate('2026-01-01').weekday).toBe('Thu');
  });

  it('names today and yesterday rather than printing a date', () => {
    const today = new Date(2026, 8, 16);
    expect(friendlyDate('2026-09-16', today)).toBe('Today');
    expect(friendlyDate('2026-09-15', today)).toBe('Yesterday');
    expect(friendlyDate('2026-09-10', today)).toBe('Thu 10 Sep');
  });

  it('formats clock times in 12 hours', () => {
    expect(formatClock('00:00')).toBe('12:00 AM');
    expect(formatClock('09:05')).toBe('9:05 AM');
    expect(formatClock('12:00')).toBe('12:00 PM');
    expect(formatClock('21:30')).toBe('9:30 PM');
  });
});
