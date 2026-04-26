-- Plan 13K cont. — 6 more chained clinical cases (4 → 10 total).
--
-- Each case = 1 vignette + 3 atoms hanging off it (Dx → severity/Ix → Mx).
-- All NICE/NHS-grounded, OGL-licensed sources. Hand-authored.
-- Idempotent via source_concept_id uniqueness.

do $$
declare
  case_asthma uuid;
  case_appendicitis uuid;
  case_preeclampsia uuid;
  case_bronchiolitis uuid;
  case_ugib uuid;
  case_sepsis uuid;
begin
  -- ============= CASE: Acute asthma exacerbation =============
  insert into public.clinical_cases
    (exam, title, vignette_md, citation_url, citation_label, source_type, status, source_concept_id)
  values
    ('UKMLA',
     'Breathless asthmatic, can''t complete sentences',
     'A 32-year-old woman with known asthma is brought to A&E with a 6-h worsening of breathlessness despite using her salbutamol inhaler ~10 times.

Observations: HR 124, BP 132/88, RR 28, SpO₂ 91 % on air, PEFR 32 % of personal best.

She can speak only in short phrases and is using accessory muscles. No audible wheeze.',
     'https://www.brit-thoracic.org.uk/quality-improvement/guidelines/asthma/',
     'BTS/SIGN — Asthma',
     'doctor_seed', 'pending_review', 'case-asthma-acute')
  on conflict (source_concept_id) do nothing
  returning id into case_asthma;

  if case_asthma is null then
    select id into case_asthma from public.clinical_cases where source_concept_id = 'case-asthma-acute';
  end if;

  insert into public.atoms (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  select * from (values
    ('UKMLA', ARRAY['Respiratory','Asthma'],
     'Life-threatening asthma: PEFR <33 %, SpO₂ <92 %, silent chest, exhaustion, altered consciousness, cyanosis.',
     'How would you classify the severity of her asthma exacerbation?',
     'Life-threatening asthma',
     '["Mild exacerbation","Moderate exacerbation","Acute severe asthma","Near-fatal asthma"]'::jsonb,
     2,
     'https://www.brit-thoracic.org.uk/quality-improvement/guidelines/asthma/', 'BTS/SIGN — Asthma', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-asthma-q1-severity', case_asthma),
    ('UKMLA', ARRAY['Respiratory','Asthma'],
     'BTS/SIGN acute asthma: O-S-H-I-T (Oxygen, Salbutamol nebs, Hydrocortisone IV/oral pred, Ipratropium nebs, Theophylline / IV Mg).',
     'What is the most appropriate immediate management bundle?',
     'High-flow oxygen, back-to-back salbutamol nebs, IV hydrocortisone',
     '["Oral salbutamol + reassure","IV adrenaline 1 mg","Salbutamol MDI alone","Bilevel non-invasive ventilation immediately"]'::jsonb,
     2,
     'https://www.brit-thoracic.org.uk/quality-improvement/guidelines/asthma/', 'BTS/SIGN — Asthma', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-asthma-q2-mx', case_asthma),
    ('UKMLA', ARRAY['Calculations','Asthma'],
     'Adult acute severe asthma nebulised salbutamol = 5 mg per dose.',
     'What dose of nebulised salbutamol (in mg) should you give?',
     '5', '[]'::jsonb,
     1,
     'https://bnf.nice.org.uk/drugs/salbutamol/', 'BNF — Salbutamol', 'doctor_seed',
     true, true, 'pending_review', 'calc', 'case-asthma-q3-calc-5', case_asthma)
  ) as new_rows (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);

  -- ============= CASE: Appendicitis =============
  insert into public.clinical_cases
    (exam, title, vignette_md, citation_url, citation_label, source_type, status, source_concept_id)
  values
    ('UKMLA',
     'Right iliac fossa pain in a young man',
     'A 22-year-old man presents to A&E with 24 h of central abdominal pain that has now migrated to the right iliac fossa. He has nausea, anorexia and a fever.

Observations: HR 98, BP 122/78, T 38.1 °C, RR 18.

Examination: tenderness and guarding at McBurney''s point with rebound; Rovsing sign positive.

Bloods: WCC 14 ×10⁹/L, CRP 88 mg/L. Urinalysis: trace blood, no nitrites.',
     'https://www.nice.org.uk/guidance/ng121',
     'NICE NG121 — Acute abdomen referral',
     'doctor_seed', 'pending_review', 'case-appendicitis')
  on conflict (source_concept_id) do nothing
  returning id into case_appendicitis;

  if case_appendicitis is null then
    select id into case_appendicitis from public.clinical_cases where source_concept_id = 'case-appendicitis';
  end if;

  insert into public.atoms (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  select * from (values
    ('UKMLA', ARRAY['Surgery','Appendicitis'],
     'Migratory pain (umbilicus → RIF) + McBurney tenderness + Rovsing sign + raised inflammatory markers strongly suggest acute appendicitis.',
     'What is the most likely diagnosis?',
     'Acute appendicitis',
     '["Acute pancreatitis","Mesenteric adenitis","Crohn''s flare with terminal ileitis","Renal colic"]'::jsonb,
     1,
     'https://www.nice.org.uk/guidance/ng121', 'NICE NG121 — Acute abdomen referral', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-app-q1-dx', case_appendicitis),
    ('UKMLA', ARRAY['Surgery','Appendicitis'],
     'Adult with high pre-test probability appendicitis: prompt surgical assessment; CT abdomen if uncertainty (USS first in young women / children).',
     'What is the most appropriate next investigation in this 22-year-old man?',
     'CT abdomen and pelvis',
     '["Plain abdominal X-ray","Erect chest X-ray only","Diagnostic peritoneal lavage","Wait 24 h and reassess"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng121', 'NICE NG121 — Acute abdomen referral', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-app-q2-ix', case_appendicitis),
    ('UKMLA', ARRAY['Surgery','Appendicitis'],
     'Definitive treatment of acute appendicitis = appendicectomy (laparoscopic preferred), with peri-operative IV antibiotics.',
     'What is the definitive management?',
     'Laparoscopic appendicectomy',
     '["IV antibiotics alone","Open cholecystectomy","Conservative trial of bowel rest only","Steroid trial for IBD"]'::jsonb,
     1,
     'https://www.nice.org.uk/guidance/ng121', 'NICE NG121 — Acute abdomen referral', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-app-q3-mx', case_appendicitis)
  ) as new_rows (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);

  -- ============= CASE: Pre-eclampsia =============
  insert into public.clinical_cases
    (exam, title, vignette_md, citation_url, citation_label, source_type, status, source_concept_id)
  values
    ('UKMLA',
     '34-week headache and visual disturbance',
     'A 28-year-old primigravida at 34/40 attends triage with a 3-day frontal headache, intermittent flashing lights, and ankle swelling.

Observations: BP 162/108 (repeated 5 min later: 158/106), HR 86, urine dip 3+ protein.

Bloods: ALT 80 IU/L, platelets 102 ×10⁹/L, urate raised. CTG: reactive, normal.',
     'https://www.nice.org.uk/guidance/ng133',
     'NICE NG133 — Hypertension in pregnancy',
     'doctor_seed', 'pending_review', 'case-preeclampsia')
  on conflict (source_concept_id) do nothing
  returning id into case_preeclampsia;

  if case_preeclampsia is null then
    select id into case_preeclampsia from public.clinical_cases where source_concept_id = 'case-preeclampsia';
  end if;

  insert into public.atoms (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  select * from (values
    ('UKMLA', ARRAY['Obstetrics','Pre-eclampsia'],
     'Pre-eclampsia ≥ 20 weeks: new BP ≥140/90 + proteinuria OR maternal organ dysfunction (raised LFTs, low platelets, AKI) OR uteroplacental dysfunction.',
     'What is the most likely diagnosis?',
     'Pre-eclampsia with severe features',
     '["Gestational hypertension only","HELLP syndrome (haemolysis, raised LFTs, low platelets)","Acute fatty liver of pregnancy","Migraine with aura"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng133', 'NICE NG133 — Hypertension in pregnancy', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-preeclampsia-q1-dx', case_preeclampsia),
    ('UKMLA', ARRAY['Obstetrics','Pre-eclampsia'],
     'NICE NG133: severe-feature pre-eclampsia → IV labetalol (or oral nifedipine) + Mg sulfate for seizure prophylaxis.',
     'What is the most appropriate immediate medication for both BP control and seizure prophylaxis?',
     'IV labetalol + IV magnesium sulfate',
     '["Oral atenolol + IV diazepam","IV ramipril + IV phenytoin","IV hydralazine + oral phenobarbitone","IV methyldopa + IV diazepam"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng133', 'NICE NG133 — Hypertension in pregnancy', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-preeclampsia-q2-mx', case_preeclampsia),
    ('UKMLA', ARRAY['Obstetrics','Pre-eclampsia'],
     'Definitive treatment of pre-eclampsia is delivery; timing depends on gestation and severity (NICE NG133).',
     'What is the definitive treatment?',
     'Delivery of the placenta',
     '["Long-term oral methyldopa","Bed rest until 40 weeks","Plasmapheresis","Lifelong antihypertensive"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng133', 'NICE NG133 — Hypertension in pregnancy', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-preeclampsia-q3-definitive', case_preeclampsia)
  ) as new_rows (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);

  -- ============= CASE: Bronchiolitis =============
  insert into public.clinical_cases
    (exam, title, vignette_md, citation_url, citation_label, source_type, status, source_concept_id)
  values
    ('UKMLA',
     '5-month-old with cough and feeding difficulty',
     'A 5-month-old infant is brought to A&E by his mother in winter with 3 days of coryza and worsening cough. Today he is feeding poorly and grunting.

Observations: HR 168, RR 60, T 37.6 °C, SpO₂ 89 % on air. Subcostal recessions and head bobbing.

Auscultation: bilateral fine inspiratory crackles and wheeze. Nasopharyngeal aspirate is positive for RSV.',
     'https://www.nice.org.uk/guidance/ng9',
     'NICE NG9 — Bronchiolitis',
     'doctor_seed', 'pending_review', 'case-bronchiolitis')
  on conflict (source_concept_id) do nothing
  returning id into case_bronchiolitis;

  if case_bronchiolitis is null then
    select id into case_bronchiolitis from public.clinical_cases where source_concept_id = 'case-bronchiolitis';
  end if;

  insert into public.atoms (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  select * from (values
    ('UKMLA', ARRAY['Paediatrics','Respiratory'],
     'Bronchiolitis: <2 yrs, winter, RSV, coryza → cough/wheeze + crackles + feeding difficulty.',
     'What is the most likely diagnosis?',
     'Acute bronchiolitis',
     '["Viral-induced wheeze","Pneumonia","Asthma exacerbation","Cystic fibrosis exacerbation"]'::jsonb,
     1,
     'https://www.nice.org.uk/guidance/ng9', 'NICE NG9 — Bronchiolitis', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-bronc-q1-dx', case_bronchiolitis),
    ('UKMLA', ARRAY['Paediatrics','Respiratory'],
     'NICE NG9: admit if SpO₂ <90 %, inadequate fluid intake (<50–75 % of normal), severe respiratory distress, apnoea.',
     'Which feature most strongly justifies admission?',
     'SpO₂ 89 % on air with feeding difficulty',
     '["Bilateral crackles","Coryzal symptoms for 3 days","Mild wheeze on auscultation","Temperature 37.6 °C"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng9', 'NICE NG9 — Bronchiolitis', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-bronc-q2-admit', case_bronchiolitis),
    ('UKMLA', ARRAY['Paediatrics','Respiratory'],
     'Bronchiolitis is supportive: oxygen for sats <90 %, NG/IV fluids if not feeding. Antibiotics, salbutamol, steroids and chest physio are NOT recommended.',
     'What is the most appropriate management?',
     'Supportive care: oxygen, NG fluids, monitor',
     '["Salbutamol nebulisers","IV amoxicillin","Oral prednisolone","Chest physiotherapy"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng9', 'NICE NG9 — Bronchiolitis', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-bronc-q3-mx', case_bronchiolitis)
  ) as new_rows (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);

  -- ============= CASE: Upper GI bleed =============
  insert into public.clinical_cases
    (exam, title, vignette_md, citation_url, citation_label, source_type, status, source_concept_id)
  values
    ('UKMLA',
     'Coffee-ground vomit and black stool',
     'A 55-year-old man presents with one episode of fresh haematemesis after drinking heavily for several days, then passing two melaena stools. Past medical history: alcohol-related liver disease, varices noted on a previous endoscopy.

Observations: HR 118, BP 96/58, RR 22, SpO₂ 98 % on air. Cool peripheries.

Bloods: Hb 78 g/L, urea 18 mmol/L, creatinine 90 µmol/L. INR 1.8.',
     'https://www.nice.org.uk/guidance/cg141',
     'NICE CG141 — Acute upper GI bleeding',
     'doctor_seed', 'pending_review', 'case-ugib-varices')
  on conflict (source_concept_id) do nothing
  returning id into case_ugib;

  if case_ugib is null then
    select id into case_ugib from public.clinical_cases where source_concept_id = 'case-ugib-varices';
  end if;

  insert into public.atoms (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  select * from (values
    ('UKMLA', ARRAY['Gastroenterology','UGIB'],
     'Acute upper GI bleed in a known varices patient → suspect variceal haemorrhage.',
     'What is the most likely source of bleeding?',
     'Oesophageal variceal haemorrhage',
     '["Bleeding peptic ulcer","Mallory-Weiss tear","Gastric malignancy","Boerhaave syndrome"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/cg141', 'NICE CG141 — Acute upper GI bleeding', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-ugib-q1-dx', case_ugib),
    ('UKMLA', ARRAY['Gastroenterology','UGIB'],
     'Variceal bleed: terlipressin + prophylactic IV antibiotics + urgent endoscopy with band ligation, alongside resuscitation.',
     'In addition to fluid resuscitation and blood products, what specific medications should be given immediately?',
     'IV terlipressin + prophylactic IV antibiotics',
     '["IV omeprazole alone","Oral propranolol only","Tranexamic acid only","IV vitamin K only"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/cg141', 'NICE CG141 — Acute upper GI bleeding', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-ugib-q2-meds', case_ugib),
    ('UKMLA', ARRAY['Gastroenterology','UGIB'],
     'NICE CG141: endoscopy within 24 h of presentation for all UGIB; immediately after resus for unstable patients.',
     'What is the timing of definitive endoscopy?',
     'Within 24 h of presentation, immediately after resuscitation if unstable',
     '["After 72 h of bowel rest","Only if recurrent bleeding","After 7 days of acid suppression","Routine outpatient in 2–4 weeks"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/cg141', 'NICE CG141 — Acute upper GI bleeding', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-ugib-q3-endoscopy', case_ugib)
  ) as new_rows (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);

  -- ============= CASE: Sepsis =============
  insert into public.clinical_cases
    (exam, title, vignette_md, citation_url, citation_label, source_type, status, source_concept_id)
  values
    ('UKMLA',
     'Confused 75-year-old with foul-smelling urine',
     'A 75-year-old woman is brought in from a residential home with 12 h of confusion and rigors. She has been incontinent of foul-smelling urine. Past history: type 2 diabetes, recent UTI.

Observations: HR 124, BP 88/54, RR 26, T 39.0 °C, SpO₂ 95 % on air. Capillary refill 4 s.

Bloods: WCC 18, CRP 220, lactate 4.2 mmol/L, creatinine doubled from baseline. Urinalysis nitrites and leucocytes positive.',
     'https://www.nice.org.uk/guidance/ng51',
     'NICE NG51 — Sepsis',
     'doctor_seed', 'pending_review', 'case-sepsis-uro')
  on conflict (source_concept_id) do nothing
  returning id into case_sepsis;

  if case_sepsis is null then
    select id into case_sepsis from public.clinical_cases where source_concept_id = 'case-sepsis-uro';
  end if;

  insert into public.atoms (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  select * from (values
    ('UKMLA', ARRAY['Infection','Sepsis'],
     'Sepsis with hypotension + lactate >2 unresponsive to fluids = septic shock; here urological source.',
     'What is the most likely diagnosis?',
     'Septic shock from a urinary source',
     '["Mild sepsis","Cardiogenic shock","Hypovolaemic shock","Anaphylactic shock"]'::jsonb,
     1,
     'https://www.nice.org.uk/guidance/ng51', 'NICE NG51 — Sepsis', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-sepsis-q1-dx', case_sepsis),
    ('UKMLA', ARRAY['Infection','Sepsis'],
     'Sepsis Six (within 1 h): give IV antibiotics, IV fluids, oxygen; take blood cultures, lactate, urine output (catheter).',
     'What is the most appropriate immediate management bundle?',
     'Sepsis Six within 1 h: O₂, IV fluids, IV broad-spectrum antibiotics; blood cultures, serum lactate, urine output',
     '["Wait for blood cultures before antibiotics","Oral co-amoxiclav and discharge","CT abdomen and reassess in 4 h","Steroids only"]'::jsonb,
     1,
     'https://www.nice.org.uk/guidance/ng51', 'NICE NG51 — Sepsis', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-sepsis-q2-mx', case_sepsis),
    ('UKMLA', ARRAY['Calculations','Sepsis'],
     'Initial sepsis fluid bolus per Surviving Sepsis Campaign: 30 mL/kg of crystalloid within 3 h.',
     'She weighs 60 kg. What total volume of IV crystalloid (in mL) should she receive within 3 h as initial resuscitation?',
     '1800', '[]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng51', 'NICE NG51 — Sepsis', 'doctor_seed',
     true, true, 'pending_review', 'calc', 'case-sepsis-q3-calc-1800', case_sepsis)
  ) as new_rows (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);
end$$;
