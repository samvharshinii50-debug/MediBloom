import { findInteraction, INTERACTION_RULES, KNOWN_GENERICS } from '../src/data/interactions';
import { resolveGeneric, DRUG_SYNONYMS } from '../src/data/drugSynonyms';

/**
 * The demo profile is the thing a judge actually sees, so its medicines and the
 * interactions between them are pinned here. If someone edits the dataset and
 * the demo stops telling its story, these fail rather than the demo.
 */

/** Kept in step with DEMO_MEDICINES in src/data/demoSeed.ts. */
const DEMO_GENERICS = [
  'levothyroxine',
  'metformin',
  'methylcobalamin',
  'mefenamic acid',
  'calcium carbonate',
  'warfarin',
];

describe('the demo medicine list', () => {
  it('uses only generics the interaction engine knows', () => {
    for (const g of DEMO_GENERICS) {
      expect({ g, known: KNOWN_GENERICS.has(g) }).toEqual({ g, known: true });
    }
  });

  it('resolves every brand name on the demo strips', () => {
    const brands: Array<[string, string]> = [
      ['Thyronorm', 'levothyroxine'],
      ['Glycomet', 'metformin'],
      ['Nurokind', 'methylcobalamin'],
      ['Meftal', 'mefenamic acid'],
      ['Shelcal', 'calcium carbonate'],
      ['Warfarin', 'warfarin'],
    ];
    for (const [brand, generic] of brands) {
      expect({ brand, got: resolveGeneric(brand) }).toEqual({ brand, got: generic });
    }
  });

  it('carries the severe pair the whole demo hinges on', () => {
    const rule = findInteraction('warfarin', 'mefenamic acid');
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe('severe');
    expect(rule!.swapFor).toBe('acetaminophen');
  });

  it('carries the everyday moderate pair older Indian women are rarely told about', () => {
    const rule = findInteraction('levothyroxine', 'calcium carbonate');
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe('moderate');
  });

  it('is able to say a deliberate pairing is fine', () => {
    const rule = findInteraction('metformin', 'methylcobalamin');
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe('mild');
  });

  it('produces exactly one severe flag, so the demo has a single clear headline', () => {
    const severe: string[] = [];
    for (let i = 0; i < DEMO_GENERICS.length; i++) {
      for (let j = i + 1; j < DEMO_GENERICS.length; j++) {
        const r = findInteraction(DEMO_GENERICS[i], DEMO_GENERICS[j]);
        if (r?.severity === 'severe') severe.push([r.a, r.b].sort().join('+'));
      }
    }
    expect(severe).toEqual(['mefenamic acid+warfarin']);
  });
});

describe('Indian brand coverage', () => {
  const EXPECTED: Array<[string, string]> = [
    ['Dolo 650', 'acetaminophen'],
    ['Crocin', 'acetaminophen'],
    ['Combiflam', 'ibuprofen'],
    ['Ecosprin 75', 'aspirin'],
    ['Pan 40', 'pantoprazole'],
    ['Meftal Spas', 'mefenamic acid'],
    ['Calcirol', 'cholecalciferol'],
    ['Vitamin D3', 'cholecalciferol'],
    ['Shelcal XT', 'calcium carbonate'],
    ['Nurokind', 'methylcobalamin'],
    ['Vitamin B12', 'methylcobalamin'],
    ['Livogen', 'ferrous sulfate'],
    ['Folvite', 'folic acid'],
    ['Primolut N', 'norethisterone'],
    ['Trapic', 'tranexamic acid'],
    ['Osteofos', 'alendronate'],
    ['Domstal', 'domperidone'],
    ['Thyronorm 50', 'levothyroxine'],
    ['Zoryl', 'glimepiride'],
    ['Montek LC', 'montelukast'],
  ];

  it('resolves the brands people read off the strip', () => {
    for (const [brand, generic] of EXPECTED) {
      expect({ brand, got: resolveGeneric(brand) }).toEqual({ brand, got: generic });
    }
  });

  it('still handles a dosage form prefix and a strength', () => {
    expect(resolveGeneric('Tab. Shelcal 500mg')).toBe('calcium carbonate');
    expect(resolveGeneric('Cap. Nurokind 1500 mcg')).toBe('methylcobalamin');
  });
});

describe('the women-and-elderly additions', () => {
  const ADDED = [
    'alendronate', 'mefenamic acid', 'tranexamic acid', 'norethisterone',
    'estradiol', 'domperidone', 'methylcobalamin', 'cholecalciferol', 'finasteride',
  ];

  it('are all reachable by the checker', () => {
    for (const g of ADDED) {
      expect({ g, known: KNOWN_GENERICS.has(g) }).toEqual({ g, known: true });
    }
  });

  it('flags buying Meftal over the counter while on warfarin', () => {
    expect(findInteraction('mefenamic acid', 'warfarin')!.severity).toBe('severe');
  });

  it('flags calcium blocking the bone tablet', () => {
    expect(findInteraction('alendronate', 'calcium carbonate')!.severity).toBe('moderate');
  });

  it('flags the clot risk of tranexamic acid with hormones', () => {
    expect(findInteraction('tranexamic acid', 'estradiol')!.severity).toBe('severe');
  });

  it('points the newly added rules at a professional', () => {
    const added = INTERACTION_RULES.filter((r) => ADDED.includes(r.a) || ADDED.includes(r.b));
    expect(added.length).toBeGreaterThan(8);
    const vague = added.filter(
      (r) => !/doctor|pharmacist|emergency|urgent|blood test|prescrib/i.test(r.guidance),
    );
    expect(vague.map((r) => `${r.a}+${r.b}`)).toEqual([]);
  });

  /**
   * `swapFor` replaces drug `b`, and the UI renders that literally as
   * "b → swapFor". Get the order wrong and the app tells someone to swap their
   * anticoagulant for paracetamol, which is the single worst thing it could
   * say. These drugs are never the one you swap out.
   */
  const NEVER_SWAP_OUT = [
    'warfarin', 'apixaban', 'rivaroxaban', 'dabigatran', 'insulin', 'digoxin',
    'levothyroxine', 'lithium', 'methotrexate', 'clopidogrel', 'amiodarone',
    'carbamazepine', 'valproate', 'lamotrigine', 'cyclosporine', 'tacrolimus',
    'prednisolone',
  ];

  it('never offers to swap out a medicine that must not be swapped', () => {
    const bad = INTERACTION_RULES
      .filter((r) => r.swapFor && NEVER_SWAP_OUT.includes(r.b))
      .map((r) => `${r.b} -> ${r.swapFor} (in ${r.a} + ${r.b})`);
    expect(bad).toEqual([]);
  });

  it('never suggests swapping a drug for itself or for its own partner', () => {
    const bad = INTERACTION_RULES
      .filter((r) => r.swapFor && (r.swapFor === r.a || r.swapFor === r.b))
      .map((r) => `${r.a} + ${r.b} -> ${r.swapFor}`);
    expect(bad).toEqual([]);
  });

  it('gives a reason with every swap it offers', () => {
    const bad = INTERACTION_RULES
      .filter((r) => r.swapFor && !r.swapReason)
      .map((r) => `${r.a} + ${r.b}`);
    expect(bad).toEqual([]);
  });

  it('has no alias mapping to an unknown generic', () => {
    const orphans = DRUG_SYNONYMS
      .filter((s) => !KNOWN_GENERICS.has(s.generic))
      .map((s) => `${s.alias} -> ${s.generic}`);
    expect(orphans).toEqual([]);
  });
});
