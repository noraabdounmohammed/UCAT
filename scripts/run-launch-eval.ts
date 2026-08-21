import fs from 'node:fs';
import path from 'node:path';
import { generateQuestionFromConcept } from '../src/services/aiQuestionGenerator';
import { UKMLA_QUALITY_INSTRUCTIONS, reviewUKMLAQuestion, validateUKMLAQuestion } from '../src/services/questionQuality';
import type { ConceptNode } from '../src/types/conceptTypes';

const AI_PROXY_BASE = process.env.STUDYEDIT_BASE_URL || 'https://studyedit.com';
const realFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  if (url === '/.netlify/functions/ai-generate') {
    return realFetch(`${AI_PROXY_BASE}${url}`, init);
  }

  return realFetch(input as any, init);
}) as typeof fetch;

type PilotConcept = {
  family: string;
  concept: ConceptNode;
};

const node = (
  concept_id: string,
  title: string,
  content: string,
  custom_filters: string[] = [],
): ConceptNode => ({
  concept_id,
  title,
  content,
  custom_filters,
  prerequisites: [],
  mastery_data: {
    mastery_level: 0,
    attempts: 0,
    correct: 0,
    incorrect: 0,
    last_practiced: null,
  },
});

// Snapshot taken from canonical curriculum_concepts after the launch-critical
// truth audit on 2026-08-21. Keeping this runner read-only makes the eval
// reproducible and prevents accidental writes to the live question bank.
const PILOT: PilotConcept[] = [
  { family: 'acute-cardiovascular', concept: node('ukmla-20', 'ST-elevation myocardial infarction – diagnosis and urgent reperfusion', 'STEMI is an acute coronary syndrome with clinical features of myocardial ischaemia and persistent diagnostic ST-segment elevation on ECG. Do not wait for troponin elevation before making an urgent reperfusion decision when the ECG and clinical presentation indicate STEMI.', ['Cardiovascular','Acute coronary syndromes','Definition']) },
  { family: 'anticoagulation', concept: node('ukmla-176', 'Atrial fibrillation – Long-term stroke prevention anticoagulants', 'For atrial fibrillation with a CHA2DS2-VASc score of 2 or above, offer a direct-acting oral anticoagulant, taking bleeding risk into account. For men with a score of 1, consider anticoagulation. If direct-acting oral anticoagulants are contraindicated, not tolerated or unsuitable, offer a vitamin K antagonist.', ['Cardiovascular','Arrhythmias','Stroke','Clinical features']) },
  { family: 'anticoagulation', concept: node('ukmla-184', 'Atrial fibrillation – Initial anticoagulation in new-onset AF', 'In new-onset atrial fibrillation when the person is receiving no anticoagulation or subtherapeutic anticoagulation, offer heparin at initial presentation if there is no contraindication and continue until stroke and bleeding risks have been assessed and appropriate antithrombotic therapy started. Long-term anticoagulation is not automatic and depends on risk assessment.', ['Cardiovascular','Arrhythmias','Management']) },
  { family: 'anticoagulation', concept: node('ukmla-414', 'ACS with a separate indication for anticoagulation – antiplatelet strategy', 'After acute coronary syndrome in someone with a separate indication for anticoagulation, antiplatelet choice and duration should be individualised according to bleeding, thromboembolic and cardiovascular risk and patient preference. A fixed 4-week-to-6-month triple-therapy rule should not be assumed.', ['Cardiovascular','Acute coronary syndromes','Management']) },
  { family: 'acute-cardiovascular', concept: node('ukmla-636', 'Cardiogenic pulmonary oedema – non-invasive ventilation', 'Do not routinely use CPAP or other non-invasive ventilation for cardiogenic pulmonary oedema. Consider starting non-invasive ventilation without delay when there is severe dyspnoea with acidaemia, either at presentation or when the person has failed to respond to medical treatment.', ['Cardiovascular','Cardiac failure','Management']) },
  { family: 'acute-cardiovascular', concept: node('ukmla-1168', 'STEMI – reperfusion strategy', 'For eligible people with acute STEMI presenting within 12 hours of symptom onset, provide reperfusion as quickly as possible. Primary PCI is preferred if it can be delivered within 120 minutes of when fibrinolysis could have been given; otherwise offer fibrinolysis if there is no contraindication. Consider angiography/PCI beyond 12 hours when there is continuing myocardial ischaemia or cardiogenic shock.', ['Cardiovascular','Acute coronary syndromes','Management']) },
  { family: 'pregnancy-safety', concept: node('ukmla-1237', 'Warfarin – pregnancy and breastfeeding', 'Warfarin is usually avoided during pregnancy because of fetal teratogenic and bleeding risks, but specialist use may be appropriate in selected situations such as some people with mechanical heart valves after individual risk-benefit assessment. Do not stop warfarin in pregnancy without specialist advice. Warfarin is compatible with breastfeeding and is a preferred oral anticoagulant when breastfeeding.', ['Cardiovascular','Clinical features']) },
  { family: 'pregnancy-safety', concept: node('ukmla-1307', 'Hyperthyroidism in pregnancy – antithyroid drug choice', 'Hyperthyroidism in pregnancy should be managed with specialist obstetric/endocrine input. Propylthiouracil is generally preferred during the first trimester because carbimazole/methimazole exposure has a recognised embryopathy risk. If antithyroid treatment is still required later in pregnancy, switching to carbimazole may be considered because prolonged propylthiouracil carries a risk of serious hepatotoxicity. Use the lowest effective dose and avoid block-and-replace regimens in pregnancy.', ['Endocrinology','Complications']) },
  { family: 'paediatrics', concept: node('ukmla-1423', 'Paediatric DKA – suspected cerebral oedema', 'Suspected cerebral oedema during paediatric DKA is a clinical emergency. Treat immediately with the most readily available hypertonic saline (2.7% or 3%, 2.5–5 mL/kg over 10–15 minutes) or mannitol 20% (0.5–1 g/kg over 10–15 minutes), involve senior paediatric/intensive-care staff and adjust fluids according to the current BSPED pathway. Do not wait for CT imaging before treating suspected cerebral oedema; imaging is considered after stabilisation to exclude alternative intracranial pathology.', ['Endocrinology','Diabetic ketoacidosis','Complications']) },
  { family: 'cancer-referral', concept: node('ukmla-1882', 'Dysphagia – suspected upper gastrointestinal cancer referral', 'Unexplained dysphagia warrants referral using a suspected cancer pathway for oesophageal or stomach cancer. Do not require age over 55, weight loss or another red flag before making the referral; those features may increase suspicion but dysphagia itself meets the NG12 referral criterion.', ['ENT','Swallowing problems','Differential diagnosis']) },
  { family: 'paediatrics', concept: node('ukmla-2113', 'Bronchiolitis – oxygen supplementation', 'In hospital, give supplemental oxygen in bronchiolitis if oxygen saturation is persistently below 90% in babies and children aged 6 weeks and over. Use a threshold below 92% for babies under 6 weeks or children of any age with relevant underlying health conditions. Oxygen saturation is interpreted alongside the overall clinical picture.', ['Respiratory','Bronchiolitis','Management']) },
  { family: 'pregnancy-safety', concept: node('ukmla-4254', 'Malaria in pregnancy – artemisinin combination therapy', 'Pregnancy increases the risk of severe malaria and requires early expert input. Artemether-lumefantrine can be used in all trimesters of pregnancy and is a preferred treatment option in current UK malaria guidance when an artemisinin combination is indicated. Do not teach a blanket rule that artemisinin-based combination therapies should be avoided in the first trimester.', ['Infectious Diseases','Malaria','Management']) },
  { family: 'sepsis-infection', concept: node('ukmla-4347', 'Sepsis – adult hospital risk stratification', 'For people aged 16 or over who are not and have not recently been pregnant, NICE NG253 uses NEWS2 together with clinical judgement to stratify risk from suspected sepsis in acute hospital settings. Do not use qSOFA as the primary NICE screening rule for deciding early treatment.', ['Infectious Diseases','Sepsis','Investigations']) },
  { family: 'sepsis-infection', concept: node('ukmla-4348', 'Sepsis – early management is risk- and population-specific', 'Do not apply a universal Sepsis-6 bundle to every person with suspected sepsis. In adults aged 16 or over who are not recently pregnant, NICE NG253 uses NEWS2 plus clinical judgement: high-risk patients should receive IV antibiotics within 1 hour; moderate-risk patients generally within 3 hours if not already given; low-risk patients may have antibiotics deferred while further diagnostic information is gathered. Fluid resuscitation uses reassessed 250 mL crystalloid boluses, up to 1000 mL initially if needed. Oxygen targets depend on age and risk of hypercapnic respiratory failure. Separate NICE pathways apply to under-16s and to people who are pregnant or recently pregnant.', ['Infectious Diseases','Sepsis','Management']) },
  { family: 'sepsis-infection', concept: node('ukmla-4362', 'Pneumonia – CURB-65 score interpretation', 'In adults with community-acquired pneumonia in hospital, CURB-65 0 to 1 is low risk, 2 is intermediate risk, and 3 to 5 is high risk. Use clinical judgement alongside the score to determine place of care; score 2 does not automatically mandate admission and score 3 to 5 does not automatically mandate ICU.', ['Infectious Diseases','Pneumonia','Management']) },
  { family: 'pregnancy-safety', concept: node('ukmla-4379', 'Varicella exposure in pregnancy – post-exposure prophylaxis', 'After significant exposure to chickenpox or shingles in pregnancy, assess susceptibility. If the pregnant person is susceptible, current UKHSA guidance recommends oral aciclovir or valaciclovir as first-choice post-exposure prophylaxis at any stage of pregnancy, generally from days 7 to 14 after exposure. Varicella immunoglobulin is not the routine first-choice PEP for susceptible pregnant women and is reserved for situations where oral antivirals cannot be used.', ['Infectious Diseases','Varicella zoster','Management']) },
  { family: 'pregnancy-safety', concept: node('ukmla-4957', 'Ectopic pregnancy – ultrasound and hCG interpretation', 'Use transvaginal ultrasound to determine pregnancy location. In a pregnancy of unknown location, do not use a single serum hCG value to determine where the pregnancy is located; place more importance on symptoms and ultrasound findings. Serial hCG measurements about 48 hours apart can help guide subsequent management. A serum hCG of 1,500 IU/L or more may justify considering an earlier repeat scan, but it is not a threshold above which an intrauterine gestational sac must be visible.', ['Obstetrics and Gynaecology','Ectopic pregnancy','Investigations']) },
  { family: 'cancer-referral', concept: node('ukmla-4965', 'Endometrial cancer – current NICE referral criteria', 'For unexplained post-menopausal bleeding that cannot be attributed to HRT, NICE NG12 recommends a suspected cancer pathway referral if aged 55 or over and says to consider the same referral pathway if under 55. In people aged 55 or over, unexplained vaginal discharge at first presentation, or vaginal discharge with thrombocytosis or haematuria, can prompt urgent direct-access ultrasound. Unscheduled bleeding while using HRT should be assessed using current menopause/HRT guidance rather than a fixed rule to stop HRT for 6 weeks before referral.', ['Obstetrics and Gynaecology','Endometrial cancer','Management']) },
  { family: 'cancer-referral', concept: node('ukmla-5146', 'Ovarian cancer – CA125 is interpreted with age-specific thresholds', 'CA125 is associated with ovarian cancer but is not specific. Under NICE NG12 updated in 2026, for people aged 40 or over with persistent symptoms suggesting ovarian cancer, measure CA125 in primary care and use age-specific thresholds to decide urgent ultrasound: 35 IU/mL or more age 40–49, 31 or more age 50–59, 24 or more age 60–69, 25 or more age 70–79, and 31 or more age 80+. Do not use a universal CA125 threshold of 35 IU/mL for every age.', ['Oncology','Ovarian cancer','Investigations']) },
  { family: 'paediatrics', concept: node('ukmla-5666', 'Paediatric DKA – initial fluid resuscitation', 'In children and young people with DKA who are not shocked but require IV fluids, give an initial 10 mL/kg bolus of 0.9% sodium chloride over 30 minutes and subtract this from the calculated fluid deficit. If shock is present, give 10 mL/kg isotonic crystalloid over about 15 minutes, reassess and repeat as required according to the current BSPED pathway. Subsequent deficit and maintenance replacement is calculated and given over 48 hours rather than using a generic 10–20 mL/kg over 1–2 hour rule.', ['Child health','Diabetic ketoacidosis']) },
];

const normalise = (value: unknown) => String(value ?? '').trim();

async function run() {
  const startedAt = new Date().toISOString();
  const items: any[] = [];

  for (const [index, target] of PILOT.entries()) {
    console.log(`[${index + 1}/${PILOT.length}] ${target.concept.concept_id} ${target.concept.title}`);
    try {
      const candidate: any = await generateQuestionFromConcept(
        target.concept,
        'ukmla_sba',
        UKMLA_QUALITY_INSTRUCTIONS,
      );
      const deterministic = validateUKMLAQuestion(candidate);
      const review = deterministic.pass
        ? await reviewUKMLAQuestion(candidate, target.concept)
        : deterministic;

      items.push({
        conceptId: target.concept.concept_id,
        family: target.family,
        title: target.concept.title,
        generated: true,
        pass: review.pass,
        score: review.score,
        reasons: review.reasons,
        deterministicReasons: deterministic.reasons,
        question: {
          vignette: normalise(candidate?.clinical_vignette ?? candidate?.vignette),
          leadIn: normalise(candidate?.question),
          options: Array.isArray(candidate?.options) ? candidate.options : [],
          correct: normalise(candidate?.correct_answer ?? candidate?.correct),
          explanation: normalise(candidate?.explanation),
        },
      });
    } catch (error) {
      items.push({
        conceptId: target.concept.concept_id,
        family: target.family,
        title: target.concept.title,
        generated: false,
        pass: false,
        score: 0,
        reasons: [error instanceof Error ? error.message : String(error)],
        deterministicReasons: [],
      });
    }
  }

  const passed = items.filter(item => item.pass).length;
  const generated = items.filter(item => item.generated).length;
  const passRate = Math.round((passed / items.length) * 1000) / 10;
  const failedSafety = items.filter(item => !item.pass && item.reasons.some((reason: string) => /unsafe|ambiguous|multiple|unsupported|stale/i.test(reason)));
  const gateReasons: string[] = [];
  if (generated !== items.length) gateReasons.push('One or more pilot items failed to generate.');
  if (passRate < 90) gateReasons.push('Pilot pass rate is below 90%.');
  if (failedSafety.length > 0) gateReasons.push('One or more items failed for safety, ambiguity, support or stale-source reasons.');

  const byFamily: Record<string, { requested: number; passed: number; failed: number }> = {};
  for (const item of items) {
    const bucket = byFamily[item.family] ?? { requested: 0, passed: 0, failed: 0 };
    bucket.requested += 1;
    item.pass ? bucket.passed += 1 : bucket.failed += 1;
    byFamily[item.family] = bucket;
  }

  const report = {
    startedAt,
    completedAt: new Date().toISOString(),
    aiProxy: AI_PROXY_BASE,
    requested: items.length,
    generated,
    passed,
    failed: items.length - passed,
    passRate,
    launchGatePassed: gateReasons.length === 0,
    gateReasons,
    byFamily,
    items,
  };

  const outDir = path.resolve('artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'launch-eval-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, items: undefined }, null, 2));
  console.log(`Report: ${outPath}`);

  if (!report.launchGatePassed) process.exitCode = 1;
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
