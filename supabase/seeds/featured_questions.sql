-- Pre-loaded featured questions for instant user experience
-- Images to be added after generation

-- ============================================
-- ACUTE CORONARY SYNDROME (ACS/MI)
-- ============================================
INSERT INTO cached_questions (
  concept_id, concept_title, specialty, condition_name,
  question_stem, question_text, options, correct_answer,
  explanation, key_fact, is_featured, priority, custom_filters
) VALUES (
  'ukmla-cardio-acs',
  'Acute Coronary Syndrome',
  'Cardiology',
  'Acute Coronary Syndrome',
  'A 58-year-old man presents to the emergency department with central crushing chest pain radiating to his left arm for the past 2 hours. He is sweating profusely and appears grey. He has a history of hypertension and type 2 diabetes. His ECG shows ST elevation in leads V1-V4.',
  'What is the most appropriate immediate management?',
  '[{"id": "A", "text": "Aspirin 300mg, Ticagrelor 180mg, and urgent PCI"}, {"id": "B", "text": "GTN spray and observe"}, {"id": "C", "text": "Thrombolysis with alteplase"}, {"id": "D", "text": "Arrange outpatient cardiology review"}, {"id": "E", "text": "Start beta-blocker and discharge"}]',
  'A',
  'This patient has a STEMI (ST-elevation myocardial infarction) evidenced by ST elevation in V1-V4 (anterior STEMI) with classic symptoms. The management is dual antiplatelet therapy (Aspirin + P2Y12 inhibitor like Ticagrelor) and urgent primary PCI within 120 minutes. Thrombolysis is only used if PCI is not available within the time window.',
  'STEMI requires dual antiplatelet therapy and primary PCI within 120 minutes',
  true, 100,
  ARRAY['cardiology', 'emergency', 'chest-pain']
),
(
  'ukmla-cardio-acs',
  'Acute Coronary Syndrome',
  'Cardiology',
  'Acute Coronary Syndrome',
  'A 65-year-old woman presents with chest tightness and shortness of breath. Her troponin is elevated at 150 ng/L (normal <14). ECG shows T-wave inversion in leads V1-V3 but no ST elevation.',
  'What is the most likely diagnosis?',
  '[{"id": "A", "text": "STEMI"}, {"id": "B", "text": "NSTEMI"}, {"id": "C", "text": "Unstable angina"}, {"id": "D", "text": "Stable angina"}, {"id": "E", "text": "Pericarditis"}]',
  'B',
  'Elevated troponin with ECG changes (T-wave inversion) but NO ST elevation = NSTEMI. Unstable angina has similar presentation but troponin is NORMAL. STEMI requires ST elevation. This distinction is critical for management - NSTEMI patients need risk stratification (GRACE score) and may have PCI within 72 hours rather than emergently.',
  'NSTEMI = elevated troponin + ischaemic symptoms WITHOUT ST elevation',
  true, 99,
  ARRAY['cardiology', 'chest-pain']
),

-- ============================================
-- HEART FAILURE
-- ============================================
(
  'ukmla-cardio-heart-failure',
  'Heart Failure',
  'Cardiology',
  'Heart Failure',
  'A 72-year-old man presents with progressive breathlessness over 3 months. He now sleeps propped up on 4 pillows and wakes at night gasping for air. On examination, he has bilateral ankle oedema, elevated JVP, and bibasal crackles.',
  'Which investigation finding would confirm the diagnosis of heart failure?',
  '[{"id": "A", "text": "Chest X-ray showing cardiomegaly"}, {"id": "B", "text": "ECG showing left bundle branch block"}, {"id": "C", "text": "BNP >400 pg/mL with echocardiogram showing EF 35%"}, {"id": "D", "text": "Elevated troponin"}, {"id": "E", "text": "Oxygen saturation of 92%"}]',
  'C',
  'Heart failure diagnosis requires BOTH elevated natriuretic peptides (BNP >400 or NT-proBNP >2000) AND structural/functional cardiac abnormality on echo. This patient has classic symptoms: orthopnoea (sleeping on pillows), PND (waking gasping), peripheral oedema, raised JVP, and pulmonary oedema (crackles). EF 35% = HFrEF (reduced ejection fraction).',
  'Heart failure diagnosis = elevated BNP + echo showing structural/functional abnormality',
  true, 98,
  ARRAY['cardiology', 'breathlessness']
),
(
  'ukmla-cardio-heart-failure',
  'Heart Failure',
  'Cardiology',
  'Heart Failure',
  'A patient with newly diagnosed heart failure with reduced ejection fraction (HFrEF, EF 30%) is being started on medication. They have no contraindications.',
  'Which combination of medications has the strongest evidence for reducing mortality?',
  '[{"id": "A", "text": "Furosemide + Digoxin"}, {"id": "B", "text": "ACE inhibitor + Beta-blocker + MRA + SGLT2 inhibitor"}, {"id": "C", "text": "Calcium channel blocker + Thiazide"}, {"id": "D", "text": "Aspirin + Statin"}, {"id": "E", "text": "GTN spray + Ivabradine"}]',
  'B',
  'The "four pillars" of HFrEF treatment are: ACE inhibitor (or ARB/ARNI), Beta-blocker, MRA (spironolactone/eplerenone), and SGLT2 inhibitor (dapagliflozin/empagliflozin). All four have mortality benefit. Furosemide is for symptom relief only. Digoxin reduces hospitalisations but not mortality. CCBs (except amlodipine) are contraindicated in HFrEF.',
  'HFrEF four pillars: ACEi + Beta-blocker + MRA + SGLT2i (all reduce mortality)',
  true, 97,
  ARRAY['cardiology', 'pharmacology']
),

-- ============================================
-- ASTHMA
-- ============================================
(
  'ukmla-resp-asthma',
  'Asthma',
  'Respiratory',
  'Asthma',
  'A 25-year-old woman presents to A&E with severe breathlessness and wheeze. She can only speak in single words. Her peak flow is 28% of predicted, respiratory rate 32, heart rate 125, and oxygen saturation 88% on air.',
  'What severity of asthma attack is this?',
  '[{"id": "A", "text": "Moderate acute asthma"}, {"id": "B", "text": "Acute severe asthma"}, {"id": "C", "text": "Life-threatening asthma"}, {"id": "D", "text": "Near-fatal asthma"}, {"id": "E", "text": "Brittle asthma"}]',
  'C',
  'Life-threatening asthma features: SpO2 <92%, PEF <33% predicted, silent chest, cyanosis, poor respiratory effort, altered consciousness, hypotension. This patient has SpO2 88% and PEF 28% = LIFE-THREATENING. Acute severe = PEF 33-50%, can''t complete sentences, HR >110, RR >25. The inability to speak in sentences alone would be severe, but the low SpO2 and PEF <33% escalate to life-threatening.',
  'Life-threatening asthma: SpO2 <92%, PEF <33%, silent chest, altered consciousness',
  true, 96,
  ARRAY['respiratory', 'emergency', 'breathlessness']
),
(
  'ukmla-resp-asthma',
  'Asthma',
  'Respiratory',
  'Asthma',
  'A 19-year-old university student with asthma is using her salbutamol inhaler 4 times per week and waking at night with wheeze twice a month. She is currently on a SABA inhaler only.',
  'According to NICE guidelines, what is the next step in her asthma management?',
  '[{"id": "A", "text": "Add a LAMA inhaler"}, {"id": "B", "text": "Add a low-dose ICS inhaler"}, {"id": "C", "text": "Add a LTRA (montelukast)"}, {"id": "D", "text": "Add oral prednisolone"}, {"id": "E", "text": "Continue current management"}]',
  'B',
  'Using SABA >2x/week or any night symptoms = uncontrolled asthma. Step 2 is LOW-DOSE ICS (inhaled corticosteroid). The stepwise approach: Step 1 = SABA PRN, Step 2 = add low-dose ICS, Step 3 = add LABA (or increase ICS or add LTRA), Step 4 = increase ICS to medium dose, Step 5 = specialist referral. LAMA is for COPD primarily.',
  'Asthma step-up: SABA → add ICS → add LABA → increase ICS → specialist',
  true, 95,
  ARRAY['respiratory', 'pharmacology']
),

-- ============================================
-- PNEUMONIA
-- ============================================
(
  'featured-pneumonia-001',
  'Community Acquired Pneumonia',
  'Respiratory',
  'Pneumonia',
  'A 70-year-old man presents with productive cough, fever 38.5°C, and right-sided pleuritic chest pain for 3 days. On examination, there are bronchial breath sounds and dullness to percussion at the right base. His observations: RR 24, HR 100, BP 110/70, SpO2 94% on air, confusion score 1 (new confusion).',
  'What is his CURB-65 score and recommended management?',
  '[{"id": "A", "text": "CURB-65 = 2, treat in community with oral antibiotics"}, {"id": "B", "text": "CURB-65 = 3, consider hospital admission"}, {"id": "C", "text": "CURB-65 = 1, treat in community"}, {"id": "D", "text": "CURB-65 = 4, consider ICU admission"}, {"id": "E", "text": "CURB-65 = 0, no antibiotics needed"}]',
  'B',
  'CURB-65: Confusion (1), Urea >7 (not given, assume 0), Respiratory rate ≥30 (0 - his is 24), BP systolic <90 or diastolic ≤60 (0), Age ≥65 (1). Score = 2. However, if we assume raised urea (common in elderly with infection), score = 3. CURB-65 0-1 = community treatment, 2 = consider hospital, 3-5 = hospital admission, 4-5 = consider ICU. Given his age, confusion, and clinical picture, hospital admission is appropriate.',
  'CURB-65: Confusion, Urea >7, RR ≥30, BP low, 65+ years. Score ≥3 = admit',
  true, 94,
  ARRAY['respiratory', 'infection']
),

-- ============================================
-- STROKE
-- ============================================
(
  'featured-stroke-001',
  'Acute Stroke',
  'Neurology',
  'Stroke',
  'A 68-year-old man is brought to A&E by ambulance. His wife noticed sudden onset of right-sided weakness and slurred speech 90 minutes ago. He has atrial fibrillation and hypertension. On examination, he has right facial droop, right arm weakness (power 2/5), and dysarthria. CT head shows no haemorrhage.',
  'What is the most appropriate immediate management?',
  '[{"id": "A", "text": "Aspirin 300mg and admit to stroke unit"}, {"id": "B", "text": "IV thrombolysis with alteplase"}, {"id": "C", "text": "Mechanical thrombectomy"}, {"id": "D", "text": "Start warfarin immediately"}, {"id": "E", "text": "MRI brain before any treatment"}]',
  'B',
  'This is an acute ischaemic stroke (CT excluded haemorrhage) within the thrombolysis window (4.5 hours from onset). IV alteplase is indicated. Aspirin is given AFTER thrombolysis or if thrombolysis contraindicated. Thrombectomy is for large vessel occlusion and can be done up to 24 hours in selected patients, but IV thrombolysis should be given first if within window. Never anticoagulate in acute stroke.',
  'Acute ischaemic stroke within 4.5 hours + no haemorrhage on CT = IV thrombolysis',
  true, 93,
  ARRAY['neurology', 'emergency']
),

-- ============================================
-- DKA (Diabetic Ketoacidosis)
-- ============================================
(
  'featured-dka-001',
  'Diabetic Ketoacidosis',
  'Endocrinology',
  'DKA',
  'A 22-year-old woman with type 1 diabetes presents with vomiting, abdominal pain, and drowsiness. She has deep rapid breathing. Blood glucose is 28 mmol/L, pH 7.1, bicarbonate 10 mmol/L, and ketones 5.2 mmol/L.',
  'What is the most important initial management step?',
  '[{"id": "A", "text": "IV insulin infusion at 0.1 units/kg/hour"}, {"id": "B", "text": "IV 0.9% saline 1L over 1 hour"}, {"id": "C", "text": "IV sodium bicarbonate"}, {"id": "D", "text": "Subcutaneous insulin correction dose"}, {"id": "E", "text": "Oral rehydration"}]',
  'B',
  'DKA management priority: FLUIDS FIRST, then insulin. These patients are severely dehydrated (average 6L deficit). Give 0.9% saline 1L in first hour, then adjust based on response. Insulin is started at 0.1 units/kg/hour AFTER fluid resuscitation begins (usually within first hour but fluids take priority). Bicarbonate is rarely needed and only if pH <6.9. Never give subcut insulin in DKA.',
  'DKA: Fluids first (0.9% saline), then IV insulin 0.1 units/kg/hour',
  true, 92,
  ARRAY['endocrinology', 'emergency', 'diabetes']
),

-- ============================================
-- MENINGITIS
-- ============================================
(
  'featured-meningitis-001',
  'Bacterial Meningitis',
  'Infectious Disease',
  'Meningitis',
  'A 20-year-old university student presents with severe headache, fever 39°C, photophobia, and neck stiffness. He has a non-blanching petechial rash on his legs. He is becoming increasingly drowsy.',
  'What is the most appropriate immediate action?',
  '[{"id": "A", "text": "Lumbar puncture to confirm diagnosis"}, {"id": "B", "text": "IV ceftriaxone immediately"}, {"id": "C", "text": "CT head before any treatment"}, {"id": "D", "text": "Blood cultures then wait for results"}, {"id": "E", "text": "Oral amoxicillin and discharge"}]',
  'B',
  'This is suspected meningococcal meningitis/septicaemia (classic triad + non-blanching rash = Neisseria meningitidis). Treatment must NOT be delayed for investigations. Give IV ceftriaxone (or benzylpenicillin) IMMEDIATELY - ideally within 1 hour of arrival. LP is contraindicated if signs of raised ICP (reduced consciousness). CT can be done after antibiotics if needed. The rash indicates meningococcal septicaemia which has high mortality if treatment delayed.',
  'Suspected bacterial meningitis with rash = IV antibiotics IMMEDIATELY, do not delay for LP',
  true, 91,
  ARRAY['infectious-disease', 'emergency', 'neurology']
),

-- ============================================
-- APPENDICITIS
-- ============================================
(
  'featured-appendicitis-001',
  'Acute Appendicitis',
  'Surgery',
  'Appendicitis',
  'A 16-year-old boy presents with 24 hours of abdominal pain that started around the umbilicus and has now localised to the right iliac fossa. He has anorexia, nausea, and a low-grade fever of 37.8°C. On examination, there is tenderness and guarding at McBurney''s point.',
  'What is the most likely diagnosis?',
  '[{"id": "A", "text": "Mesenteric adenitis"}, {"id": "B", "text": "Acute appendicitis"}, {"id": "C", "text": "Gastroenteritis"}, {"id": "D", "text": "Crohn''s disease"}, {"id": "E", "text": "Testicular torsion"}]',
  'B',
  'Classic appendicitis presentation: periumbilical pain migrating to RIF (as inflammation spreads to parietal peritoneum), anorexia (almost always present), nausea/vomiting, low-grade fever. McBurney''s point tenderness (1/3 distance from ASIS to umbilicus) is highly specific. The migration of pain is key - visceral pain (poorly localised) becomes somatic pain (well localised) as parietal peritoneum becomes inflamed.',
  'Appendicitis: periumbilical pain → RIF migration + anorexia + McBurney''s tenderness',
  true, 90,
  ARRAY['surgery', 'abdominal-pain', 'emergency']
),

-- ============================================
-- SEPSIS
-- ============================================
(
  'featured-sepsis-001',
  'Sepsis',
  'Emergency Medicine',
  'Sepsis',
  'A 75-year-old woman from a nursing home presents with confusion, fever 38.8°C, respiratory rate 26, heart rate 110, and BP 85/50. She has a productive cough. Lactate is 4.2 mmol/L.',
  'According to the Sepsis Six, which interventions should be completed within the first hour?',
  '[{"id": "A", "text": "Oxygen, IV fluids, blood cultures only"}, {"id": "B", "text": "Oxygen, IV access, blood cultures, lactate, IV antibiotics, fluid challenge, urine output monitoring"}, {"id": "C", "text": "CT scan, lumbar puncture, IV antibiotics"}, {"id": "D", "text": "Oral antibiotics and observe"}, {"id": "E", "text": "IV fluids only, antibiotics can wait for culture results"}]',
  'B',
  'Sepsis Six (within 1 hour): 1) High-flow oxygen, 2) Blood cultures, 3) IV antibiotics, 4) IV fluid challenge (500ml crystalloid), 5) Measure lactate, 6) Measure urine output. This patient has septic shock (sepsis + hypotension + lactate >2). The elevated lactate (>4) indicates tissue hypoperfusion. Never delay antibiotics for culture results in sepsis - give within 1 hour of recognition.',
  'Sepsis Six within 1 hour: O2, cultures, antibiotics, fluids, lactate, urine output',
  true, 89,
  ARRAY['emergency', 'infection']
),

-- ============================================
-- HYPOTHYROIDISM
-- ============================================
(
  'featured-hypothyroid-001',
  'Hypothyroidism',
  'Endocrinology',
  'Hypothyroidism',
  'A 55-year-old woman presents with fatigue, weight gain, constipation, and feeling cold all the time. On examination, she has dry skin, bradycardia, and slow-relaxing reflexes. Her TSH is 45 mU/L (normal 0.4-4.0) and free T4 is 4 pmol/L (normal 9-25).',
  'What is the diagnosis and first-line treatment?',
  '[{"id": "A", "text": "Primary hypothyroidism - levothyroxine"}, {"id": "B", "text": "Secondary hypothyroidism - levothyroxine"}, {"id": "C", "text": "Subclinical hypothyroidism - observe"}, {"id": "D", "text": "Hyperthyroidism - carbimazole"}, {"id": "E", "text": "Sick euthyroid syndrome - treat underlying cause"}]',
  'A',
  'High TSH + low T4 = PRIMARY hypothyroidism (thyroid gland failure). The pituitary increases TSH trying to stimulate the failing thyroid. Most common cause is autoimmune (Hashimoto''s). Treatment is levothyroxine, starting at 25-50mcg in elderly/cardiac patients, 50-100mcg in young healthy patients. Secondary hypothyroidism (pituitary failure) would show LOW TSH + low T4.',
  'Primary hypothyroidism: HIGH TSH + LOW T4. Treat with levothyroxine.',
  true, 88,
  ARRAY['endocrinology', 'fatigue']
),

-- ============================================
-- AKI (Acute Kidney Injury)
-- ============================================
(
  'featured-aki-001',
  'Acute Kidney Injury',
  'Nephrology',
  'AKI',
  'A 70-year-old man is admitted with pneumonia. His creatinine on admission is 180 μmol/L (baseline 90 μmol/L from 3 months ago). He has been taking ibuprofen for back pain and was started on gentamicin for his infection.',
  'What type of AKI is most likely and what is the cause?',
  '[{"id": "A", "text": "Pre-renal AKI due to sepsis and dehydration"}, {"id": "B", "text": "Intrinsic renal AKI due to NSAIDs and gentamicin"}, {"id": "C", "text": "Post-renal AKI due to obstruction"}, {"id": "D", "text": "Chronic kidney disease, not AKI"}, {"id": "E", "text": "Normal creatinine variation"}]',
  'B',
  'Creatinine doubled from baseline = AKI Stage 2. NSAIDs cause renal vasoconstriction (reduce GFR) and can cause interstitial nephritis. Gentamicin is nephrotoxic (ATN). Together = intrinsic renal AKI. Pre-renal would be from hypovolaemia/hypoperfusion alone. Always check: 1) Nephrotoxic drugs (NSAIDs, aminoglycosides, contrast), 2) Volume status, 3) Obstruction (USS). Stop nephrotoxins!',
  'AKI causes: Pre-renal (hypoperfusion), Intrinsic (nephrotoxins/ATN), Post-renal (obstruction)',
  true, 87,
  ARRAY['nephrology', 'pharmacology']
),

-- ============================================
-- DEPRESSION
-- ============================================
(
  'featured-depression-001',
  'Depression',
  'Psychiatry',
  'Depression',
  'A 35-year-old woman presents with 2 months of low mood, loss of interest in activities she used to enjoy, poor sleep, reduced appetite, and difficulty concentrating at work. She denies suicidal thoughts but feels "hopeless about the future."',
  'What are the ICD-11 core symptoms of depression?',
  '[{"id": "A", "text": "Low mood, anhedonia, fatigue"}, {"id": "B", "text": "Anxiety, panic attacks, avoidance"}, {"id": "C", "text": "Hallucinations, delusions, disorganised thinking"}, {"id": "D", "text": "Elevated mood, increased energy, reduced sleep need"}, {"id": "E", "text": "Memory loss, confusion, personality change"}]',
  'A',
  'ICD-11 core symptoms of depression (need 2+ for diagnosis): 1) Low mood, 2) Anhedonia (loss of interest/pleasure), 3) Fatigue/reduced energy. Additional symptoms: sleep disturbance, appetite/weight change, poor concentration, guilt/worthlessness, psychomotor changes, suicidal thoughts. Duration ≥2 weeks. This patient has low mood, anhedonia, and multiple additional symptoms = depressive episode.',
  'Depression core symptoms: Low mood + Anhedonia + Fatigue (need 2+ for ≥2 weeks)',
  true, 86,
  ARRAY['psychiatry', 'mental-health']
),

-- ============================================
-- RHEUMATOID ARTHRITIS
-- ============================================
(
  'featured-ra-001',
  'Rheumatoid Arthritis',
  'Rheumatology',
  'Rheumatoid Arthritis',
  'A 45-year-old woman presents with 3 months of symmetrical pain and swelling in her hands, particularly affecting the MCP and PIP joints. She has morning stiffness lasting over an hour. Her DIP joints are spared.',
  'What is the most likely diagnosis?',
  '[{"id": "A", "text": "Osteoarthritis"}, {"id": "B", "text": "Rheumatoid arthritis"}, {"id": "C", "text": "Psoriatic arthritis"}, {"id": "D", "text": "Gout"}, {"id": "E", "text": "Reactive arthritis"}]',
  'B',
  'Classic RA: symmetrical polyarthritis affecting MCP and PIP joints, sparing DIP joints, with prolonged morning stiffness (>1 hour). OA affects DIP joints (Heberden''s nodes) and has brief morning stiffness (<30 mins). Psoriatic arthritis often affects DIP joints and is asymmetrical. RA is autoimmune - check RF and anti-CCP antibodies. Early DMARD treatment (methotrexate) prevents joint destruction.',
  'RA: Symmetrical MCP/PIP involvement, DIP sparing, morning stiffness >1 hour',
  true, 85,
  ARRAY['rheumatology', 'joint-pain']
);

-- Update any NULL arrays to empty arrays
UPDATE cached_questions SET custom_filters = '{}' WHERE custom_filters IS NULL;
