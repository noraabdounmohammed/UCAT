export interface FlashcardQualityResult {
  pass: boolean;
  reasons: string[];
  front: string;
  back: string;
}

const MAX_FRONT_WORDS = 30;
const MAX_FRONT_CHARS = 190;
const MAX_BACK_WORDS = 90;

const normaliseSpace = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();

export function stripFlashcardFrontFormatting(value: unknown): string {
  return normaliseSpace(value)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s*/g, '')
    .replace(/^[-*+]\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

function wordCount(value: string): number {
  return value ? value.split(/\s+/).filter(Boolean).length : 0;
}

function hasMultipleRetrievalObjectives(front: string): boolean {
  const lower = front.toLowerCase();
  const secondQuestionTask = /\b(?:and|then)\s+(?:why|what|which|when|where|who|how)\b/.test(lower);
  const pairedImperatives = /\b(?:state|name|identify|give|describe|explain)\b[^?]{0,90}\band\s+(?:state|name|identify|give|describe|explain)\b/.test(lower);
  const multipleQuestionMarks = (front.match(/\?/g) || []).length > 1;
  return secondQuestionTask || pairedImperatives || multipleQuestionMarks;
}

function unsupportedAbsolute(back: string, source: string): string | null {
  const risky = [
    /\bregardless of\b/i,
    /\birrespective of\b/i,
    /\balways\b/i,
    /\bnever\b/i,
  ];

  for (const pattern of risky) {
    const match = back.match(pattern)?.[0];
    if (!match) continue;
    if (!pattern.test(source)) return match;
  }
  return null;
}

export function validateFlashcardCandidate(
  candidate: { question_stem?: unknown; question?: unknown; explanation?: unknown },
  sourceContent: unknown = '',
): FlashcardQualityResult {
  const rawFront = String(candidate.question_stem ?? candidate.question ?? '').trim();
  const front = stripFlashcardFrontFormatting(rawFront);
  const back = String(candidate.explanation ?? '').trim();
  const source = String(sourceContent ?? '');
  const reasons: string[] = [];

  if (!front) reasons.push('Flashcard front is missing.');
  if (!back) reasons.push('Flashcard back is missing.');
  if (front.length > MAX_FRONT_CHARS || wordCount(front) > MAX_FRONT_WORDS) {
    reasons.push(`Flashcard front is too long (max ${MAX_FRONT_WORDS} words / ${MAX_FRONT_CHARS} characters).`);
  }
  if (hasMultipleRetrievalObjectives(front)) {
    reasons.push('Flashcard front asks more than one retrieval question.');
  }
  if (wordCount(back) > MAX_BACK_WORDS) {
    reasons.push(`Flashcard back contains too much teaching (max ${MAX_BACK_WORDS} words).`);
  }

  const absolute = unsupportedAbsolute(back, source);
  if (absolute) {
    reasons.push(`Flashcard strengthens the source with an unsupported absolute: “${absolute}”.`);
  }

  return { pass: reasons.length === 0, reasons, front, back };
}

export function normaliseFlashcardForCache<T extends {
  question_stem: string;
  question_text: string;
  explanation?: string | null;
  concept_content?: string | null;
  question_format?: string;
}>(question: T): { question: T; quality: FlashcardQualityResult } {
  if (question.question_format !== 'flashcard') {
    return {
      question,
      quality: { pass: true, reasons: [], front: question.question_stem, back: question.explanation ?? '' },
    };
  }

  const quality = validateFlashcardCandidate(question, question.concept_content ?? '');
  return {
    question: {
      ...question,
      question_stem: quality.front,
      question_text: quality.front,
    },
    quality,
  };
}
