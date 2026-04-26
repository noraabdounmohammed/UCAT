-- Plan 13L — expand EMQ bank from 36 (Cardio only) to 56 across 4 new
-- high-yield UKMLA themes. Hand-authored, NICE/NHS-grounded.
--
-- EMQ schema reuses the atom row: canonical_stem = vignette+question,
-- answer = correct option, distractors = option list (10 wrong options
-- for an 11-option EMQ).
--
-- Themes added:
--   1. Causes of jaundice (5 vignettes)
--   2. Causes of AKI (5 vignettes)
--   3. Causes of anaemia (5 vignettes)
--   4. Causes of acute headache (5 vignettes)

-- =========================================================
-- THEME 1: Jaundice
-- =========================================================
insert into public.atoms (
  exam, topic_path, claim, canonical_stem, answer, distractors,
  difficulty, citation_url, citation_label, source_type,
  high_yield, free_tier, status, question_kind, source_concept_id
)
select * from (values
  ('UKMLA', ARRAY['Gastroenterology','Jaundice'],
   'Pre-hepatic jaundice: high unconjugated bilirubin from haemolysis (e.g. G6PD deficiency).',
   'A 24-year-old man of Mediterranean descent develops jaundice and dark urine 2 days after starting nitrofurantoin. FBC shows anaemia with bite cells. What is the most likely cause?',
   'G6PD deficiency',
   '["Gilbert syndrome","Viral hepatitis","Primary biliary cholangitis","Pancreatic head cancer","Choledocholithiasis","Alcoholic hepatitis","Paracetamol overdose","Autoimmune hepatitis","Sickle-cell crisis","Hereditary spherocytosis"]'::jsonb,
   3, 'https://www.nhs.uk/conditions/g6pd-deficiency/', 'NHS — G6PD deficiency', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-jaundice-g6pd'),
  ('UKMLA', ARRAY['Gastroenterology','Jaundice'],
   'Painless obstructive jaundice + weight loss + palpable gallbladder = pancreatic head cancer (Courvoisier sign).',
   'A 70-year-old man presents with painless jaundice, weight loss and a palpable gallbladder. LFTs show conjugated hyperbilirubinaemia and raised ALP. What is the most likely diagnosis?',
   'Pancreatic head cancer',
   '["Gilbert syndrome","Viral hepatitis","Primary biliary cholangitis","G6PD deficiency","Choledocholithiasis","Alcoholic hepatitis","Paracetamol overdose","Autoimmune hepatitis","Sickle-cell crisis","Hereditary spherocytosis"]'::jsonb,
   2, 'https://www.nice.org.uk/guidance/ng85', 'NICE NG85 — Pancreatic cancer', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-jaundice-pancreatic'),
  ('UKMLA', ARRAY['Gastroenterology','Jaundice'],
   'Choledocholithiasis: RUQ pain, jaundice, raised conjugated bilirubin + ALP.',
   'A 45-year-old woman has RUQ pain, fever and jaundice. USS shows a dilated CBD with a stone. What is the most likely diagnosis?',
   'Choledocholithiasis',
   '["Gilbert syndrome","Viral hepatitis","Primary biliary cholangitis","Pancreatic head cancer","G6PD deficiency","Alcoholic hepatitis","Paracetamol overdose","Autoimmune hepatitis","Sickle-cell crisis","Hereditary spherocytosis"]'::jsonb,
   2, 'https://www.nice.org.uk/guidance/cg188', 'NICE CG188 — Gallstones', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-jaundice-cbd'),
  ('UKMLA', ARRAY['Gastroenterology','Jaundice'],
   'Gilbert syndrome: mild unconjugated hyperbilirubinaemia worse with fasting/illness, otherwise well.',
   'A 22-year-old student notices mild yellowing of his sclerae after a chest infection. LFTs show isolated raised unconjugated bilirubin; everything else normal. What is the most likely diagnosis?',
   'Gilbert syndrome',
   '["Choledocholithiasis","Viral hepatitis","Primary biliary cholangitis","Pancreatic head cancer","G6PD deficiency","Alcoholic hepatitis","Paracetamol overdose","Autoimmune hepatitis","Sickle-cell crisis","Hereditary spherocytosis"]'::jsonb,
   2, 'https://www.nhs.uk/conditions/gilberts-syndrome/', 'NHS — Gilbert''s syndrome', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-jaundice-gilbert'),
  ('UKMLA', ARRAY['Gastroenterology','Jaundice'],
   'Primary biliary cholangitis: middle-aged woman, pruritus, raised ALP + anti-mitochondrial antibody.',
   'A 52-year-old woman has months of fatigue and itching. LFTs show isolated raised ALP; AMA is positive. What is the most likely diagnosis?',
   'Primary biliary cholangitis',
   '["Gilbert syndrome","Viral hepatitis","Choledocholithiasis","Pancreatic head cancer","G6PD deficiency","Alcoholic hepatitis","Paracetamol overdose","Autoimmune hepatitis","Sickle-cell crisis","Hereditary spherocytosis"]'::jsonb,
   3, 'https://www.nice.org.uk/guidance/ng180', 'NICE NG180 — Cirrhosis', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-jaundice-pbc')
) as new_rows (
  exam, topic_path, claim, canonical_stem, answer, distractors,
  difficulty, citation_url, citation_label, source_type,
  high_yield, free_tier, status, question_kind, source_concept_id
)
where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);

-- =========================================================
-- THEME 2: AKI causes
-- =========================================================
insert into public.atoms (
  exam, topic_path, claim, canonical_stem, answer, distractors,
  difficulty, citation_url, citation_label, source_type,
  high_yield, free_tier, status, question_kind, source_concept_id
)
select * from (values
  ('UKMLA', ARRAY['Renal','AKI'],
   'Pre-renal AKI: hypovolaemia (sepsis, GI losses) → low GFR with intact tubules.',
   'An 80-year-old nursing-home resident has 3 days of vomiting and reduced oral intake. BP 88/54, dry mucous membranes. Creatinine has risen from 80 to 220 µmol/L. What is the most likely cause of his AKI?',
   'Pre-renal — hypovolaemia',
   '["Acute tubular necrosis (ischaemic)","NSAIDs","ACE-inhibitor","IgA nephropathy","Acute interstitial nephritis","Rhabdomyolysis","Obstructing prostate enlargement","Bilateral renal vein thrombosis","Contrast-induced nephropathy","Anti-GBM disease"]'::jsonb,
   1, 'https://www.nice.org.uk/guidance/ng148', 'NICE NG148 — AKI', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-aki-prerenal-hypovol'),
  ('UKMLA', ARRAY['Renal','AKI'],
   'Post-renal AKI: bladder outflow obstruction in older men → hydronephrosis on USS.',
   'A 78-year-old man with known BPH presents with anuria for 24 h. He has a palpable bladder. USS shows bilateral hydronephrosis. What is the most likely cause?',
   'Obstructing prostate enlargement',
   '["Acute tubular necrosis (ischaemic)","NSAIDs","ACE-inhibitor","IgA nephropathy","Acute interstitial nephritis","Rhabdomyolysis","Pre-renal — hypovolaemia","Bilateral renal vein thrombosis","Contrast-induced nephropathy","Anti-GBM disease"]'::jsonb,
   1, 'https://www.nice.org.uk/guidance/ng148', 'NICE NG148 — AKI', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-aki-bph'),
  ('UKMLA', ARRAY['Renal','AKI'],
   'Rhabdomyolysis: pigmented tubular casts, raised CK, dark urine, often after prolonged immobility.',
   'A 35-year-old man is found unconscious after collapsing alone at home for 2 days. He has dark "tea-coloured" urine, CK 25 000 U/L, K 6.1 mmol/L. What is the most likely cause of his AKI?',
   'Rhabdomyolysis',
   '["Acute tubular necrosis (ischaemic)","NSAIDs","ACE-inhibitor","IgA nephropathy","Acute interstitial nephritis","Pre-renal — hypovolaemia","Obstructing prostate enlargement","Bilateral renal vein thrombosis","Contrast-induced nephropathy","Anti-GBM disease"]'::jsonb,
   2, 'https://www.nice.org.uk/guidance/ng148', 'NICE NG148 — AKI', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-aki-rhabdo'),
  ('UKMLA', ARRAY['Renal','AKI'],
   'Acute interstitial nephritis: drug rash + fever + eosinophilia + sterile pyuria after a new drug (often beta-lactam, NSAID, PPI).',
   'A 60-year-old woman starts amoxicillin for a UTI. 10 days later she has a maculopapular rash, fever, and creatinine has risen from 70 to 200 µmol/L. Urinalysis shows white-cell casts and eosinophils. What is the most likely cause?',
   'Acute interstitial nephritis',
   '["Acute tubular necrosis (ischaemic)","NSAIDs","ACE-inhibitor","IgA nephropathy","Rhabdomyolysis","Pre-renal — hypovolaemia","Obstructing prostate enlargement","Bilateral renal vein thrombosis","Contrast-induced nephropathy","Anti-GBM disease"]'::jsonb,
   3, 'https://www.nice.org.uk/guidance/ng148', 'NICE NG148 — AKI', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-aki-ain'),
  ('UKMLA', ARRAY['Renal','AKI'],
   'Anti-GBM (Goodpasture) disease: rapidly progressive GN + pulmonary haemorrhage in young adult.',
   'A 28-year-old man has 2 weeks of haemoptysis and breathlessness, then develops AKI with creatinine 380 µmol/L. Renal biopsy shows linear IgG deposition along the glomerular basement membrane. What is the most likely cause?',
   'Anti-GBM disease',
   '["Acute tubular necrosis (ischaemic)","NSAIDs","ACE-inhibitor","IgA nephropathy","Acute interstitial nephritis","Rhabdomyolysis","Pre-renal — hypovolaemia","Obstructing prostate enlargement","Bilateral renal vein thrombosis","Contrast-induced nephropathy"]'::jsonb,
   4, 'https://www.nice.org.uk/guidance/ng148', 'NICE NG148 — AKI', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-aki-anti-gbm')
) as new_rows (
  exam, topic_path, claim, canonical_stem, answer, distractors,
  difficulty, citation_url, citation_label, source_type,
  high_yield, free_tier, status, question_kind, source_concept_id
)
where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);

-- =========================================================
-- THEME 3: Anaemia causes
-- =========================================================
insert into public.atoms (
  exam, topic_path, claim, canonical_stem, answer, distractors,
  difficulty, citation_url, citation_label, source_type,
  high_yield, free_tier, status, question_kind, source_concept_id
)
select * from (values
  ('UKMLA', ARRAY['Haematology','Anaemia'],
   'Iron-deficiency anaemia: microcytic hypochromic, low ferritin; in older adults — investigate GI source.',
   'A 70-year-old woman presents with fatigue. Hb 88 g/L, MCV 70 fL, ferritin 8 µg/L. Faecal occult blood is positive. What is the most likely cause of her anaemia?',
   'Iron-deficiency anaemia (GI blood loss)',
   '["Vitamin B12 deficiency","Folate deficiency","Anaemia of chronic disease","Beta-thalassaemia trait","Sickle-cell anaemia","Aplastic anaemia","Haemolytic anaemia (autoimmune)","Pernicious anaemia","Hereditary spherocytosis","Lead poisoning"]'::jsonb,
   1, 'https://www.nice.org.uk/guidance/cg61', 'NICE CG61 — Iron-deficiency anaemia', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-anaemia-ida'),
  ('UKMLA', ARRAY['Haematology','Anaemia'],
   'Pernicious anaemia: autoimmune destruction of parietal cells → low B12; macrocytic anaemia + neurology.',
   'A 65-year-old woman has tingling in both feet and unsteady gait. Hb 95 g/L, MCV 112 fL, B12 100 ng/L. Anti-intrinsic-factor antibodies positive. What is the most likely cause?',
   'Pernicious anaemia',
   '["Iron-deficiency anaemia (GI blood loss)","Folate deficiency","Anaemia of chronic disease","Beta-thalassaemia trait","Sickle-cell anaemia","Aplastic anaemia","Haemolytic anaemia (autoimmune)","Vitamin B12 deficiency","Hereditary spherocytosis","Lead poisoning"]'::jsonb,
   2, 'https://www.nice.org.uk/guidance/ng239', 'NICE NG239 — B12 and folate deficiency', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-anaemia-pernicious'),
  ('UKMLA', ARRAY['Haematology','Anaemia'],
   'Anaemia of chronic disease: normocytic, low TIBC, raised ferritin; usually the picture in CKD/RA.',
   'A 55-year-old man with rheumatoid arthritis on methotrexate has Hb 102 g/L, MCV 88 fL, ferritin 250 µg/L, TIBC low. What is the most likely cause?',
   'Anaemia of chronic disease',
   '["Iron-deficiency anaemia (GI blood loss)","Folate deficiency","Vitamin B12 deficiency","Beta-thalassaemia trait","Sickle-cell anaemia","Aplastic anaemia","Haemolytic anaemia (autoimmune)","Pernicious anaemia","Hereditary spherocytosis","Lead poisoning"]'::jsonb,
   3, 'https://www.nice.org.uk/guidance/ng157', 'NICE NG157 — Rheumatoid arthritis', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-anaemia-acd'),
  ('UKMLA', ARRAY['Haematology','Anaemia'],
   'Haemolytic anaemia (autoimmune): high reticulocytes, raised LDH/bilirubin, positive Coombs.',
   'A 30-year-old woman has 2 weeks of fatigue and dark urine. Hb 75 g/L, reticulocytes 7 %, LDH high, indirect bilirubin raised, DAT positive. What is the most likely cause?',
   'Haemolytic anaemia (autoimmune)',
   '["Iron-deficiency anaemia (GI blood loss)","Folate deficiency","Vitamin B12 deficiency","Beta-thalassaemia trait","Sickle-cell anaemia","Aplastic anaemia","Anaemia of chronic disease","Pernicious anaemia","Hereditary spherocytosis","Lead poisoning"]'::jsonb,
   3, 'https://www.nhs.uk/conditions/haemolytic-anaemia/', 'NHS — Haemolytic anaemia', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-anaemia-aiha'),
  ('UKMLA', ARRAY['Haematology','Anaemia'],
   'Beta-thalassaemia trait: very microcytic anaemia disproportionate to mild Hb drop, normal ferritin, raised HbA2.',
   'A 25-year-old woman of Cypriot descent has Hb 110 g/L, MCV 65 fL, ferritin 80 µg/L. HbA2 5.5 %. What is the most likely cause?',
   'Beta-thalassaemia trait',
   '["Iron-deficiency anaemia (GI blood loss)","Folate deficiency","Vitamin B12 deficiency","Pernicious anaemia","Sickle-cell anaemia","Aplastic anaemia","Anaemia of chronic disease","Haemolytic anaemia (autoimmune)","Hereditary spherocytosis","Lead poisoning"]'::jsonb,
   3, 'https://www.nhs.uk/conditions/thalassaemia/', 'NHS — Thalassaemia', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-anaemia-thalassaemia')
) as new_rows (
  exam, topic_path, claim, canonical_stem, answer, distractors,
  difficulty, citation_url, citation_label, source_type,
  high_yield, free_tier, status, question_kind, source_concept_id
)
where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);

-- =========================================================
-- THEME 4: Acute headache differentials
-- =========================================================
insert into public.atoms (
  exam, topic_path, claim, canonical_stem, answer, distractors,
  difficulty, citation_url, citation_label, source_type,
  high_yield, free_tier, status, question_kind, source_concept_id
)
select * from (values
  ('UKMLA', ARRAY['Neurology','Headache'],
   'Subarachnoid haemorrhage: thunderclap headache, peak in seconds, often with neck stiffness/vomiting.',
   'A 45-year-old woman describes the worst headache of her life starting suddenly while exercising. She has neck stiffness and photophobia. CT head shows blood in the sulci. What is the most likely diagnosis?',
   'Subarachnoid haemorrhage',
   '["Migraine","Tension-type headache","Cluster headache","Giant-cell arteritis","Bacterial meningitis","Encephalitis","Idiopathic intracranial hypertension","Space-occupying lesion","Trigeminal neuralgia","Medication-overuse headache"]'::jsonb,
   2, 'https://www.nice.org.uk/guidance/cg150', 'NICE CG150 — Headaches', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-hd-sah'),
  ('UKMLA', ARRAY['Neurology','Headache'],
   'Giant-cell arteritis: > 50 yrs, temporal headache + jaw claudication + visual loss, raised ESR.',
   'A 72-year-old woman has a 2-week unilateral temporal headache, jaw pain when chewing, and transient visual loss in one eye. ESR 95 mm/h. What is the most likely diagnosis?',
   'Giant-cell arteritis',
   '["Subarachnoid haemorrhage","Migraine","Tension-type headache","Cluster headache","Bacterial meningitis","Encephalitis","Idiopathic intracranial hypertension","Space-occupying lesion","Trigeminal neuralgia","Medication-overuse headache"]'::jsonb,
   2, 'https://www.nice.org.uk/guidance/cg150', 'NICE CG150 — Headaches', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-hd-gca'),
  ('UKMLA', ARRAY['Neurology','Headache'],
   'Cluster headache: severe unilateral retro-orbital pain in clusters, often nightly, with autonomic features (lacrimation, ptosis).',
   'A 35-year-old man has nightly bouts of severe right-sided retro-orbital pain lasting 45 min, with right-sided lacrimation and a partial ptosis. What is the most likely diagnosis?',
   'Cluster headache',
   '["Subarachnoid haemorrhage","Migraine","Tension-type headache","Giant-cell arteritis","Bacterial meningitis","Encephalitis","Idiopathic intracranial hypertension","Space-occupying lesion","Trigeminal neuralgia","Medication-overuse headache"]'::jsonb,
   3, 'https://www.nice.org.uk/guidance/cg150', 'NICE CG150 — Headaches', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-hd-cluster'),
  ('UKMLA', ARRAY['Neurology','Headache'],
   'Bacterial meningitis: fever + headache + neck stiffness ± rash; LP confirms.',
   'A 19-year-old student presents with 12 h of fever, severe headache, neck stiffness, photophobia and a non-blanching rash. What is the most likely diagnosis?',
   'Bacterial meningitis',
   '["Subarachnoid haemorrhage","Migraine","Tension-type headache","Cluster headache","Giant-cell arteritis","Encephalitis","Idiopathic intracranial hypertension","Space-occupying lesion","Trigeminal neuralgia","Medication-overuse headache"]'::jsonb,
   1, 'https://www.nice.org.uk/guidance/ng240', 'NICE NG240 — Meningitis', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-hd-meningitis'),
  ('UKMLA', ARRAY['Neurology','Headache'],
   'Idiopathic intracranial hypertension: young, obese woman; daily headache + transient visual obscurations + papilloedema; raised LP opening pressure.',
   'A 28-year-old woman with BMI 38 has 6 weeks of daily headache and transient blurring of vision when she stands. Fundoscopy shows bilateral papilloedema; CT head normal; LP opening pressure 32 cmH₂O. What is the most likely diagnosis?',
   'Idiopathic intracranial hypertension',
   '["Subarachnoid haemorrhage","Migraine","Tension-type headache","Cluster headache","Giant-cell arteritis","Bacterial meningitis","Encephalitis","Space-occupying lesion","Trigeminal neuralgia","Medication-overuse headache"]'::jsonb,
   3, 'https://www.nice.org.uk/guidance/cg150', 'NICE CG150 — Headaches', 'doctor_seed',
   true, true, 'pending_review', 'emq', 'emq-hd-iih')
) as new_rows (
  exam, topic_path, claim, canonical_stem, answer, distractors,
  difficulty, citation_url, citation_label, source_type,
  high_yield, free_tier, status, question_kind, source_concept_id
)
where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);
