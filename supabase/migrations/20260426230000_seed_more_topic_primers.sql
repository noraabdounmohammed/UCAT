-- Plan 13M — hand-author 6 more topic primers (2 → 8 total).
--
-- Each ~200-280 words, paraphrased from NICE/NHS Open Government Licence
-- guidance. Original prose, no verbatim quotes, copyright-safe.
-- Idempotent via topic_key uniqueness.

insert into public.topic_primers (topic_key, topic_name, body, source)
values
  ('endocrinology',
   'Endocrinology',
   $body$Endocrinology covers disorders of hormone-producing glands. The conditions most commonly tested at UKMLA level are diabetes mellitus (type 1 and type 2), thyroid disease (hypo- and hyperthyroidism), adrenal disorders (Addison''s and Cushing''s) and pituitary disease.

For diabetes, you need a working knowledge of the diagnostic thresholds (fasting glucose ≥ 7.0, random ≥ 11.1 with symptoms, HbA1c ≥ 48 mmol/mol per NICE), the stepwise glycaemic management of T2DM (lifestyle → metformin → SGLT2 inhibitor where indicated, then GLP-1 or DPP-4 etc.) and the immediate management of acute complications: DKA (0.9 % saline first, then fixed-rate insulin 0.1 unit/kg/h) and HHS (slower rehydration, lower insulin rate).

Thyroid topics: TFT interpretation (high TSH + low T4 = primary hypothyroidism; suppressed TSH + high T4 = thyrotoxicosis), the levothyroxine titration principle (start low in the elderly), and the role of antithyroid drugs (carbimazole) plus β-blockers in Graves''. Recognise thyroid storm as an emergency.

Adrenal disease: Addison''s presents with hyponatraemia, hyperkalaemia and hyperpigmentation; the short Synacthen test confirms it. Cushing''s clusters round-face/striae/proximal weakness; suppressed midnight cortisol is screening, dexamethasone-suppression confirms. Crucially, never stop long-term steroids abruptly — recognise adrenal crisis (hypotension, hypoglycaemia, hyponatraemia) and treat with IV hydrocortisone + fluids.$body$,
   'NICE NG28 / NG145 / NG243 — selected endocrinology guidance'),

  ('respiratory',
   'Respiratory',
   $body$The UKMLA respiratory syllabus focuses on common conditions you''ll see on every acute take: asthma exacerbations, COPD, pneumonia and pulmonary embolism. You should also understand chronic conditions (interstitial lung disease, lung cancer red flags, OSA) and tuberculosis.

For asthma, recognise severity bands (BTS/SIGN: moderate, acute severe, life-threatening, near-fatal) and the OSHIT bundle (oxygen, salbutamol nebs, hydrocortisone IV, ipratropium nebs, IV magnesium sulfate). PEFR <33 % of best, SpO₂ <92 %, silent chest, exhaustion or altered consciousness flag life-threatening.

COPD exacerbations: controlled oxygen (target 88-92 %), nebulised bronchodilators, oral prednisolone 30 mg for 5 days, antibiotics if purulent sputum. Long-term: smoking cessation is the single highest-yield intervention; know the inhaled-therapy escalation ladder.

Community-acquired pneumonia: use CURB-65 to triage (0-1 home, 2 ward, 3+ consider HDU/ICU); typical organism is S. pneumoniae and first-line is amoxicillin (mild) or co-amoxiclav + macrolide (severe).

Pulmonary embolism: assess with Wells score; PERC may rule out low-pretest cases. CTPA is the imaging of choice (V/Q in pregnancy/young women). Therapeutic anticoagulation (DOAC first-line) starts as soon as diagnosis is suspected if low bleeding risk.$body$,
   'NICE NG115 / NG191 / BTS — Asthma'),

  ('gastroenterology',
   'Gastroenterology',
   $body$UKMLA gastroenterology emphasises acute presentations (upper GI bleed, acute abdomen, jaundice) plus chronic disease (IBD, IBS, coeliac, liver disease).

Upper GI bleed: early risk-stratify with Glasgow-Blatchford and Rockall scores, resuscitate with blood products if shocked. Suspect varices in known liver disease — give IV terlipressin and prophylactic broad-spectrum antibiotics (e.g. cefotaxime), then endoscopy within 24 h (immediately if unstable). For non-variceal bleeds, IV PPI is given after endoscopic therapy.

Jaundice: classify pre-hepatic (haemolysis — high unconjugated bilirubin, normal LFTs), hepatic (raised ALT/AST), or post-hepatic (raised ALP + conjugated bilirubin, dilated CBD on USS). Painless obstructive jaundice + weight loss + palpable gallbladder (Courvoisier) suggests pancreatic head cancer.

IBD: ulcerative colitis affects rectum upward continuously; Crohn''s causes skip lesions anywhere mouth-to-anus. Assess severity with Truelove-Witts; severe UC flare needs admission, IV hydrocortisone, VTE prophylaxis, and consider rescue ciclosporin or infliximab if no response by day 3.

Coeliac disease: IgA tTG with IgA total + biopsy in adults; lifelong gluten-free diet is the only treatment. Always check IgA level — a deficiency can give a false-negative IgA tTG.$body$,
   'NICE CG141 / NG20 / NG151 — selected GI guidance'),

  ('renal',
   'Renal',
   $body$Renal medicine at UKMLA centres on AKI, CKD, electrolyte disturbance, and the urgent recognition of nephrotic vs nephritic syndromes.

AKI: KDIGO defines it as a creatinine rise ≥ 26 µmol/L in 48 h, or ≥ 1.5× baseline in 7 days, or urine output < 0.5 ml/kg/h for 6 h. Causes split classically into pre-renal (hypovolaemia, sepsis), intrinsic renal (ATN, AIN, glomerulonephritis), and post-renal (obstruction). Initial workup: assess fluid status, urinalysis, USS within 24 h if obstruction possible, and stop nephrotoxics (NSAIDs, ACEi, contrast, gentamicin).

CKD: eGFR < 60 for ≥ 3 months staging G1-G5, with albuminuria sub-staging. Slow progression with BP control (ACEi or ARB if albuminuria) and SGLT2 inhibitors where indicated. Refer to nephrology for eGFR < 30, persistent albuminuria, or rapidly declining function.

Hyperkalaemia (K ≥ 6.5 or any ECG change): give 10 ml of 10 % calcium gluconate IV for cardioprotection first, then insulin-dextrose (10 units actrapid in 25 g glucose) to shift potassium intracellularly; salbutamol nebs and treat the cause.

Hyponatraemia: classify by volume status. Chronic hyponatraemia must be corrected slowly — no more than 10 mmol/L per 24 h — to avoid central pontine myelinolysis.$body$,
   'NICE NG148 / NG203 — AKI and CKD'),

  ('neurology',
   'Neurology',
   $body$The most-tested UKMLA neurology areas are stroke and TIA, headache, seizures and the major neuroinflammatory diseases (MS) plus dementia.

Stroke: any sudden focal deficit needs urgent CT to exclude haemorrhage. Confirmed ischaemic stroke within 4.5 h of onset → IV thrombolysis with alteplase (NICE NG128), subject to no contraindications. Consider mechanical thrombectomy up to 24 h for proximal large-vessel occlusion. Aspirin 300 mg starts at 24 h post-thrombolysis. For long-term secondary prevention in atrial fibrillation, switch from antiplatelet to a DOAC (typically 2 weeks after non-disabling stroke).

Headache red flags: thunderclap (think SAH — CT then LP if normal), worsening over weeks (SOL), early-morning headache plus papilloedema (raised ICP), > 50 yrs with temporal tenderness + jaw claudication (giant-cell arteritis — ESR, urgent prednisolone 60 mg, biopsy within 1 week).

Seizures: distinguish provoked (sodium derangement, alcohol withdrawal) from unprovoked. First unprovoked seizure does not usually require AEDs — refer to first-fit clinic. Status epilepticus (≥ 5 min or recurrent without recovery) is treated with IV lorazepam, then phenytoin, then RSI for refractory status.

Multiple sclerosis: relapsing-remitting most common; MRI lesions disseminated in time and space. Acute relapses → high-dose methylprednisolone shortens duration; disease-modifying therapy reduces relapse rate.$body$,
   'NICE NG128 / CG150 / NG217 — selected neurology'),

  ('haematology',
   'Haematology',
   $body$Haematology at UKMLA level focuses on anaemia, the leukaemias and lymphomas in outline, plus disorders of clotting (DVT/PE, DIC) and emergency presentations like febrile neutropenia.

Anaemia: classify by MCV. Microcytic — usually iron deficiency (low ferritin); always investigate for occult GI loss in anyone over 50. Normocytic — common in chronic disease and acute blood loss. Macrocytic — B12/folate deficiency (megaloblastic) or alcohol/liver disease/hypothyroidism (non-megaloblastic). Pernicious anaemia (anti-IF antibodies) needs lifelong IM hydroxocobalamin.

Sickle cell: vaso-occlusive crises managed with IV opioids, IV fluids, oxygen and warmth; check for chest crisis (CXR, antibiotics, exchange transfusion). Hydroxycarbamide for frequent crises.

Acute leukaemias present with cytopenias (anaemia, infections, bleeding) and need urgent haematology referral; tumour lysis can complicate treatment.

DVT/PE: Wells-score risk-stratify; D-dimer if low pre-test probability rules out. Therapeutic anticoagulation = DOAC first-line for most; LMWH is preferred in pregnancy and active cancer (though edoxaban now NICE-recommended for many cancer patients).

Febrile neutropenia: any temperature ≥ 38 in a patient with neutrophils <0.5 — treat as an emergency with IV piperacillin-tazobactam within 1 h, while sending blood cultures.$body$,
   'NICE NG24 / NG158 / BNF — Haematology guidance')

on conflict (topic_key) do nothing;
