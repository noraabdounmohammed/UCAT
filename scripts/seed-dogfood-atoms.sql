-- Plan 2 / Task 13 — dogfood seed atoms for the /study route smoke test.
-- 5 high-yield UKMLA atoms, all NICE-cited, all flagged free_tier so an
-- unauthenticated visitor can hit them via Plan 2's UI on first encounter.
-- Idempotent: each insert is gated on no existing atom with the same claim.

insert into public.atoms (
  exam, topic_path, claim, canonical_stem, answer, distractors,
  difficulty, citation_url, citation_label, source_type,
  high_yield, free_tier, status, reviewed_at
)
select
  v.exam, v.topic_path::text[], v.claim, v.canonical_stem, v.answer, v.distractors::jsonb,
  v.difficulty::smallint, v.citation_url, v.citation_label, v.source_type,
  v.high_yield::boolean, v.free_tier::boolean, v.status, v.reviewed_at::timestamptz
from (values

  -- 1. Stable angina — first-line antianginal
  (
    'UKMLA',
    ARRAY['Cardiology', 'Stable angina'],
    'first-line antianginal for stable angina is a beta-blocker (or rate-limiting CCB if intolerant)',
    $stem$A 60-year-old man has chest pain on exertion, relieved by rest. Resting ECG and examination are unremarkable. What is the first-line antianginal medication?$stem$,
    'Beta-blocker',
    '["ACE inhibitor","Long-acting nitrate","Aspirin alone"]',
    '3',
    'https://www.nice.org.uk/guidance/cg126',
    'NICE CG126',
    'NICE',
    'true', 'true', 'approved', now()::text
  ),

  -- 2. Hypertension — first-line in <55, non-Black
  (
    'UKMLA',
    ARRAY['Cardiology', 'Hypertension'],
    'first-line antihypertensive for a person under 55 (and not of Black African or African-Caribbean family origin) is an ACE inhibitor',
    $stem$A 45-year-old white British man has a clinic BP of 158/96 mmHg confirmed by ABPM. He is otherwise well. What is the first-line antihypertensive?$stem$,
    'ACE inhibitor',
    '["Calcium-channel blocker","Thiazide-like diuretic","Beta-blocker"]',
    '2',
    'https://www.nice.org.uk/guidance/ng136',
    'NICE NG136',
    'NICE',
    'true', 'true', 'approved', now()::text
  ),

  -- 3. Acute asthma exacerbation — first-line bronchodilator
  (
    'UKMLA',
    ARRAY['Respiratory', 'Asthma exacerbation'],
    'first-line bronchodilator in acute asthma is a high-dose short-acting beta-2 agonist (salbutamol) via spacer or nebuliser',
    $stem$A 24-year-old woman with known asthma presents to A&E with breathlessness and wheeze, peak flow 60% of best. SpO2 is 95% on air. What is the first-line bronchodilator?$stem$,
    'Salbutamol via spacer or nebuliser',
    '["Ipratropium bromide","IV magnesium sulphate","Oral montelukast"]',
    '2',
    'https://www.nice.org.uk/guidance/ng80',
    'NICE NG80',
    'NICE',
    'true', 'true', 'approved', now()::text
  ),

  -- 4. Atrial fibrillation — anticoagulation decision
  (
    'UKMLA',
    ARRAY['Cardiology', 'Atrial fibrillation'],
    'anticoagulation in non-valvular AF is decided by CHA2DS2-VASc; offer to men with score ≥ 2 and consider in men with score 1',
    $stem$A 70-year-old man is found to have new AF on a routine ECG. He has a history of hypertension and type 2 diabetes. CHA2DS2-VASc is 4. What is the most appropriate anticoagulation decision?$stem$,
    'Offer a DOAC (e.g. apixaban) for stroke prevention',
    '["Aspirin alone","No anticoagulation, repeat ECG in 6 months","Warfarin only after cardioversion"]',
    '3',
    'https://www.nice.org.uk/guidance/ng196',
    'NICE NG196',
    'NICE',
    'true', 'true', 'approved', now()::text
  ),

  -- 5. Type 2 diabetes — first-line glucose-lowering therapy
  (
    'UKMLA',
    ARRAY['Endocrinology', 'Type 2 diabetes'],
    'first-line pharmacological therapy for type 2 diabetes is metformin (titrated, modified-release if GI intolerance)',
    $stem$A 58-year-old man newly diagnosed with type 2 diabetes (HbA1c 62 mmol/mol) has tried lifestyle measures for 3 months without adequate control. Renal function is normal. What is the first-line pharmacological therapy?$stem$,
    'Metformin',
    '["Gliclazide","DPP-4 inhibitor","SGLT2 inhibitor as monotherapy"]',
    '2',
    'https://www.nice.org.uk/guidance/ng28',
    'NICE NG28',
    'NICE',
    'true', 'true', 'approved', now()::text
  )

) as v(exam, topic_path, claim, canonical_stem, answer, distractors,
       difficulty, citation_url, citation_label, source_type,
       high_yield, free_tier, status, reviewed_at)
where not exists (
  select 1 from public.atoms a where a.claim = v.claim
);

-- Verify
select count(*) as approved_free_tier_atoms
from public.atoms
where free_tier = true and status = 'approved';
