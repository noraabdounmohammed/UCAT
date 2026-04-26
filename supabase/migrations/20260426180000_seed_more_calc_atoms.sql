-- Plan 13J — expand drug-calc bank from 8 → 22 atoms.
--
-- All hand-authored, deterministic, BNF/NICE-grounded. No LLM needed.
-- Citations are Open Government Licence (NICE/NHS) or BNF where freely
-- linkable. Renderer uses ±5 % tolerance so rounding-style answers pass.
-- Idempotent via `where not exists` on source_concept_id.

insert into public.atoms (
  exam, topic_path, claim, canonical_stem, answer, distractors,
  difficulty, image_url, image_alt,
  citation_url, citation_label, source_type,
  high_yield, free_tier, status, question_kind, source_concept_id
)
select * from (values
  -- ECG rate from R-R squares (300 / big squares)
  ('UKMLA',
   ARRAY['Calculations', 'ECG'],
   'Heart rate (regular rhythm) ≈ 300 / number of large squares between R-R.',
   'A regular ECG shows 4 large squares between consecutive R waves. What is the heart rate in beats per minute?',
   '75', '[]'::jsonb,
   2, null, null,
   'https://www.nice.org.uk/guidance/cg95', 'NICE CG95 — chest pain', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-ecg-rate-75'),

  -- Adrenaline anaphylaxis adult IM dose (Resus Council UK 2021): 500 micrograms = 0.5 mg
  ('UKMLA',
   ARRAY['Calculations', 'Anaphylaxis'],
   'Adult IM adrenaline for anaphylaxis = 500 micrograms (0.5 ml of 1:1000) per Resus Council UK 2021.',
   'A 35-year-old adult is in anaphylaxis. What dose of IM adrenaline (in micrograms) should be given as the first dose?',
   '500', '[]'::jsonb,
   1, null, null,
   'https://www.resus.org.uk/library/additional-guidance/guidance-anaphylaxis', 'Resus Council UK — Anaphylaxis 2021', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-adrenaline-adult-500'),

  -- Adrenaline child 6-12y IM: 300 micrograms
  ('UKMLA',
   ARRAY['Calculations', 'Anaphylaxis'],
   'Resus Council UK 2021: child 6–12 yrs IM adrenaline = 300 micrograms (0.3 ml of 1:1000).',
   'An 8-year-old child is in anaphylaxis. According to Resus Council UK 2021, what is the IM adrenaline dose in micrograms?',
   '300', '[]'::jsonb,
   2, null, null,
   'https://www.resus.org.uk/library/additional-guidance/guidance-anaphylaxis', 'Resus Council UK — Anaphylaxis 2021', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-adrenaline-child-300'),

  -- Adrenaline cardiac arrest IV: 1 mg
  ('UKMLA',
   ARRAY['Calculations', 'Resuscitation'],
   'ALS adult cardiac-arrest IV adrenaline dose = 1 mg every 3–5 min (10 ml of 1:10 000).',
   'An adult is in cardiac arrest with shockable rhythm. After the third shock, what dose of IV adrenaline (in mg) is given per ALS?',
   '1', '[]'::jsonb,
   1, null, null,
   'https://www.resus.org.uk/library/2021-resuscitation-guidelines/adult-advanced-life-support-guidelines', 'Resus Council UK — ALS 2021', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-adrenaline-arrest-1'),

  -- Maximum lidocaine plain: 3 mg/kg
  ('UKMLA',
   ARRAY['Calculations', 'Local anaesthetic'],
   'Maximum dose plain lidocaine = 3 mg/kg (BNF).',
   'A 70 kg adult needs local infiltration with plain lidocaine. What is the maximum dose in mg?',
   '210', '[]'::jsonb,
   2, null, null,
   'https://bnf.nice.org.uk/drugs/lidocaine-hydrochloride/', 'BNF — Lidocaine hydrochloride', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-lidocaine-210'),

  -- Maximum lidocaine WITH adrenaline: 7 mg/kg
  ('UKMLA',
   ARRAY['Calculations', 'Local anaesthetic'],
   'Maximum dose lidocaine with adrenaline = 7 mg/kg (BNF).',
   'A 70 kg adult needs lidocaine with adrenaline. What is the maximum total dose in mg?',
   '490', '[]'::jsonb,
   3, null, null,
   'https://bnf.nice.org.uk/drugs/lidocaine-hydrochloride/', 'BNF — Lidocaine hydrochloride', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-lidocaine-adr-490'),

  -- Sodium correction (chronic hyponatraemia) max rate: 10 mmol/L/24 h
  ('UKMLA',
   ARRAY['Calculations', 'Electrolytes'],
   'Chronic hyponatraemia: maximum sodium correction = 10 mmol/L per 24 h to avoid osmotic demyelination.',
   'A patient with chronic hyponatraemia has serum Na 115 mmol/L. What is the maximum allowable serum Na (mmol/L) at the end of the first 24 h of correction?',
   '125', '[]'::jsonb,
   3, null, null,
   'https://www.nice.org.uk/guidance/ng80', 'NICE NG80 — Hyponatraemia', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-na-correction-125'),

  -- IV potassium max peripheral: 10 mmol/h
  ('UKMLA',
   ARRAY['Calculations', 'Electrolytes'],
   'Peripheral IV potassium max rate = 10 mmol/h (NICE adult IV-fluids guideline).',
   'An adult patient on a general ward has K 2.8 mmol/L and needs IV potassium replacement via a peripheral line. What is the maximum infusion rate in mmol/h?',
   '10', '[]'::jsonb,
   2, null, null,
   'https://www.nice.org.uk/guidance/cg174', 'NICE CG174 — IV fluids in adults', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-iv-k-10'),

  -- DKA fluid resus first bag (sBP > 90): 1 L over 1 h
  ('UKMLA',
   ARRAY['Calculations', 'Diabetes'],
   'JBDS DKA pathway: if sBP > 90 mmHg, first bag of 0.9 % saline = 1 L over 1 h.',
   'A patient with DKA has sBP 110 mmHg. According to JBDS, how many mL of 0.9 % saline should be given in the first hour?',
   '1000', '[]'::jsonb,
   2, null, null,
   'https://www.nice.org.uk/guidance/ng28', 'NICE NG28 — Type 2 diabetes', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-dka-1000'),

  -- Fixed-rate insulin DKA: 0.1 U/kg/h
  ('UKMLA',
   ARRAY['Calculations', 'Diabetes'],
   'JBDS DKA pathway: fixed-rate IV insulin = 0.1 unit/kg/h.',
   'A 70 kg patient with DKA needs a fixed-rate insulin infusion. What is the rate in units per hour?',
   '7', '[]'::jsonb,
   2, null, null,
   'https://www.nice.org.uk/guidance/ng28', 'NICE NG28 — Type 2 diabetes', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-dka-insulin-7'),

  -- Salbutamol nebuliser child 5+ y: 5 mg
  ('UKMLA',
   ARRAY['Calculations', 'Asthma'],
   'BNFc: nebulised salbutamol for child ≥ 5 yrs in acute asthma = 5 mg per dose.',
   'A 7-year-old has acute severe asthma. What is the BNFc nebulised salbutamol dose in mg?',
   '5', '[]'::jsonb,
   2, null, null,
   'https://bnfc.nice.org.uk/drugs/salbutamol/', 'BNFc — Salbutamol', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-salb-5'),

  -- Naloxone first IV adult: 400 micrograms
  ('UKMLA',
   ARRAY['Calculations', 'Toxicology'],
   'Adult IV naloxone for opioid overdose = 400 micrograms initial bolus (BNF).',
   'An unresponsive adult with pinpoint pupils and shallow breathing is given IV naloxone. What is the first dose in micrograms?',
   '400', '[]'::jsonb,
   1, null, null,
   'https://bnf.nice.org.uk/drugs/naloxone-hydrochloride/', 'BNF — Naloxone hydrochloride', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-naloxone-400'),

  -- Drip-rate calculation (gtt/min)
  ('UKMLA',
   ARRAY['Calculations', 'IV fluids'],
   'Drip rate (drops/min) = (volume mL × drop factor) / time min. Standard giving set = 20 drops/mL.',
   'You need to give 1000 mL of 0.9 % saline over 8 h via a standard giving set (20 drops/mL). What is the drip rate in drops per minute?',
   '42', '[]'::jsonb,
   3, null, null,
   'https://www.nice.org.uk/guidance/cg174', 'NICE CG174 — IV fluids in adults', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-drip-42'),

  -- Mean arterial pressure
  ('UKMLA',
   ARRAY['Calculations', 'Haemodynamics'],
   'MAP ≈ DBP + (SBP − DBP)/3.',
   'A patient has BP 120/60 mmHg. Calculate the mean arterial pressure in mmHg.',
   '80', '[]'::jsonb,
   2, null, null,
   'https://www.nice.org.uk/guidance/ng136', 'NICE NG136 — Hypertension in adults', 'doctor_seed',
   true, true, 'pending_review', 'calc', 'calc-map-80')
) as new_rows (exam, topic_path, claim, canonical_stem, answer, distractors,
               difficulty, image_url, image_alt,
               citation_url, citation_label, source_type,
               high_yield, free_tier, status, question_kind, source_concept_id)
where not exists (
  select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id
);
