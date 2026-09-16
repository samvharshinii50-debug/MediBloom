import { answer, type AssistantContext } from '../src/engines/assistantEngine';
import { checkInteractions } from '../src/engines/interactionEngine';
import type { DoseLogEntry, DoseStatus, Medicine } from '../src/data/types';

const NOW = new Date(2026, 8, 16, 14, 30); // Wed 2026-09-16, 2:30pm
const TODAY = '2026-09-16';
const YESTERDAY = '2026-09-15';

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
    id: `${medicineId}-${date}-${time}`, medicineId, date,
    scheduledTime: time, status, actedAt: status === 'pending' ? null : `${date}T${time}:00.000Z`,
    caregiverNotified: false,
  };
}

const WARFARIN = med();
const IBUPROFEN = med({ id: 'm2', name: 'Ibuprofen', generic: 'ibuprofen', dosage: '400', times: ['09:00', '21:00'] });
const METFORMIN = med({ id: 'm3', name: 'Metformin', generic: 'metformin', dosage: '500', times: ['08:00', '20:00'] });

const MEDICINES = [WARFARIN, IBUPROFEN, METFORMIN];

const ENTRIES: DoseLogEntry[] = [
  dose('m1', TODAY, '09:00', 'taken'),
  dose('m2', TODAY, '09:00', 'taken'),
  dose('m2', TODAY, '21:00', 'pending'),
  dose('m3', TODAY, '08:00', 'taken'),
  dose('m3', TODAY, '20:00', 'pending'),
  dose('m1', YESTERDAY, '09:00', 'taken'),
  dose('m2', YESTERDAY, '09:00', 'missed'),
  dose('m2', YESTERDAY, '21:00', 'taken'),
  dose('m3', YESTERDAY, '08:00', 'taken'),
  dose('m3', YESTERDAY, '20:00', 'taken'),
];

function ctx(over: Partial<AssistantContext> = {}): AssistantContext {
  const medicines = over.medicines ?? MEDICINES;
  return {
    medicines,
    entries: over.entries ?? ENTRIES,
    interactions: over.interactions ?? checkInteractions(medicines),
    profileName: over.profileName ?? 'Ananya',
    now: over.now ?? NOW,
  };
}

const ask = (q: string, over: Partial<AssistantContext> = {}) => answer(q, ctx(over)).text;

describe('the fixture itself', () => {
  it('really does contain a severe pair, or the safety tests prove nothing', () => {
    const found = checkInteractions(MEDICINES);
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].rule.severity).toBe('severe');
  });
});

describe('"what did I have today" — the question that used to fail', () => {
  it('lists what was actually taken, with names and times', () => {
    const text = ask('what did i have today');
    expect(text).toMatch(/Today you've taken 3 of 5/);
    expect(text).toContain('Warfarin');
    expect(text).toContain('Metformin');
    expect(text).toContain('9:00 AM');
  });

  it('also reports what is still to come', () => {
    expect(ask('what did i have today')).toMatch(/Still to come/);
  });

  it('answers the same question phrased half a dozen other ways', () => {
    for (const q of [
      'what have i taken',
      'what did i take',
      'show me my doses today',
      'what medicine did i have',
      'how many did i take today',
      'my dose log',
    ]) {
      expect({ q, matched: /taken/i.test(ask(q)) }).toEqual({ q, matched: true });
    }
  });

  it('scopes to yesterday when asked', () => {
    const text = ask('what did i take yesterday');
    expect(text).toMatch(/^Yesterday/);
    expect(text).toMatch(/Marked missed/);
  });

  it('narrows to a part of the day', () => {
    const text = ask('what did i take yesterday evening');
    expect(text).toMatch(/Yesterday evening/);
    // The 09:00 miss is a morning dose, so it must not appear here.
    expect(text).not.toMatch(/Marked missed/);
  });

  it('answers a miss-framed question with the misses', () => {
    const text = ask('what did i miss yesterday');
    expect(text).toContain('Ibuprofen');
    expect(text).toMatch(/don't double up/i);
  });

  it('says so plainly when nothing was missed', () => {
    expect(ask('did i miss anything today')).toMatch(/didn't miss anything/);
  });
});

describe('what is still due', () => {
  it('lists the pending doses and flags overdue ones', () => {
    const text = ask("what's left");
    expect(text).toMatch(/You have 2 left today/);
    expect(text).toContain('Ibuprofen');
    expect(text).toContain('9:00 PM');
  });

  it('confirms a finished day', () => {
    const done = ENTRIES.filter((e) => e.date === TODAY).map((e) => ({ ...e, status: 'taken' as DoseStatus }));
    expect(ask("what's left", { entries: done })).toMatch(/is done/);
  });

  it('finds the next dose with a countdown', () => {
    const text = ask('when is my next dose');
    expect(text).toMatch(/Next up is Metformin/);
    expect(text).toMatch(/that's in 5h 30m/);
  });
});

describe('did I take a particular medicine', () => {
  it('says yes when it was taken', () => {
    expect(ask('did i take my warfarin today')).toMatch(/^Yes — Warfarin was taken at 9:00 AM/);
  });

  it('says no when it was missed', () => {
    const text = ask('did i take ibuprofen yesterday morning');
    expect(text).toMatch(/^No — Ibuprofen is marked missed/);
  });

  it('reports a partly-done medicine honestly', () => {
    expect(ask('did i take metformin today')).toMatch(/still unmarked for 8:00 PM/);
  });

  it('falls back to the whole day when no medicine is named', () => {
    expect(ask('did i take it today')).toMatch(/Today you've taken/);
  });

  it('handles a medicine that was not scheduled', () => {
    expect(ask('did i take aspirin today')).toMatch(/Today you've taken/);
  });
});

describe('the medicine list', () => {
  it('lists everything with doses and times', () => {
    const text = ask('what am i taking');
    expect(text).toMatch(/You're tracking 3/);
    expect(text).toContain('Warfarin 5 mg');
    expect(text).toContain('8:00 AM');
  });

  it('mentions how many pairs are flagged', () => {
    expect(ask('list my medicines')).toMatch(/needs? a look/);
  });

  it('points a new user at the add button', () => {
    expect(ask('what am i taking', { medicines: [], entries: [], interactions: [] }))
      .toMatch(/haven't added any medicines/);
  });

  it('gives the schedule for one medicine', () => {
    expect(ask('when do i take metformin')).toMatch(/Metformin 500 mg is set for 8:00 AM and 8:00 PM/);
  });
});

describe('adherence and streak', () => {
  it('reports the overall number', () => {
    expect(ask('how am i doing')).toMatch(/You've taken \d+ of \d+ doses — that's \d+%/);
  });

  it('scopes to a window when one is given', () => {
    expect(ask('how did i do yesterday')).toMatch(/yesterday/);
  });

  it('talks about the streak', () => {
    expect(ask("what's my streak")).toMatch(/streak/);
  });

  it('does not invent a number with no data', () => {
    expect(ask('how am i doing', { entries: [] })).toMatch(/nothing settled/);
  });
});

describe('safety', () => {
  it('names the severe pair on the list', () => {
    const text = ask('do any of mine interact');
    expect(text).toMatch(/severe combination/);
    expect(text).toContain('Warfarin');
  });

  it('checks a drug the user does not take against the ones they do', () => {
    const text = ask('can i take aspirin');
    expect(text).toMatch(/Careful/);
    expect(text).toContain('Warfarin');
  });

  it('returns the interaction object so the UI can draw swap chips', () => {
    const res = answer('do any of mine interact', ctx());
    expect(res.interaction).not.toBeNull();
  });

  it('explains severity words', () => {
    expect(ask('what does severe mean')).toMatch(/shouldn't normally be taken together/);
    expect(ask('what does mild mean')).toMatch(/most people are fine/);
  });

  it('refuses to guess at side effects', () => {
    const text = ask('what are the side effects of metformin');
    expect(text).toMatch(/don't hold a side-effect database/);
    expect(text).toMatch(/pharmacist/);
  });

  it('is honest that it has no food-timing rules', () => {
    expect(ask('should i take metformin with food')).toMatch(/don't carry food and timing rules/);
  });

  it('gives missed-dose advice without telling anyone to double up', () => {
    const text = ask('i forgot my dose what do i do');
    expect(text).toMatch(/Never double up/);
  });

  it('says there is nothing to act on when nothing is flagged', () => {
    expect(ask('what should i do about it', { medicines: [WARFARIN], interactions: [] }))
      .toMatch(/nothing flagged/);
  });
});

describe('social and meta', () => {
  it('greets by name and gives the day at a glance', () => {
    const text = ask('hello');
    expect(text).toContain('Ananya');
    expect(text).toMatch(/2 doses still to mark/);
  });

  it('explains what it can do', () => {
    expect(ask('what can you do')).toMatch(/what did i have today/i);
  });

  it('is straight about where the data goes', () => {
    const text = ask('do you send my data anywhere');
    expect(text).toMatch(/nowhere else/);
    expect(text).toMatch(/airplane mode/);
  });

  it('answers thanks without a wall of text', () => {
    expect(ask('thanks').length).toBeLessThan(120);
  });

  it('explains how caregiver alerts work', () => {
    expect(ask('how do caregiver alerts work')).toMatch(/unmarked past the limit/);
  });

  it('explains how to upload a prescription', () => {
    expect(ask('how do i upload a prescription')).toMatch(/Upload a prescription/);
  });
});

describe('the fallback', () => {
  it('admits it does not know rather than inventing an answer', () => {
    const text = ask('banana helicopter');
    expect(text).toMatch(/couldn't work that one out/);
    expect(text).toMatch(/pharmacist/);
  });

  it('treats a bare date as a request for that day, which is the useful reading', () => {
    // "tuesday" on its own is not gibberish — showing that day's log beats a shrug.
    expect(ask('tuesday')).toMatch(/^Tuesday you've taken/);
    expect(ask('yesterday')).toMatch(/^Yesterday/);
  });

  it('still answers about a medicine it recognises in an odd sentence', () => {
    expect(ask('metformin')).toContain('Metformin');
  });

  it('prompts when asked nothing at all', () => {
    expect(ask('')).toMatch(/Ask me anything/);
  });
});

describe('which questions the cloud is worth asking about', () => {
  const exactness = (q: string) => answer(q, ctx()).exact;

  it('answers data lookups itself, instantly, without consulting a model', () => {
    for (const q of [
      'what did i have today',
      "what's left",
      'when is my next dose',
      'did i take warfarin',
      'what am i taking',
      'how am i doing',
      "what's my streak",
      'what time do i take metformin',
    ]) {
      expect({ q, exact: exactness(q) }).toEqual({ q, exact: true });
    }
  });

  it('leaves the open-ended and the clinical open to cloud assist', () => {
    for (const q of [
      'my knee is hurting can i take something',
      'what are the side effects',
      'should i take this with food',
      'banana helicopter',
      'is it safe to travel with these',
    ]) {
      expect({ q, exact: exactness(q) }).toEqual({ q, exact: false });
    }
  });
});

describe('robustness', () => {
  const QUESTIONS = [
    '', ' ', 'hi', 'hello there', 'what did i have today', "what's left", 'whats left',
    'when is my next dose', 'did i take warfarin', 'what am i taking', 'how am i doing',
    "what's my streak", 'do any of mine interact', 'can i take ibuprofen',
    'what does severe mean', 'what should i do', 'i missed a dose', 'side effects',
    'with food?', 'how do i add a medicine', 'thanks', 'privacy', 'asdkjhasd',
    '???', '12345', 'metformin metformin metformin', 'take take take take',
    'what did i take on monday', 'how was last week', 'what did i miss last week',
    'yesterday evening', 'this morning', '3 days ago', 'tomorrow',
  ];

  it('always returns usable text and follow-ups, and never throws', () => {
    for (const q of QUESTIONS) {
      const res = answer(q, ctx());
      expect({ q, ok: typeof res.text === 'string' && res.text.length > 10 })
        .toEqual({ q, ok: true });
      expect({ q, chips: res.followUps.length > 0 }).toEqual({ q, chips: true });
      expect({ q, source: res.source }).toEqual({ q, source: 'device' });
    }
  });

  it('survives an empty database for every question', () => {
    const bare = ctx({ medicines: [], entries: [], interactions: [] });
    for (const q of QUESTIONS) {
      const res = answer(q, bare);
      expect({ q, ok: res.text.length > 10 }).toEqual({ q, ok: true });
    }
  });

  it('never produces a dangling undefined or NaN in its prose', () => {
    for (const q of QUESTIONS) {
      const text = answer(q, ctx()).text;
      expect({ q, clean: !/undefined|NaN|\[object/.test(text) }).toEqual({ q, clean: true });
    }
  });
});
