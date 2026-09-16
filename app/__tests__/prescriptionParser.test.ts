import {
  parsePrescription, parseFrequency, suggestGenerics, levenshtein, needsConfirmation,
  CONFIDENCE_THRESHOLD,
} from '../src/engines/prescriptionParser';
import {
  SAMPLE_PRESCRIPTION_TEXT, SAMPLE_PRESCRIPTION_TEXT_2,
} from '../src/data/samplePrescription';

/** Text as OCR would read each of the five demo prescriptions. */
const RX3_MINDCARE = `Harbour Mind Care
Psychiatry & Counselling Services
Patient  Ananya Rao    Age / Sex  34 / F
Impression: Generalised anxiety, improving.

Medications Advised

1 Sertraline 50 mg
One tablet once daily, in the morning after food - continue for 8 weeks

2 Ibuprofen 400 mg
One tablet as needed for headache, maximum twice a day - SOS

3 Melatonin 3 mg
One tablet at bedtime if sleep is disturbed - SOS`;

const RX4_POLYPHARMACY = `St. Amara Hospital
Internal Medicine & Geriatric Care Unit
Patient Sharada Rao   Age / Sex 68 / F
Diagnosis: Hypothyroidism - Post-PCI on antiplatelet therapy

#  Drug              Strength  Directions                          Duration
1  Levothyroxine     50 mcg    Once daily, empty stomach           Continue
2  Clopidogrel       75 mg     Once daily, after breakfast         Continue
3  Pantoprazole      40 mg     Once daily, before breakfast        8 weeks
4  Calcium Carbonate 500 mg    Twice daily, after meals            3 months
5  Vitamin D3        60000 IU  Once weekly, Sunday morning         8 weeks`;

const RX5_CLEAN = `Lotus Women's Health Centre
OBSTETRICS - GYNAECOLOGY - WELLNESS
Patient  Ananya Rao     Date  04 March 2026

Prescribed

Folic Acid 5 mg
One tablet once daily, after breakfast - 3 months

Vitamin D3 60000 IU
One sachet once weekly, Sunday morning - 8 weeks

Calcium Carbonate 500 mg
One tablet once daily, after dinner - 3 months`;

describe('parseFrequency', () => {
  it('reads the common daily patterns', () => {
    expect(parseFrequency('Once daily - night')).toEqual({ label: 'Once daily', times: ['21:00'] });
    expect(parseFrequency('Once daily - morning')).toEqual({ label: 'Once daily', times: ['08:00'] });
    expect(parseFrequency('Twice daily, after meals')?.times).toHaveLength(2);
    expect(parseFrequency('3 times daily')?.times).toHaveLength(3);
    expect(parseFrequency('four times a day')?.times).toHaveLength(4);
  });

  it('understands prescription shorthand', () => {
    expect(parseFrequency('1 tab BD')?.label).toBe('Twice daily');
    expect(parseFrequency('TDS after food')?.label).toBe('3x daily');
    expect(parseFrequency('take OD')?.label).toBe('Once daily');
  });

  it('treats as-needed as having no fixed times', () => {
    expect(parseFrequency('As needed for pain - SOS')).toEqual({ label: 'As needed', times: [] });
    expect(parseFrequency('PRN')?.times).toEqual([]);
  });

  it('handles weekly dosing', () => {
    expect(parseFrequency('Once weekly, Sunday morning')?.label).toBe('Once weekly');
  });

  it('returns null when there is no frequency at all', () => {
    expect(parseFrequency('Reg. No. DEMO-KA-44821')).toBeNull();
  });
});

describe('levenshtein', () => {
  it('measures edit distance', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
    expect(levenshtein('atorvastatin', 'atorvastotin')).toBe(1);
    expect(levenshtein('', 'abc')).toBe(3);
  });
});

describe('suggestGenerics', () => {
  it('recovers a misread drug name', () => {
    expect(suggestGenerics('Atorvastotin')).toContain('atorvastatin');
  });

  it('recovers from a broken-up read', () => {
    expect(suggestGenerics('Ator statin')).toContain('atorvastatin');
  });

  it('returns nothing for a stub of text', () => {
    expect(suggestGenerics('ab')).toEqual([]);
  });
});

describe('parsePrescription — demo prescription 1 (cardiac)', () => {
  const parsed = parsePrescription(SAMPLE_PRESCRIPTION_TEXT);

  it('finds all six medicines', () => {
    expect(parsed).toHaveLength(6);
  });

  it('reads warfarin cleanly', () => {
    const warfarin = parsed.find((p) => p.generic === 'warfarin');
    expect(warfarin).toBeDefined();
    expect(warfarin!.dosage).toBe('5');
    expect(warfarin!.unit).toBe('mg');
    expect(warfarin!.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
  });

  it('resolves the Indian brand names off the strip', () => {
    const generics = parsed.map((p) => p.generic);
    expect(generics).toEqual(
      expect.arrayContaining([
        'warfarin', 'levothyroxine', 'metformin', 'calcium carbonate', 'methylcobalamin',
      ]),
    );
  });

  it('reads Glycomet as twice daily', () => {
    const met = parsed.find((p) => p.generic === 'metformin');
    expect(met).toBeDefined();
    expect(met!.times).toHaveLength(2);
  });

  it('handles a microgram strength', () => {
    const thyroid = parsed.find((p) => p.generic === 'levothyroxine');
    expect(thyroid!.dosage).toBe('50');
    expect(thyroid!.unit).toBe('mcg');
  });

  it('flags the misread name instead of silently guessing', () => {
    const unsure = parsed.find((p) => needsConfirmation(p));
    expect(unsure).toBeDefined();
    expect(unsure!.generic).toBeNull();
    expect(unsure!.suggestions).toContain('atorvastatin');
  });

  it('never marks a low-confidence read as confirmed', () => {
    for (const p of parsed) {
      if (p.generic === null) expect(p.confidence).toBeLessThan(CONFIDENCE_THRESHOLD);
    }
  });
});

describe('parsePrescription — demo prescription 2 (numbered list)', () => {
  const parsed = parsePrescription(SAMPLE_PRESCRIPTION_TEXT_2);

  it('finds all four medicines from a numbered layout', () => {
    expect(parsed).toHaveLength(4);
    expect(parsed.map((p) => p.generic)).toEqual(
      expect.arrayContaining([
        'tranexamic acid', 'mefenamic acid', 'ferrous sulfate', 'folic acid',
      ]),
    );
  });

  it('picks up frequency from the line below the name', () => {
    const tranexamic = parsed.find((p) => p.generic === 'tranexamic acid');
    expect(tranexamic!.times).toHaveLength(3);
  });

  it('reads an as-needed line with no fixed times', () => {
    const meftal = parsed.find((p) => p.generic === 'mefenamic acid');
    expect(meftal!.frequencyLabel).toBe('As needed');
    expect(meftal!.times).toEqual([]);
  });

  it('resolves a two-word generic written out in full', () => {
    expect(parsed.find((p) => p.generic === 'tranexamic acid')).toBeDefined();
  });
});

describe('parsePrescription — demo prescription 3 (mind care)', () => {
  const parsed = parsePrescription(RX3_MINDCARE);

  it('finds the prescribed medicines', () => {
    const generics = parsed.map((p) => p.generic);
    expect(generics).toContain('sertraline');
    expect(generics).toContain('ibuprofen');
  });

  it('reads the morning timing for sertraline', () => {
    const sert = parsed.find((p) => p.generic === 'sertraline');
    expect(sert!.times).toEqual(['08:00']);
  });
});

describe('parsePrescription — demo prescription 4 (table, polypharmacy)', () => {
  const parsed = parsePrescription(RX4_POLYPHARMACY);

  it('reads every row of a five-drug table', () => {
    expect(parsed.length).toBeGreaterThanOrEqual(5);
    const generics = parsed.map((p) => p.generic);
    expect(generics).toContain('levothyroxine');
    expect(generics).toContain('clopidogrel');
    expect(generics).toContain('pantoprazole');
  });

  it('keeps mcg distinct from mg', () => {
    const levo = parsed.find((p) => p.generic === 'levothyroxine');
    expect(levo!.unit).toBe('mcg');
    expect(levo!.dosage).toBe('50');
  });
});

describe('parsePrescription — demo prescription 5 (clean)', () => {
  const parsed = parsePrescription(RX5_CLEAN);

  it('reads all three supplements', () => {
    expect(parsed.length).toBeGreaterThanOrEqual(3);
  });
});

describe('parsePrescription — robustness', () => {
  it('never throws on junk', () => {
    expect(() => parsePrescription('')).not.toThrow();
    expect(() => parsePrescription('!!!! ???? 12345')).not.toThrow();
    // @ts-expect-error deliberately wrong type
    expect(() => parsePrescription(null)).not.toThrow();
    // @ts-expect-error deliberately wrong type
    expect(parsePrescription(undefined)).toEqual([]);
  });

  it('ignores letterhead, addresses and patient details', () => {
    const parsed = parsePrescription(SAMPLE_PRESCRIPTION_TEXT);
    const names = parsed.map((p) => p.name.toLowerCase()).join(' ');
    expect(names).not.toContain('lakeview');
    expect(names).not.toContain('ananya');
    expect(names).not.toContain('demo');
  });

  it('does not list the same medicine twice', () => {
    const parsed = parsePrescription(`${SAMPLE_PRESCRIPTION_TEXT}\n${SAMPLE_PRESCRIPTION_TEXT}`);
    const generics = parsed.map((p) => p.generic).filter(Boolean);
    expect(new Set(generics).size).toBe(generics.length);
  });
});
