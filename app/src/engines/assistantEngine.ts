import { findInteraction } from '../data/interactions';
import { resolveGeneric } from '../data/drugSynonyms';
import type { DetectedInteraction, DoseLogEntry, Medicine } from '../data/types';
import { adherenceByMedicine, computeAdherence, weakestTimeOfDay } from './insightEngine';
import { combine, formatClock, friendlyDate, toDateKey } from './scheduleEngine';
import {
  asksAboutMisses,
  classify,
  normalise,
  parseTimeframe,
  partOfDayOf,
  withinTimeframe,
  type Timeframe,
} from './nlu';

export interface AssistantAnswer {
  text: string;
  /** Populated when the answer is about a specific interaction, so the UI
   *  can render the swap chips instead of burying it in prose. */
  interaction?: DetectedInteraction | null;
  /** Follow-up prompts offered as tappable chips. */
  followUps: string[];
  /** Where the answer came from, shown in the UI so it is never ambiguous. */
  source: 'device';
  /**
   * True when this is a direct read of the user's own data — what they took,
   * what is left, their numbers. Those answers are exact, instant and correct
   * by construction, so there is nothing a language model could add except
   * latency and a chance of rephrasing "skipped" into "you took it". The
   * caller uses this to decide whether cloud assist is worth consulting.
   */
  exact: boolean;
}

export interface AssistantContext {
  medicines: Medicine[];
  entries: DoseLogEntry[];
  interactions: DetectedInteraction[];
  profileName: string;
  now?: Date;
}

const SEVERITY_WORDS: Record<string, string> = {
  severe: "Severe means these two shouldn't normally be taken together — it's worth a call to your pharmacist before the next dose.",
  moderate: 'Moderate means it can usually be managed, but it needs watching or spacing out. Your doctor can tell you which.',
  mild: "Mild means most people are fine taking these together. It's just worth knowing about.",
};

const DEFAULT_FOLLOWUPS = ['What did I take today?', 'Do any of mine interact?'];

/* -------------------------------- helpers -------------------------------- */

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "a, b and c" — the Oxford comma is deliberately left out; it reads softer. */
function listSentence(items: string[], max = 4): string {
  if (items.length === 0) return '';
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  let out: string;
  if (shown.length === 1) out = shown[0];
  else out = `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
  return extra > 0 ? `${out}, plus ${extra} more` : out;
}

function byId(medicines: Medicine[]): Map<string, Medicine> {
  return new Map(medicines.map((m) => [m.id, m]));
}

function doseLabel(e: DoseLogEntry, m: Medicine | undefined, withDose = true): string {
  if (!m) return `a dose at ${formatClock(e.scheduledTime)}`;
  const strength = withDose && m.dosage ? ` ${m.dosage} ${m.unit}` : '';
  return `${m.name}${strength} at ${formatClock(e.scheduledTime)}`;
}

/** Entries inside the window, narrowed further by part of day when asked. */
function dosesIn(ctx: AssistantContext, tf: Timeframe): DoseLogEntry[] {
  return ctx.entries
    .filter((e) => withinTimeframe(e.date, tf))
    .filter((e) => !tf.partOfDay || partOfDayOf(e.scheduledTime) === tf.partOfDay)
    .sort((a, b) =>
      a.date === b.date
        ? a.scheduledTime.localeCompare(b.scheduledTime)
        : a.date.localeCompare(b.date),
    );
}

/** How to open a sentence about a window: "Today", "Last week", "This morning". */
function windowLead(tf: Timeframe): string {
  const part = tf.partOfDay ? ` ${tf.partOfDay}` : '';
  if (tf.label === 'today') return part ? `This${part}` : 'Today';
  if (tf.label === 'yesterday') return part ? `Yesterday${part}` : 'Yesterday';
  return cap(tf.label) + part;
}

/**
 * Medicine names the user mentioned, matched on the full name, the generic, and
 * any brand alias. Longest match wins so "vitamin d" beats a stray "d".
 */
function mentionedMedicines(text: string, medicines: Medicine[]): Medicine[] {
  const t = normalise(text);
  const hits = medicines.filter((m) => {
    const name = normalise(m.name);
    const generic = normalise(m.generic);
    if (name && t.includes(name)) return true;
    if (generic && t.includes(generic)) return true;
    return false;
  });
  return hits.sort((a, b) => b.name.length - a.name.length);
}

/**
 * Any generic drug name in the message, including ones the user does not take.
 * Scans 1- and 2-word windows so "vitamin d" and brand names both resolve.
 */
function mentionedGenerics(text: string): string[] {
  const words = normalise(text).split(' ').filter(Boolean);
  const found: string[] = [];

  for (let size = 2; size >= 1; size--) {
    for (let i = 0; i + size <= words.length; i++) {
      const phrase = words.slice(i, i + size).join(' ');
      if (phrase.length < 3) continue;
      const g = resolveGeneric(phrase);
      if (g && !found.includes(g)) found.push(g);
    }
  }
  return found;
}

function findDetected(
  ctx: AssistantContext,
  a: string,
  b: string,
): DetectedInteraction | null {
  return (
    ctx.interactions.find(
      (d) =>
        (d.rule.a === a && d.rule.b === b) || (d.rule.a === b && d.rule.b === a),
    ) ?? null
  );
}

function reply(
  text: string,
  followUps: string[] = DEFAULT_FOLLOWUPS,
  interaction: DetectedInteraction | null = null,
  exact = false,
): AssistantAnswer {
  return { text, followUps, interaction, source: 'device', exact };
}

/** A direct read of the user's own log or list — see `exact` on the answer. */
function exactReply(
  text: string,
  followUps: string[] = DEFAULT_FOLLOWUPS,
  interaction: DetectedInteraction | null = null,
): AssistantAnswer {
  return reply(text, followUps, interaction, true);
}

/** The intents that answer straight from stored data and never need a model. */
const EXACT_INTENTS = new Set([
  'dosesTaken', 'dosesPending', 'nextDose', 'didITake',
  'listMedicines', 'scheduleQuery', 'adherence', 'streak',
]);

/* ----------------------------- answer builders ---------------------------- */

function answerDoseLog(
  ctx: AssistantContext,
  tf: Timeframe,
  wantMisses: boolean,
): AssistantAnswer {
  const meds = byId(ctx.medicines);
  const doses = dosesIn(ctx, tf);
  const lead = windowLead(tf);

  if (doses.length === 0) {
    return reply(
      `${lead} you had nothing scheduled — so there's nothing to report.`,
      ['What am I taking?', 'How am I doing this week?'],
    );
  }

  const taken = doses.filter((e) => e.status === 'taken');
  const missed = doses.filter((e) => e.status === 'missed');
  const skipped = doses.filter((e) => e.status === 'skipped');
  const pending = doses.filter((e) => e.status === 'pending');

  if (wantMisses) {
    if (missed.length === 0 && skipped.length === 0) {
      return reply(
        `${lead} you didn't miss anything — all ${taken.length} ${taken.length === 1 ? 'dose' : 'doses'} were marked taken.`,
        ['How am I doing this week?', 'What is left today?'],
      );
    }
    const gone = [...missed, ...skipped].map((e) => doseLabel(e, meds.get(e.medicineId), false));
    return reply(
      `${lead} you missed ${listSentence(gone)}. Don't double up to catch up — just carry on with the next one as normal.`,
      ['How am I doing this week?', 'What should I do about it?'],
    );
  }

  const parts: string[] = [];

  if (taken.length > 0) {
    const names = taken.map((e) => doseLabel(e, meds.get(e.medicineId)));
    parts.push(
      `${lead} you've taken ${taken.length} of ${doses.length}: ${listSentence(names)}.`,
    );
  } else {
    parts.push(`${lead} you haven't marked anything as taken yet.`);
  }

  if (pending.length > 0) {
    const names = pending.map((e) => doseLabel(e, meds.get(e.medicineId), false));
    parts.push(`Still to come: ${listSentence(names)}.`);
  }

  if (missed.length > 0) {
    const names = missed.map((e) => doseLabel(e, meds.get(e.medicineId), false));
    parts.push(`Marked missed: ${listSentence(names)}.`);
  }

  if (skipped.length > 0) {
    parts.push(`${skipped.length} ${skipped.length === 1 ? 'was' : 'were'} skipped on purpose.`);
  }

  return reply(parts.join(' '), ['What is left today?', 'How am I doing this week?']);
}

function answerPending(ctx: AssistantContext, tf: Timeframe): AssistantAnswer {
  const meds = byId(ctx.medicines);
  const doses = dosesIn(ctx, tf);
  const pending = doses.filter((e) => e.status === 'pending');
  const lead = windowLead(tf);

  if (doses.length === 0) {
    return reply(`${lead} you had nothing scheduled.`, ['What am I taking?']);
  }
  if (pending.length === 0) {
    return reply(
      `${lead} is done — everything scheduled has been marked. ${
        doses.filter((e) => e.status === 'taken').length
      } of ${doses.length} taken.`,
      ['How am I doing this week?', 'Do any of mine interact?'],
    );
  }

  const now = ctx.now ?? new Date();
  const overdue = pending.filter((e) => combine(e.date, e.scheduledTime) < now);
  const names = pending.map((e) => doseLabel(e, meds.get(e.medicineId)));
  const overdueLine =
    overdue.length > 0
      ? ` ${overdue.length} of those ${overdue.length === 1 ? 'is' : 'are'} already past due.`
      : '';

  return reply(
    `You have ${pending.length} left ${tf.label === 'today' ? 'today' : tf.label}: ${listSentence(names)}.${overdueLine}`,
    ['What did I take today?', 'When is my next dose?'],
  );
}

function answerNextDose(ctx: AssistantContext): AssistantAnswer {
  const meds = byId(ctx.medicines);
  const now = ctx.now ?? new Date();

  const upcoming = ctx.entries
    .filter((e) => e.status === 'pending')
    .filter((e) => combine(e.date, e.scheduledTime).getTime() >= now.getTime())
    .sort(
      (a, b) =>
        combine(a.date, a.scheduledTime).getTime() - combine(b.date, b.scheduledTime).getTime(),
    );

  if (upcoming.length === 0) {
    const stillDue = ctx.entries.filter(
      (e) => e.status === 'pending' && e.date === toDateKey(now),
    );
    if (stillDue.length > 0) {
      const names = stillDue.map((e) => doseLabel(e, meds.get(e.medicineId)));
      return reply(
        `Nothing further is scheduled today, but ${listSentence(names)} ${stillDue.length === 1 ? 'is' : 'are'} still unmarked from earlier.`,
        ['What did I take today?'],
      );
    }
    return reply(
      "Nothing else is due today. Your next reminder will be tomorrow morning.",
      ['What am I taking?', 'How am I doing this week?'],
    );
  }

  const next = upcoming[0];
  const med = meds.get(next.medicineId);
  const when = combine(next.date, next.scheduledTime);
  const mins = Math.round((when.getTime() - now.getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const rel =
    mins < 1
      ? 'right now'
      : h > 0
        ? `in ${h}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`
        : `in ${mins}m`;
  const day = next.date === toDateKey(now) ? '' : ` on ${friendlyDate(next.date, now)}`;

  return reply(
    `Next up is ${doseLabel(next, med)}${day} — that's ${rel}.`,
    ['What is left today?', 'What did I take today?'],
  );
}

function answerDidITake(
  ctx: AssistantContext,
  question: string,
  tf: Timeframe,
): AssistantAnswer {
  const mine = mentionedMedicines(question, ctx.medicines);

  if (mine.length === 0) {
    // They asked "did I take it" without naming one — answer for the whole day.
    return answerDoseLog(ctx, tf, asksAboutMisses(question));
  }

  const m = mine[0];
  const doses = dosesIn(ctx, tf).filter((e) => e.medicineId === m.id);
  const lead = windowLead(tf);

  if (doses.length === 0) {
    return reply(
      `${m.name} wasn't scheduled ${tf.label === 'today' ? 'today' : tf.label}.`,
      ['What did I take today?'],
    );
  }

  const taken = doses.filter((e) => e.status === 'taken');
  const pending = doses.filter((e) => e.status === 'pending');
  const missed = doses.filter((e) => e.status === 'missed');

  if (taken.length === doses.length) {
    return reply(
      `Yes — ${m.name} ${doses.length === 1 ? `was taken at ${formatClock(doses[0].scheduledTime)}` : `was taken all ${doses.length} times`} ${tf.label === 'today' ? 'today' : tf.label}.`,
      ['What is left today?', 'How am I doing this week?'],
    );
  }

  if (taken.length === 0 && missed.length > 0) {
    return reply(
      `No — ${m.name} is marked missed ${tf.label === 'today' ? 'today' : tf.label} (${listSentence(missed.map((e) => formatClock(e.scheduledTime)))}). If it's still close to the time, take it; if the next dose is nearly due, skip it rather than doubling up.`,
      ['What should I do about it?', 'How am I doing this week?'],
    );
  }

  if (pending.length > 0) {
    return reply(
      `${lead} ${m.name} is ${taken.length > 0 ? `taken for ${listSentence(taken.map((e) => formatClock(e.scheduledTime)))} but still unmarked for ` : 'still unmarked for '}${listSentence(pending.map((e) => formatClock(e.scheduledTime)))}.`,
      ['What is left today?'],
    );
  }

  return reply(
    `${lead} ${m.name}: ${taken.length} taken, ${missed.length} missed.`,
    ['How am I doing this week?'],
  );
}

function answerListMedicines(ctx: AssistantContext): AssistantAnswer {
  if (ctx.medicines.length === 0) {
    return reply(
      "You haven't added any medicines yet. Tap Medicines, then Add — or upload a prescription and let the phone read it for you.",
      ['How do I upload a prescription?'],
    );
  }

  const lines = ctx.medicines.map(
    (m) =>
      `${m.name} ${m.dosage} ${m.unit} (${m.times.length > 0 ? m.times.map(formatClock).join(', ') : 'as needed'})`,
  );
  const flagged = ctx.interactions.length;
  const warn =
    flagged > 0
      ? ` ${flagged} ${flagged === 1 ? 'pair needs' : 'pairs need'} a look.`
      : ' Nothing in the list clashes.';

  return reply(
    `You're tracking ${ctx.medicines.length}: ${listSentence(lines, 6)}.${warn}`,
    ['Do any of mine interact?', 'What did I take today?'],
  );
}

function answerSchedule(ctx: AssistantContext, question: string): AssistantAnswer {
  const mine = mentionedMedicines(question, ctx.medicines);

  if (mine.length > 0) {
    const m = mine[0];
    const times =
      m.times.length > 0
        ? m.times.map(formatClock).join(' and ')
        : 'no fixed time — you log it when you take it';
    return reply(
      `${m.name} ${m.dosage} ${m.unit} is set for ${times}.${m.notes ? ` Your note: ${m.notes}.` : ''}`,
      ['What is left today?', 'What did I take today?'],
    );
  }

  const today = dosesIn(ctx, parseTimeframe('today', ctx.now));
  if (today.length === 0) {
    return reply('Nothing is scheduled today.', ['What am I taking?']);
  }
  const meds = byId(ctx.medicines);
  const lines = today.map((e) => doseLabel(e, meds.get(e.medicineId), false));
  return reply(
    `Today's schedule: ${listSentence(lines, 6)}.`,
    ['What is left today?', 'When is my next dose?'],
  );
}

function answerAdherence(ctx: AssistantContext, tf: Timeframe): AssistantAnswer {
  const scoped = tf.explicit ? dosesIn(ctx, tf) : ctx.entries;
  const stats = computeAdherence(scoped);

  if (stats.taken + stats.missed + stats.skipped === 0) {
    return reply(
      `There's nothing settled ${tf.explicit ? tf.label : 'yet'} to work a number out from. Once you start marking doses I'll spot the patterns.`,
      ['What am I taking?', 'Do any of mine interact?'],
    );
  }

  const weak = weakestTimeOfDay(scoped);
  const weakLine = weak ? ` Your ${weak.bucket} doses are the ones that slip most.` : '';
  const streakLine =
    !tf.explicit && stats.streakDays > 0 ? ` You're on a ${stats.streakDays}-day streak.` : '';
  const worst = adherenceByMedicine(ctx.medicines, scoped).filter((x) => x.settled >= 3)[0];
  const worstLine =
    worst && worst.ratePercent < 80
      ? ` ${worst.medicine.name} is the weakest at ${worst.ratePercent}%.`
      : '';
  const scope = tf.explicit ? ` ${tf.label}` : '';

  return reply(
    `You've taken ${stats.taken} of ${stats.taken + stats.missed + stats.skipped} doses${scope} — that's ${stats.ratePercent}%.${streakLine}${weakLine}${worstLine}`,
    ['What did I miss?', 'Do any of mine interact?'],
  );
}

function answerStreak(ctx: AssistantContext): AssistantAnswer {
  const stats = computeAdherence(ctx.entries);
  if (stats.streakDays === 0) {
    return reply(
      "Your streak is at zero right now — a missed dose broke it. Mark everything today and it starts again tomorrow.",
      ['What is left today?', 'How am I doing this week?'],
    );
  }
  return reply(
    `You're on a ${stats.streakDays}-day streak — ${stats.streakDays} ${stats.streakDays === 1 ? 'day' : 'days'} back-to-back with nothing missed. Overall you're at ${stats.ratePercent}%.`,
    ['What is left today?', 'Do any of mine interact?'],
  );
}

function answerMyInteractions(ctx: AssistantContext): AssistantAnswer {
  if (ctx.medicines.length === 0) {
    return reply(
      "There's nothing to check yet — add a medicine or two and I'll check every pair automatically.",
      ['How do I add a medicine?'],
    );
  }
  if (ctx.interactions.length === 0) {
    return reply(
      "Good news — nothing in your current list interacts in a way I recognise. I re-check automatically whenever you add something new.",
      ['How am I doing this week?', 'What am I taking?'],
    );
  }

  const worst = ctx.interactions[0];
  const more =
    ctx.interactions.length > 1
      ? ` There ${ctx.interactions.length === 2 ? 'is 1 other' : `are ${ctx.interactions.length - 1} others`} to look at too.`
      : '';

  return reply(
    `Yes — ${worst.medicineA.name} and ${worst.medicineB.name} are a ${worst.rule.severity} combination. ${worst.rule.explanation}${more}`,
    ['What should I do about it?', 'What does severe mean?'],
    worst,
  );
}

function answerPairCheck(ctx: AssistantContext, generics: string[]): AssistantAnswer {
  // Two named drugs — check that pair directly.
  if (generics.length >= 2) {
    const rule = findInteraction(generics[0], generics[1]);
    if (rule) {
      const swap = rule.swapFor
        ? ` You could ask about ${cap(rule.swapFor)} instead — ${rule.swapReason ?? 'it tends to be the safer option here'}.`
        : '';
      return reply(
        `That's a ${rule.severity} combination. ${rule.explanation} ${rule.guidance}${swap}`,
        ['What does severe mean?', 'Do any of mine interact?'],
        findDetected(ctx, rule.a, rule.b),
      );
    }
    return reply(
      `I don't have a known interaction between ${cap(generics[0])} and ${cap(generics[1])} in my reference. That isn't a guarantee they're fine together though — your pharmacist can check properly.`,
      ['Do any of mine interact?'],
    );
  }

  // One named drug — check it against everything they already take.
  const g = generics[0];
  const clashes = ctx.medicines
    .map((m) => ({ m, rule: findInteraction(g, m.generic) }))
    .filter((x): x is { m: Medicine; rule: NonNullable<ReturnType<typeof findInteraction>> } => !!x.rule)
    .sort((a, b) => severityRank(b.rule.severity) - severityRank(a.rule.severity));

  if (clashes.length === 0) {
    return reply(
      `${cap(g)} doesn't clash with anything on your list as far as my reference goes. Still worth a word with your pharmacist before starting anything new.`,
      ['Do any of mine interact?', 'What am I taking?'],
    );
  }

  const first = clashes[0];
  const swap = first.rule.swapFor
    ? ` ${cap(first.rule.swapFor)} is usually the safer choice — ${first.rule.swapReason ?? 'it avoids this particular clash'}.`
    : '';
  const more =
    clashes.length > 1 ? ` It also clashes with ${listSentence(clashes.slice(1).map((x) => x.m.name))}.` : '';

  return reply(
    `Careful — ${cap(g)} is a ${first.rule.severity} combination with your ${first.m.name}. ${first.rule.explanation} ${first.rule.guidance}${swap}${more}`,
    ['What does severe mean?', 'Do any of mine interact?'],
    findDetected(ctx, first.rule.a, first.rule.b),
  );
}

function severityRank(s: string): number {
  return s === 'severe' ? 3 : s === 'moderate' ? 2 : 1;
}

function answerMedicineInfo(ctx: AssistantContext, m: Medicine): AssistantAnswer {
  const related = ctx.interactions.filter(
    (d) => d.medicineA.id === m.id || d.medicineB.id === m.id,
  );
  const mine = ctx.entries.filter((e) => e.medicineId === m.id && e.status !== 'pending');
  const takenCount = mine.filter((e) => e.status === 'taken').length;
  const rate = mine.length > 0 ? Math.round((takenCount / mine.length) * 100) : null;
  const rateLine = rate !== null ? ` You've taken it ${rate}% of the time over the last month.` : '';
  const times = m.times.length > 0 ? m.times.map(formatClock).join(' and ') : 'as needed';

  if (related.length > 0) {
    const r = related[0];
    const other = r.medicineA.id === m.id ? r.medicineB : r.medicineA;
    return reply(
      `${m.name} ${m.dosage} ${m.unit}, set for ${times}.${rateLine} Worth knowing: it's flagged as a ${r.rule.severity} combination with ${other.name}.`,
      ['What should I do about it?', 'What did I take today?'],
      r,
    );
  }

  return reply(
    `${m.name} ${m.dosage} ${m.unit}, set for ${times}.${rateLine} Nothing on your list conflicts with it.`,
    ['What is left today?', 'How am I doing this week?'],
  );
}

/* --------------------------------- router --------------------------------- */

/**
 * Deterministic intent routing over the user's own data.
 * No model, no network — every answer is traceable to a rule, which is exactly
 * what the app promises on its Safety screen.
 */
export function answer(question: string, ctx: AssistantContext): AssistantAnswer {
  const result = route(question, ctx);
  // Mark data lookups as exact so the caller knows not to bother a model with
  // a question this engine has already answered perfectly.
  const intent = classify(question.trim()).intent;
  return { ...result, exact: result.exact || EXACT_INTENTS.has(intent) };
}

function route(question: string, ctx: AssistantContext): AssistantAnswer {
  const raw = question.trim();
  if (raw.length === 0) {
    return reply(
      'Ask me anything about your medicines — what you took today, whether two are safe together, or how your week is going.',
      DEFAULT_FOLLOWUPS,
    );
  }

  const now = ctx.now ?? new Date();
  const scoped: AssistantContext = { ...ctx, now };
  const { intent } = classify(raw);
  const tf = parseTimeframe(raw, now);
  const generics = mentionedGenerics(raw);
  const mine = mentionedMedicines(raw, ctx.medicines);

  switch (intent) {
    case 'greeting': {
      const name = ctx.profileName ? `, ${ctx.profileName}` : '';
      const pending = dosesIn(scoped, parseTimeframe('today', now)).filter(
        (e) => e.status === 'pending',
      ).length;
      const status =
        pending > 0
          ? ` You have ${pending} ${pending === 1 ? 'dose' : 'doses'} still to mark today.`
          : ' Everything scheduled for today is marked off.';
      return reply(
        `Hi${name}!${ctx.medicines.length > 0 ? status : ' Add your first medicine and I can start keeping track.'}`,
        ['What did I take today?', 'Do any of mine interact?'],
      );
    }

    case 'thanks':
      return reply(
        "Any time. I'm here whenever you want to check something.",
        DEFAULT_FOLLOWUPS,
      );

    case 'help':
      return reply(
        "I can tell you what you took and when, what's still due, how your adherence is going, and whether any two medicines clash — all from what's on this phone. Try: \"what did I have today\", \"what's left\", \"can I take ibuprofen\", or \"how was last week\".",
        ['What did I take today?', 'What is left today?'],
      );

    case 'privacy':
      return reply(
        'Your medicines, doses and settings live in a database on this phone and nowhere else. The interaction checker, the reminders and this chat all work with the network off — turn on airplane mode and try it. Nothing is sent anywhere unless you switch on an optional feature yourself and enter your own key.',
        ['What am I taking?', 'Do any of mine interact?'],
      );

    case 'dosesTaken':
      return answerDoseLog(scoped, tf, asksAboutMisses(raw));

    case 'dosesPending':
      return answerPending(scoped, tf);

    case 'nextDose':
      return answerNextDose(scoped);

    case 'didITake':
      return answerDidITake(scoped, raw, tf);

    case 'listMedicines':
      return answerListMedicines(scoped);

    case 'scheduleQuery':
      return answerSchedule(scoped, raw);

    case 'adherence':
      return answerAdherence(scoped, tf);

    case 'streak':
      return answerStreak(scoped);

    case 'interactionsMine':
      // "is ibuprofen safe" is a pair question wearing a safety hat.
      if (generics.length > 0) return answerPairCheck(scoped, generics);
      return answerMyInteractions(scoped);

    case 'pairCheck':
      if (generics.length > 0) return answerPairCheck(scoped, generics);
      return answerMyInteractions(scoped);

    case 'severityMeaning': {
      const word = ['severe', 'moderate', 'mild'].find((s) => normalise(raw).includes(s));
      return reply(SEVERITY_WORDS[word ?? 'severe'], ['Do any of mine interact?']);
    }

    case 'whatShouldIDo': {
      const worst = ctx.interactions[0];
      if (!worst) {
        return reply(
          "There's nothing flagged right now, so nothing to act on. Keep marking your doses and I'll tell you if that changes.",
          ['How am I doing this week?'],
        );
      }
      const swap = worst.rule.swapFor
        ? ` A common alternative is ${cap(worst.rule.swapFor)} — ${worst.rule.swapReason ?? 'usually gentler in this combination'}.`
        : '';
      return reply(`${worst.rule.guidance}${swap}`, ['What does severe mean?'], worst);
    }

    case 'missedAdvice': {
      // "what did I miss today" wants the log; "I forgot, what do I do" wants
      // advice. Both contain "what", so the order and the ask both matter.
      const t = normalise(raw);
      const wantsAdvice =
        /\b(what (do|should) i do|what now|should i (take|skip|double)|do i (take|skip|double)|catch up)\b/.test(t);
      const wantsList =
        /\b(what|which|how many|show|list)\b.*\b(miss|missed|skip|skipped|forgot|forget)\b/.test(t);

      if (wantsList && !wantsAdvice) return answerDoseLog(scoped, tf, true);
      return reply(
        "If you've just missed one, take it as soon as you remember — unless it's nearly time for the next dose, in which case skip it and carry on as normal. Never double up to catch up. For a specific medicine, your pharmacist can give you the exact rule for it.",
        ['What did I miss?', 'How am I doing this week?'],
      );
    }

    case 'foodTiming': {
      const m = mine[0];
      const note = m?.notes ? ` Your note on ${m.name} says: ${m.notes}.` : '';
      return reply(
        `I don't carry food and timing rules for individual medicines — that's on the leaflet in the box, and your pharmacist can confirm it in a sentence.${note} What I can tell you is when each of yours is scheduled and whether any two clash.`,
        ['What is my schedule?', 'Do any of mine interact?'],
      );
    }

    case 'sideEffects':
      return reply(
        "I don't hold a side-effect database, so I won't guess — that's exactly the kind of thing worth getting right. Ring your pharmacist, or use the leaflet in the box. If it feels severe — trouble breathing, swelling, chest pain — treat it as an emergency and call your local emergency number.",
        ['Do any of mine interact?', 'What am I taking?'],
      );

    case 'caregiverHelp':
      return reply(
        "Caregiver alerts watch for a dose that stays unmarked past the limit you set — one, two, four or eight hours. When that happens, MediBloom writes the email for you: which medicine, what time it was due, how long it's been. If you've set up automatic sending it goes on its own; otherwise a notification appears and one tap sends it. Turn it on under More, then Settings.",
        ['What is left today?', 'How am I doing this week?'],
      );

    case 'howTo': {
      const t = normalise(raw);
      if (/\bupload|scan|prescription|photo|pdf\b/.test(t)) {
        return reply(
          'Medicines, then "Upload a prescription". Take a photo, pick a PDF, or tap the sample one. Your phone reads the text itself, shows you what it saw, and nothing is saved until you confirm each line.',
          ['How do I add a medicine?'],
        );
      }
      if (/\berase|delete|remove|clear\b/.test(t)) {
        return reply(
          'To remove one medicine, open it under Medicines and delete it there. To wipe everything — medicines, history, settings — it\'s More, then Settings, then "Erase everything".',
          ['What am I taking?'],
        );
      }
      if (/\btime|remind|schedule|change\b/.test(t)) {
        return reply(
          'When you add or edit a medicine, tap the time chip. Big plus and minus buttons move the hour and minutes, and the reminder reschedules the moment you save.',
          ['What is my schedule?'],
        );
      }
      return reply(
        'Medicines, then the plus button. Type the name — brand names work, it resolves them to the generic — set the dose and how often, and it starts checking against everything else straight away.',
        ['How do I upload a prescription?'],
      );
    }

    default:
      break;
  }

  /* Nothing classified cleanly, but they named something we recognise --------
     Answering about that is far better than a shrug. */
  if (mine.length === 1) return answerMedicineInfo(scoped, mine[0]);
  if (generics.length > 0) return answerPairCheck(scoped, generics);
  if (tf.explicit) return answerDoseLog(scoped, tf, asksAboutMisses(raw));

  return reply(
    "I couldn't work that one out. I answer from your own medicine list and a built-in interaction reference, so I'm good on things like \"what did I have today\", \"what's still due\", \"can I take ibuprofen\" or \"how was last week\". For anything clinical, your pharmacist is the right call.",
    ['What did I take today?', 'What is left today?', 'Do any of mine interact?'],
  );
}
