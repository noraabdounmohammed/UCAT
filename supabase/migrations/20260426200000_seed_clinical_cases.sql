-- Plan 13K cont. — seed 4 chained clinical cases with linked atoms.
--
-- Each case = 1 vignette + 3 atoms hanging off it (Ix → Dx → Mx pattern).
-- All NICE/NHS-grounded, OGL-licensed sources. Hand-authored.
-- Idempotent via source_concept_id uniqueness.

do $$
declare
  case_chest_pain uuid;
  case_dka uuid;
  case_anaphylaxis uuid;
  case_stroke uuid;
begin
  -- ============= CASE 1: Acute coronary syndrome =============
  insert into public.clinical_cases
    (exam, title, vignette_md, citation_url, citation_label, source_type, status, source_concept_id)
  values
    ('UKMLA',
     'Crushing central chest pain',
     'A 62-year-old man presents to A&E with sudden-onset central crushing chest pain radiating to the left arm. He looks grey and clammy. Past medical history: hypertension and type 2 diabetes. He smokes 15 cigarettes a day.

Observations: HR 92, BP 148/86, SpO₂ 96 % on air, RR 18, T 36.8 °C.

ECG: 2 mm ST-elevation in leads II, III and aVF.

Initial bloods: Troponin pending.',
     'https://www.nice.org.uk/guidance/ng185',
     'NICE NG185 — Acute coronary syndromes',
     'doctor_seed', 'pending_review', 'case-acs-inferior-stemi')
  on conflict (source_concept_id) do nothing
  returning id into case_chest_pain;

  if case_chest_pain is null then
    select id into case_chest_pain from public.clinical_cases where source_concept_id = 'case-acs-inferior-stemi';
  end if;

  insert into public.atoms (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  select * from (values
    ('UKMLA', ARRAY['Cardiology', 'ACS'],
     'Inferior STEMI = ST-elevation in II, III, aVF.',
     'Based on the ECG findings, what is the most likely diagnosis?',
     'Inferior ST-elevation myocardial infarction',
     '["Anterior STEMI","Pulmonary embolism","Aortic dissection"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng185', 'NICE NG185 — ACS', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-acs-q1-dx', case_chest_pain),
    ('UKMLA', ARRAY['Cardiology', 'ACS'],
     'STEMI within 12 h of onset → primary PCI within 120 min of presentation (NICE NG185).',
     'What is the first-line definitive treatment for this patient if a PCI centre is available within 120 min?',
     'Primary percutaneous coronary intervention',
     '["Thrombolysis with alteplase","Coronary artery bypass grafting","Conservative management with aspirin alone"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng185', 'NICE NG185 — ACS', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-acs-q2-mx', case_chest_pain),
    ('UKMLA', ARRAY['Cardiology', 'ACS'],
     'Inferior MI is most often caused by occlusion of the right coronary artery.',
     'Which coronary artery is most likely to be occluded?',
     'Right coronary artery',
     '["Left anterior descending artery","Left circumflex artery","Left main stem"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng185', 'NICE NG185 — ACS', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-acs-q3-anatomy', case_chest_pain)
  ) as new_rows (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);

  -- ============= CASE 2: DKA =============
  insert into public.clinical_cases
    (exam, title, vignette_md, citation_url, citation_label, source_type, status, source_concept_id)
  values
    ('UKMLA',
     'Confused teenager with rapid breathing',
     'A 17-year-old girl is brought to A&E by her parents with 24 h of vomiting, polyuria and progressive drowsiness. She has type 1 diabetes and admits to missing several insulin doses.

Observations: HR 124, BP 96/60, RR 32 (deep, sighing), T 37.1 °C, SpO₂ 99 % on air. GCS 13.

Capillary blood glucose: 28 mmol/L.
Blood ketones: 5.4 mmol/L.
ABG: pH 7.18, HCO₃ 11 mmol/L.',
     'https://www.nice.org.uk/guidance/ng18',
     'NICE NG18 — Diabetes (children & young people)',
     'doctor_seed', 'pending_review', 'case-dka-teen')
  on conflict (source_concept_id) do nothing
  returning id into case_dka;

  if case_dka is null then
    select id into case_dka from public.clinical_cases where source_concept_id = 'case-dka-teen';
  end if;

  insert into public.atoms (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  select * from (values
    ('UKMLA', ARRAY['Endocrinology', 'DKA'],
     'DKA diagnostic triad (JBDS): hyperglycaemia >11, ketones ≥3, pH <7.30 / HCO₃ <15.',
     'Which combination of findings best confirms diabetic ketoacidosis here?',
     'Glucose >11, ketones ≥3, pH <7.30',
     '["Glucose >11, lactate >2, anion gap normal","Glucose >7, ketones ≥1, pH <7.40","Glucose <11, ketones ≥3, HCO₃ <15"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng18', 'NICE NG18 — Diabetes (CYP)', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-dka-q1-dx', case_dka),
    ('UKMLA', ARRAY['Endocrinology', 'DKA'],
     'JBDS DKA: first-bag fluid is 0.9 % saline; insulin starts at 0.1 unit/kg/h fixed-rate.',
     'After confirming the diagnosis, what is the most appropriate first IV management step?',
     '0.9 % saline 1 L over 1 h, then start fixed-rate insulin at 0.1 unit/kg/h',
     '["Variable-rate insulin sliding scale only","Bicarbonate infusion","5 % dextrose 1 L over 1 h"]'::jsonb,
     3,
     'https://www.nice.org.uk/guidance/ng18', 'NICE NG18 — Diabetes (CYP)', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-dka-q2-mx', case_dka),
    ('UKMLA', ARRAY['Calculations', 'Diabetes'],
     'Fixed-rate insulin in DKA = 0.1 unit/kg/h.',
     'She weighs 60 kg. What is her fixed-rate IV insulin infusion in units per hour?',
     '6', '[]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng18', 'NICE NG18 — Diabetes (CYP)', 'doctor_seed',
     true, true, 'pending_review', 'calc', 'case-dka-q3-calc-6', case_dka)
  ) as new_rows (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);

  -- ============= CASE 3: Anaphylaxis =============
  insert into public.clinical_cases
    (exam, title, vignette_md, citation_url, citation_label, source_type, status, source_concept_id)
  values
    ('UKMLA',
     'Sudden swelling and wheeze after a peanut',
     'A 24-year-old woman attends a friend''s birthday and bites into a chocolate brownie. Within 5 minutes her tongue and lips swell, she develops urticaria across her chest, and she begins to wheeze. A friend calls 999.

Observations on paramedic arrival: HR 132, BP 78/40, SpO₂ 92 % on air, RR 28, audible stridor.',
     'https://www.resus.org.uk/library/additional-guidance/guidance-anaphylaxis',
     'Resus Council UK — Anaphylaxis 2021',
     'doctor_seed', 'pending_review', 'case-anaphylaxis-peanut')
  on conflict (source_concept_id) do nothing
  returning id into case_anaphylaxis;

  if case_anaphylaxis is null then
    select id into case_anaphylaxis from public.clinical_cases where source_concept_id = 'case-anaphylaxis-peanut';
  end if;

  insert into public.atoms (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  select * from (values
    ('UKMLA', ARRAY['Immunology', 'Anaphylaxis'],
     'Anaphylaxis = sudden ABC compromise + skin/mucosal changes after exposure to a likely trigger.',
     'Which feature most strongly supports a diagnosis of anaphylaxis (rather than urticaria alone)?',
     'Hypotension and stridor',
     '["Itchy rash","Lip swelling alone","Anxiety and palpitations"]'::jsonb,
     1,
     'https://www.resus.org.uk/library/additional-guidance/guidance-anaphylaxis', 'Resus Council UK — Anaphylaxis 2021', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-anaph-q1-dx', case_anaphylaxis),
    ('UKMLA', ARRAY['Calculations', 'Anaphylaxis'],
     'Adult IM adrenaline for anaphylaxis = 500 micrograms (0.5 ml of 1:1000).',
     'What dose of IM adrenaline (in micrograms) should be given immediately?',
     '500', '[]'::jsonb,
     1,
     'https://www.resus.org.uk/library/additional-guidance/guidance-anaphylaxis', 'Resus Council UK — Anaphylaxis 2021', 'doctor_seed',
     true, true, 'pending_review', 'calc', 'case-anaph-q2-calc-500', case_anaphylaxis),
    ('UKMLA', ARRAY['Immunology', 'Anaphylaxis'],
     'After initial adrenaline, give high-flow oxygen and IV fluid challenge; consider repeat IM adrenaline at 5 min if no improvement.',
     'After IM adrenaline she remains hypotensive and wheezy 5 min later. What is the next best step?',
     'Repeat IM adrenaline 500 micrograms and give IV fluid bolus',
     '["IV chlorphenamine 10 mg only","Switch to oral prednisolone 40 mg","Salbutamol nebuliser as the only intervention"]'::jsonb,
     2,
     'https://www.resus.org.uk/library/additional-guidance/guidance-anaphylaxis', 'Resus Council UK — Anaphylaxis 2021', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-anaph-q3-mx', case_anaphylaxis)
  ) as new_rows (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);

  -- ============= CASE 4: Acute stroke =============
  insert into public.clinical_cases
    (exam, title, vignette_md, citation_url, citation_label, source_type, status, source_concept_id)
  values
    ('UKMLA',
     'Sudden right-sided weakness',
     'A 71-year-old man is brought in by ambulance after his wife noticed sudden right-sided weakness and slurred speech 90 min ago. He is in atrial fibrillation but is not on any anticoagulant.

Observations: HR 102 irregular, BP 178/96, SpO₂ 97 % on air, T 36.7 °C.

Examination: NIHSS 8 — right arm and leg weakness, mild dysarthria.

Capillary glucose: 6.4 mmol/L. CT head: no haemorrhage; loss of grey-white differentiation in the left MCA territory.',
     'https://www.nice.org.uk/guidance/ng128',
     'NICE NG128 — Stroke and TIA',
     'doctor_seed', 'pending_review', 'case-stroke-mca')
  on conflict (source_concept_id) do nothing
  returning id into case_stroke;

  if case_stroke is null then
    select id into case_stroke from public.clinical_cases where source_concept_id = 'case-stroke-mca';
  end if;

  insert into public.atoms (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  select * from (values
    ('UKMLA', ARRAY['Neurology', 'Stroke'],
     'Loss of grey-white differentiation in MCA territory on CT, with sudden focal deficit, suggests acute ischaemic stroke.',
     'What is the most likely diagnosis?',
     'Acute ischaemic stroke (left MCA territory)',
     '["Intracerebral haemorrhage","Subarachnoid haemorrhage","Bell''s palsy"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng128', 'NICE NG128 — Stroke and TIA', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-stroke-q1-dx', case_stroke),
    ('UKMLA', ARRAY['Neurology', 'Stroke'],
     'NICE NG128: thrombolysis with alteplase if presenting within 4.5 h of symptom onset and haemorrhage excluded.',
     'Symptoms started 90 min ago and CT excludes bleed. What is the next best step?',
     'IV alteplase (thrombolysis)',
     '["Aspirin 300 mg now, no thrombolysis","Warfarin loading","Heparin infusion"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng128', 'NICE NG128 — Stroke and TIA', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-stroke-q2-mx', case_stroke),
    ('UKMLA', ARRAY['Neurology', 'Stroke'],
     'After acute stroke (no haemorrhage) in atrial fibrillation, start anticoagulation typically 14 days post-event for non-disabling/disabling stroke per NICE.',
     'For long-term secondary prevention given his AF, what is the most appropriate medication?',
     'Direct oral anticoagulant (e.g. apixaban)',
     '["Lifelong aspirin 75 mg only","Clopidogrel 75 mg","Warfarin loading 10 mg/10 mg/5 mg"]'::jsonb,
     3,
     'https://www.nice.org.uk/guidance/ng128', 'NICE NG128 — Stroke and TIA', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-stroke-q3-prevention', case_stroke)
  ) as new_rows (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);
end$$;
