/**
 * Atomic Engine domain types — must match
 * supabase/migrations/20260425120000_atomic_engine_schema.sql
 */

export type Exam = 'UKMLA' | 'UCAT' | string;

export type AtomSourceType =
  | 'NICE' | 'NHS' | 'BNF' | 'GMC' | 'past_paper'
  | 'doctor_seed' | 'student_bounty' | 'ai-draft';

export type AtomStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

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
