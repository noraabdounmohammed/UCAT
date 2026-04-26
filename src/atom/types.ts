/**
 * Atomic Engine domain types — must match
 * supabase/migrations/20260425120000_atomic_engine_schema.sql
 */

export type Exam = 'UKMLA' | 'UCAT' | string;

export type AtomSourceType =
  | 'NICE' | 'NHS' | 'BNF' | 'GMC' | 'past_paper'
  | 'doctor_seed' | 'student_bounty' | 'ai-draft';

export type AtomStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

/** UKMLA-style question formats. SBA is the default 4-option MCQ. */
export type QuestionKind = 'sba' | 'cloze' | 'emq' | 'calc';

/**
 * Verdict from the AI-side QA pass on AI-drafted atoms — populated by
 * `scripts/ai-review-atoms.ts`. `null` means the AI hasn't reviewed yet
 * (or this is a human-seeded atom). Surface in the /review UI so Nora can
 * fast-path "ok" cases and focus on "concern" ones.
 */
export type AiReviewStatus = 'ok' | 'concern' | null;

export type VariantGeneratedBy =
  | 'ai-deepseek-v3' | 'ai-openai-gpt4o-mini'
  | 'human' | 'past_paper';

export interface Atom {
  id: string;
  exam: Exam;
  topicPath: string[];
  claim: string;
  canonicalStem: string;
  answer: string;
  distractors: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  imageUrl: string | null;
  imageAlt: string | null;
  citationUrl: string;
  citationLabel: string;
  sourceType: AtomSourceType;
  prereqAtomIds: string[];
  highYield: boolean;
  freeTier: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null; // ISO 8601
  status: AtomStatus;
  createdAt: string;
  updatedAt: string;
  /** AI-QA verdict — see AiReviewStatus. */
  aiReviewStatus?: AiReviewStatus;
  aiReviewNotes?: string | null;
  aiReviewedAt?: string | null;
  /**
   * AI-paraphrased rationale grounded in the citation source. Shown to
   * the user after they pick an answer (especially valuable on a wrong
   * pick) so they understand *why* the right answer is right. Original
   * prose, never verbatim — copyright-compliant under Open Government
   * Licence for NICE/NHS sources.
   */
  explanation?: string | null;
  explanationSource?: string | null;
  explanationGeneratedAt?: string | null;
  /**
   * Renderer hint — when set, overrides the default mix in QuestionRouter.
   * Defaults to 'sba' DB-side; the in-app QuestionRouter rotates ~30%
   * of unset atoms to cloze for variety.
   */
  questionKind?: QuestionKind;
}

export interface AtomVariant {
  id: string;
  parentAtomId: string;
  stem: string;
  answer: string;
  distractors: string[];
  generatedBy: VariantGeneratedBy;
  reviewedBy: string | null;
  reviewedAt: string | null;
  status: AtomStatus;
  createdAt: string;
}

export interface UserAtomState {
  userId: string;
  atomId: string;
  stability: number;
  difficulty: number;
  dueAt: string;
  lastReviewAt: string | null;
  reps: number;
  lapses: number;
}

export type FsrsRatingValue = 1 | 2 | 3 | 4; // forgot | hard | good | easy
export type ConfidenceValue = 1 | 2 | 3 | 4;

export interface ReviewEvent {
  id: string;
  userId: string;
  atomId: string;
  variantId: string | null;
  rating: FsrsRatingValue;
  confidence: ConfidenceValue | null;
  responseMs: number | null;
  createdAt: string;
}
