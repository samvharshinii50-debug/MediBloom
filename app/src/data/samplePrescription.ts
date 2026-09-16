/**
 * Text of the bundled demo prescription.
 *
 * This is what on-device OCR actually produces for
 * `demo-prescriptions/rx1-anna-nagar-cardiac.pdf`, including one imperfect read
 * ("Atorvastotin") so the confirm-before-saving path is exercised rather than
 * hidden. It runs through the very same parser as a camera capture — the only
 * thing this shortcut skips is the camera itself.
 *
 * The medicines are the ones an older woman in Chennai is genuinely likely to
 * be handed: a thyroid tablet, a calcium tablet, metformin, a B12 capsule and
 * warfarin. The doctor's warning about Meftal is on the sheet because that is
 * the exact mistake the app exists to catch.
 */
export const SAMPLE_PRESCRIPTION_TEXT = `Anna Nagar Heart & Diabetes Centre
Department of Cardiology - 42 Second Avenue, Anna Nagar, Chennai 600040
Dr. Meenakshi Raghavan
MD, DM (Cardiology)
Reg. No. DEMO-TN-44821

Patient: Lakshmi Subramanian    Age/Sex: 68 / F    Date: 16 September 2026
Diagnosis: Post mitral valve replacement, on anticoagulation - Type 2 diabetes - Hypothyroidism

Medicine            Strength    Frequency                Duration
Tab. Warfarin       5 mg        Once daily - 8 pm        Continue
Tab. Thyronorm      50 mcg      Once daily - empty stomach   Continue
Tab. Glycomet       500 mg      Twice daily - after food     Continue
Tab. Shelcal        500 mg      Once daily - after lunch     3 months
Cap. Nurokind       1500 mcg    Once daily - morning         3 months
Tab. Atorvastotin   10 mg       Once daily - night           Continue

Advice:
- Warfarin at the same time every night. Do not skip.
- Thyronorm one hour before coffee or breakfast.
- Do not take Meftal, Combiflam or any pain tablet from the medical shop without asking us first.
- INR check every month. Report any unusual bruising or bleeding at once.

SAMPLE PRESCRIPTION - NOT A REAL MEDICAL DOCUMENT`;

/** Second sample, used by tests to prove the parser handles a different layout. */
export const SAMPLE_PRESCRIPTION_TEXT_2 = `Kongu Women's Clinic
Obstetrics & Gynaecology | 18 Mettupalayam Road, Coimbatore 641043
Dr. Anitha Selvaraj | MBBS, MS (Obstetrics & Gynaecology)

Patient Name : Divya Ramesh
Age / Sex : 34 Years / Female
Diagnosis : Heavy menstrual bleeding, Iron deficiency anaemia

PRESCRIPTION

1. Tranexamic acid 500 mg
Thrice daily - during periods, for 5 days

2. Mefenamic acid 250 mg
As needed for cramps

3. Livogen 100 mg
Once daily - after lunch

4. Folvite 5 mg
Once daily - morning

Advice: Take iron with lemon juice, never with tea or milk.
Keep iron and calcium at least four hours apart.

SAMPLE PRESCRIPTION - NOT A REAL MEDICAL DOCUMENT`;
