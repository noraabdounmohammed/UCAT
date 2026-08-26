import fs from 'node:fs';
import path from 'node:path';
import { generateQuestionFromConcept } from '../src/services/aiQuestionGenerator';
import { UKMLA_QUALITY_INSTRUCTIONS, reviewUKMLAQuestion, validateUKMLAQuestion } from '../src/services/questionQuality';
import { buildEvidencePacketInstructions } from '../src/services/evidencePackets';
import type { ConceptNode } from '../src/types/conceptTypes';

const AI_PROXY_BASE = process.env.STUDYEDIT_BASE_URL || 'https://studyedit.com';
const OUT = process.env.TARGETED_EVAL_OUT || 'artifacts/targeted-eval.json';
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

const normalise = (v: unknown) => String(v ?? '').trim();

async function run() {
  const items: any[] = [];
  for (const [index, target] of TARGETS.entries()) {
    console.log(`[${index + 1}/${TARGETS.length}] ${target.concept.concept_id} ${target.concept.title}`);
    try {
      const candidate: any = await generateQuestionFromConcept(target.concept, 'ukmla_sba', `${UKMLA_QUALITY_INSTRUCTIONS}${buildEvidencePacketInstructions(target.concept.concept_id)}`);
      const deterministic = validateUKMLAQuestion(candidate);
      const review = deterministic.pass ? await reviewUKMLAQuestion(candidate, target.concept) : deterministic;
      items.push({ conceptId: target.concept.concept_id, family: target.family, title: target.concept.title, generated: true, pass: review.pass, score: review.score, reasons: review.reasons, deterministicReasons: deterministic.reasons, question: { vignette: normalise(candidate?.clinical_vignette ?? candidate?.vignette), leadIn: normalise(candidate?.question), options: Array.isArray(candidate?.options) ? candidate.options : [], correct: normalise(candidate?.correct_answer ?? candidate?.correct), explanation: normalise(candidate?.explanation) } });
    } catch (error) {
      items.push({ conceptId: target.concept.concept_id, family: target.family, title: target.concept.title, generated: false, pass: false, score: 0, reasons: [error instanceof Error ? error.message : String(error)], deterministicReasons: [] });
    }
  }
  const passed = items.filter(x => x.pass).length;
  const report = { startedAt: new Date().toISOString(), requested: items.length, generated: items.filter(x => x.generated).length, passed, failed: items.length - passed, passRate: Math.round((passed / items.length) * 1000) / 10, items };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, items: undefined }, null, 2));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
