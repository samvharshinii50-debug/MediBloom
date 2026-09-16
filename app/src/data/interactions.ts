import type { InteractionRule } from './types';

/**
 * Bundled drug-drug interaction dataset.
 *
 * Scope rules used when building this list:
 *  - Only textbook-level, widely documented pairs. Anything uncertain was left out.
 *  - `severe` is reserved for combinations that are contraindicated or carry a
 *    serious risk (major bleeding, serotonin syndrome, muscle breakdown,
 *    dangerous drops in blood pressure, dangerous potassium levels).
 *  - `moderate` means real, but manageable with spacing, monitoring or a dose change.
 *  - `mild` means generally fine, just worth knowing.
 *  - Names are lowercase single generics. Class effects are written out member by member.
 *  - Wording is deliberately plain: no abbreviations, no clinical shorthand.
 *
 * This is decision support for a person managing their own medicines, never a
 * prescribing tool. Every `guidance` string points back to a doctor or pharmacist.
 */
export const INTERACTION_RULES: InteractionRule[] = [
  // ---------------------------------------------------------------------------
  // Warfarin
  // ---------------------------------------------------------------------------
  {
    a: 'warfarin',
    b: 'ibuprofen',
    severity: 'severe',
    explanation:
      'Warfarin thins your blood, and ibuprofen irritates the stomach lining and makes platelets less sticky. Together they clearly raise your risk of serious stomach bleeding.',
    guidance:
      'Do not start ibuprofen while on warfarin without asking your doctor or pharmacist first. Get urgent help if you notice black stools, blood in vomit, or bruising that keeps spreading.',
    swapFor: 'acetaminophen',
    swapReason:
      'Acetaminophen eases pain without thinning your blood or irritating the stomach lining.',
  },
  {
    a: 'warfarin',
    b: 'naproxen',
    severity: 'severe',
    explanation:
      'Naproxen adds to the blood-thinning effect of warfarin and can damage the stomach lining, so bleeding becomes much more likely.',
    guidance:
      'Avoid naproxen while taking warfarin unless your doctor has specifically approved it. Ask your pharmacist for a safer pain option.',
    swapFor: 'acetaminophen',
    swapReason:
      'Acetaminophen relieves pain without adding to warfarin bleeding risk.',
  },
  {
    a: 'warfarin',
    b: 'diclofenac',
    severity: 'severe',
    explanation:
      'Diclofenac can irritate the stomach and reduce clotting on top of what warfarin already does, which raises the chance of a dangerous bleed.',
    guidance:
      'Check with your doctor or pharmacist before using diclofenac tablets or high-dose gel while on warfarin.',
    swapFor: 'acetaminophen',
    swapReason: 'Acetaminophen does not add to the bleeding risk from warfarin.',
  },
  {
    a: 'warfarin',
    b: 'aspirin',
    severity: 'severe',
    explanation:
      'Both medicines make bleeding more likely, by different routes. Taken together the risk of a serious bleed goes up sharply.',
    guidance:
      'Some people are told to take both on purpose after a heart valve or stent procedure. Never start or stop either one on your own - confirm the plan with your doctor.',
  },
  {
    a: 'warfarin',
    b: 'clopidogrel',
    severity: 'severe',
    explanation:
      'Warfarin slows clot formation and clopidogrel stops platelets sticking together, so together bleeding is much harder to stop.',
    guidance:
      'This pair is sometimes prescribed deliberately for a limited time. Keep both on your list, report any unusual bruising or bleeding, and only change doses on your doctor advice.',
  },
  {
    a: 'warfarin',
    b: 'fluconazole',
    severity: 'severe',
    explanation:
      'Fluconazole slows the liver down so warfarin builds up in your body. Even a short antifungal course can push your blood-thinning far too high.',
    guidance:
      'Tell the prescriber you are on warfarin before starting fluconazole. You will usually need an extra blood-clotting test within a few days.',
  },
  {
    a: 'warfarin',
    b: 'metronidazole',
    severity: 'severe',
    explanation:
      'Metronidazole makes warfarin much stronger by slowing how fast your liver clears it, which can cause sudden heavy bleeding.',
    guidance:
      'Let your doctor or pharmacist know you take warfarin before starting metronidazole, and ask when your next blood-clotting test should be.',
  },
  {
    a: 'warfarin',
    b: 'sulfamethoxazole',
    severity: 'severe',
    explanation:
      'This antibiotic is one of the strongest boosters of warfarin. It can raise your blood-thinning to a dangerous level within days.',
    guidance:
      'Tell the prescriber you take warfarin so they can choose a different antibiotic or arrange close blood testing. Do not simply add it yourself.',
  },
  {
    a: 'warfarin',
    b: 'trimethoprim',
    severity: 'severe',
    explanation:
      'Trimethoprim, often given for urine infections, makes warfarin work far more strongly and raises the risk of a serious bleed.',
    guidance:
      'Mention your warfarin whenever an antibiotic is prescribed. Ask your doctor whether a different antibiotic or an extra blood test is needed.',
  },
  {
    a: 'warfarin',
    b: 'ciprofloxacin',
    severity: 'moderate',
    explanation:
      'Ciprofloxacin can make warfarin work more strongly, so your blood may thin more than intended during the antibiotic course.',
    guidance:
      'Tell your doctor or pharmacist you are on warfarin. They will usually arrange a blood-clotting test during or just after the course.',
  },
  {
    a: 'warfarin',
    b: 'amiodarone',
    severity: 'severe',
    explanation:
      'Amiodarone slows the removal of warfarin from your body and the effect builds over weeks, which can lead to heavy bleeding.',
    guidance:
      'Your warfarin dose almost always needs lowering when amiodarone is started. Do not adjust it yourself - your doctor will guide this with blood tests.',
  },
  {
    a: 'warfarin',
    b: 'carbamazepine',
    severity: 'moderate',
    explanation:
      'Carbamazepine speeds up how fast your body clears warfarin, so your blood may not be thinned enough and a clot becomes more likely.',
    guidance:
      'If either medicine is started, stopped or changed, ask your doctor about extra blood-clotting checks. Do not stop either one on your own.',
  },
  {
    a: 'warfarin',
    b: 'rifampicin',
    severity: 'severe',
    explanation:
      'Rifampicin makes your liver clear warfarin much faster, so warfarin can stop protecting you against clots.',
    guidance:
      'Your warfarin dose usually needs a big change during and after rifampicin treatment. This must be managed by your doctor with regular blood tests.',
  },
  {
    a: 'warfarin',
    b: 'st johns wort',
    severity: 'severe',
    explanation:
      'This herbal supplement speeds up the breakdown of warfarin, so your blood may clot more easily again and raise your risk of a stroke or clot.',
    guidance:
      'Do not take St John’s wort while on warfarin. Tell your doctor or pharmacist about every herbal product you use, including ones bought over the counter.',
  },
  {
    a: 'warfarin',
    b: 'sertraline',
    severity: 'moderate',
    explanation:
      'Sertraline makes platelets less sticky, which adds to the bleeding risk from warfarin, especially bleeding in the stomach.',
    guidance:
      'This combination is often used safely, but tell your doctor and watch for unusual bruising, nosebleeds or black stools. Do not stop your antidepressant suddenly.',
  },
  {
    a: 'warfarin',
    b: 'levothyroxine',
    severity: 'moderate',
    explanation:
      'Thyroid hormone changes how quickly your body uses clotting proteins, so starting or changing levothyroxine can make warfarin work more strongly.',
    guidance:
      'Ask your doctor for a blood-clotting check a few weeks after any levothyroxine dose change. Keep taking both as prescribed.',
  },
  {
    a: 'warfarin',
    b: 'acetaminophen',
    severity: 'moderate',
    explanation:
      'Acetaminophen is still the safest everyday painkiller with warfarin, but taking full doses every day for more than a few days can gently increase blood thinning.',
    guidance:
      'Occasional doses are generally fine. If you need it daily for more than about a week, tell your doctor or pharmacist so your blood-clotting level can be checked.',
  },

  // ---------------------------------------------------------------------------
  // Direct oral anticoagulants
  // ---------------------------------------------------------------------------
  {
    a: 'apixaban',
    b: 'ibuprofen',
    severity: 'severe',
    explanation:
      'Apixaban keeps your blood from clotting, and ibuprofen damages the stomach lining while also affecting platelets. Together serious stomach bleeding is much more likely.',
    guidance:
      'Ask your doctor or pharmacist before taking ibuprofen while on apixaban. Seek urgent care for black stools or blood in vomit.',
    swapFor: 'acetaminophen',
    swapReason:
      'Acetaminophen controls pain without adding to the bleeding risk from apixaban.',
  },
  {
    a: 'apixaban',
    b: 'aspirin',
    severity: 'severe',
    explanation:
      'Both reduce your ability to form a clot, so bruising and bleeding become considerably more likely when they are combined.',
    guidance:
      'Sometimes both are prescribed on purpose for a set period. Confirm with your doctor that you are still meant to be on both, and never add aspirin yourself.',
  },
  {
    a: 'apixaban',
    b: 'ketoconazole',
    severity: 'severe',
    explanation:
      'Ketoconazole strongly blocks the route your body uses to clear apixaban, so apixaban levels can roughly double and cause dangerous bleeding.',
    guidance:
      'This pairing is generally avoided. Tell the prescriber you take apixaban so a different antifungal can be chosen.',
  },
  {
    a: 'apixaban',
    b: 'rifampicin',
    severity: 'severe',
    explanation:
      'Rifampicin clears apixaban out of your body much faster, which can leave you unprotected against a clot or stroke.',
    guidance:
      'Do not take these together without specialist advice. Tell your doctor about your apixaban before any tuberculosis treatment is started.',
  },
  {
    a: 'rivaroxaban',
    b: 'ibuprofen',
    severity: 'severe',
    explanation:
      'Rivaroxaban stops your blood clotting normally and ibuprofen irritates the stomach lining, so the two together clearly raise bleeding risk.',
    guidance:
      'Check with your doctor or pharmacist before using ibuprofen while on rivaroxaban, and report any black stools or unusual bruising straight away.',
    swapFor: 'acetaminophen',
    swapReason: 'Acetaminophen does not add to the bleeding risk from rivaroxaban.',
  },
  {
    a: 'dabigatran',
    b: 'verapamil',
    severity: 'moderate',
    explanation:
      'Verapamil increases how much dabigatran your body absorbs, which can raise bleeding risk, especially if your kidneys are not working well.',
    guidance:
      'Your dabigatran dose or timing may need adjusting. Ask your doctor before starting verapamil, and do not change doses yourself.',
  },

  // ---------------------------------------------------------------------------
  // Antiplatelets
  // ---------------------------------------------------------------------------
  {
    a: 'clopidogrel',
    b: 'omeprazole',
    severity: 'moderate',
    explanation:
      'Clopidogrel has to be switched on by a liver enzyme, and omeprazole blocks that enzyme. That can make clopidogrel work less well at protecting your heart.',
    guidance:
      'Ask your doctor or pharmacist whether a different stomach medicine would suit you better. Do not stop clopidogrel on your own.',
    swapFor: 'pantoprazole',
    swapReason:
      'Pantoprazole protects the stomach in the same way but barely affects how clopidogrel is activated.',
  },
  {
    a: 'clopidogrel',
    b: 'esomeprazole',
    severity: 'moderate',
    explanation:
      'Esomeprazole blocks the liver enzyme that turns clopidogrel into its active form, so clopidogrel may give you less protection.',
    guidance:
      'Raise this with your doctor or pharmacist at your next visit and ask whether your stomach medicine can be changed. Keep taking clopidogrel meanwhile.',
    swapFor: 'pantoprazole',
    swapReason:
      'Pantoprazole gives similar stomach protection without getting in the way of clopidogrel.',
  },
  {
    a: 'clopidogrel',
    b: 'aspirin',
    severity: 'moderate',
    explanation:
      'Both stop platelets from sticking together, so together they raise the chance of bruising and bleeding.',
    guidance:
      'After a stent or heart attack this combination is often intended for a set number of months. Check with your doctor how long you should stay on both.',
  },
  {
    a: 'clopidogrel',
    b: 'ibuprofen',
    severity: 'moderate',
    explanation:
      'Ibuprofen irritates the stomach lining while clopidogrel makes any bleeding harder to stop, so stomach bleeds become more likely.',
    guidance:
      'Prefer a different painkiller and ask your pharmacist what suits you. If you must use ibuprofen, keep it short and ask about stomach protection.',
    swapFor: 'acetaminophen',
    swapReason:
      'Acetaminophen relieves pain without irritating the stomach or affecting platelets.',
  },
  {
    a: 'aspirin',
    b: 'ibuprofen',
    severity: 'moderate',
    explanation:
      'Ibuprofen can block low-dose aspirin from reaching the platelets it is meant to protect, so your heart protection may be reduced. Stomach bleeding risk also rises.',
    guidance:
      'If you need both on the same day, ask your pharmacist about spacing them - aspirin is usually taken at least two hours before ibuprofen. Better still, use a different painkiller.',
    swapFor: 'acetaminophen',
    swapReason:
      'Acetaminophen does not compete with aspirin, so your heart protection stays intact.',
  },

  // ---------------------------------------------------------------------------
  // Serotonin syndrome and antidepressant interactions
  // ---------------------------------------------------------------------------
  {
    a: 'sertraline',
    b: 'tramadol',
    severity: 'severe',
    explanation:
      'Both raise serotonin levels in the brain. Too much serotonin can cause agitation, shivering, a racing heart, fever and confusion, which can become an emergency.',
    guidance:
      'Only use this combination if your doctor has weighed it up. Seek urgent care if you feel agitated, sweaty and shaky with muscle twitching after a dose.',
  },
  {
    a: 'fluoxetine',
    b: 'tramadol',
    severity: 'severe',
    explanation:
      'Fluoxetine and tramadol both push serotonin levels up, and fluoxetine also slows how tramadol is processed. This raises the risk of a serious reaction and of seizures.',
    guidance:
      'Ask your doctor for a different pain option before taking tramadol on fluoxetine. Get urgent help for fever, stiffness, confusion or twitching.',
  },
  {
    a: 'escitalopram',
    b: 'tramadol',
    severity: 'severe',
    explanation:
      'Taken together these can raise brain serotonin too far, causing restlessness, sweating, tremor, a fast heartbeat and confusion.',
    guidance:
      'Check with your doctor before combining them, and go to an emergency department if you develop fever with muscle twitching or severe agitation.',
  },
  {
    a: 'venlafaxine',
    b: 'tramadol',
    severity: 'severe',
    explanation:
      'Both medicines increase serotonin and both can lower the seizure threshold, so serotonin overload and fits become more likely.',
    guidance:
      'Discuss safer pain relief with your doctor before using tramadol on venlafaxine. Seek urgent care for shivering, confusion or a very fast heartbeat.',
  },
  {
    a: 'duloxetine',
    b: 'tramadol',
    severity: 'severe',
    explanation:
      'Duloxetine and tramadol both boost serotonin, and the combination can tip you into a serious reaction with fever, stiff muscles and confusion.',
    guidance:
      'Ask your doctor whether a different painkiller is suitable. If you already take both, learn the warning signs and get help quickly if they appear.',
  },
  {
    a: 'sertraline',
    b: 'linezolid',
    severity: 'severe',
    explanation:
      'Linezolid is an antibiotic that also acts on serotonin. Combined with sertraline it can cause a dangerous build-up of serotonin.',
    guidance:
      'This pairing is normally avoided. Tell the prescriber about your antidepressant before starting linezolid so alternatives can be considered.',
  },
  {
    a: 'fluoxetine',
    b: 'phenelzine',
    severity: 'severe',
    explanation:
      'Phenelzine belongs to an older antidepressant group called monoamine oxidase inhibitors. Combining one with fluoxetine can cause a life-threatening surge in serotonin.',
    guidance:
      'These must never be taken together, and a long gap is needed when switching between them. Only a doctor should plan that changeover.',
  },
  {
    a: 'sertraline',
    b: 'sumatriptan',
    severity: 'moderate',
    explanation:
      'Both affect serotonin, so there is a small chance of feeling agitated, shaky, sweaty or unusually warm after a migraine dose.',
    guidance:
      'Most people use these together without trouble. Mention it to your doctor or pharmacist, and stop the triptan and seek advice if you feel shivery and confused after a dose.',
  },
  {
    a: 'sertraline',
    b: 'st johns wort',
    severity: 'severe',
    explanation:
      'St John’s wort acts on serotonin in the same way an antidepressant does, so adding it to sertraline can cause a dangerous serotonin build-up.',
    guidance:
      'Do not take St John’s wort alongside an antidepressant. Tell your doctor about any herbal product you are using.',
  },
  {
    a: 'citalopram',
    b: 'ondansetron',
    severity: 'moderate',
    explanation:
      'Both can affect the electrical rhythm of the heart, and together that effect adds up. Both also act on serotonin.',
    guidance:
      'Tell your doctor if you take these together, especially if you have a heart condition or low potassium. Report fainting or palpitations promptly.',
  },
  {
    a: 'amitriptyline',
    b: 'fluoxetine',
    severity: 'moderate',
    explanation:
      'Fluoxetine slows down the breakdown of amitriptyline, so amitriptyline can build up and cause drowsiness, a dry mouth, a fast heartbeat and confusion.',
    guidance:
      'Your doctor may need to use a lower amitriptyline dose. Do not combine these without medical advice, and report a racing heart or heavy daytime drowsiness.',
  },
  {
    a: 'amitriptyline',
    b: 'tramadol',
    severity: 'moderate',
    explanation:
      'Both raise serotonin and both can make a seizure more likely, so the combination needs care.',
    guidance:
      'Ask your doctor whether the doses are appropriate for you. Report twitching, severe drowsiness or any blackout straight away.',
  },
  {
    a: 'sertraline',
    b: 'ibuprofen',
    severity: 'moderate',
    explanation:
      'Sertraline makes platelets less sticky and ibuprofen irritates the stomach lining, so stomach bleeding becomes more likely, particularly in older adults.',
    guidance:
      'Use the lowest dose of ibuprofen for the shortest time, or ask your pharmacist for another option. Report black stools or stomach pain to your doctor.',
    swapFor: 'acetaminophen',
    swapReason:
      'Acetaminophen does not irritate the stomach lining, so the combined bleeding risk goes away.',
  },
  {
    a: 'phenelzine',
    b: 'pseudoephedrine',
    severity: 'severe',
    explanation:
      'Phenelzine is an older antidepressant that stops your body breaking down stimulating chemicals. A decongestant like pseudoephedrine can then send your blood pressure dangerously high.',
    guidance:
      'Avoid cold and flu products containing decongestants while on phenelzine. Always ask a pharmacist before buying anything over the counter.',
  },
  {
    a: 'tramadol',
    b: 'bupropion',
    severity: 'severe',
    explanation:
      'Both medicines make a seizure more likely, and bupropion also slows the breakdown of tramadol. Together the chance of a fit rises noticeably.',
    guidance:
      'Tell your doctor if both appear on your list so an alternative can be considered. Seek urgent care after any blackout or fit.',
  },

  // ---------------------------------------------------------------------------
  // Statins
  // ---------------------------------------------------------------------------
  {
    a: 'simvastatin',
    b: 'clarithromycin',
    severity: 'severe',
    explanation:
      'Clarithromycin blocks the liver route that clears simvastatin, so simvastatin levels climb steeply and can break down your muscle tissue and harm your kidneys.',
    guidance:
      'Doctors usually pause the statin for the few days of antibiotic treatment. Ask your doctor or pharmacist what to do rather than deciding yourself, and report muscle pain or dark urine urgently.',
  },
  {
    a: 'atorvastatin',
    b: 'clarithromycin',
    severity: 'severe',
    explanation:
      'Clarithromycin makes atorvastatin build up in your body, which raises the risk of severe muscle damage.',
    guidance:
      'Tell the prescriber you take atorvastatin - a different antibiotic or a short statin pause is often arranged. Report muscle aches, weakness or cola-coloured urine at once.',
  },
  {
    a: 'simvastatin',
    b: 'itraconazole',
    severity: 'severe',
    explanation:
      'This antifungal sharply raises simvastatin levels, which can cause painful muscle breakdown and kidney injury.',
    guidance:
      'These are not normally used together. Speak to your doctor before starting itraconazole while on simvastatin.',
  },
  {
    a: 'simvastatin',
    b: 'gemfibrozil',
    severity: 'severe',
    explanation:
      'Both lower cholesterol but together they greatly increase the chance of serious muscle damage, so they are not meant to be combined.',
    guidance:
      'If both are on your list, contact your doctor before your next dose. Report muscle pain, tenderness or weakness immediately.',
  },
  {
    a: 'atorvastatin',
    b: 'gemfibrozil',
    severity: 'severe',
    explanation:
      'Gemfibrozil slows the clearance of atorvastatin and adds its own muscle effects, which can lead to severe muscle breakdown.',
    guidance:
      'Ask your doctor whether a different cholesterol combination is safer for you. Do not ignore new muscle pain or dark urine - get checked the same day.',
  },
  {
    a: 'simvastatin',
    b: 'amiodarone',
    severity: 'moderate',
    explanation:
      'Amiodarone raises simvastatin levels, which increases the chance of muscle pain and damage. There is a dose ceiling for simvastatin when the two are combined.',
    guidance:
      'Ask your doctor to confirm your simvastatin dose is low enough for use with amiodarone, and report new muscle aches or weakness.',
  },
  {
    a: 'simvastatin',
    b: 'amlodipine',
    severity: 'moderate',
    explanation:
      'Amlodipine slows the breakdown of simvastatin, so more of it stays in your blood and muscle side effects become more likely.',
    guidance:
      'There is a recommended maximum simvastatin dose when you also take amlodipine. Ask your doctor or pharmacist to check your dose, and report muscle pain.',
  },
  {
    a: 'atorvastatin',
    b: 'colchicine',
    severity: 'moderate',
    explanation:
      'Both can irritate muscle tissue, so taken together muscle pain and weakness are more likely, especially if your kidneys are not working well.',
    guidance:
      'Tell your doctor if you develop muscle aches, and ask whether your doses need reviewing. Do not take extra colchicine for a gout flare without advice.',
  },

  // ---------------------------------------------------------------------------
  // Blood pressure medicines, potassium and kidneys
  // ---------------------------------------------------------------------------
  {
    a: 'lisinopril',
    b: 'spironolactone',
    severity: 'severe',
    explanation:
      'Both medicines make your body hold on to potassium. Together potassium can climb to a level that upsets your heart rhythm.',
    guidance:
      'This pair is sometimes prescribed together for heart failure, but only with regular blood tests. Ask your doctor when your potassium was last checked, and avoid potassium-based salt substitutes.',
  },
  {
    a: 'ramipril',
    b: 'spironolactone',
    severity: 'severe',
    explanation:
      'Both raise the potassium level in your blood, and too much potassium can cause a dangerous heart rhythm without any warning symptoms.',
    guidance:
      'Make sure your doctor is monitoring your blood tests while you take both. Report muscle weakness, numbness or a fluttering heartbeat straight away.',
  },
  {
    a: 'telmisartan',
    b: 'spironolactone',
    severity: 'severe',
    explanation:
      'Telmisartan and spironolactone both push potassium up, and the combined effect can reach a level that affects your heart.',
    guidance:
      'Only take both under medical supervision with regular blood tests, and avoid salt substitutes that contain potassium.',
  },
  {
    a: 'lisinopril',
    b: 'potassium chloride',
    severity: 'severe',
    explanation:
      'Lisinopril already makes your body keep potassium, so adding a potassium supplement can push the level dangerously high.',
    guidance:
      'Do not take potassium supplements on your own while on lisinopril. If one was prescribed, confirm with your doctor that it is still needed and that your blood is being checked.',
  },
  {
    a: 'spironolactone',
    b: 'potassium chloride',
    severity: 'severe',
    explanation:
      'Spironolactone is a water tablet that keeps potassium in the body, so a potassium supplement on top can raise it to a harmful level.',
    guidance:
      'Check with your doctor before taking any potassium supplement with spironolactone, and avoid potassium-containing salt substitutes.',
  },
  {
    a: 'spironolactone',
    b: 'trimethoprim',
    severity: 'severe',
    explanation:
      'Trimethoprim acts on the kidney in a way that also holds potassium back, so combined with spironolactone potassium can rise sharply within days.',
    guidance:
      'Tell the prescriber you take spironolactone before starting trimethoprim, and ask whether a blood test is needed during the course.',
  },
  {
    a: 'lisinopril',
    b: 'ibuprofen',
    severity: 'moderate',
    explanation:
      'Ibuprofen makes lisinopril less effective at lowering blood pressure and puts extra strain on the kidneys, especially if you are also on a water tablet.',
    guidance:
      'Keep ibuprofen short and occasional, and ask your doctor or pharmacist first if you need it regularly. Drink enough fluid and report reduced urine output.',
    swapFor: 'acetaminophen',
    swapReason:
      'Acetaminophen does not raise blood pressure or strain the kidneys the way ibuprofen does.',
  },
  {
    a: 'lisinopril',
    b: 'lithium',
    severity: 'severe',
    explanation:
      'Lisinopril reduces how much lithium your kidneys remove, so lithium can build up to a toxic level.',
    guidance:
      'Your lithium level needs checking soon after starting or changing lisinopril. Contact your doctor urgently if you get tremor, vomiting, diarrhoea or slurred speech.',
  },
  {
    a: 'furosemide',
    b: 'ibuprofen',
    severity: 'moderate',
    explanation:
      'Ibuprofen blunts the effect of furosemide, so fluid can build up again, and the pair puts more strain on your kidneys.',
    guidance:
      'Avoid regular ibuprofen if you take furosemide, and ask your pharmacist for an alternative. Tell your doctor if your ankles swell or you gain weight quickly.',
    swapFor: 'acetaminophen',
    swapReason:
      'Acetaminophen relieves pain without working against your water tablet or straining the kidneys.',
  },
  {
    a: 'prednisolone',
    b: 'ibuprofen',
    severity: 'moderate',
    explanation:
      'Steroids and ibuprofen each irritate the stomach lining, so together stomach ulcers and bleeding become considerably more likely.',
    guidance:
      'Take both with food if you must, and ask your doctor whether you need a stomach-protecting medicine. Report stomach pain or black stools promptly.',
    swapFor: 'acetaminophen',
    swapReason:
      'Acetaminophen does not irritate the stomach lining, so the ulcer risk from the steroid is not increased.',
  },

  // ---------------------------------------------------------------------------
  // Digoxin
  // ---------------------------------------------------------------------------
  {
    a: 'digoxin',
    b: 'furosemide',
    severity: 'moderate',
    explanation:
      'Furosemide can wash potassium and magnesium out of your body, and low potassium makes digoxin far more likely to upset your heart rhythm.',
    guidance:
      'Keep up with the blood tests your doctor arranges. Report nausea, loss of appetite, blurred or yellow-tinged vision, or a very slow pulse.',
  },
  {
    a: 'digoxin',
    b: 'amiodarone',
    severity: 'severe',
    explanation:
      'Amiodarone can roughly double the amount of digoxin in your blood, which can cause a dangerously slow or irregular heartbeat.',
    guidance:
      'The digoxin dose is usually halved when amiodarone starts, but only your doctor should make that change. Report nausea, confusion or visual changes urgently.',
  },
  {
    a: 'digoxin',
    b: 'verapamil',
    severity: 'moderate',
    explanation:
      'Verapamil raises digoxin levels and also slows the heart itself, so your pulse can drop too low.',
    guidance:
      'Ask your doctor whether your digoxin dose needs lowering. Check your pulse as advised and report dizziness, fainting or a very slow heartbeat.',
  },
  {
    a: 'digoxin',
    b: 'clarithromycin',
    severity: 'severe',
    explanation:
      'Clarithromycin can cause a sharp rise in digoxin levels, which leads to nausea, confusion and dangerous heart rhythms.',
    guidance:
      'Tell the prescriber you take digoxin so another antibiotic can be considered. Report vomiting, confusion or visual changes during the course.',
  },

  // ---------------------------------------------------------------------------
  // Lithium
  // ---------------------------------------------------------------------------
  {
    a: 'lithium',
    b: 'ibuprofen',
    severity: 'severe',
    explanation:
      'Ibuprofen reduces how much lithium your kidneys can remove, so lithium can rise to a toxic level within days.',
    guidance:
      'Avoid ibuprofen unless your doctor has approved it and arranged lithium blood tests. Seek urgent help for tremor, vomiting, unsteadiness or slurred speech.',
    swapFor: 'acetaminophen',
    swapReason:
      'Acetaminophen does not affect how your kidneys clear lithium, so lithium levels stay stable.',
  },
  {
    a: 'lithium',
    b: 'hydrochlorothiazide',
    severity: 'severe',
    explanation:
      'This water tablet makes your kidneys hold on to lithium, which can push lithium into the toxic range.',
    guidance:
      'Your lithium level must be rechecked soon after this water tablet is started or changed. Contact your doctor urgently if you feel shaky, sick or confused.',
  },

  // ---------------------------------------------------------------------------
  // Methotrexate
  // ---------------------------------------------------------------------------
  {
    a: 'methotrexate',
    b: 'ibuprofen',
    severity: 'severe',
    explanation:
      'Ibuprofen slows how fast your kidneys clear methotrexate, so methotrexate can build up and damage your bone marrow, mouth lining and liver.',
    guidance:
      'Do not take ibuprofen with weekly methotrexate unless your doctor has specifically allowed it. Report mouth ulcers, fever or unusual bruising immediately.',
    swapFor: 'acetaminophen',
    swapReason:
      'Acetaminophen does not interfere with how your kidneys clear methotrexate.',
  },
  {
    a: 'methotrexate',
    b: 'trimethoprim',
    severity: 'severe',
    explanation:
      'Both medicines work against folate in the body, so together they can badly suppress your bone marrow and stop you making enough blood cells.',
    guidance:
      'This combination is generally avoided. Always tell the prescriber you take methotrexate before any antibiotic is started.',
  },
  {
    a: 'methotrexate',
    b: 'sulfamethoxazole',
    severity: 'severe',
    explanation:
      'This antibiotic adds to the folate-blocking effect of methotrexate and slows its removal, which can cause dangerous drops in blood cell counts.',
    guidance:
      'Tell the prescriber about your methotrexate so another antibiotic can be chosen. Get urgent help for fever, mouth ulcers or unusual bruising.',
  },
  {
    a: 'methotrexate',
    b: 'aspirin',
    severity: 'moderate',
    explanation:
      'Aspirin slows how quickly methotrexate leaves your body. Low-dose heart aspirin is usually managed safely, but full painkiller doses can let methotrexate build up to harmful levels.',
    guidance:
      'Tell the doctor who manages your methotrexate about any aspirin you take, and do not use full-strength aspirin for pain without asking first.',
  },

  // ---------------------------------------------------------------------------
  // Allopurinol
  // ---------------------------------------------------------------------------
  {
    a: 'allopurinol',
    b: 'azathioprine',
    severity: 'severe',
    explanation:
      'Allopurinol blocks the enzyme that breaks down azathioprine, so azathioprine builds up and can severely damage your bone marrow.',
    guidance:
      'These are only combined with a large azathioprine dose reduction and close blood monitoring by a specialist. Contact your doctor before taking both.',
  },
  {
    a: 'allopurinol',
    b: 'amoxicillin',
    severity: 'mild',
    explanation:
      'Taking these together makes a harmless-looking skin rash somewhat more likely than with either alone.',
    guidance:
      'Keep taking both unless a rash appears. If you develop a rash, stop and contact your doctor or pharmacist for advice.',
  },

  // ---------------------------------------------------------------------------
  // Sedation and slowed breathing
  // ---------------------------------------------------------------------------
  {
    a: 'alprazolam',
    b: 'morphine',
    severity: 'severe',
    explanation:
      'Both slow down the part of the brain that controls breathing. Together they can make your breathing dangerously shallow, especially while asleep.',
    guidance:
      'Only take both if a doctor has planned it, at the lowest doses. Make sure someone nearby knows, and call emergency services for heavy snoring that cannot be roused or bluish lips.',
  },
  {
    a: 'diazepam',
    b: 'morphine',
    severity: 'severe',
    explanation:
      'Diazepam and morphine both suppress breathing and deepen drowsiness, so the combination can stop you breathing properly.',
    guidance:
      'Do not add one to the other without your doctor knowing. Never drive after taking both, and get emergency help if breathing becomes slow or noisy.',
  },
  {
    a: 'lorazepam',
    b: 'oxycodone',
    severity: 'severe',
    explanation:
      'This pairing causes much deeper sedation than either alone and can slow your breathing to an unsafe level.',
    guidance:
      'Use only under medical supervision and at the smallest effective doses. Seek emergency help if the person cannot be woken.',
  },
  {
    a: 'clonazepam',
    b: 'tramadol',
    severity: 'severe',
    explanation:
      'Clonazepam and tramadol together cause heavy drowsiness and can slow your breathing dangerously.',
    guidance:
      'Tell your doctor that you take both so the plan can be reviewed. Avoid alcohol entirely, and do not drive until you know how it affects you.',
  },
  {
    a: 'zolpidem',
    b: 'codeine',
    severity: 'severe',
    explanation:
      'A sleeping tablet with an opioid cough or pain medicine can suppress breathing during sleep and cause confused night-time wandering.',
    guidance:
      'Avoid taking these on the same night unless your doctor has said it is safe. Ask your pharmacist before buying any cough syrup containing codeine.',
  },
  {
    a: 'gabapentin',
    b: 'morphine',
    severity: 'severe',
    explanation:
      'Gabapentin increases how much morphine your body absorbs and adds its own sedation, which can slow breathing dangerously.',
    guidance:
      'Any dose increase should be made slowly and by your doctor. Report unusual daytime sleepiness or breathing pauses during sleep.',
  },
  {
    a: 'diphenhydramine',
    b: 'alprazolam',
    severity: 'moderate',
    explanation:
      'Diphenhydramine, found in many sleep aids and allergy products, adds to the drowsiness and confusion from alprazolam, which raises the risk of falls.',
    guidance:
      'Ask your pharmacist for a non-drowsy allergy option instead. Do not drive or use stairs in the dark after taking both.',
  },
  {
    a: 'alprazolam',
    b: 'alcohol',
    severity: 'severe',
    explanation:
      'Alcohol deepens the sedative effect of alprazolam and can slow your breathing to a dangerous level, as well as causing memory blanks.',
    guidance:
      'Do not drink alcohol while taking alprazolam. If you find that difficult, tell your doctor so your treatment can be reviewed.',
  },
  {
    a: 'morphine',
    b: 'alcohol',
    severity: 'severe',
    explanation:
      'Alcohol and morphine together strongly suppress breathing. This combination is a common cause of accidental overdose.',
    guidance:
      'Avoid alcohol completely while taking morphine, and tell your doctor if you drink regularly so the plan can be adjusted safely.',
  },

  // ---------------------------------------------------------------------------
  // Erection medicines and nitrates
  // ---------------------------------------------------------------------------
  {
    a: 'sildenafil',
    b: 'nitroglycerin',
    severity: 'severe',
    explanation:
      'Both widen blood vessels. Together they can drop your blood pressure so far that you faint, and it can be life-threatening.',
    guidance:
      'Never take these together. If you use a heart spray or tablet for chest pain, tell your doctor before any erection medicine is prescribed.',
  },
  {
    a: 'sildenafil',
    b: 'isosorbide mononitrate',
    severity: 'severe',
    explanation:
      'This heart medicine and sildenafil both relax blood vessels, and the combined drop in blood pressure can cause collapse.',
    guidance:
      'Do not combine them. Tell your doctor or pharmacist about your heart tablets before using anything for erections, including products bought online.',
  },
  {
    a: 'tadalafil',
    b: 'nitroglycerin',
    severity: 'severe',
    explanation:
      'Tadalafil stays in the body for a long time, and taking a nitrate for chest pain during that window can cause a dangerous fall in blood pressure.',
    guidance:
      'Never use them together, and tell any emergency team that you have taken tadalafil before they give a nitrate. Ask your doctor how long to wait between them.',
  },
  {
    a: 'sildenafil',
    b: 'tamsulosin',
    severity: 'moderate',
    explanation:
      'Both relax blood vessels, so together they can make you feel faint or dizzy, particularly when standing up.',
    guidance:
      'Ask your doctor about spacing the doses several hours apart and starting at a low dose. Stand up slowly and sit down if you feel light-headed.',
  },

  // ---------------------------------------------------------------------------
  // Absorption: levothyroxine, antibiotics, minerals
  // ---------------------------------------------------------------------------
  {
    a: 'levothyroxine',
    b: 'calcium carbonate',
    severity: 'moderate',
    explanation:
      'Calcium binds to levothyroxine in the stomach so less of your thyroid medicine gets absorbed, and your thyroid levels can drift out of range.',
    guidance:
      'Take levothyroxine on an empty stomach and leave at least four hours before any calcium. Ask your pharmacist to help you set the timings.',
  },
  {
    a: 'levothyroxine',
    b: 'ferrous sulfate',
    severity: 'moderate',
    explanation:
      'Iron sticks to levothyroxine in the gut, so much less thyroid medicine reaches your bloodstream.',
    guidance:
      'Separate them by at least four hours - thyroid tablet first thing, iron later in the day. Ask your doctor to recheck your thyroid blood test if you have been taking them together.',
  },
  {
    a: 'levothyroxine',
    b: 'omeprazole',
    severity: 'moderate',
    explanation:
      'Levothyroxine needs stomach acid to dissolve properly, and omeprazole reduces that acid, so you may absorb less of your thyroid dose.',
    guidance:
      'Keep taking both as prescribed but ask your doctor for a thyroid blood test after starting or stopping omeprazole, in case your dose needs adjusting.',
  },
  {
    a: 'levothyroxine',
    b: 'aluminium hydroxide',
    severity: 'moderate',
    explanation:
      'Antacids bind levothyroxine in the stomach so less of it is absorbed and your thyroid control can slip.',
    guidance:
      'Take your thyroid tablet at least four hours away from any antacid. Ask your pharmacist to check the timing of everything you take in the morning.',
  },
  {
    a: 'doxycycline',
    b: 'calcium carbonate',
    severity: 'moderate',
    explanation:
      'Calcium, including the calcium in milk and supplements, binds doxycycline in the gut so the antibiotic may not work.',
    guidance:
      'Take doxycycline at least two hours before or four hours after calcium or dairy. Ask your pharmacist to map out your day if this is confusing.',
  },
  {
    a: 'ciprofloxacin',
    b: 'ferrous sulfate',
    severity: 'moderate',
    explanation:
      'Iron binds ciprofloxacin in the gut and can block a large part of the dose from being absorbed.',
    guidance:
      'Space them out - ciprofloxacin two hours before or six hours after your iron tablet. Do not stop the antibiotic early; ask your pharmacist about timing.',
  },
  {
    a: 'calcium carbonate',
    b: 'ferrous sulfate',
    severity: 'mild',
    explanation:
      'Calcium reduces how much iron your body takes in, so an iron supplement works less well when taken at the same time.',
    guidance:
      'Take them at different times of day, for example iron in the morning and calcium in the evening. Ask your pharmacist if you are unsure.',
  },
  {
    a: 'doxycycline',
    b: 'isotretinoin',
    severity: 'severe',
    explanation:
      'Both can raise the pressure of fluid around the brain. Together that can cause severe headaches and vision problems.',
    guidance:
      'These acne treatments should not be combined. Contact your prescriber promptly, and seek urgent care for a bad headache with blurred or double vision.',
  },

  // ---------------------------------------------------------------------------
  // Breathing and heart medicines
  // ---------------------------------------------------------------------------
  {
    a: 'theophylline',
    b: 'ciprofloxacin',
    severity: 'severe',
    explanation:
      'Ciprofloxacin sharply slows the breakdown of theophylline, which can cause vomiting, a racing heart, fits and dangerous heart rhythms.',
    guidance:
      'Tell the prescriber you take theophylline before starting ciprofloxacin - a different antibiotic is usually chosen. Report a racing heart, vomiting or tremor urgently.',
  },
  {
    a: 'propranolol',
    b: 'salbutamol',
    severity: 'severe',
    explanation:
      'Propranolol blocks the very receptors that your salbutamol inhaler needs to open your airways, so your reliever may not work during an attack.',
    guidance:
      'If you have asthma, tell your doctor before taking propranolol. Seek urgent help if your reliever inhaler stops easing your breathing.',
  },
  {
    a: 'verapamil',
    b: 'metoprolol',
    severity: 'severe',
    explanation:
      'Both slow the heart and weaken its pumping. Together your pulse can drop dangerously low or the heart’s electrical signal can be blocked.',
    guidance:
      'This pair needs close medical supervision. Check your pulse as advised, and seek urgent care for fainting, severe dizziness or a pulse below the level your doctor set.',
  },
  {
    a: 'diltiazem',
    b: 'metoprolol',
    severity: 'moderate',
    explanation:
      'Diltiazem and metoprolol both slow the heart rate, so together your pulse and blood pressure can fall more than intended.',
    guidance:
      'Ask your doctor what pulse rate is too low for you and how often to check. Report dizziness on standing or episodes of near-fainting.',
  },

  // ---------------------------------------------------------------------------
  // Diabetes
  // ---------------------------------------------------------------------------
  {
    a: 'metformin',
    b: 'iodinated contrast',
    severity: 'moderate',
    explanation:
      'The dye used for some scans can briefly stress the kidneys, and if metformin then builds up it can cause a rare but serious acid build-up in the blood.',
    guidance:
      'Tell the scan team you take metformin before any scan with dye. They will advise whether to pause metformin and when to restart it.',
  },
  {
    a: 'metformin',
    b: 'alcohol',
    severity: 'moderate',
    explanation:
      'Heavy drinking on metformin raises the risk of a rare but serious acid build-up in the blood, and can also cause low blood sugar.',
    guidance:
      'Avoid binge drinking and do not drink on an empty stomach. Talk to your doctor about what amount, if any, is safe for you.',
  },
  {
    a: 'insulin',
    b: 'metoprolol',
    severity: 'moderate',
    explanation:
      'Metoprolol can hide the early warning signs of low blood sugar, such as a pounding heart and shakiness, so a low can creep up on you.',
    guidance:
      'Check your blood sugar more often, especially when driving, and learn the signs that are not hidden, like sweating and hunger. Discuss targets with your doctor.',
  },
  {
    a: 'glimepiride',
    b: 'propranolol',
    severity: 'moderate',
    explanation:
      'Propranolol masks the shakiness and fast heartbeat that normally warn you of a low blood sugar from glimepiride.',
    guidance:
      'Test your blood sugar more often and always carry a fast sugar source. Tell your doctor if you have had a low you did not feel coming.',
  },
  {
    a: 'glimepiride',
    b: 'alcohol',
    severity: 'moderate',
    explanation:
      'Alcohol stops your liver releasing stored sugar, so a low blood sugar can happen hours later, often overnight.',
    guidance:
      'If you drink, eat with it and check your sugar before bed. Discuss safe limits with your doctor or diabetes nurse.',
  },

  // ---------------------------------------------------------------------------
  // Contraception and epilepsy medicines
  // ---------------------------------------------------------------------------
  {
    a: 'ethinylestradiol',
    b: 'carbamazepine',
    severity: 'severe',
    explanation:
      'Carbamazepine speeds up the breakdown of the hormones in the contraceptive pill, so the pill can stop preventing pregnancy.',
    guidance:
      'Use an additional or different method of contraception and speak to your doctor or family planning clinic before relying on the pill.',
  },
  {
    a: 'ethinylestradiol',
    b: 'rifampicin',
    severity: 'severe',
    explanation:
      'Rifampicin strongly speeds up the clearance of contraceptive hormones, so the pill can fail even weeks after the course ends.',
    guidance:
      'Use another reliable method of contraception during treatment and for several weeks afterwards. Ask your doctor exactly how long to continue it.',
  },
  {
    a: 'ethinylestradiol',
    b: 'st johns wort',
    severity: 'severe',
    explanation:
      'St John’s wort makes your body break down the contraceptive pill faster, which has led to unplanned pregnancies and breakthrough bleeding.',
    guidance:
      'Avoid this herbal supplement if you rely on the pill, and tell your doctor or pharmacist about every supplement you take.',
  },
  {
    a: 'ethinylestradiol',
    b: 'lamotrigine',
    severity: 'moderate',
    explanation:
      'The contraceptive pill lowers lamotrigine levels, so seizures can return, and levels rise again during the pill-free week.',
    guidance:
      'Tell your epilepsy doctor before starting or stopping the pill so your lamotrigine dose can be reviewed. Do not change either dose yourself.',
  },
  {
    a: 'valproate',
    b: 'lamotrigine',
    severity: 'severe',
    explanation:
      'Valproate roughly doubles lamotrigine levels, which sharply raises the risk of a severe, potentially life-threatening skin reaction.',
    guidance:
      'Lamotrigine must be started at a much lower dose and increased very slowly when valproate is also taken. Stop and seek urgent care for any new rash.',
  },
  {
    a: 'carbamazepine',
    b: 'clarithromycin',
    severity: 'moderate',
    explanation:
      'Clarithromycin slows the breakdown of carbamazepine, so levels rise and can cause dizziness, unsteadiness, double vision and drowsiness.',
    guidance:
      'Tell the prescriber you take carbamazepine so another antibiotic can be considered. Report dizziness or double vision during the course.',
  },
  {
    a: 'phenytoin',
    b: 'fluconazole',
    severity: 'moderate',
    explanation:
      'Fluconazole slows how your body clears phenytoin, so phenytoin can build up and cause unsteadiness, slurred speech and double vision.',
    guidance:
      'Mention your phenytoin before any antifungal is started. Report unsteadiness or visual changes to your doctor promptly.',
  },
  {
    a: 'st johns wort',
    b: 'cyclosporine',
    severity: 'severe',
    explanation:
      'St John’s wort makes the body clear cyclosporine much faster, which has caused transplanted organs to be rejected.',
    guidance:
      'Never take this supplement if you are on cyclosporine. Tell your transplant team about any over-the-counter or herbal product before you start it.',
  },

  // ---------------------------------------------------------------------------
  // Other well-established pairs
  // ---------------------------------------------------------------------------
  {
    a: 'metronidazole',
    b: 'alcohol',
    severity: 'moderate',
    explanation:
      'Drinking while on metronidazole can cause flushing, a pounding headache, nausea and vomiting soon after the drink.',
    guidance:
      'Avoid alcohol during the course and for a couple of days afterwards. Ask your pharmacist exactly how long to wait for your prescription.',
  },
  {
    a: 'ciprofloxacin',
    b: 'tizanidine',
    severity: 'severe',
    explanation:
      'Ciprofloxacin blocks the breakdown of tizanidine, so tizanidine levels soar and can cause a dangerous drop in blood pressure and heavy sedation.',
    guidance:
      'These should not be taken together. Tell the prescriber about your muscle relaxant before starting ciprofloxacin.',
  },
  {
    a: 'clarithromycin',
    b: 'colchicine',
    severity: 'severe',
    explanation:
      'Clarithromycin stops colchicine being cleared from the body, which can cause severe, sometimes fatal, colchicine poisoning.',
    guidance:
      'Avoid this combination, especially if your kidneys are not working well. Tell the prescriber you take colchicine before any antibiotic is chosen.',
  },
  {
    a: 'levodopa',
    b: 'metoclopramide',
    severity: 'moderate',
    explanation:
      'Metoclopramide works against levodopa in the brain, so Parkinson symptoms such as stiffness and slowness can get noticeably worse.',
    guidance:
      'Ask your doctor or pharmacist for a different anti-sickness medicine that is safe in Parkinson disease. Do not stop your levodopa.',
  },
  {
    a: 'ibuprofen',
    b: 'naproxen',
    severity: 'moderate',
    explanation:
      'These are two medicines of the same type. Taking both at once does not relieve pain any better but roughly doubles the risk of stomach ulcers and kidney strain.',
    guidance:
      'Take only one anti-inflammatory painkiller at a time. Check combination cold and pain products with your pharmacist, as they often contain one already.',
    swapFor: 'acetaminophen',
    swapReason:
      'Acetaminophen can be added to a single anti-inflammatory safely, unlike a second one of the same type.',
  },
  {
    a: 'acetaminophen',
    b: 'alcohol',
    severity: 'moderate',
    explanation:
      'Regular drinking makes your liver more vulnerable to damage from acetaminophen, even at doses that would normally be safe.',
    guidance:
      'Keep to the dose on the label, never take two products containing it at once, and talk to your doctor if you drink most days.',
  },
  {
    a: 'ibuprofen',
    b: 'alcohol',
    severity: 'moderate',
    explanation:
      'Both irritate the stomach lining, so together they make stomach pain, ulcers and bleeding more likely.',
    guidance:
      'Take ibuprofen with food and avoid drinking while using it regularly. See your doctor for stomach pain, black stools or vomit that looks like coffee grounds.',
  },
  {
    a: 'cetirizine',
    b: 'alcohol',
    severity: 'mild',
    explanation:
      'Cetirizine makes some people drowsy, and alcohol adds to that, so you may feel more sleepy or slower to react than usual.',
    guidance:
      'See how cetirizine affects you before drinking, and do not drive if you feel drowsy. Ask your pharmacist about a less sedating option if this is a problem.',
  },
  {
    a: 'ciprofloxacin',
    b: 'caffeine',
    severity: 'mild',
    explanation:
      'Ciprofloxacin slows the breakdown of caffeine, so your usual coffee or tea can leave you jittery, restless or unable to sleep.',
    guidance:
      'Cut back on coffee, tea and energy drinks during the course. Mention it to your pharmacist if you feel unusually restless.',
  },

  // ---------------------------------------------------------------------------
  // Commonly prescribed to women and to older adults in India.
  // Added because the original set skewed towards hospital medicine and missed
  // the combinations that actually turn up on a family's kitchen shelf.
  // ---------------------------------------------------------------------------
  {
    a: 'alendronate',
    b: 'calcium carbonate',
    severity: 'moderate',
    explanation:
      'Calcium binds to alendronate in the stomach, so the bone tablet is barely absorbed and stops protecting you.',
    guidance:
      'Take alendronate first thing on an empty stomach with plain water, stay upright, and leave at least 30 minutes — ideally longer — before calcium or breakfast. Your pharmacist can set the timings out for you.',
  },
  {
    a: 'alendronate',
    b: 'ferrous sulfate',
    severity: 'moderate',
    explanation:
      'Iron binds to alendronate the same way calcium does and blocks its absorption.',
    guidance:
      'Keep the two at opposite ends of the day. Your pharmacist can help you set the timings.',
  },
  {
    a: 'alendronate',
    b: 'ibuprofen',
    severity: 'moderate',
    explanation:
      'Both irritate the lining of the stomach and food pipe. Together the chance of pain, ulcers or bleeding goes up.',
    guidance:
      'Tell your doctor if you need regular pain relief. Paracetamol is usually gentler on the stomach.',
    swapFor: 'acetaminophen',
    swapReason: 'Paracetamol relieves pain without irritating the stomach lining.',
  },
  {
    // Order matters: `swapFor` replaces drug `b`, and the drug we are telling
    // her to swap is the painkiller, never the anticoagulant.
    a: 'warfarin',
    b: 'mefenamic acid',
    severity: 'severe',
    explanation:
      'Mefenamic acid thins the blood further and irritates the stomach lining, so on warfarin the risk of a serious bleed rises sharply.',
    guidance:
      'Do not take mefenamic acid for period pain while on warfarin without asking your doctor. Get urgent help for black stools, blood in vomit or bruising that keeps spreading.',
    swapFor: 'acetaminophen',
    swapReason: 'Paracetamol eases pain without adding to the bleeding risk.',
  },
  {
    a: 'aspirin',
    b: 'mefenamic acid',
    severity: 'moderate',
    explanation:
      'Two anti-inflammatory medicines together roughly double the irritation to the stomach lining without adding much pain relief.',
    guidance:
      'Avoid taking both on the same day. If you are on aspirin for your heart, ask your doctor or pharmacist for a gentler painkiller instead.',
    swapFor: 'acetaminophen',
    swapReason: 'Paracetamol does not irritate the stomach the way these do.',
  },
  {
    a: 'mefenamic acid',
    b: 'ramipril',
    severity: 'moderate',
    explanation:
      'Anti-inflammatory painkillers blunt blood-pressure medicines and put extra strain on the kidneys, especially in older adults.',
    guidance:
      'Occasional use is usually fine. Tell your doctor if you are taking it for more than a few days at a time.',
  },
  {
    a: 'tranexamic acid',
    b: 'estradiol',
    severity: 'severe',
    explanation:
      'Both raise the tendency of blood to clot. Together the risk of a clot in the leg or lung goes up meaningfully.',
    guidance:
      'This combination needs a doctor who knows your full history. Seek urgent help for calf swelling, chest pain or sudden breathlessness.',
  },
  {
    a: 'tranexamic acid',
    b: 'norethisterone',
    severity: 'moderate',
    explanation:
      'Both are used for heavy periods and both nudge the blood towards clotting, so using them together needs a little more thought.',
    guidance:
      'Often prescribed deliberately and safely. Just make sure the doctor prescribing one knows about the other.',
  },
  {
    a: 'domperidone',
    b: 'ondansetron',
    severity: 'severe',
    explanation:
      'Both affect the heart\'s electrical rhythm. Taken together they can cause a dangerous irregular heartbeat.',
    guidance:
      'Do not combine without a doctor saying so. Seek urgent help for fainting, palpitations or a racing heart.',
  },
  {
    a: 'domperidone',
    b: 'fluconazole',
    severity: 'severe',
    explanation:
      'Fluconazole slows the breakdown of domperidone, raising its level and with it the risk of a dangerous heart rhythm.',
    guidance:
      'Ask your doctor for a different anti-sickness medicine while you are on fluconazole.',
  },
  {
    a: 'pantoprazole',
    b: 'levothyroxine',
    severity: 'moderate',
    explanation:
      'Acid-reducing medicines lower the absorption of thyroid tablets, so your thyroid level can drift down.',
    guidance:
      'Take levothyroxine on an empty stomach first thing and the pantoprazole later. Ask for a thyroid blood test if you feel unusually tired.',
  },
  {
    a: 'methylcobalamin',
    b: 'metformin',
    severity: 'mild',
    explanation:
      'Metformin taken for a long time lowers vitamin B12 levels, which is exactly why B12 is often prescribed alongside it.',
    guidance:
      'Nothing to avoid here — this pairing is usually intentional. Ask your doctor for a B12 blood test every year or so.',
  },
  {
    a: 'cholecalciferol',
    b: 'hydrochlorothiazide',
    severity: 'moderate',
    explanation:
      'This water tablet makes the body hold on to calcium, and vitamin D increases how much calcium you absorb. Together the calcium level can climb too high.',
    guidance:
      'Usually managed with an occasional blood test. Tell your doctor about nausea, confusion or unusual thirst.',
  },
  {
    a: 'finasteride',
    b: 'tamsulosin',
    severity: 'mild',
    explanation:
      'These are often prescribed together on purpose for an enlarged prostate and work in different ways.',
    guidance:
      'No action needed. Stand up slowly for the first few days, as the combination can make you light-headed — tell your doctor if the dizziness persists.',
  },
];

/** Every generic name that appears anywhere in the rule set, including swap targets. */
/**
 * Drugs the app recognises by name but has no interaction rule for.
 *
 * Without this list, a brand name whose generic never appears in a rule simply
 * fails to resolve — so typing "Crestor", "Losar" or "Allegra" got you a "did
 * you mean?" and no interaction checking at all, even though the synonym table
 * had the brand all along. Recognising a drug and having nothing to warn about
 * are two different things, and the app needs to be able to say the second one.
 */
const RECOGNISED_WITHOUT_RULES: string[] = [
  // cardiovascular
  'rosuvastatin', 'fenofibrate', 'losartan', 'enalapril', 'atenolol',
  // diabetes
  'gliclazide', 'glibenclamide',
  // stomach
  'rabeprazole',
  // anti-infectives
  'azithromycin', 'levofloxacin', 'erythromycin', 'cefixime',
  // neurology and allergy
  'selegiline', 'pregabalin', 'fexofenadine', 'loratadine', 'montelukast',
  // emergency medicines
  'epinephrine', 'norepinephrine',
  // women's health and supplements
  'medroxyprogesterone', 'folic acid',
];

export const KNOWN_GENERICS: Set<string> = new Set<string>([
  ...INTERACTION_RULES.flatMap((rule) =>
    rule.swapFor ? [rule.a, rule.b, rule.swapFor] : [rule.a, rule.b],
  ),
  ...RECOGNISED_WITHOUT_RULES,
]);

/** Builds the order-independent lookup key for a pair of generic names. */
function pairKey(first: string, second: string): string {
  const x = first.trim().toLowerCase();
  const y = second.trim().toLowerCase();
  return x < y ? `${x}|${y}` : `${y}|${x}`;
}

/** Built once at module load so the checker never scans the array per pair. */
const RULE_INDEX: Map<string, InteractionRule> = (() => {
  const index = new Map<string, InteractionRule>();
  for (const rule of INTERACTION_RULES) {
    index.set(pairKey(rule.a, rule.b), rule);
  }
  return index;
})();

/**
 * Looks up the interaction between two generic drug names.
 * Order-independent and case-insensitive. Returns undefined when no rule exists.
 */
export function findInteraction(
  genericA: string,
  genericB: string,
): InteractionRule | undefined {
  if (!genericA || !genericB) return undefined;
  return RULE_INDEX.get(pairKey(genericA, genericB));
}
