import {
  normalise, tokens, parseTimeframe, withinTimeframe, partOfDayOf,
  classify, asksAboutMisses,
} from '../src/engines/nlu';

/** A fixed Wednesday, so weekday arithmetic is deterministic. */
const WED = new Date(2026, 8, 16, 14, 30); // 2026-09-16 is a Wednesday

describe('normalise', () => {
  it('expands the contractions people actually type', () => {
    expect(normalise("what's left")).toBe('what is left');
    expect(normalise("I've taken it")).toBe('i have taken it');
    expect(normalise("didn't take")).toBe('did not take');
  });

  it('folds the synonyms for medicine into one word', () => {
    expect(normalise('my meds')).toBe('my medicine');
    expect(normalise('my pills')).toBe('my medicine');
    expect(normalise('my medications')).toBe('my medicine');
  });

  it('strips punctuation and collapses whitespace', () => {
    expect(normalise('  What   did I take??!  ')).toBe('what did i take');
  });

  it('survives an empty string', () => {
    expect(normalise('')).toBe('');
    expect(tokens('')).toEqual([]);
  });
});

describe('parseTimeframe', () => {
  it('defaults to today but says it assumed so', () => {
    const tf = parseTimeframe('what did i take', WED);
    expect(tf.from).toBe('2026-09-16');
    expect(tf.to).toBe('2026-09-16');
    expect(tf.explicit).toBe(false);
  });

  it('recognises today explicitly', () => {
    const tf = parseTimeframe('what did i have today', WED);
    expect(tf.explicit).toBe(true);
    expect(tf.label).toBe('today');
  });

  it('recognises yesterday', () => {
    const tf = parseTimeframe('did i take it yesterday', WED);
    expect(tf.from).toBe('2026-09-15');
    expect(tf.to).toBe('2026-09-15');
  });

  it('treats last night as yesterday evening', () => {
    const tf = parseTimeframe('did i take my pill last night', WED);
    expect(tf.from).toBe('2026-09-15');
    expect(tf.partOfDay).toBe('evening');
  });

  it('handles "N days ago"', () => {
    expect(parseTimeframe('3 days ago', WED).from).toBe('2026-09-13');
    expect(parseTimeframe('1 days ago', WED).label).toBe('yesterday');
  });

  it('runs this week from Monday to today', () => {
    const tf = parseTimeframe('how was this week', WED);
    expect(tf.from).toBe('2026-09-14'); // the Monday
    expect(tf.to).toBe('2026-09-16');
  });

  it('runs last week as the previous Monday to Sunday', () => {
    const tf = parseTimeframe('how was last week', WED);
    expect(tf.from).toBe('2026-09-07');
    expect(tf.to).toBe('2026-09-13');
  });

  it('handles rolling windows', () => {
    expect(parseTimeframe('last 7 days', WED).from).toBe('2026-09-10');
    expect(parseTimeframe('last 30 days', WED).from).toBe('2026-08-18');
    expect(parseTimeframe('last two weeks', WED).from).toBe('2026-09-03');
  });

  it('resolves a named weekday to the most recent one', () => {
    // Monday of the current week, two days before Wednesday.
    expect(parseTimeframe('what about monday', WED).from).toBe('2026-09-14');
    // Friday has not happened yet this week, so it means last Friday.
    expect(parseTimeframe('what about friday', WED).from).toBe('2026-09-11');
  });

  it('picks up part of day', () => {
    expect(parseTimeframe('this morning', WED).partOfDay).toBe('morning');
    expect(parseTimeframe('this evening', WED).partOfDay).toBe('evening');
    expect(parseTimeframe('tonight', WED).partOfDay).toBe('evening');
    expect(parseTimeframe('what did i take', WED).partOfDay).toBeUndefined();
  });
});

describe('withinTimeframe', () => {
  it('is inclusive at both ends', () => {
    const tf = parseTimeframe('this week', WED);
    expect(withinTimeframe('2026-09-14', tf)).toBe(true);
    expect(withinTimeframe('2026-09-16', tf)).toBe(true);
    expect(withinTimeframe('2026-09-13', tf)).toBe(false);
    expect(withinTimeframe('2026-09-17', tf)).toBe(false);
  });
});

describe('partOfDayOf', () => {
  it('splits the day into three', () => {
    expect(partOfDayOf('08:00')).toBe('morning');
    expect(partOfDayOf('13:00')).toBe('afternoon');
    expect(partOfDayOf('21:00')).toBe('evening');
    expect(partOfDayOf('11:59')).toBe('morning');
    expect(partOfDayOf('17:00')).toBe('evening');
  });
});

describe('classify', () => {
  const expectIntent = (text: string, intent: string) => {
    expect({ text, intent: classify(text).intent }).toEqual({ text, intent });
  };

  it('routes dose-log questions', () => {
    expectIntent('what did i have today', 'dosesTaken');
    expectIntent('what have i taken', 'dosesTaken');
    expectIntent("what's my dose history", 'dosesTaken');
    expectIntent('how many did i take', 'dosesTaken');
  });

  it('routes what-is-left questions', () => {
    expectIntent("what's left", 'dosesPending');
    expectIntent('anything left today', 'dosesPending');
    expectIntent('am i done for the day', 'dosesPending');
  });

  it('routes the next dose', () => {
    expectIntent('when is my next dose', 'nextDose');
    expectIntent("what's next", 'nextDose');
  });

  it('routes did-i-take', () => {
    expectIntent('did i take metformin', 'didITake');
    expectIntent('have i taken my warfarin', 'didITake');
  });

  it('routes the medicine list', () => {
    expectIntent('what am i taking', 'listMedicines');
    expectIntent('list my medicines', 'listMedicines');
  });

  it('routes the numbers', () => {
    expectIntent('how am i doing', 'adherence');
    expectIntent("what's my adherence", 'adherence');
    expectIntent("what's my streak", 'streak');
  });

  it('routes safety questions', () => {
    expectIntent('do any of mine interact', 'interactionsMine');
    expectIntent('what does severe mean', 'severityMeaning');
    expectIntent('what should i do', 'whatShouldIDo');
  });

  it('routes social and meta', () => {
    expectIntent('hello', 'greeting');
    expectIntent('thanks', 'thanks');
    expectIntent('what can you do', 'help');
  });

  it('tells a permission question apart from the dose log', () => {
    // "what did I take" and "what can I take" differ by one word and mean
    // completely different things.
    expectIntent('what did i take today', 'dosesTaken');
    expectIntent('what can i take', 'pairCheck');
    expectIntent('what can i take for my knee', 'pairCheck');
    expectIntent('my knee is hurting what can i take', 'pairCheck');
    expectIntent('i have a headache what should i take', 'pairCheck');
  });

  it('returns unknown rather than guessing', () => {
    expectIntent('banana helicopter', 'unknown');
    expect(classify('').intent).toBe('unknown');
  });
});

describe('asksAboutMisses', () => {
  it('spots negative framing', () => {
    expect(asksAboutMisses('what did i miss today')).toBe(true);
    expect(asksAboutMisses('did i forget anything')).toBe(true);
    expect(asksAboutMisses('what did i take today')).toBe(false);
  });
});
