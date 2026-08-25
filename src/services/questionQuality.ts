import type { ConceptNode } from '@/types/conceptTypes';
import { assessClinicalTruthRisk, getVerifiedSourcesForConcept } from './clinicalTruth';
import { getEvidencePacket } from './evidencePackets';

export const UKMLA_QUALITY_GATE_VERSION = 'ukmla_quality_v1_2026-08-25';

export const UKMLA_QUALITY_INSTRUCTIONS = `You are writing a UK Medical Licensing Assessment (MLA) Applied Knowledge Test single-best-answer item.

The item must test APPLIED clinical knowledge, not recognition of a buzzword or recall of an isolated sentence.

ITEM BLUEPRINT — decide this before writing:
- Test ONE clinically meaningful decision.
- Pick one cognitive task: diagnosis, next investigation, initial management, medication choice, mechanism, anatomy, or causative organism.
- Build the correct answer first.
- Build four distractors that represent realistic near-miss decisions or misconceptions, not random wrong answers.
- Difficulty should come from clinical discrimination, NOT obscure trivia, hidden assumptions, deliberately deceptive wording, or an implausibly rare exception.
- If the source concept is merely a factual property (for example route of administration, half-life, mechanism, one adverse effect, or one score component), DO NOT disguise that fact as a patient-management decision.
- Never turn a thin factual concept into a treatment-selection question unless the supplied source explicitly supports the treatment decision and competing options.

VIGNETTE:
- Start with age + gender where clinically appropriate.
- Use short readable paragraphs separated by a blank line: presentation/history; examination/observations; investigations/results; treatment/change if relevant.
- Do not put the lead-in question inside the vignette.
- Include realistic context without making every detail a giveaway.
- Usually only one or two features should be genuinely discriminative.
- Avoid famous buzzwords when natural clinical description can test the same reasoning.
- Reference ranges are required for laboratory values when interpretation depends on abnormality; do not add pointless ranges to ordinary observations.
- For medication-management questions include every discriminator needed to choose safely, including indication, renal function, haemodynamic status, bleeding history, pregnancy, prior adverse reactions, procedure/reperfusion plan and interacting antithrombotics when relevant.

LEAD-IN:
- One short direct sentence outside the vignette, ending with ?.
- It must pass the cover test: a knowledgeable learner could formulate an answer before seeing the options.
- Natural UKMLA-style wording is allowed.
- Do not ask a management question when the source only supports a descriptive fact.

OPTIONS:
- Exactly 5, IDs A-E.
- Same semantic category and grammatically answer the lead-in.
- Concise and similar in style/length.
- Every distractor must be a clinically plausible near miss before the decisive clue is applied.
- No all/none of the above, joke answers, obvious opposites or conspicuously detailed correct options.
- Exactly ONE answer must be defensibly best.
- If more than one answer choice is clinically true, rewrite the lead-in or replace an option.
- Never make a distractor by falsely denying a real property of a drug, score, disease, investigation or treatment.

ANTI-PATTERN-RECOGNITION:
- Do not make the answer recoverable from one famous buzzword alone.
- Do not reproduce the concept title verbatim in the vignette unless unavoidable.
- Make the learner integrate at least two pieces of information whenever the source supports it.
- Prefer realistic competing diagnoses/actions over obscure trivia.
- Avoid gratuitous textbook labels such as sausage-shaped, tumour plop or tearing when a natural description can test the same concept; if used, they must not be the only discriminator.

OUTPUT JSON:
{
  "vignette": "clinical vignette with blank lines between clinical sections",
  "question": "one short lead-in ending in ?",
  "options": [
    {"id":"A","text":"..."},
    {"id":"B","text":"..."},
    {"id":"C","text":"..."},
    {"id":"D","text":"..."},
    {"id":"E","text":"..."}
  ],
  "correct": "A",
  "key_fact": "one concise standalone carry-forward fact",
  "explanation": "Explain why the correct answer is best and why each realistic alternative is not best here.",
  "blueprint": {
    "task": "diagnosis|investigation|management|medication|mechanism|anatomy|organism",
    "reasoning": "the clinical discrimination being tested",
    "decisive_clues": ["clue 1", "clue 2"],
    "distractor_intents": {
      "A": "correct or misconception represented",
      "B": "correct or misconception represented",
      "C": "correct or misconception represented",
      "D": "correct or misconception represented",
      "E": "correct or misconception represented"
    }
  }
}

Use only facts supported by the supplied concept content and any attached evidence packet. If the source is too thin for a fair applied item, prefer a simple factual/application question rather than inventing clinical management detail.`;

export interface UKMLAQualityResult {
  pass: boolean;
  score: number;
  reasons: string[];
  unsafe?: boolean;
  ambiguous_options?: string[];
}

const normalise = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim();

function findDuplicateOptions(options: Array<{ id?: string; text?: string }>): boolean {
  const normalised = options.map(option => normalise(option.text).toLowerCase()).filter(Boolean);
  return new Set(normalised).size !== normalised.length;
}

function deterministicChecks(question: any): string[] {
  const reasons: string[] = [];
  const vignette = normalise(question.clinical_vignette || question.vignette || question.question_stem);
  const leadIn = normalise(question.question || question.question_text);
  const options = Array.isArray(question.options) ? question.options : [];
  const correct = normalise(question.correct_answer || question.correct);

  if (vignette.length < 35) reasons.push('Vignette is too thin for a fair applied clinical item.');
  if (!leadIn || !leadIn.endsWith('?') || leadIn.length > 180) reasons.push('Lead-in is missing, too long, or not a direct question.');
  if (leadIn && vignette.toLowerCase().includes(leadIn.toLowerCase())) reasons.push('Lead-in is duplicated inside the vignette.');
  if (options.length !== 5) reasons.push('UKMLA SBA requires exactly five options.');

  const optionIds = options.map((option: any) => normalise(option?.id).toUpperCase());
  if (options.length === 5 && optionIds.join(',') !== 'A,B,C,D,E') reasons.push('Options must use IDs A-E in order.');
  if (!['A', 'B', 'C', 'D', 'E'].includes(correct.toUpperCase())) reasons.push('Correct answer must be A-E.');
  if (correct && !optionIds.includes(correct.toUpperCase())) reasons.push('Correct answer ID is not present among the options.');
  if (options.some((option: any) => !normalise(option?.text))) reasons.push('One or more answer options are blank.');
  if (findDuplicateOptions(options)) reasons.push('Answer options contain duplicates.');
  if (options.some((option: any) => /\b(all|none) of the above\b/i.test(normalise(option?.text)))) reasons.push('All/none-of-the-above options are not allowed.');

  const optionLengths = options.map((option: any) => normalise(option?.text).length).filter(Boolean);
  if (optionLengths.length === 5) {
    const max = Math.max(...optionLengths);
    const min = Math.max(1, Math.min(...optionLengths));
    if (max > 70 && max / min > 3.2) reasons.push('Option length creates a likely answer cue.');
  }

  if (/\b(except|not true|least likely)\b/i.test(leadIn)) reasons.push('Negative lead-ins are disallowed for launch items.');
  if (/\b(pathognomonic|classic triad|textbook presentation)\b/i.test(vignette)) reasons.push('Vignette contains overt cueing language.');

  return reasons;
}

export function validateUKMLAQuestion(question: any): UKMLAQualityResult {
  const reasons = deterministicChecks(question);
  return {
    pass: reasons.length === 0,
    score: reasons.length === 0 ? 100 : Math.max(0, 100 - reasons.length * 12),
    reasons,
  };
}

function buildReviewerPrompt(question: any, concept: ConceptNode): string {
  const sources = getVerifiedSourcesForConcept(concept.concept_id || '');
  const evidencePacket = getEvidencePacket(concept.concept_id || '');
  return `You are an adversarial clinical question reviewer for UKMLA launch quality.

Assess this question against these requirements:
1. Exactly one defensibly best answer.
2. Clinical truth is correct and current.
3. The vignette contains every fact needed to choose safely.
4. Distractors are plausible but genuinely inferior, not partially correct restatements of the right approach.
5. No hidden assumptions, option-length cueing, buzzword giveaways, or trick wording.
6. The question tests the supplied concept rather than invented management detail.
7. The explanation teaches why the correct answer wins and why alternatives lose.
8. If a source/evidence packet is supplied, do not accept claims that conflict with it.

Concept title: ${concept.title}
Concept content: ${concept.content}
Verified sources: ${sources.join(', ') || 'none attached'}
Evidence packet: ${evidencePacket ? JSON.stringify(evidencePacket) : 'none'}
Question: ${JSON.stringify(question)}

Return ONLY JSON:
{"pass":true|false,"score":0-100,"reasons":["..."],"unsafe":true|false,"ambiguous_options":["A","B"]}`;
}

export async function reviewUKMLAQuestion(question: any, concept: ConceptNode): Promise<UKMLAQualityResult> {
  const deterministic = validateUKMLAQuestion(question);
  if (!deterministic.pass) return deterministic;

  const truthRisk = assessClinicalTruthRisk(question, concept);
  if (!truthRisk.pass) {
    return {
      pass: false,
      score: Math.min(70, truthRisk.score),
      reasons: truthRisk.reasons,
      unsafe: truthRisk.unsafe,
    };
  }

  try {
    const { generateAIResponse } = await import('./openai');
    const raw = await generateAIResponse(buildReviewerPrompt(question, concept), {
      question: normalise(question.question || question.question_text),
      options: (question.options || []).map((option: any) => `${option.id}. ${option.text}`),
      correctAnswer: normalise(question.correct_answer || question.correct),
      selectedAnswer: '',
      explanation: normalise(question.explanation),
    });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { pass: false, score: 0, reasons: ['Adversarial reviewer returned invalid JSON.'] };
    const parsed = JSON.parse(match[0]);
    const score = Number(parsed.score || 0);
    const ambiguous = Array.isArray(parsed.ambiguous_options) ? parsed.ambiguous_options : [];
    const unsafe = Boolean(parsed.unsafe);
    const reasons = Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [];
    const pass = Boolean(parsed.pass) && score >= 88 && !unsafe && ambiguous.length === 0;
    return { pass, score, reasons, unsafe, ambiguous_options: ambiguous };
  } catch (error) {
    return { pass: false, score: 0, reasons: [`Adversarial review failed closed: ${String(error)}`] };
  }
}
