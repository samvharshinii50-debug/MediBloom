import {
  checkInteractions, countFor, worstFor, groupBySeverity, topConcern,
} from '../src/engines/interactionEngine';
import { findInteraction, INTERACTION_RULES, KNOWN_GENERICS } from '../src/data/interactions';
import { resolveGeneric, DRUG_SYNONYMS } from '../src/data/drugSynonyms';
import type { Medicine } from '../src/data/types';

function med(name: string, generic: string, id = name): Medicine {
  return {
    id,
    name,
    generic,
    dosage: '10',
    unit: 'mg',
    times: ['09:00'],
    startDate: '2026-01-01',
    endDate: null,
    colorTag: '#E85D8A',
    notes: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('the bundled dataset', () => {
  it('has a substantial set of rules', () => {
    expect(INTERACTION_RULES.length).toBeGreaterThanOrEqual(90);
  });

  it('never ships a rule without an explanation and an action', () => {
    for (const r of INTERACTION_RULES) {
      expect(r.explanation.trim().length).toBeGreaterThan(10);
      expect(r.guidance.trim().length).toBeGreaterThan(10);
    }
  });

  it('keeps every drug name lowercase and single-token-ish', () => {
    for (const r of INTERACTION_RULES) {
      expect(r.a).toBe(r.a.toLowerCase());
      expect(r.b).toBe(r.b.toLowerCase());
      expect(r.a).not.toBe(r.b);
    }
  });

  it('has no duplicate pairs in either direction', () => {
    const seen = new Set<string>();
    for (const r of INTERACTION_RULES) {
      const key = [r.a, r.b].sort().join('|');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('only suggests swaps for drugs it knows', () => {
    for (const r of INTERACTION_RULES) {
      if (r.swapFor) expect(KNOWN_GENERICS.has(r.swapFor)).toBe(true);
    }
  });

  it('has no duplicate synonym aliases', () => {
    const aliases = DRUG_SYNONYMS.map((s) => s.alias);
    expect(new Set(aliases).size).toBe(aliases.length);
  });
});

describe('findInteraction', () => {
  it('finds the classic bleeding-risk pair', () => {
    const rule = findInteraction('warfarin', 'ibuprofen');
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe('severe');
  });

  it('matches regardless of order', () => {
    expect(findInteraction('ibuprofen', 'warfarin')).toEqual(
      findInteraction('warfarin', 'ibuprofen'),
    );
  });

  it('matches regardless of case', () => {
    expect(findInteraction('Warfarin', 'IBUPROFEN')).toBeDefined();
  });

  it('returns undefined for an unknown pair', () => {
    expect(findInteraction('warfarin', 'notarealdrug')).toBeUndefined();
  });
});

describe('resolveGeneric', () => {
  it('maps brand names to generics', () => {
    expect(resolveGeneric('Tylenol')).toBe('acetaminophen');
    expect(resolveGeneric('Coumadin')).toBe('warfarin');
  });

  it('strips dosage form prefixes and strengths', () => {
    expect(resolveGeneric('Tab. Warfarin 5mg')).toBe('warfarin');
    expect(resolveGeneric('CAP Metformin')).toBe('metformin');
  });

  it('passes a known generic straight through', () => {
    expect(resolveGeneric('metformin')).toBe('metformin');
  });

  it('returns null for something unrecognisable', () => {
    expect(resolveGeneric('zzzzqqq')).toBeNull();
  });
});

describe('checkInteractions', () => {
  it('finds nothing with fewer than two medicines', () => {
    expect(checkInteractions([])).toEqual([]);
    expect(checkInteractions([med('Warfarin', 'warfarin')])).toEqual([]);
  });

  it('detects a real pair', () => {
    const found = checkInteractions([
      med('Warfarin', 'warfarin', 'w'),
      med('Ibuprofen', 'ibuprofen', 'i'),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].rule.severity).toBe('severe');
  });

  it('checks every pair, not just neighbours', () => {
    const found = checkInteractions([
      med('Warfarin', 'warfarin', 'w'),
      med('Metformin', 'metformin', 'm'),
      med('Ibuprofen', 'ibuprofen', 'i'),
    ]);
    // warfarin+ibuprofen must still be found despite metformin sitting between.
    expect(found.some((f) => f.rule.severity === 'severe')).toBe(true);
  });

  it('sorts the worst first', () => {
    const found = checkInteractions([
      med('Warfarin', 'warfarin', 'w'),
      med('Ibuprofen', 'ibuprofen', 'i'),
      med('Sertraline', 'sertraline', 's'),
    ]);
    if (found.length > 1) {
      const order = { severe: 0, moderate: 1, mild: 2 };
      for (let i = 1; i < found.length; i++) {
        expect(order[found[i].rule.severity]).toBeGreaterThanOrEqual(
          order[found[i - 1].rule.severity],
        );
      }
    }
  });

  it('never reports a medicine against itself', () => {
    const found = checkInteractions([
      med('Warfarin', 'warfarin', 'w1'),
      med('Warfarin', 'warfarin', 'w2'),
    ]);
    for (const f of found) expect(f.medicineA.id).not.toBe(f.medicineB.id);
  });
});

describe('per-medicine helpers', () => {
  const meds = [
    med('Warfarin', 'warfarin', 'w'),
    med('Ibuprofen', 'ibuprofen', 'i'),
  ];
  const found = checkInteractions(meds);

  it('counts interactions involving a medicine', () => {
    expect(countFor('w', found)).toBe(1);
    expect(countFor('nonexistent', found)).toBe(0);
  });

  it('reports the worst severity for a medicine', () => {
    expect(worstFor('w', found)).toBe('severe');
    expect(worstFor('nonexistent', found)).toBeNull();
  });

  it('groups by severity', () => {
    const g = groupBySeverity(found);
    expect(g.severe.length + g.moderate.length + g.mild.length).toBe(found.length);
  });

  it('surfaces the top concern', () => {
    expect(topConcern(found)?.rule.severity).toBe('severe');
    expect(topConcern([])).toBeNull();
  });
});
