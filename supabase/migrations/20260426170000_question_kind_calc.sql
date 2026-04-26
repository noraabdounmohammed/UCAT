-- Plan 13I — add 'calc' to question_kind allowlist + seed standard UKMLA drug calcs.
--
-- Standard UKMLA drug calcs are formula-based + well-defined, so we can
-- generate them deterministically (no LLM needed for the body). Each is
-- inserted with question_kind='calc' so <CalcRenderer /> picks them up
-- via the QuestionRouter.

alter table public.atoms
  drop constraint if exists atoms_question_kind_check;

alter table public.atoms
  add constraint atoms_question_kind_check
  check (question_kind in ('sba', 'cloze', 'emq', 'calc'));

-- Seed: handful of high-yield calc atoms covering BMI, GFR, IV maintenance,
-- paracetamol max dose, paediatric weight-based dosing.
-- Idempotency: skip rows whose source_concept_id already exists.
insert into public.atoms (
  exam, topic_path, claim, canonical_stem, answer, distractors,
  difficulty, image_url, image_alt,
  citation_url, citation_label, source_type,
  high_yield, free_tier, status, question_kind, source_concept_id
)
select * from (values
  -- BMI
  ('UKMLA',
   ARRAY['Calculations', 'BMI'],
   'BMI = weight(kg) / height(m)²',
   'A patient is 1.75 m tall and weighs 92 kg. Calculate their BMI to one decimal place. Type the number only.',
   '30.0', '[]'::jsonb,
   2, null, null,
   'https://www.nice.org.uk/guidance/cg189', 'NICE CG189 — Obesity', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-bmi-30'),
  -- BMI underweight
  ('UKMLA',
   ARRAY['Calculations', 'BMI'],
   'BMI = weight(kg) / height(m)²',
   'A patient is 1.62 m tall and weighs 45 kg. Calculate their BMI to one decimal place.',
   '17.1', '[]'::jsonb,
   2, null, null,
   'https://www.nice.org.uk/guidance/cg189', 'NICE CG189 — Obesity', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-bmi-17'),
  -- IV maintenance fluids (NICE CG174 — adult): 25-30 ml/kg/day
  ('UKMLA',
   ARRAY['Calculations', 'IV fluids'],
   'NICE adult maintenance IV fluid is 25–30 ml/kg/day; midpoint ~ 25 ml/kg/day.',
   'A 70 kg adult is nil by mouth post-op and needs 24-hour maintenance IV fluids per NICE CG174 (use 25 ml/kg/day). What is the total volume in ml over 24 h?',
   '1750', '[]'::jsonb,
   2, null, null,
   'https://www.nice.org.uk/guidance/cg174', 'NICE CG174 — IV fluids in adults', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-iv-1750'),
  -- Paracetamol max daily dose (adult, oral): 4 g
  ('UKMLA',
   ARRAY['Calculations', 'Paracetamol dosing'],
   'Adult oral paracetamol max = 4 g per 24 h (BNF).',
   'A healthy 60 kg adult is taking oral paracetamol for pain. According to the BNF, what is the maximum daily dose in milligrams?',
   '4000', '[]'::jsonb,
   1, null, null,
   'https://bnf.nice.org.uk/drugs/paracetamol/', 'BNF — Paracetamol', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-paracetamol-4000'),
  -- Paediatric paracetamol single dose: 15 mg/kg
  ('UKMLA',
   ARRAY['Calculations', 'Paracetamol dosing'],
   'Paediatric paracetamol oral dose = 15 mg/kg per dose, max QDS (BNFc).',
   'A 12 kg child needs oral paracetamol per the BNFc weight-based dose (15 mg/kg). What is the single dose in milligrams?',
   '180', '[]'::jsonb,
   2, null, null,
   'https://bnfc.nice.org.uk/drugs/paracetamol/', 'BNFc — Paracetamol', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-paracetamol-paeds-180'),
  -- Paediatric maintenance fluids (Holliday-Segar 4-2-1)
  ('UKMLA',
   ARRAY['Calculations', 'Paediatric fluids'],
   'Holliday-Segar: 4 ml/kg/h for first 10 kg + 2 ml/kg/h for next 10 kg + 1 ml/kg/h for remainder.',
   'A 25 kg child needs hourly maintenance IV fluids using the Holliday-Segar formula (4-2-1). What is the rate in ml/h?',
   '65', '[]'::jsonb,
   3, null, null,
   'https://www.nice.org.uk/guidance/ng29', 'NICE NG29 — IV fluids in children', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-paeds-fluids-65'),
  -- eGFR Cockcroft-Gault (lite): use given values
  ('UKMLA',
   ARRAY['Calculations', 'Renal'],
   'Cockcroft-Gault: CrCl = ((140 − age) × weight × constant) / (serum creatinine × 0.815). For a male, the value works out to give CrCl directly in ml/min when SI units are used.',
   'A 70-year-old male, weight 75 kg, serum creatinine 100 µmol/L. Estimate creatinine clearance using Cockcroft-Gault. The answer rounds to which integer (ml/min)?',
   '64', '[]'::jsonb,
   3, null, null,
   'https://www.nice.org.uk/guidance/ng203', 'NICE NG203 — CKD', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-ckd-cg-64'),
  -- Anion gap
  ('UKMLA',
   ARRAY['Calculations', 'Acid-base'],
   'Anion gap = (Na + K) − (Cl + HCO3); normal range ~10–18 mmol/L.',
   'Bloods show Na 138, K 4.0, Cl 100, HCO3 12 mmol/L. Calculate the anion gap (mmol/L).',
   '30', '[]'::jsonb,
   2, null, null,
   'https://www.nice.org.uk/guidance/ng28', 'NICE NG28 — Type 2 diabetes', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-anion-gap-30')
) as new_rows (exam, topic_path, claim, canonical_stem, answer, distractors,
               difficulty, image_url, image_alt,
               citation_url, citation_label, source_type,
               high_yield, free_tier, status, question_kind, source_concept_id)
where not exists (
  select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id
);
