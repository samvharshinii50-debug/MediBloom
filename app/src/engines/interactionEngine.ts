import { findInteraction } from '../data/interactions';
import type { DetectedInteraction, Medicine, Severity } from '../data/types';

const SEVERITY_ORDER: Record<Severity, number> = {
  severe: 0,
  moderate: 1,
  mild: 2,
};

/**
 * Checks every unique pair of the user's medicines against the bundled rules.
 * Pure and synchronous — no network, no async, so screens can call it freely.
 */
export function checkInteractions(medicines: Medicine[]): DetectedInteraction[] {
  const found: DetectedInteraction[] = [];

  for (let i = 0; i < medicines.length; i++) {
    for (let j = i + 1; j < medicines.length; j++) {
      const a = medicines[i];
      const b = medicines[j];
      const rule = findInteraction(a.generic, b.generic);
      if (!rule) continue;

      // Present the pair in the rule's own order so `swapFor` refers to the
      // medicine the user actually sees on the right-hand side.
      const ruleMatchesAFirst = rule.a === a.generic.toLowerCase();
      found.push({
        rule,
        medicineA: ruleMatchesAFirst ? a : b,
        medicineB: ruleMatchesAFirst ? b : a,
      });
    }
  }

  return found.sort(
    (x, y) => SEVERITY_ORDER[x.rule.severity] - SEVERITY_ORDER[y.rule.severity],
  );
}

/** How many interactions involve this specific medicine. */
export function countFor(medicineId: string, detected: DetectedInteraction[]): number {
  return detected.filter(
    (d) => d.medicineA.id === medicineId || d.medicineB.id === medicineId,
  ).length;
}

/** The worst severity involving this medicine, or null. */
export function worstFor(
  medicineId: string,
  detected: DetectedInteraction[],
): Severity | null {
  const mine = detected.filter(
    (d) => d.medicineA.id === medicineId || d.medicineB.id === medicineId,
  );
  if (mine.length === 0) return null;
  return mine.reduce<Severity>(
    (worst, d) =>
      SEVERITY_ORDER[d.rule.severity] < SEVERITY_ORDER[worst] ? d.rule.severity : worst,
    'mild',
  );
}

export function groupBySeverity(
  detected: DetectedInteraction[],
): Record<Severity, DetectedInteraction[]> {
  return {
    severe: detected.filter((d) => d.rule.severity === 'severe'),
    moderate: detected.filter((d) => d.rule.severity === 'moderate'),
    mild: detected.filter((d) => d.rule.severity === 'mild'),
  };
}

/** The single most important interaction to surface on the home screen. */
export function topConcern(detected: DetectedInteraction[]): DetectedInteraction | null {
  return detected.length > 0 ? detected[0] : null;
}
