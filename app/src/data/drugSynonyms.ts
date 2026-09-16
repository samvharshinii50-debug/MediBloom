import type { DrugSynonym } from './types';
import { KNOWN_GENERICS } from './interactions';

/**
 * Brand names and alternate spellings mapped to canonical lowercase generics.
 *
 * This is what lets the app recognise a medicine whether the user types
 * "Tylenol", "Crocin", "acetaminophen" or "paracetamol", and what makes a
 * scanned prescription line resolve to something we can actually check.
 *
 * Conventions:
 *  - Everything is lowercase, and no alias appears twice.
 *  - Combination brands are mapped to the ingredient that actually drives the
 *    interactions (for example Augmentin -> amoxicillin, Combiflam -> ibuprofen).
 *  - Prednisone is mapped to prednisolone: the body converts one into the other
 *    and they behave the same way for interaction checking.
 *  - Only brands the author is confident about are listed. A missing brand is
 *    safer than a wrong one.
 */
export const DRUG_SYNONYMS: DrugSynonym[] = [
  // --- acetaminophen / paracetamol -------------------------------------------
  { alias: 'paracetamol', generic: 'acetaminophen' },
  { alias: 'paracetmol', generic: 'acetaminophen' },
  { alias: 'acetaminofen', generic: 'acetaminophen' },
  { alias: 'apap', generic: 'acetaminophen' },
  { alias: 'tylenol', generic: 'acetaminophen' },
  { alias: 'crocin', generic: 'acetaminophen' },
  { alias: 'dolo', generic: 'acetaminophen' },
  { alias: 'calpol', generic: 'acetaminophen' },
  { alias: 'panadol', generic: 'acetaminophen' },
  { alias: 'metacin', generic: 'acetaminophen' },
  { alias: 'paracip', generic: 'acetaminophen' },

  // --- ibuprofen --------------------------------------------------------------
  { alias: 'ibuprofin', generic: 'ibuprofen' },
  { alias: 'advil', generic: 'ibuprofen' },
  { alias: 'motrin', generic: 'ibuprofen' },
  { alias: 'brufen', generic: 'ibuprofen' },
  { alias: 'nurofen', generic: 'ibuprofen' },
  { alias: 'ibugesic', generic: 'ibuprofen' },
  { alias: 'combiflam', generic: 'ibuprofen' },

  // --- other anti-inflammatory painkillers ------------------------------------
  { alias: 'aleve', generic: 'naproxen' },
  { alias: 'naprosyn', generic: 'naproxen' },
  { alias: 'naxdom', generic: 'naproxen' },
  { alias: 'voveran', generic: 'diclofenac' },
  { alias: 'voltaren', generic: 'diclofenac' },
  { alias: 'dynapar', generic: 'diclofenac' },
  { alias: 'diclofenac sodium', generic: 'diclofenac' },

  // --- aspirin ----------------------------------------------------------------
  { alias: 'acetylsalicylic acid', generic: 'aspirin' },
  { alias: 'asa', generic: 'aspirin' },
  { alias: 'ecosprin', generic: 'aspirin' },
  { alias: 'disprin', generic: 'aspirin' },
  { alias: 'loprin', generic: 'aspirin' },

  // --- anticoagulants and antiplatelets ---------------------------------------
  { alias: 'coumadin', generic: 'warfarin' },
  { alias: 'jantoven', generic: 'warfarin' },
  { alias: 'warfarin sodium', generic: 'warfarin' },
  { alias: 'warf', generic: 'warfarin' },
  { alias: 'plavix', generic: 'clopidogrel' },
  { alias: 'deplatt', generic: 'clopidogrel' },
  { alias: 'clopilet', generic: 'clopidogrel' },
  { alias: 'clavix', generic: 'clopidogrel' },
  { alias: 'eliquis', generic: 'apixaban' },
  { alias: 'xarelto', generic: 'rivaroxaban' },
  { alias: 'pradaxa', generic: 'dabigatran' },

  // --- statins and other cholesterol medicines --------------------------------
  { alias: 'lipitor', generic: 'atorvastatin' },
  { alias: 'atorva', generic: 'atorvastatin' },
  { alias: 'storvas', generic: 'atorvastatin' },
  { alias: 'tonact', generic: 'atorvastatin' },
  { alias: 'crestor', generic: 'rosuvastatin' },
  { alias: 'rosuvas', generic: 'rosuvastatin' },
  { alias: 'rozavel', generic: 'rosuvastatin' },
  { alias: 'zocor', generic: 'simvastatin' },
  { alias: 'simvastatin sodium', generic: 'simvastatin' },
  { alias: 'lopid', generic: 'gemfibrozil' },
  { alias: 'tricor', generic: 'fenofibrate' },

  // --- diabetes ---------------------------------------------------------------
  { alias: 'glucophage', generic: 'metformin' },
  { alias: 'glycomet', generic: 'metformin' },
  { alias: 'obimet', generic: 'metformin' },
  { alias: 'metfornin', generic: 'metformin' },
  { alias: 'metformin hydrochloride', generic: 'metformin' },
  { alias: 'amaryl', generic: 'glimepiride' },
  { alias: 'glimestar', generic: 'glimepiride' },
  { alias: 'diamicron', generic: 'gliclazide' },
  { alias: 'daonil', generic: 'glibenclamide' },
  { alias: 'glyburide', generic: 'glibenclamide' },
  { alias: 'lantus', generic: 'insulin' },
  { alias: 'humalog', generic: 'insulin' },
  { alias: 'novorapid', generic: 'insulin' },
  { alias: 'mixtard', generic: 'insulin' },
  { alias: 'huminsulin', generic: 'insulin' },
  { alias: 'actrapid', generic: 'insulin' },
  { alias: 'insulin glargine', generic: 'insulin' },
  { alias: 'insulin lispro', generic: 'insulin' },

  // --- blood pressure and heart -----------------------------------------------
  { alias: 'norvasc', generic: 'amlodipine' },
  { alias: 'amlokind', generic: 'amlodipine' },
  { alias: 'amlong', generic: 'amlodipine' },
  { alias: 'stamlo', generic: 'amlodipine' },
  { alias: 'amlodipine besylate', generic: 'amlodipine' },
  { alias: 'telma', generic: 'telmisartan' },
  { alias: 'telmikind', generic: 'telmisartan' },
  { alias: 'micardis', generic: 'telmisartan' },
  { alias: 'cozaar', generic: 'losartan' },
  { alias: 'losar', generic: 'losartan' },
  { alias: 'losartan potassium', generic: 'losartan' },
  { alias: 'zestril', generic: 'lisinopril' },
  { alias: 'prinivil', generic: 'lisinopril' },
  { alias: 'vasotec', generic: 'enalapril' },
  { alias: 'envas', generic: 'enalapril' },
  { alias: 'altace', generic: 'ramipril' },
  { alias: 'cardace', generic: 'ramipril' },
  { alias: 'lopressor', generic: 'metoprolol' },
  { alias: 'metolar', generic: 'metoprolol' },
  { alias: 'metpure', generic: 'metoprolol' },
  { alias: 'tenormin', generic: 'atenolol' },
  { alias: 'aten', generic: 'atenolol' },
  { alias: 'inderal', generic: 'propranolol' },
  { alias: 'ciplar', generic: 'propranolol' },
  { alias: 'isoptin', generic: 'verapamil' },
  { alias: 'calan', generic: 'verapamil' },
  { alias: 'cardizem', generic: 'diltiazem' },
  { alias: 'dilzem', generic: 'diltiazem' },
  { alias: 'lasix', generic: 'furosemide' },
  { alias: 'frusemide', generic: 'furosemide' },
  { alias: 'frusolone', generic: 'furosemide' },
  { alias: 'aldactone', generic: 'spironolactone' },
  { alias: 'hctz', generic: 'hydrochlorothiazide' },
  { alias: 'microzide', generic: 'hydrochlorothiazide' },
  { alias: 'aquazide', generic: 'hydrochlorothiazide' },
  { alias: 'lanoxin', generic: 'digoxin' },
  { alias: 'cordarone', generic: 'amiodarone' },
  { alias: 'glyceryl trinitrate', generic: 'nitroglycerin' },
  { alias: 'nitroglycerine', generic: 'nitroglycerin' },
  { alias: 'nitrostat', generic: 'nitroglycerin' },
  { alias: 'imdur', generic: 'isosorbide mononitrate' },
  { alias: 'monotrate', generic: 'isosorbide mononitrate' },
  { alias: 'ismn', generic: 'isosorbide mononitrate' },

  // --- thyroid ----------------------------------------------------------------
  { alias: 'synthroid', generic: 'levothyroxine' },
  { alias: 'eltroxin', generic: 'levothyroxine' },
  { alias: 'thyronorm', generic: 'levothyroxine' },
  { alias: 'thyrox', generic: 'levothyroxine' },
  { alias: 'euthyrox', generic: 'levothyroxine' },
  { alias: 'levothyroxin', generic: 'levothyroxine' },
  { alias: 'l-thyroxine', generic: 'levothyroxine' },
  { alias: 'levothyroxine sodium', generic: 'levothyroxine' },

  // --- stomach ----------------------------------------------------------------
  { alias: 'prilosec', generic: 'omeprazole' },
  { alias: 'omez', generic: 'omeprazole' },
  { alias: 'ocid', generic: 'omeprazole' },
  { alias: 'omeprazol', generic: 'omeprazole' },
  { alias: 'nexium', generic: 'esomeprazole' },
  { alias: 'nexpro', generic: 'esomeprazole' },
  { alias: 'esomeprazol', generic: 'esomeprazole' },
  { alias: 'protonix', generic: 'pantoprazole' },
  { alias: 'pantocid', generic: 'pantoprazole' },
  { alias: 'pantop', generic: 'pantoprazole' },
  { alias: 'pan', generic: 'pantoprazole' },
  { alias: 'pan-d', generic: 'pantoprazole' },
  { alias: 'razo', generic: 'rabeprazole' },
  { alias: 'gelusil', generic: 'aluminium hydroxide' },
  { alias: 'digene', generic: 'aluminium hydroxide' },
  { alias: 'maalox', generic: 'aluminium hydroxide' },
  { alias: 'aluminum hydroxide', generic: 'aluminium hydroxide' },
  { alias: 'zofran', generic: 'ondansetron' },
  { alias: 'emeset', generic: 'ondansetron' },
  { alias: 'reglan', generic: 'metoclopramide' },
  { alias: 'perinorm', generic: 'metoclopramide' },
  { alias: 'maxolon', generic: 'metoclopramide' },

  // --- antibiotics and antifungals --------------------------------------------
  { alias: 'zithromax', generic: 'azithromycin' },
  { alias: 'azithral', generic: 'azithromycin' },
  { alias: 'azee', generic: 'azithromycin' },
  { alias: 'z-pak', generic: 'azithromycin' },
  { alias: 'cipro', generic: 'ciprofloxacin' },
  { alias: 'ciplox', generic: 'ciprofloxacin' },
  { alias: 'cifran', generic: 'ciprofloxacin' },
  { alias: 'levaquin', generic: 'levofloxacin' },
  { alias: 'levoflox', generic: 'levofloxacin' },
  { alias: 'augmentin', generic: 'amoxicillin' },
  { alias: 'amoxil', generic: 'amoxicillin' },
  { alias: 'novamox', generic: 'amoxicillin' },
  { alias: 'clavam', generic: 'amoxicillin' },
  { alias: 'amoxycillin', generic: 'amoxicillin' },
  { alias: 'flagyl', generic: 'metronidazole' },
  { alias: 'metrogyl', generic: 'metronidazole' },
  { alias: 'metronidazol', generic: 'metronidazole' },
  { alias: 'vibramycin', generic: 'doxycycline' },
  { alias: 'doxt', generic: 'doxycycline' },
  { alias: 'doxy', generic: 'doxycycline' },
  { alias: 'biaxin', generic: 'clarithromycin' },
  { alias: 'claribid', generic: 'clarithromycin' },
  { alias: 'althrocin', generic: 'erythromycin' },
  { alias: 'bactrim', generic: 'sulfamethoxazole' },
  { alias: 'septran', generic: 'sulfamethoxazole' },
  { alias: 'septra', generic: 'sulfamethoxazole' },
  { alias: 'co-trimoxazole', generic: 'sulfamethoxazole' },
  { alias: 'cotrimoxazole', generic: 'sulfamethoxazole' },
  { alias: 'zifi', generic: 'cefixime' },
  { alias: 'taxim-o', generic: 'cefixime' },
  { alias: 'rifampin', generic: 'rifampicin' },
  { alias: 'rifadin', generic: 'rifampicin' },
  { alias: 'r-cin', generic: 'rifampicin' },
  { alias: 'zyvox', generic: 'linezolid' },
  { alias: 'linospan', generic: 'linezolid' },
  { alias: 'diflucan', generic: 'fluconazole' },
  { alias: 'forcan', generic: 'fluconazole' },
  { alias: 'sporanox', generic: 'itraconazole' },
  { alias: 'canditral', generic: 'itraconazole' },
  { alias: 'nizoral', generic: 'ketoconazole' },
  { alias: 'ketoconazol', generic: 'ketoconazole' },

  // --- mental health ----------------------------------------------------------
  { alias: 'zoloft', generic: 'sertraline' },
  { alias: 'daxid', generic: 'sertraline' },
  { alias: 'serlift', generic: 'sertraline' },
  { alias: 'sertralin', generic: 'sertraline' },
  { alias: 'prozac', generic: 'fluoxetine' },
  { alias: 'fludac', generic: 'fluoxetine' },
  { alias: 'lexapro', generic: 'escitalopram' },
  { alias: 'cipralex', generic: 'escitalopram' },
  { alias: 'nexito', generic: 'escitalopram' },
  { alias: 'celexa', generic: 'citalopram' },
  { alias: 'effexor', generic: 'venlafaxine' },
  { alias: 'venlor', generic: 'venlafaxine' },
  { alias: 'cymbalta', generic: 'duloxetine' },
  { alias: 'duzela', generic: 'duloxetine' },
  { alias: 'elavil', generic: 'amitriptyline' },
  { alias: 'amitone', generic: 'amitriptyline' },
  { alias: 'tryptomer', generic: 'amitriptyline' },
  { alias: 'wellbutrin', generic: 'bupropion' },
  { alias: 'zyban', generic: 'bupropion' },
  { alias: 'nardil', generic: 'phenelzine' },
  { alias: 'eldepryl', generic: 'selegiline' },
  { alias: 'xanax', generic: 'alprazolam' },
  { alias: 'alprax', generic: 'alprazolam' },
  { alias: 'restyl', generic: 'alprazolam' },
  { alias: 'valium', generic: 'diazepam' },
  { alias: 'calmpose', generic: 'diazepam' },
  { alias: 'ativan', generic: 'lorazepam' },
  { alias: 'klonopin', generic: 'clonazepam' },
  { alias: 'rivotril', generic: 'clonazepam' },
  { alias: 'clonotril', generic: 'clonazepam' },
  { alias: 'lonazep', generic: 'clonazepam' },
  { alias: 'ambien', generic: 'zolpidem' },
  { alias: 'zolfresh', generic: 'zolpidem' },
  { alias: 'lithium carbonate', generic: 'lithium' },
  { alias: 'lithosun', generic: 'lithium' },
  { alias: 'licab', generic: 'lithium' },
  { alias: 'eskalith', generic: 'lithium' },

  // --- pain, opioids, nerve pain ----------------------------------------------
  { alias: 'ultram', generic: 'tramadol' },
  { alias: 'tramazac', generic: 'tramadol' },
  { alias: 'contramal', generic: 'tramadol' },
  { alias: 'oxycontin', generic: 'oxycodone' },
  { alias: 'percocet', generic: 'oxycodone' },
  { alias: 'ms contin', generic: 'morphine' },
  { alias: 'morphine sulphate', generic: 'morphine' },
  { alias: 'morphine sulfate', generic: 'morphine' },
  { alias: 'codeine phosphate', generic: 'codeine' },
  { alias: 'neurontin', generic: 'gabapentin' },
  { alias: 'gabapin', generic: 'gabapentin' },
  { alias: 'lyrica', generic: 'pregabalin' },
  { alias: 'imitrex', generic: 'sumatriptan' },
  { alias: 'suminat', generic: 'sumatriptan' },
  { alias: 'colcrys', generic: 'colchicine' },
  { alias: 'zanaflex', generic: 'tizanidine' },
  { alias: 'sirdalud', generic: 'tizanidine' },

  // --- allergy, asthma, cough --------------------------------------------------
  { alias: 'zyrtec', generic: 'cetirizine' },
  { alias: 'cetrizine', generic: 'cetirizine' },
  { alias: 'cetirizin', generic: 'cetirizine' },
  { alias: 'cetzine', generic: 'cetirizine' },
  { alias: 'alerid', generic: 'cetirizine' },
  { alias: 'okacet', generic: 'cetirizine' },
  { alias: 'allegra', generic: 'fexofenadine' },
  { alias: 'fexo', generic: 'fexofenadine' },
  { alias: 'claritin', generic: 'loratadine' },
  { alias: 'benadryl', generic: 'diphenhydramine' },
  { alias: 'diphenhydramin', generic: 'diphenhydramine' },
  { alias: 'montair', generic: 'montelukast' },
  { alias: 'singulair', generic: 'montelukast' },
  { alias: 'montek', generic: 'montelukast' },
  { alias: 'albuterol', generic: 'salbutamol' },
  { alias: 'ventolin', generic: 'salbutamol' },
  { alias: 'asthalin', generic: 'salbutamol' },
  { alias: 'proair', generic: 'salbutamol' },
  { alias: 'deriphyllin', generic: 'theophylline' },
  { alias: 'sudafed', generic: 'pseudoephedrine' },

  // --- epilepsy ----------------------------------------------------------------
  { alias: 'tegretol', generic: 'carbamazepine' },
  { alias: 'mazetol', generic: 'carbamazepine' },
  { alias: 'zeptol', generic: 'carbamazepine' },
  { alias: 'dilantin', generic: 'phenytoin' },
  { alias: 'eptoin', generic: 'phenytoin' },
  { alias: 'depakote', generic: 'valproate' },
  { alias: 'valparin', generic: 'valproate' },
  { alias: 'encorate', generic: 'valproate' },
  { alias: 'sodium valproate', generic: 'valproate' },
  { alias: 'divalproex', generic: 'valproate' },
  { alias: 'valproic acid', generic: 'valproate' },
  { alias: 'lamictal', generic: 'lamotrigine' },
  { alias: 'lametec', generic: 'lamotrigine' },

  // --- hormones, urology, skin -------------------------------------------------
  { alias: 'viagra', generic: 'sildenafil' },
  { alias: 'suhagra', generic: 'sildenafil' },
  { alias: 'penegra', generic: 'sildenafil' },
  { alias: 'cialis', generic: 'tadalafil' },
  { alias: 'tadacip', generic: 'tadalafil' },
  { alias: 'megalis', generic: 'tadalafil' },
  { alias: 'flomax', generic: 'tamsulosin' },
  { alias: 'urimax', generic: 'tamsulosin' },
  { alias: 'ethinyl estradiol', generic: 'ethinylestradiol' },
  { alias: 'ethinyloestradiol', generic: 'ethinylestradiol' },
  { alias: 'yasmin', generic: 'ethinylestradiol' },
  { alias: 'mala-d', generic: 'ethinylestradiol' },
  { alias: 'ovral', generic: 'ethinylestradiol' },
  { alias: 'femilon', generic: 'ethinylestradiol' },
  { alias: 'accutane', generic: 'isotretinoin' },
  { alias: 'isotroin', generic: 'isotretinoin' },
  { alias: 'sotret', generic: 'isotretinoin' },

  // --- immune system, gout, transplant ------------------------------------------
  { alias: 'zyloric', generic: 'allopurinol' },
  { alias: 'zyloprim', generic: 'allopurinol' },
  { alias: 'imuran', generic: 'azathioprine' },
  { alias: 'azoran', generic: 'azathioprine' },
  { alias: 'trexall', generic: 'methotrexate' },
  { alias: 'folitrax', generic: 'methotrexate' },
  { alias: 'methotrexat', generic: 'methotrexate' },
  { alias: 'neoral', generic: 'cyclosporine' },
  { alias: 'sandimmune', generic: 'cyclosporine' },
  { alias: 'ciclosporin', generic: 'cyclosporine' },
  { alias: 'panimun', generic: 'cyclosporine' },
  { alias: 'omnacortil', generic: 'prednisolone' },
  { alias: 'wysolone', generic: 'prednisolone' },
  { alias: 'prednisone', generic: 'prednisolone' },
  { alias: 'deltasone', generic: 'prednisolone' },

  // --- Parkinson disease --------------------------------------------------------
  { alias: 'sinemet', generic: 'levodopa' },
  { alias: 'syndopa', generic: 'levodopa' },
  { alias: 'levodopa carbidopa', generic: 'levodopa' },

  // --- supplements, minerals and other spellings --------------------------------
  { alias: 'shelcal', generic: 'calcium carbonate' },
  { alias: 'caltrate', generic: 'calcium carbonate' },
  { alias: 'tums', generic: 'calcium carbonate' },
  { alias: 'calcium', generic: 'calcium carbonate' },
  { alias: 'ferrous sulphate', generic: 'ferrous sulfate' },
  { alias: 'ferrous fumarate', generic: 'ferrous sulfate' },
  { alias: 'ferrous ascorbate', generic: 'ferrous sulfate' },
  { alias: 'feosol', generic: 'ferrous sulfate' },
  { alias: 'fefol', generic: 'ferrous sulfate' },
  { alias: 'iron', generic: 'ferrous sulfate' },
  { alias: 'kcl', generic: 'potassium chloride' },
  { alias: 'klor-con', generic: 'potassium chloride' },
  { alias: 'potklor', generic: 'potassium chloride' },
  { alias: 'potchlor', generic: 'potassium chloride' },
  { alias: 'st johns wort', generic: 'st johns wort' },
  { alias: 'hypericum', generic: 'st johns wort' },
  { alias: 'ethanol', generic: 'alcohol' },
  { alias: 'ethyl alcohol', generic: 'alcohol' },
  { alias: 'iohexol', generic: 'iodinated contrast' },
  { alias: 'contrast dye', generic: 'iodinated contrast' },
  { alias: 'adrenaline', generic: 'epinephrine' },
  { alias: 'noradrenaline', generic: 'norepinephrine' },
  { alias: 'frusemide injection', generic: 'furosemide' },

  // ---------------------------------------------------------------------------
  // Indian brand names people actually read off a strip, weighted towards what
  // women and older adults are prescribed. South Indian pharmacy staples first.
  // ---------------------------------------------------------------------------
  { alias: 'meftal', generic: 'mefenamic acid' },
  { alias: 'meftal spas', generic: 'mefenamic acid' },
  { alias: 'meftal forte', generic: 'mefenamic acid' },
  { alias: 'mefkind', generic: 'mefenamic acid' },
  { alias: 'ponstan', generic: 'mefenamic acid' },

  { alias: 'pause', generic: 'tranexamic acid' },
  { alias: 'trapic', generic: 'tranexamic acid' },
  { alias: 'texid', generic: 'tranexamic acid' },
  { alias: 'clip', generic: 'tranexamic acid' },

  { alias: 'primolut', generic: 'norethisterone' },
  { alias: 'primolut n', generic: 'norethisterone' },
  { alias: 'regestrone', generic: 'norethisterone' },
  { alias: 'deviry', generic: 'medroxyprogesterone' },
  { alias: 'meprate', generic: 'medroxyprogesterone' },
  { alias: 'progynova', generic: 'estradiol' },
  { alias: 'estrabet', generic: 'estradiol' },

  { alias: 'fosamax', generic: 'alendronate' },
  { alias: 'osteofos', generic: 'alendronate' },
  { alias: 'gemfos', generic: 'alendronate' },
  { alias: 'restofos', generic: 'alendronate' },

  { alias: 'calcirol', generic: 'cholecalciferol' },
  { alias: 'uprise d3', generic: 'cholecalciferol' },
  { alias: 'd rise', generic: 'cholecalciferol' },
  { alias: 'vitamin d3', generic: 'cholecalciferol' },
  { alias: 'vitamin d', generic: 'cholecalciferol' },
  { alias: 'cholecalciferol', generic: 'cholecalciferol' },

  { alias: 'shelcal xt', generic: 'calcium carbonate' },
  { alias: 'shelcal hd', generic: 'calcium carbonate' },
  { alias: 'calcimax', generic: 'calcium carbonate' },
  { alias: 'ostocalcium', generic: 'calcium carbonate' },
  { alias: 'gemcal', generic: 'calcium carbonate' },

  { alias: 'methylcobalamin', generic: 'methylcobalamin' },
  { alias: 'mecobalamin', generic: 'methylcobalamin' },
  { alias: 'vitamin b12', generic: 'methylcobalamin' },
  { alias: 'b12', generic: 'methylcobalamin' },
  { alias: 'nurokind', generic: 'methylcobalamin' },
  { alias: 'neurobion', generic: 'methylcobalamin' },
  { alias: 'methycobal', generic: 'methylcobalamin' },

  { alias: 'domperidone', generic: 'domperidone' },
  { alias: 'domstal', generic: 'domperidone' },
  { alias: 'vomistop', generic: 'domperidone' },
  { alias: 'motilium', generic: 'domperidone' },

  { alias: 'finasteride', generic: 'finasteride' },
  { alias: 'finast', generic: 'finasteride' },
  { alias: 'fincar', generic: 'finasteride' },

  { alias: 'pan 40', generic: 'pantoprazole' },
  { alias: 'pan d', generic: 'pantoprazole' },

  { alias: 'folvite', generic: 'folic acid' },
  { alias: 'folic acid', generic: 'folic acid' },
  { alias: 'autrin', generic: 'ferrous sulfate' },
  { alias: 'orofer xt', generic: 'ferrous sulfate' },
  { alias: 'livogen', generic: 'ferrous sulfate' },
  { alias: 'dexorange', generic: 'ferrous sulfate' },

  { alias: 'thyronorm 50', generic: 'levothyroxine' },
  { alias: 'eltroxin 50', generic: 'levothyroxine' },

  { alias: 'dolo 650', generic: 'acetaminophen' },
  { alias: 'pacimol', generic: 'acetaminophen' },
  { alias: 'zerodol', generic: 'diclofenac' },

  { alias: 'ecosprin av', generic: 'aspirin' },
  { alias: 'ecosprin 75', generic: 'aspirin' },

  { alias: 'glycomet gp', generic: 'metformin' },
  { alias: 'gluconorm', generic: 'metformin' },
  { alias: 'okamet', generic: 'metformin' },
  { alias: 'zoryl', generic: 'glimepiride' },

  { alias: 'lipvas', generic: 'atorvastatin' },

  { alias: 'telma 40', generic: 'telmisartan' },
  { alias: 'met xl', generic: 'metoprolol' },


  { alias: 'montek lc', generic: 'montelukast' },
  { alias: 'levolin', generic: 'salbutamol' },
];

/** alias -> canonical generic, built once at module load. */
const SYNONYM_MAP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const entry of DRUG_SYNONYMS) {
    map.set(entry.alias, entry.generic);
  }
  return map;
})();

/** "Tab.", "Cap", "Syp.", "Inj." and friends at the start of a prescription line. */
const FORM_PREFIX = /^(?:tabs?\.?|caps?\.?|syps?\.?|syrs?\.?|injs?\.?|tablets?|capsules?|syrup|injection|susp\.?|suspension)\s+/;

/** Trailing strength or volume, e.g. "650 mg", "0.5mg od", "10ml", "40 iu". */
const TRAILING_STRENGTH = /[\s,\-/]*\b\d+(?:\.\d+)?\s*(?:mg|mcg|ug|g|gm|ml|l|iu|units?|%)\b.*$/;

/** Trailing bare number, e.g. "telma 40", "dolo-650". */
const TRAILING_NUMBER = /[\s,\-/]+\d+(?:\.\d+)?$/;

/** Trailing release-form or frequency shorthand, e.g. "-xl", " sr", " od". */
const TRAILING_FORM_CODE = /[\s\-/](?:sr|xr|xl|cr|er|mr|la|dt|od|bd|bid|tid|tds|qid|hs|prn|stat)$/;

/** Trailing punctuation left over from scanned text. */
const EDGE_JUNK = /^[^a-z0-9]+|[^a-z0-9%)]+$/g;

function clean(input: string): string {
  let text = input.toLowerCase().trim().replace(/\s+/g, ' ');
  text = text.replace(EDGE_JUNK, '');

  // A scanned line can carry more than one prefix, e.g. "tab. cap ...".
  for (let i = 0; i < 3 && FORM_PREFIX.test(text); i += 1) {
    text = text.replace(FORM_PREFIX, '');
  }

  text = text.replace(TRAILING_STRENGTH, '');
  text = text.replace(TRAILING_NUMBER, '');

  for (let i = 0; i < 3 && TRAILING_FORM_CODE.test(text); i += 1) {
    text = text.replace(TRAILING_FORM_CODE, '');
  }

  return text.replace(EDGE_JUNK, '').trim();
}

function lookup(candidate: string): string | null {
  if (!candidate) return null;
  const mapped = SYNONYM_MAP.get(candidate);
  if (mapped !== undefined) return mapped;
  if (KNOWN_GENERICS.has(candidate)) return candidate;
  return null;
}

/**
 * Turns whatever the user typed, or whatever was read off a prescription, into a
 * canonical lowercase generic name.
 *
 * Tries, in order: the cleaned text, the raw lowercased text (so aliases that
 * legitimately contain digits or dashes still match), and finally the first word
 * of the cleaned text. Returns null when nothing recognisable is found.
 */
export function resolveGeneric(input: string): string | null {
  if (typeof input !== 'string') return null;

  const raw = input.toLowerCase().trim().replace(/\s+/g, ' ');
  if (!raw) return null;

  const cleaned = clean(raw);

  const direct = lookup(cleaned);
  if (direct !== null) return direct;

  if (raw !== cleaned) {
    const fromRaw = lookup(raw);
    if (fromRaw !== null) return fromRaw;
  }

  const firstWord = cleaned.split(' ')[0] ?? '';
  if (firstWord.length >= 4 && firstWord !== cleaned) {
    return lookup(firstWord);
  }

  return null;
}
