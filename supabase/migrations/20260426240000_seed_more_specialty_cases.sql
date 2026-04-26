-- Plan 13K cont. — 4 more chained cases (10 → 14 total).
-- Covers under-served specialties: Psych, Derm, ID, MSK.

do $$
declare
  case_psych uuid;
  case_derm uuid;
  case_id_lyme uuid;
  case_msk uuid;
begin
  -- ============= CASE: First-episode psychosis =============
  insert into public.clinical_cases
    (exam, title, vignette_md, citation_url, citation_label, source_type, status, source_concept_id)
  values
    ('UKMLA',
     'Withdrawn 19-year-old with paranoid beliefs',
     'A 19-year-old male university student is brought to the GP by his mother. Over 6 months he has become increasingly withdrawn, dropped out of his studies and now expresses fixed beliefs that the security services are monitoring him through his laptop.

He hears a voice giving a running commentary on his actions. He has lost weight and stopped showering. He denies illicit drug use and his urine drug screen is negative.

There is a family history of schizophrenia in a maternal uncle.',
     'https://www.nice.org.uk/guidance/cg178',
     'NICE CG178 — Psychosis and schizophrenia',
     'doctor_seed', 'pending_review', 'case-psych-fep')
  on conflict (source_concept_id) do nothing
  returning id into case_psych;

  if case_psych is null then
    select id into case_psych from public.clinical_cases where source_concept_id = 'case-psych-fep';
  end if;

  insert into public.atoms (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  select * from (values
    ('UKMLA', ARRAY['Psychiatry','Psychosis'],
     'First-episode psychosis: ≥1 month of positive symptoms (delusions/hallucinations) + functional decline; rule out organic and substance causes.',
     'What is the most likely diagnosis?',
     'First-episode psychosis (likely schizophrenia)',
     '["Bipolar affective disorder, manic episode","Severe depressive episode with psychotic features","Drug-induced psychosis","Organic brain disease (e.g. encephalitis)"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/cg178', 'NICE CG178 — Psychosis and schizophrenia', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-psych-q1-dx', case_psych),
    ('UKMLA', ARRAY['Psychiatry','Psychosis'],
     'NICE CG178: refer suspected first-episode psychosis to Early Intervention in Psychosis service (EIP) urgently — assessment within 2 weeks.',
     'What is the most appropriate next step?',
     'Urgent referral to Early Intervention in Psychosis service',
     '["Start oral risperidone today in primary care","Detain under Mental Health Act","Routine outpatient psychiatry referral","Reassure and review in 4 weeks"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/cg178', 'NICE CG178 — Psychosis and schizophrenia', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-psych-q2-mx', case_psych),
    ('UKMLA', ARRAY['Psychiatry','Psychosis'],
     'NICE CG178: first-line pharmacological = oral 2nd-generation antipsychotic (e.g. risperidone, olanzapine) + family-inclusive CBT for psychosis.',
     'After EIP assessment confirms first-episode psychosis, what combination is recommended for initial treatment?',
     'Oral second-generation antipsychotic + CBT for psychosis',
     '["Antipsychotic alone, no psychological therapy","CBT alone","Long-acting depot injection on day 1","Lithium monotherapy"]'::jsonb,
     3,
     'https://www.nice.org.uk/guidance/cg178', 'NICE CG178 — Psychosis and schizophrenia', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-psych-q3-rx', case_psych)
  ) as new_rows (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);

  -- ============= CASE: Cellulitis with sepsis features =============
  insert into public.clinical_cases
    (exam, title, vignette_md, citation_url, citation_label, source_type, status, source_concept_id)
  values
    ('UKMLA',
     'Hot, swollen leg in a diabetic patient',
     'A 65-year-old man with type 2 diabetes presents with a 48-h history of redness, warmth and swelling extending up his right lower leg from a cracked area between his toes. He has rigors today.

Observations: HR 108, BP 118/72, T 38.4 °C, RR 18, SpO₂ 97 % on air. The skin is erythematous with poorly defined edges; no fluctuance, no crepitus.

Bloods: WCC 16.5, CRP 188.',
     'https://www.nice.org.uk/guidance/ng141',
     'NICE NG141 — Cellulitis and erysipelas',
     'doctor_seed', 'pending_review', 'case-derm-cellulitis')
  on conflict (source_concept_id) do nothing
  returning id into case_derm;

  if case_derm is null then
    select id into case_derm from public.clinical_cases where source_concept_id = 'case-derm-cellulitis';
  end if;

  insert into public.atoms (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  select * from (values
    ('UKMLA', ARRAY['Dermatology','Cellulitis'],
     'Cellulitis: poorly demarcated erythema, warmth, swelling and tenderness; commonly caused by S. pyogenes / S. aureus.',
     'What is the most likely diagnosis?',
     'Cellulitis (Eron Class III — systemically unwell)',
     '["Erysipelas (sharply demarcated)","Necrotising fasciitis","DVT","Lipodermatosclerosis"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng141', 'NICE NG141 — Cellulitis', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-derm-q1-dx', case_derm),
    ('UKMLA', ARRAY['Dermatology','Cellulitis'],
     'Eron Class III/IV cellulitis (systemic features) → admit for IV antibiotics; first-line is IV flucloxacillin (penicillin allergy: clarithromycin or clindamycin).',
     'What is the most appropriate management?',
     'Admit for IV flucloxacillin',
     '["Outpatient oral flucloxacillin and discharge","Topical fusidic acid","Watch and wait, review in 48 h","Surgical debridement immediately"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng141', 'NICE NG141 — Cellulitis', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-derm-q2-mx', case_derm),
    ('UKMLA', ARRAY['Dermatology','Cellulitis'],
     'Necrotising fasciitis red flags: pain out of proportion to clinical signs, rapid spread, systemic toxicity, crepitus, skin necrosis.',
     'Which feature would most strongly suggest necrotising fasciitis rather than cellulitis?',
     'Pain disproportionate to clinical findings with rapid spread',
     '["Sharply demarcated erythema","Vesicles confined to one dermatome","Itch as the dominant symptom","Resolution within 24 h of oral antibiotics"]'::jsonb,
     3,
     'https://www.nice.org.uk/guidance/ng141', 'NICE NG141 — Cellulitis', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-derm-q3-redflag', case_derm)
  ) as new_rows (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);

  -- ============= CASE: Lyme disease (early localised) =============
  insert into public.clinical_cases
    (exam, title, vignette_md, citation_url, citation_label, source_type, status, source_concept_id)
  values
    ('UKMLA',
     'Bullseye rash after a New Forest walking holiday',
     'A 36-year-old woman returns from a hiking holiday in the New Forest and 10 days later notices an enlarging red ring on her right thigh, now ~10 cm across with central clearing. She has flu-like symptoms — myalgia, low-grade fever and a mild headache.

She does not recall a tick bite but did remove an unidentified arthropod 2 weeks ago.

Examination: erythema migrans rash, no neurological signs, no joint swelling.',
     'https://www.nice.org.uk/guidance/ng95',
     'NICE NG95 — Lyme disease',
     'doctor_seed', 'pending_review', 'case-id-lyme')
  on conflict (source_concept_id) do nothing
  returning id into case_id_lyme;

  if case_id_lyme is null then
    select id into case_id_lyme from public.clinical_cases where source_concept_id = 'case-id-lyme';
  end if;

  insert into public.atoms (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  select * from (values
    ('UKMLA', ARRAY['Infection','Lyme'],
     'Erythema migrans is pathognomonic for early localised Lyme disease — diagnose clinically, no serology needed.',
     'What is the most likely diagnosis?',
     'Early localised Lyme disease',
     '["Cellulitis","Tinea corporis","Erythema multiforme","Allergic reaction to insect bite"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng95', 'NICE NG95 — Lyme disease', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-lyme-q1-dx', case_id_lyme),
    ('UKMLA', ARRAY['Infection','Lyme'],
     'Erythema migrans is pathognomonic — start antibiotics on clinical grounds, do NOT delay for serology (which can be falsely negative early).',
     'How should the diagnosis be established before starting treatment?',
     'On clinical grounds — erythema migrans alone, no serology needed',
     '["Wait for positive Lyme serology before treating","Skin biopsy with PCR","CT chest / abdomen / pelvis","Lumbar puncture for Borrelia DNA"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng95', 'NICE NG95 — Lyme disease', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-lyme-q2-dx-method', case_id_lyme),
    ('UKMLA', ARRAY['Infection','Lyme'],
     'NICE NG95: first-line for adults with early Lyme disease = oral doxycycline 100 mg BD for 21 days (amoxicillin if doxycycline contraindicated).',
     'What is the most appropriate first-line antibiotic for this adult?',
     'Oral doxycycline 100 mg BD for 21 days',
     '["Topical fusidic acid","IV ceftriaxone for 14 days","Oral amoxicillin for 7 days","Oral azithromycin for 5 days"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/ng95', 'NICE NG95 — Lyme disease', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-lyme-q3-rx', case_id_lyme)
  ) as new_rows (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);

  -- ============= CASE: Suspected hip fracture =============
  insert into public.clinical_cases
    (exam, title, vignette_md, citation_url, citation_label, source_type, status, source_concept_id)
  values
    ('UKMLA',
     'Fall in an 82-year-old, leg short and rotated',
     'An 82-year-old woman is brought to A&E after a mechanical fall at home. She landed on her right side and now has severe right hip pain and cannot weight-bear.

On examination: right leg shortened and externally rotated. Distal pulses present, sensation intact.

She has a past history of osteoporosis (on alendronate), hypothyroidism, and is normally fully independent.

X-ray confirms an undisplaced intracapsular fracture of the right neck of femur.',
     'https://www.nice.org.uk/guidance/cg124',
     'NICE CG124 — Hip fracture management',
     'doctor_seed', 'pending_review', 'case-msk-nof')
  on conflict (source_concept_id) do nothing
  returning id into case_msk;

  if case_msk is null then
    select id into case_msk from public.clinical_cases where source_concept_id = 'case-msk-nof';
  end if;

  insert into public.atoms (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  select * from (values
    ('UKMLA', ARRAY['Orthopaedics','Hip fracture'],
     'Classic NOF fracture: shortened, externally rotated leg + fall in older adult; intracapsular fractures risk avascular necrosis.',
     'What is the most likely diagnosis?',
     'Intracapsular fracture of the right neck of femur',
     '["Extracapsular intertrochanteric fracture","Subtrochanteric fracture","Pubic ramus fracture","Hip dislocation"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/cg124', 'NICE CG124 — Hip fracture', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-nof-q1-dx', case_msk),
    ('UKMLA', ARRAY['Orthopaedics','Hip fracture'],
     'NICE CG124: surgery on day of admission or next day; for displaced intracapsular in fit patient, total hip replacement; for undisplaced, internal fixation considered (or hemiarthroplasty/THR).',
     'For this independent 82-year-old with an undisplaced intracapsular fracture, what is the most appropriate definitive operation?',
     'Hemiarthroplasty (or total hip replacement if independent and cognitively well) per NICE',
     '["Conservative management with bed rest","Plate-and-screw fixation of the femoral shaft","External fixator","Total knee replacement"]'::jsonb,
     3,
     'https://www.nice.org.uk/guidance/cg124', 'NICE CG124 — Hip fracture', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-nof-q2-mx', case_msk),
    ('UKMLA', ARRAY['Orthopaedics','Hip fracture'],
     'NICE CG124: surgery within 36 hours of admission to reduce mortality; this is one of the few NHS Best Practice Tariff KPIs.',
     'When should surgery occur according to NICE?',
     'Within 36 hours of admission',
     '["Within 7 days","Within 14 days","Only if pain control fails","After 6 weeks of traction"]'::jsonb,
     2,
     'https://www.nice.org.uk/guidance/cg124', 'NICE CG124 — Hip fracture', 'doctor_seed',
     true, true, 'pending_review', 'sba', 'case-nof-q3-timing', case_msk)
  ) as new_rows (
    exam, topic_path, claim, canonical_stem, answer, distractors,
    difficulty, citation_url, citation_label, source_type,
    high_yield, free_tier, status, question_kind, source_concept_id, case_id
  )
  where not exists (select 1 from public.atoms a where a.source_concept_id = new_rows.source_concept_id);
end$$;
