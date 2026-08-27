import type { ConceptNode } from '@/types/conceptTypes';
import { assessClinicalTruthRisk, getVerifiedSourcesForConcept } from './clinicalTruth';
import { getEvidencePacket } from './evidencePackets';

export const FLASHCARD_QUALITY_GATE_VERSION = 'flashcard_quality_v1_2026-08-27';

export const FLASHCARD_QUALITY_INSTRUCTIONS = `Create ONE high-quality medical retrieval-practice flashcard from the supplied concept.

PURPOSE
- Test one clinically meaningful, examinable atomic claim.
- Prefer information that changes diagnosis, investigation, management, safety, prognosis, interpretation or a high-yield definition/threshold.
- Do not create trivia merely because it appears in the source.

FRONT
- Ask ONE direct, natural question that can be answered before revealing the back.
- Usually 8-24 words; maximum 180 characters.
- Do not use markdown, bullets, headings, bold markers, answer hints or source-document language.
- Do not ask vague prompts such as “What are the key points/features/management of X?” or “What should you know about X?”.
- Do not bundle multiple independent facts with “and”, slash-separated tasks or multi-part requests unless they are inseparable parts of one rule.
- If a management/diagnosis card needs a clinical qualifier for safety or uniqueness, put that qualifier on the front.
- Do not silently assume absence of pregnancy, renal impairment, shock, bleeding, interacting treatment, timing, age or another decision-changing modifier when the answer depends on it.

BACK
- Give the shortest complete answer to the exact question asked.
- Prefer one sentence or one compact bullet; maximum 70 words and never more than 3 bullets.
- The first sentence must directly answer the front.
- Do not introduce unrelated teaching points, extra guideline rules or a second learning objective.
- Markdown is allowed on the back only for clean emphasis/bullets; never emit broken or unmatched markdown.

TRUTH + SAFETY
- Use only claims supported by the supplied concept and any evidence packet.
- Never invent a threshold, dose, duration, timing, contraindication, referral rule, hierarchy or exception.
- Preserve qualifiers that change the clinical decision.
- If the source is too broad for a safe atomic card, choose a narrower factual target rather than extrapolating.
- Numerical claims must exactly match the supplied source/evidence boundary.

OUTPUT JSON ONLY
{
  "front": "single direct retrieval question",
  "back": "short complete answer"
}`;

export interface FlashcardQualityResult {
  pass: boolean;
  score: number;
  reasons: string[];
  dimensions?: Record<string, number>;
}

const normalise = (value: unknown) => String(value ?? '').trim();

const markdownLeak = /(?:\*\*|__|^#{1,6}\s|```|\[[^\]]+\]\([^\)]+\))/m;
const vagueFront = /\b(?:what are (?:the )?(?:key points|features|causes|complications|management|treatments)|what should you know|tell me about|describe everything|summari[sz]e)\b/i;
const sourceLanguage = /\b(?:the content|the source|the text|the passage|provided information|as stated above|according to the supplied)\b/i;
const unsafeAbsolute = /\b(?:always|never|must|contraindicated|first[- ]line|preferred|only|immediately|within\s+\d|\d+\s*(?:mg|g|ml|mL|hours?|minutes?|days?|weeks?|%|mmol\/L|IU\/L))\b/i;

function unmatchedMarkdown(value: string): boolean {
  const bold = (value.match(/\*\*/g) || []).length;
  const underscore = (value.match(/__/g) || []).length;
  const fences = (value.match(/```/g) || []).length;
  return bold % 2 !== 0 || underscore % 2 !== 0 || fences % 2 !== 0;
}

function sentenceCount(value: string): number {
  return value.split(/[.!?]+(?:\s|$)/).map(v => v.trim()).filter(Boolean).length;
}

function bulletCount(value: string): number {
  return value.split('\n').filter(line => /^\s*[-*•]\s+/.test(line)).length;
}

function obviousFrontBackLeak(front: string, back: string): boolean {
  const simplify = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const f = simplify(front);
  const answerLead = simplify(back.split(/\n|\.|;/)[0]);
  if (!f || !answerLead || answerLead.length < 4) return false;
  if (f.includes(answerLead) && answerLead.split(' ').length >= 2) return true;
  return false;
}

export function validateFlashcard(card: any): FlashcardQualityResult {
  const reasons: string[] = [];
  const front = normalise(card?.question_stem ?? card?.front ?? card?.question);
  const back = normalise(card?.explanation ?? card?.back);

  if (!front) reasons.push('FORMAT: Flashcard front is missing.');
  if (!back) reasons.push('FORMAT: Flashcard back is missing.');
  if (front && !front.endsWith('?')) reasons.push('RETRIEVAL: Front must be a direct question ending in ?.');
  if (front.length > 180) reasons.push('ATOMICITY: Front is too long for a focused retrieval cue.');
  if (front.length < 6) reasons.push('RETRIEVAL: Front is too short to be meaningfully answerable.');
  if (markdownLeak.test(front)) reasons.push('UI_QUALITY: Markdown or formatting markup leaked onto the flashcard front.');
  if (sourceLanguage.test(front) || sourceLanguage.test(back)) reasons.push('SOURCE_LEAK: Card refers to source/content instead of stating medicine directly.');
  if (vagueFront.test(front)) reasons.push('RETRIEVAL: Vague broad prompt does not test one atomic claim.');
  if (/\b(?:and|\/|;).*(?:what|which|when|how|why)\b/i.test(front)) reasons.push('ATOMICITY: Front appears to contain more than one retrieval task.');
  if (back.length > 520) reasons.push('MINIMALITY: Back is too long for a retrieval-practice card.');
  if (bulletCount(back) > 3) reasons.push('MINIMALITY: Back contains more than three bullets.');
  if (sentenceCount(back) > 5 && bulletCount(back) === 0) reasons.push('MINIMALITY: Back contains too much explanatory prose.');
  if (unmatchedMarkdown(back)) reasons.push('UI_QUALITY: Back contains malformed markdown.');
  if (obviousFrontBackLeak(front, back)) reasons.push('RETRIEVAL: Front appears to reveal the answer.');

  const score = Math.max(0, 100 - reasons.length * 16);
  return { pass: reasons.length === 0, score, reasons };
}

async function callReviewer(prompt: string): Promise<any> {
  const response = await fetch('/.netlify/functions/ai-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.1,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: 'You are a hostile clinical reviewer of medical spaced-repetition flashcards. Reject cards that are unsafe, unsupported, vague, non-atomic, trivial, poorly phrased, misleading, over-broad, numerically wrong, or whose back does not directly answer the front. Do not reward polished prose. Respond with valid JSON only.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) throw new Error(`Flashcard reviewer failed: ${response.status}`);
  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Flashcard reviewer returned no content');
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Flashcard reviewer returned invalid JSON');
  return JSON.parse(match[0]);
}

export async function reviewFlashcard(card: any, concept: ConceptNode): Promise<FlashcardQualityResult> {
  const deterministic = validateFlashcard(card);
  if (!deterministic.pass) return deterministic;

  const front = normalise(card?.question_stem ?? card?.front ?? card?.question);
  const back = normalise(card?.explanation ?? card?.back);
  const truthRisk = assessClinicalTruthRisk(concept);
  const verifiedSources = getVerifiedSourcesForConcept(concept);
  const evidence = getEvidencePacket(concept.concept_id);

  const sourceContext = verifiedSources.length
    ? verifiedSources.map(source => `- ${source.title} | ${source.url} | verified ${source.verifiedOn}${source.scopeNotes ? ` | ${source.scopeNotes}` : ''}`).join('\n')
    : '- No topic-specific source registry entry. Judge support strictly from the concept/evidence boundary.';

  const evidenceContext = evidence
    ? `Risk: ${evidence.risk}\nVerified claim: ${evidence.claim}\nRequired context: ${evidence.requiredContext.join('; ')}\nAllowed targets: ${evidence.allowedTargets.join('; ')}\nForbidden inferences: ${evidence.forbiddenInferences.join('; ')}\nSource: ${evidence.source}`
    : 'No dedicated evidence packet exists; do not allow unsupported decision-critical extrapolation beyond the source concept.';

  const prompt = `Review this medical flashcard for publication.

TRUTH RISK
Level: ${truthRisk.risk}
Reasons: ${truthRisk.reasons.join('; ') || 'No special risk pattern detected.'}

VERIFIED SOURCE REGISTRY
${sourceContext}

EVIDENCE PACKET
${evidenceContext}

SOURCE CONCEPT
Title: ${concept.title}
Content: ${concept.content || ''}

FLASHCARD
Front: ${front}
Back: ${back}

Judge these dimensions from 0-5:
- clinical_accuracy: every claim is clinically correct
- source_support: decision-critical claims and qualifiers are supported by source/evidence
- atomicity: exactly one retrievable learning objective
- answerability: front has enough context for one expected answer
- front_back_alignment: back directly and completely answers the front
- retrieval_quality: natural active-recall cue, not vague recognition or source-paraphrase sludge
- minimality: shortest complete answer without unrelated teaching
- exam_value: worth remembering for a medical learner rather than low-value trivia
- wording_quality: natural professional English with no awkward guideline-transformation phrasing
- safety: no omitted qualifier could teach unsafe management

MANDATORY REJECT if ANY of these apply:
- clinically false, stale or unsupported claim
- numerical threshold/dose/timing differs from supplied source/evidence
- a management answer omits a qualifier that could change the action
- more than one independent learning objective is bundled together
- the front is vague, awkward, self-answering or not uniquely answerable
- the back answers a different question, adds a second learning objective, or materially over-teaches
- the card tests an arbitrary detail with little exam/clinical value when a higher-value claim is available
- the card relies on an inference that the evidence packet explicitly forbids

Do not reject merely because the back is concise. Concision is desirable if complete.

Return JSON only:
{
  "pass": true,
  "score": 0,
  "dimensions": {
    "clinical_accuracy": 0,
    "source_support": 0,
    "atomicity": 0,
    "answerability": 0,
    "front_back_alignment": 0,
    "retrieval_quality": 0,
    "minimality": 0,
    "exam_value": 0,
    "wording_quality": 0,
    "safety": 0
  },
  "reasons": ["specific reason if rejected"]
}

PASS only if clinical_accuracy, source_support, front_back_alignment and safety are all 5; every other dimension is at least 4; total score is at least 90/100.`,
  };

  const reviewed = await callReviewer(prompt);
  const dimensions = typeof reviewed?.dimensions === 'object' && reviewed.dimensions ? reviewed.dimensions : {};
  const requiredPerfect = ['clinical_accuracy', 'source_support', 'front_back_alignment', 'safety'];
  const other = ['atomicity', 'answerability', 'retrieval_quality', 'minimality', 'exam_value', 'wording_quality'];
  const dimensionFailure = requiredPerfect.some(key => Number(dimensions[key]) !== 5)
    || other.some(key => Number(dimensions[key]) < 4);
  const score = Number.isFinite(Number(reviewed?.score)) ? Number(reviewed.score) : 0;
  const reviewerReasons = Array.isArray(reviewed?.reasons) ? reviewed.reasons.map(String) : [];
  const pass = reviewed?.pass === true && !dimensionFailure && score >= 90;

  const highRiskLanguage = unsafeAbsolute.test(`${front} ${back}`);
  if (highRiskLanguage && truthRisk.risk === 'critical' && !evidence) {
    return {
      pass: false,
      score: Math.min(score, 70),
      dimensions,
      reasons: [...reviewerReasons, 'SUPPORT: Critical-risk decision language requires an evidence packet or equivalent verified boundary.'],
    };
  }

  return {
    pass,
    score,
    dimensions,
    reasons: pass ? [] : (reviewerReasons.length ? reviewerReasons : ['Flashcard reviewer rejected the card.']),
  };
}
