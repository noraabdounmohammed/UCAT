import type { ConceptNode } from '@/types/conceptTypes';
import { assessClinicalTruthRisk, getVerifiedSourcesForConcept } from './clinicalTruth';
import { getEvidencePacket } from './evidencePackets';

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

export interface QuestionQualityResult {
  pass: boolean;
  score: number;
  reasons: string[];
}

const normalise = (value: unknown) => String(value ?? '').trim();

function cleanVignetteForValidation(question: any): string {
  const raw = normalise(question?.clinical_vignette ?? question?.vignette);
  const leadIn = normalise(question?.question);
  if (!raw || !leadIn) return raw;

  const rawLower = raw.toLowerCase();
  const leadLower = leadIn.toLowerCase();
  if (rawLower.endsWith(leadLower)) {
    return raw.slice(0, raw.length - leadIn.length).trim();
  }
  return raw;
}

export function validateUKMLAQuestion(question: any): QuestionQualityResult {
  const reasons: string[] = [];
  const vignette = cleanVignetteForValidation(question);
  const leadIn = normalise(question?.question);
  const options = Array.isArray(question?.options) ? question.options : [];
  const correct = normalise(question?.correct_answer ?? question?.correct).toUpperCase();

  if (!vignette || vignette.length < 35) reasons.push('Missing or implausibly short clinical vignette.');
  if (!leadIn || !leadIn.endsWith('?') || leadIn.length > 180) reasons.push('Lead-in must be one short question ending in ?.');
  if (leadIn && vignette.toLowerCase().includes(leadIn.toLowerCase())) reasons.push('Lead-in is duplicated inside the vignette.');
  if (options.length !== 5) reasons.push('UKMLA SBA must contain exactly five options.');

  const expectedIds = ['A', 'B', 'C', 'D', 'E'];
  const optionIds = options.map((option: any) => normalise(option?.id).toUpperCase());
  if (optionIds.length === 5 && expectedIds.some((id, index) => optionIds[index] !== id)) reasons.push('Option IDs must be A-E in order.');
  if (!expectedIds.includes(correct)) reasons.push('Correct answer must be one of A-E.');
  if (correct && !optionIds.includes(correct)) reasons.push('Correct answer does not match an option ID.');

  const texts = options.map((option: any) => normalise(typeof option === 'string' ? option : option?.text));
  if (texts.some((text: string) => !text)) reasons.push('Every option needs text.');
  const uniqueTexts = new Set(texts.map((text: string) => text.toLowerCase()));
  if (texts.length && uniqueTexts.size !== texts.length) reasons.push('Duplicate answer options detected.');
  if (texts.some((text: string) => /\b(?:all|none) of the above\b/i.test(text))) reasons.push('All/none-of-the-above options are not allowed.');

  const lengths = texts.filter(Boolean).map((text: string) => text.length);
  if (lengths.length === 5) {
    const min = Math.max(1, Math.min(...lengths));
    const max = Math.max(...lengths);
    if (max > 70 && max / min > 3.2) reasons.push('One option is conspicuously longer than the others and may cue the answer.');
  }

  if (leadIn && /\b(?:except|not true|least likely)\b/i.test(leadIn)) reasons.push('Negative lead-ins add test-taking difficulty rather than clinical reasoning.');
  if (vignette && /\b(?:pathognomonic|classic triad|textbook presentation)\b/i.test(vignette)) reasons.push('Vignette contains overt cueing language.');

  const score = Math.max(0, 100 - reasons.length * 18);
  return { pass: reasons.length === 0, score, reasons };
}

async function callReviewer(prompt: string): Promise<any> {
  const response = await fetch('/.netlify/functions/ai-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.1,
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: 'You are a hostile reviewer for a national medical licensing exam. Reject ambiguous, cueable, unfair, unsupported, trivial, stale or clinically unsafe questions. Check every option independently for truth and defensibility. Do not reward eloquent wording. Respond with valid JSON only.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) throw new Error(`Question reviewer failed: ${response.status}`);
  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Question reviewer returned no content');
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Question reviewer returned invalid JSON');
  return JSON.parse(match[0]);
}

export async function reviewUKMLAQuestion(question: any, concept: ConceptNode): Promise<QuestionQualityResult> {
  const deterministic = validateUKMLAQuestion(question);
  if (!deterministic.pass) return deterministic;

  const truthRisk = assessClinicalTruthRisk(concept);
  const verifiedSources = getVerifiedSourcesForConcept(concept);
  const evidence = getEvidencePacket(concept.concept_id);
  const sourceContext = verifiedSources.length
    ? verifiedSources.map(source => `- ${source.title} | ${source.url} | verified ${source.verifiedOn}${source.scopeNotes ? ` | ${source.scopeNotes}` : ''}`).join('\n')
    : '- No topic-specific authoritative source has yet been verified in StudyEdit. Treat guideline-sensitive claims cautiously.';
  const evidenceContext = evidence
    ? `Risk: ${evidence.risk}\nVerified claim: ${evidence.claim}\nRequired context: ${evidence.requiredContext.join('; ')}\nAllowed question targets: ${evidence.allowedTargets.join('; ')}\nForbidden inferences: ${evidence.forbiddenInferences.join('; ')}\nDistractor intents: ${evidence.distractorIntents.join('; ')}\nSource: ${evidence.source}`
    : 'No launch evidence packet exists for this concept.';
  const vignette = cleanVignetteForValidation(question);

  const prompt = `Review this proposed UKMLA SBA against the supplied source concept AND evidence packet.

TRUTH RISK
Level: ${truthRisk.risk}
Reasons: ${truthRisk.reasons.join('; ') || 'No high-risk claim pattern detected.'}

VERIFIED SOURCE REGISTRY
${sourceContext}

EVIDENCE PACKET
${evidenceContext}

Important:
- The source registry identifies current authoritative sources but does not itself prove a claim.
- When an evidence packet is present, treat the packet as the verified launch boundary for what the item may test. Its required context, allowed targets and forbidden inferences are part of the support for the item.
- Do NOT reject an item merely because the older source concept is concise if the evidence packet explicitly supplies the missing decision boundary.
- Still reject any question that contradicts the packet, omits context needed to distinguish the options, invents unsupported medicine, or leaves more than one defensible answer.

SOURCE CONCEPT
Title: ${concept.title}
Content: ${concept.content || ''}

QUESTION
Vignette: ${vignette}
Lead-in: ${normalise(question?.question)}
Options: ${JSON.stringify(question?.options || [])}
Claimed correct answer: ${normalise(question?.correct_answer ?? question?.correct)}
Explanation: ${normalise(question?.explanation)}

Score:
- clinical/source accuracy: 25
- single-best-answer integrity: 20
- distractor plausibility: 15
- applied reasoning rather than recall: 15
- clinical realism: 10
- resistance to cueing/pattern recognition: 5
- clarity: 5
- fairness: 5

Before scoring, test every answer option independently:
1. Is the statement/action itself clinically true?
2. Could it reasonably answer this lead-in in this patient?
3. Is any claimed distinction dependent on context absent from the stem or evidence packet?
4. Does the explanation dismiss a true alternative without support from the concept or evidence packet?
5. For high/critical-risk claims, does the concept plus evidence packet provide enough verified boundary to justify the answer safely?

MANDATORY REJECTION if:
- more than one option is reasonably defensible
- the claimed correct answer is unsupported by the concept plus evidence packet
- the vignette relies on an invented fact that changes the answer
- management could be unsafe or guideline-sensitive without sufficient context
- difficulty is mainly obscurity or trick wording
- the answer is given away by buzzwords or option construction
- a descriptive fact has been disguised as a treatment decision outside the packet's allowed targets
- medicine selection omits context needed to determine the preferred agent
- the explanation says an alternative is wrong without support from the concept or evidence packet
- an option claimed false is actually a true property in the scenario
- a high/critical-risk item exceeds the verified boundary supplied by the concept plus evidence packet

Return ONLY:
{
  "pass": true,
  "score": 0,
  "reasons": ["short concrete reason"],
  "ambiguous_options": [],
  "unsafe": false
}

Pass only if score >= 88 and there is no mandatory rejection.`;

  try {
    const review = await callReviewer(prompt);
    const score = Number(review?.score || 0);
    const reasons = Array.isArray(review?.reasons) ? review.reasons.map((reason: unknown) => normalise(reason)).filter(Boolean) : [];
    const ambiguous = Array.isArray(review?.ambiguous_options) ? review.ambiguous_options : [];
    const unsafe = Boolean(review?.unsafe);
    const pass = Boolean(review?.pass) && score >= 88 && !unsafe && ambiguous.length === 0;
    return { pass, score, reasons: reasons.length ? reasons : pass ? [] : ['Adversarial reviewer did not approve this item.'] };
  } catch (error) {
    console.warn('Question reviewer unavailable.', error);
    if (truthRisk.risk === 'high' || truthRisk.risk === 'critical') {
      return {
        pass: false,
        score: 0,
        reasons: [`Clinical reviewer unavailable for ${truthRisk.risk}-risk source claim; item rejected rather than trusted without review.`]
      };
    }
    return deterministic;
  }
}
