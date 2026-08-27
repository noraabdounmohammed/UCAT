import type { ConceptNode } from '@/types/conceptTypes';
import { assessClinicalTruthRisk, getVerifiedSourcesForConcept } from './clinicalTruth';
import { getEvidencePacket } from './evidencePackets';

export const FLASHCARD_QUALITY_GATE_VERSION = 'flashcard_quality_v1_2026-08-27';

export const FLASHCARD_QUALITY_INSTRUCTIONS = `Create ONE high-quality medical retrieval-practice flashcard from the supplied concept.

FRONT
- Ask one natural, direct question testing ONE clinically meaningful, examinable atomic claim.
- Usually 8-24 words; maximum 180 characters; end with ?.
- No markdown, bullets, headings, bold markers, answer hints or source-document language.
- Never use vague prompts such as “What are the key points/features/management of X?” or “What should you know about X?”.
- If a clinical qualifier changes the answer, state it on the front. Never silently assume away pregnancy, renal impairment, shock, bleeding, age, timing or interacting treatment.

BACK
- Give the shortest complete answer to exactly what the front asks.
- Prefer one sentence or one compact bullet; maximum 70 words; never more than 3 bullets.
- First sentence directly answers the front. No unrelated second learning objective.
- Clean markdown is allowed on the back only.

TRUTH + SAFETY
- Use only claims supported by the supplied concept and evidence packet.
- Never invent thresholds, doses, duration, timing, contraindications, referral rules, treatment hierarchy or exceptions.
- Preserve every qualifier that changes the clinical decision.
- Prefer a high-value clinical/exam claim over trivia.

Return JSON only: {"front":"single retrieval question?","back":"short complete answer"}`;

export interface FlashcardQualityResult {
  pass: boolean;
  score: number;
  reasons: string[];
  dimensions?: Record<string, number>;
}

const text = (value: unknown) => String(value ?? '').trim();
const frontMarkdown = /(?:\*\*|__|^#{1,6}\s|```|\[[^\]]+\]\([^\)]+\))/m;
const vague = /\b(?:what are (?:the )?(?:key points|features|causes|complications|management|treatments)|what should you know|tell me about|describe everything|summari[sz]e)\b/i;
const sourceLeak = /\b(?:the content|the source|the text|the passage|provided information|as stated above|according to the supplied)\b/i;

function bullets(value: string) {
  return value.split('\n').filter(line => /^\s*[-*•]\s+/.test(line)).length;
}

function malformedMarkdown(value: string) {
  return ((value.match(/\*\*/g) || []).length % 2 !== 0)
    || ((value.match(/__/g) || []).length % 2 !== 0)
    || ((value.match(/```/g) || []).length % 2 !== 0);
}

export function validateFlashcard(card: any): FlashcardQualityResult {
  const reasons: string[] = [];
  const front = text(card?.question_stem ?? card?.front ?? card?.question);
  const back = text(card?.explanation ?? card?.back);

  if (!front) reasons.push('FORMAT: missing front.');
  if (!back) reasons.push('FORMAT: missing back.');
  if (front && !front.endsWith('?')) reasons.push('RETRIEVAL: front must be a direct question ending in ?.');
  if (front.length > 180) reasons.push('ATOMICITY: front is too long.');
  if (frontMarkdown.test(front)) reasons.push('UI_QUALITY: markdown leaked onto the front.');
  if (vague.test(front)) reasons.push('RETRIEVAL: vague broad prompt rather than one atomic claim.');
  if (sourceLeak.test(front) || sourceLeak.test(back)) reasons.push('SOURCE_LEAK: card refers to source/content.');
  if (back.length > 520) reasons.push('MINIMALITY: back is too long.');
  if (bullets(back) > 3) reasons.push('MINIMALITY: back contains more than three bullets.');
  if (malformedMarkdown(back)) reasons.push('UI_QUALITY: malformed markdown on back.');

  return { pass: reasons.length === 0, score: Math.max(0, 100 - 16 * reasons.length), reasons };
}

async function reviewer(prompt: string) {
  const response = await fetch('/.netlify/functions/ai-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.1,
      max_tokens: 900,
      messages: [
        { role: 'system', content: 'You are a hostile clinical reviewer of medical spaced-repetition flashcards. Reject unsafe, unsupported, vague, non-atomic, trivial, awkward, misleading, over-broad or numerically wrong cards, and cards whose back does not directly answer the front. Respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Flashcard reviewer failed: ${response.status}`);
  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  const match = String(raw || '').match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Flashcard reviewer returned invalid JSON');
  return JSON.parse(match[0]);
}

export async function reviewFlashcard(card: any, concept: ConceptNode): Promise<FlashcardQualityResult> {
  const deterministic = validateFlashcard(card);
  if (!deterministic.pass) return deterministic;

  const front = text(card?.question_stem ?? card?.front ?? card?.question);
  const back = text(card?.explanation ?? card?.back);
  const truthRisk = assessClinicalTruthRisk(concept);
  const sources = getVerifiedSourcesForConcept(concept);
  const evidence = getEvidencePacket(concept.concept_id);

  const sourceContext = sources.length
    ? sources.map(source => `- ${source.title} | ${source.url} | verified ${source.verifiedOn}${source.scopeNotes ? ` | ${source.scopeNotes}` : ''}`).join('\n')
    : '- No topic-specific registry entry; support must come from the source concept/evidence boundary.';
  const evidenceContext = evidence
    ? `Risk: ${evidence.risk}\nVerified claim: ${evidence.claim}\nRequired context: ${evidence.requiredContext.join('; ')}\nAllowed targets: ${evidence.allowedTargets.join('; ')}\nForbidden inferences: ${evidence.forbiddenInferences.join('; ')}\nSource: ${evidence.source}`
    : 'No dedicated evidence packet. Do not permit decision-critical extrapolation beyond the source concept.';

  const prompt = `Review this medical flashcard for publication.

TRUTH RISK: ${truthRisk.risk}\n${truthRisk.reasons.join('; ') || 'No special risk pattern detected.'}

VERIFIED SOURCES\n${sourceContext}

EVIDENCE PACKET\n${evidenceContext}

SOURCE CONCEPT\nTitle: ${concept.title}\nContent: ${concept.content || ''}

FLASHCARD\nFront: ${front}\nBack: ${back}

Score each 0-5:
clinical_accuracy, source_support, atomicity, answerability, front_back_alignment, retrieval_quality, minimality, exam_value, wording_quality, safety.

Reject if clinically false/stale/unsupported; any numerical threshold/dose/timing differs from source; management omits a decision-changing qualifier; more than one learning objective is bundled; front is vague/awkward/self-answering/non-unique; back answers a different question or adds unrelated teaching; low-value trivia displaces a higher-value claim; or a forbidden inference is used.

Pass only when clinical_accuracy, source_support, front_back_alignment and safety are exactly 5; all other dimensions are at least 4; total score >=90.
Return JSON only: {"pass":true,"score":95,"dimensions":{"clinical_accuracy":5,"source_support":5,"atomicity":5,"answerability":5,"front_back_alignment":5,"retrieval_quality":5,"minimality":5,"exam_value":5,"wording_quality":5,"safety":5},"reasons":[]}`;

  const result = await reviewer(prompt);
  const dimensions = result?.dimensions && typeof result.dimensions === 'object' ? result.dimensions : {};
  const perfect = ['clinical_accuracy', 'source_support', 'front_back_alignment', 'safety'];
  const strong = ['atomicity', 'answerability', 'retrieval_quality', 'minimality', 'exam_value', 'wording_quality'];
  const dimensionFailure = perfect.some(key => Number(dimensions[key]) !== 5) || strong.some(key => Number(dimensions[key]) < 4);
  const score = Number.isFinite(Number(result?.score)) ? Number(result.score) : 0;
  const reasons = Array.isArray(result?.reasons) ? result.reasons.map(String) : [];
  const pass = result?.pass === true && !dimensionFailure && score >= 90;

  return { pass, score, dimensions, reasons: pass ? [] : (reasons.length ? reasons : ['Flashcard reviewer rejected the card.']) };
}
