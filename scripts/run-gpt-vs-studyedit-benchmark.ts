import fs from 'node:fs';
import path from 'node:path';
import { generateQuestionFromConcept } from '../src/services/aiQuestionGenerator';
import { UKMLA_QUALITY_INSTRUCTIONS, reviewUKMLAQuestion, validateUKMLAQuestion } from '../src/services/questionQuality';
import { buildEvidencePacketInstructions } from '../src/services/evidencePackets';
import type { ConceptNode } from '../src/types/conceptTypes';

const AI_PROXY_BASE = process.env.STUDYEDIT_BASE_URL || 'https://studyedit.com';
const OUT = process.env.BENCHMARK_OUT || 'artifacts/gpt-vs-studyedit-benchmark.json';
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (url === '/.netlify/functions/ai-generate') return realFetch(`${AI_PROXY_BASE}${url}`, init);
  return realFetch(input as any, init);
}) as typeof fetch;

const node = (concept_id: string, title: string, content: string, custom_filters: string[] = []): ConceptNode => ({
  concept_id, title, content, custom_filters, prerequisites: [],
  mastery_data: { mastery_level: 0, attempts: 0, correct: 0, incorrect: 0, last_practiced: null },
});

const TARGETS = [
  { family: 'acute-cardiovascular', concept: node('ukmla-1168', 'STEMI – reperfusion strategy', 'For eligible people with acute STEMI presenting within 12 hours of symptom onset, provide reperfusion as quickly as possible. Primary PCI is preferred if it can be delivered within 120 minutes of when fibrinolysis could have been given; otherwise offer fibrinolysis if there is no contraindication.', ['Cardiovascular','Acute coronary syndromes','Management']) },
  { family: 'anticoagulation', concept: node('ukmla-176', 'Atrial fibrillation – Long-term stroke prevention anticoagulants', 'For people with atrial fibrillation in whom anticoagulation is indicated, a direct-acting oral anticoagulant is generally preferred when suitable. Choice depends on contraindications, valvular disease and other patient factors.', ['Cardiovascular','Atrial fibrillation','Management']) },
  { family: 'anticoagulation', concept: node('ukmla-414', 'ACS with a separate indication for anticoagulation – antiplatelet strategy', 'After acute coronary syndrome in a person who has a separate indication for anticoagulation, antiplatelet choice and duration should be individualised according to bleeding risk, thromboembolic risk, cardiovascular risk and patient preference rather than applying one fixed regimen to everyone.', ['Cardiovascular','Acute coronary syndromes','Management']) },
  { family: 'paediatrics', concept: node('ukmla-2113', 'Bronchiolitis – oxygen supplementation', 'In hospital, give supplemental oxygen in bronchiolitis if oxygen saturation is persistently below 90% in babies and children aged 6 weeks and over. Use a threshold below 92% for babies under 6 weeks or children of any age with relevant underlying health conditions. Oxygen saturation is interpreted alongside the overall clinical picture.', ['Respiratory','Bronchiolitis','Management']) },
  { family: 'pregnancy-safety', concept: node('ukmla-4254', 'Malaria in pregnancy – artemisinin combination therapy', 'Pregnant women with uncomplicated malaria should receive an effective pregnancy-appropriate antimalarial regimen according to current guidance; artemisinin combination therapy is an important treatment option and treatment should not be delayed.', ['Infectious Diseases','Malaria','Management']) },
  { family: 'sepsis-infection', concept: node('ukmla-4348', 'Sepsis – early management is risk- and population-specific', 'Do not apply a universal Sepsis-6 bundle to every person with suspected sepsis. In adults aged 16 or over who are not recently pregnant, NICE NG253 uses NEWS2 plus clinical judgement. Fluid resuscitation uses reassessed 250 mL crystalloid boluses, up to 1000 mL initially if needed.', ['Infectious Diseases','Sepsis','Management']) },
  { family: 'sepsis-infection', concept: node('ukmla-4362', 'Pneumonia – CURB-65 score interpretation', 'In adults with community-acquired pneumonia in hospital, CURB-65 supports risk assessment. Use clinical judgement alongside the score to determine place of care; score 2 does not automatically mandate admission and score 3 to 5 does not automatically mandate ICU.', ['Infectious Diseases','Pneumonia','Management']) },
  { family: 'pregnancy-safety', concept: node('ukmla-4379', 'Varicella exposure in pregnancy – post-exposure prophylaxis', 'After significant exposure to chickenpox or shingles in pregnancy, assess susceptibility. If susceptible, oral aciclovir or valaciclovir is first-choice PEP at any stage of pregnancy, generally from days 7 to 14 after exposure. VZIG is reserved for situations where oral antivirals cannot be used.', ['Infectious Diseases','Varicella zoster','Management']) },
  { family: 'paediatrics', concept: node('ukmla-5666', 'Paediatric DKA – initial fluid resuscitation', 'In children and young people with DKA who are not shocked but require IV fluids, give an initial 10 mL/kg bolus of 0.9% sodium chloride over 30 minutes and subtract this from the calculated fluid deficit. If shock is present, give 10 mL/kg isotonic crystalloid over about 15 minutes, reassess and repeat as required.', ['Child health','Diabetic ketoacidosis']) },
];

// Baseline generated in ChatGPT using GPT-5.6 Sol on 2026-08-26 from a minimal instruction:
// "Write one UKMLA-style single-best-answer question from this concept. Use five options and give the correct answer and explanation."
// No StudyEdit evidence packet, quality rubric, self-audit, compiler or generation guards were supplied to the generator.
const GPT_BASELINE: Record<string, any> = {
  'ukmla-1168': { vignette: 'A 62-year-old man presents with 90 minutes of central chest pain. ECG shows ST elevation in the anterior leads. He has no contraindication to fibrinolysis. The nearest PCI-capable centre estimates that primary PCI could begin 150 minutes after fibrinolysis could otherwise be given.', question: 'What is the most appropriate reperfusion strategy?', options: [{id:'A',text:'Primary PCI despite the delay'},{id:'B',text:'Immediate fibrinolysis'},{id:'C',text:'Aspirin alone'},{id:'D',text:'Observe with serial ECGs'},{id:'E',text:'Urgent CABG'}], correct:'B', explanation:'Because PCI cannot be delivered within 120 minutes of when fibrinolysis could have been given, fibrinolysis is preferred if there is no contraindication.' },
  'ukmla-176': { vignette: 'A 74-year-old woman with non-valvular atrial fibrillation has hypertension and a previous TIA. Her renal function is stable, she has no mechanical heart valve, no moderate-to-severe mitral stenosis and no other contraindication to a direct-acting oral anticoagulant.', question: 'Which is the most appropriate long-term strategy for stroke prevention?', options: [{id:'A',text:'A direct-acting oral anticoagulant'},{id:'B',text:'Aspirin alone'},{id:'C',text:'No antithrombotic treatment'},{id:'D',text:'Dual antiplatelet therapy'},{id:'E',text:'Long-term low-molecular-weight heparin'}], correct:'A', explanation:'Anticoagulation is indicated and a DOAC is generally preferred when suitable in non-valvular atrial fibrillation.' },
  'ukmla-414': { vignette: 'A 78-year-old man is recovering after an acute coronary syndrome. He also requires long-term oral anticoagulation for atrial fibrillation. He has a previous gastrointestinal bleed and is concerned about bleeding risk.', question: 'What is the most appropriate approach to his antiplatelet treatment?', options: [{id:'A',text:'Use a fixed 12-month dual-antiplatelet regimen for everyone'},{id:'B',text:'Individualise choice and duration according to bleeding and thrombotic risk'},{id:'C',text:'Stop anticoagulation permanently'},{id:'D',text:'Give aspirin lifelong in every case'},{id:'E',text:'Use triple therapy indefinitely'}], correct:'B', explanation:'When ACS coexists with a separate indication for anticoagulation, antiplatelet choice and duration should be individualised rather than fixed universally.' },
  'ukmla-2113': { vignette: 'An 8-month-old infant is admitted with bronchiolitis. She is feeding poorly but is haemodynamically stable and has no relevant underlying health condition. Her oxygen saturation is persistently 88% in room air.', question: 'What is the most appropriate next treatment?', options: [{id:'A',text:'Supplemental oxygen'},{id:'B',text:'Routine antibiotics'},{id:'C',text:'Nebulised salbutamol'},{id:'D',text:'Oral corticosteroids'},{id:'E',text:'Immediate intubation'}], correct:'A', explanation:'For children aged 6 weeks and over without relevant underlying conditions, persistent oxygen saturation below 90% is an indication for supplemental oxygen.' },
  'ukmla-4254': { vignette: 'A 29-year-old woman who is 24 weeks pregnant is diagnosed with uncomplicated malaria after returning from an endemic region. She is clinically stable and is able to take oral medication.', question: 'Which treatment principle is most appropriate?', options: [{id:'A',text:'Delay treatment until after delivery'},{id:'B',text:'Use a pregnancy-appropriate effective antimalarial regimen without delay'},{id:'C',text:'Treat with doxycycline monotherapy'},{id:'D',text:'Give supportive care only'},{id:'E',text:'Avoid all artemisinin-based treatment in pregnancy'}], correct:'B', explanation:'Uncomplicated malaria in pregnancy requires prompt effective pregnancy-appropriate treatment; artemisinin combination therapy is an important option.' },
  'ukmla-4348': { vignette: 'A 67-year-old man presents with suspected sepsis. He is not recently pregnant. His blood pressure is 92/58 mmHg and he appears clinically hypovolaemic. Initial assessment uses NEWS2 alongside clinical judgement.', question: 'How should initial intravenous fluid resuscitation be given?', options: [{id:'A',text:'A single 2-litre crystalloid bolus without reassessment'},{id:'B',text:'Reassessed 250 mL crystalloid boluses, up to 1000 mL initially if needed'},{id:'C',text:'No fluids until a lactate result is available'},{id:'D',text:'Routine colloid as first-line fluid'},{id:'E',text:'Exactly 30 mL/kg in every patient'}], correct:'B', explanation:'Current adult sepsis guidance uses reassessed 250 mL crystalloid boluses, with up to 1000 mL initially if required, rather than a universal large fixed bolus.' },
  'ukmla-4362': { vignette: 'A 70-year-old woman is admitted with community-acquired pneumonia. Her CURB-65 score is 2. She is alert, haemodynamically stable and has no immediate need for organ support.', question: 'How should the CURB-65 result be used?', options: [{id:'A',text:'It automatically mandates ICU admission'},{id:'B',text:'It automatically mandates hospital admission'},{id:'C',text:'It should support clinical judgement about place of care'},{id:'D',text:'It rules out severe pneumonia'},{id:'E',text:'It should be ignored once antibiotics are started'}], correct:'C', explanation:'CURB-65 supports risk assessment but should be interpreted with clinical judgement; a score of 2 does not by itself mandate a specific place of care.' },
  'ukmla-4379': { vignette: 'A 30-year-old woman at 18 weeks of pregnancy has significant household exposure to chickenpox. Testing shows that she is susceptible. She can take oral medication and has no contraindication to aciclovir or valaciclovir.', question: 'What is the preferred post-exposure prophylaxis?', options: [{id:'A',text:'Oral aciclovir or valaciclovir from days 7 to 14 after exposure'},{id:'B',text:'Varicella vaccine immediately'},{id:'C',text:'VZIG in every susceptible pregnant woman'},{id:'D',text:'No prophylaxis because she is in the second trimester'},{id:'E',text:'Oral antibiotics for 7 days'}], correct:'A', explanation:'For a susceptible pregnant woman after significant exposure, oral aciclovir or valaciclovir is first-choice PEP when oral antivirals can be used, generally on days 7 to 14 after exposure.' },
  'ukmla-5666': { vignette: 'A 12-year-old boy with diabetic ketoacidosis is dehydrated but not shocked. Intravenous fluid therapy is required.', question: 'What is the appropriate initial fluid bolus?', options: [{id:'A',text:'10 mL/kg 0.9% sodium chloride over 30 minutes'},{id:'B',text:'20 mL/kg 0.9% sodium chloride over 5 minutes'},{id:'C',text:'10 mL/kg 5% glucose over 30 minutes'},{id:'D',text:'500 mL colloid over 10 minutes'},{id:'E',text:'No intravenous fluid bolus'}], correct:'A', explanation:'In paediatric DKA without shock, an initial 10 mL/kg bolus of 0.9% sodium chloride over 30 minutes is recommended and should be subtracted from the calculated deficit.' },
};

async function scoreCandidate(candidate: any, concept: ConceptNode) {
  const deterministic = validateUKMLAQuestion(candidate);
  const review = deterministic.pass ? await reviewUKMLAQuestion(candidate, concept) : deterministic;
  return { pass: review.pass, score: review.score, reasons: review.reasons, deterministicReasons: deterministic.reasons, question: candidate };
}

async function runArm(arm: 'gpt-baseline'|'studyedit') {
  const items: any[] = [];
  for (const target of TARGETS) {
    try {
      const candidate = arm === 'gpt-baseline'
        ? GPT_BASELINE[target.concept.concept_id]
        : await generateQuestionFromConcept(target.concept, 'ukmla_sba', `${UKMLA_QUALITY_INSTRUCTIONS}${buildEvidencePacketInstructions(target.concept.concept_id)}`);
      const scored = await scoreCandidate(candidate, target.concept);
      items.push({ conceptId: target.concept.concept_id, family: target.family, title: target.concept.title, generated: !!candidate, ...scored });
    } catch (error) {
      items.push({ conceptId: target.concept.concept_id, family: target.family, title: target.concept.title, generated: false, pass: false, score: 0, reasons: [error instanceof Error ? error.message : String(error)], deterministicReasons: [] });
    }
  }
  const passed = items.filter(x => x.pass).length;
  return { requested: items.length, generated: items.filter(x => x.generated).length, passed, failed: items.length - passed, passRate: Math.round((passed / items.length) * 1000) / 10, items };
}

async function run() {
  const gpt = await runArm('gpt-baseline');
  const studyedit = await runArm('studyedit');
  const report = {
    generatedAt: new Date().toISOString(),
    design: {
      concepts: TARGETS.length,
      sameConcepts: true,
      sameAutomatedValidatorAndReviewer: true,
      baselineGenerator: 'ChatGPT GPT-5.6 Sol, minimal prompt, static outputs generated 2026-08-26',
      studyeditGenerator: 'StudyEdit safeguarded generation pipeline',
      caveat: 'Preliminary automated benchmark only; n=9 and no human clinician adjudication.'
    },
    gptBaseline: gpt,
    studyedit,
    deltaPassRatePoints: Math.round((studyedit.passRate - gpt.passRate) * 10) / 10,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ gptBaseline: {passed:gpt.passed, passRate:gpt.passRate}, studyedit:{passed:studyedit.passed, passRate:studyedit.passRate}, deltaPassRatePoints:report.deltaPassRatePoints }, null, 2));
}

run().catch(error => { console.error(error); process.exitCode = 1; });
