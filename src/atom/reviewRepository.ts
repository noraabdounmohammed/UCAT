import type { SupabaseClient } from '@supabase/supabase-js';
import type { Atom, Exam } from './types';

function rowToAtom(row: any): Atom {
  return {
    id: row.id,
    exam: row.exam,
    topicPath: row.topic_path ?? [],
    claim: row.claim,
    canonicalStem: row.canonical_stem,
    answer: row.answer,
    distractors: row.distractors ?? [],
    difficulty: row.difficulty,
    imageUrl: row.image_url ?? null,
    imageAlt: row.image_alt ?? null,
    citationUrl: row.citation_url,
    citationLabel: row.citation_label,
    sourceType: row.source_type,
    prereqAtomIds: row.prereq_atom_ids ?? [],
    highYield: row.high_yield,
    freeTier: row.free_tier,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    aiReviewStatus: row.ai_review_status ?? null,
    aiReviewNotes: row.ai_review_notes ?? null,
    aiReviewedAt: row.ai_reviewed_at ?? null,
    explanation: row.explanation ?? null,
    explanationSource: row.explanation_source ?? null,
    explanationGeneratedAt: row.explanation_generated_at ?? null,
  };
}

export type AtomPatch = Partial<Pick<Atom,
  'claim' | 'canonicalStem' | 'answer' | 'distractors' | 'citationUrl' | 'citationLabel'
>>;

export interface ReviewRepository {
  listPendingReview(exam: Exam, limit: number): Promise<Atom[]>;
  approveAtom(atomId: string, reviewerId: string): Promise<void>;
  rejectAtom(atomId: string, reviewerId: string, reason: string): Promise<void>;
  updateAtom(atomId: string, patch: AtomPatch): Promise<void>;
}

export function createReviewRepository(supabase: SupabaseClient): ReviewRepository {
  return {
    async listPendingReview(exam, limit) {
      // Order: AI-flagged "concern" cases first (those need Nora's eye most),
      // then "ok" AI-reviewed (fast-path), then unreviewed (incl. doctor
      // seeds with no AI verdict). Within each band, oldest first.
      // Postgres alphabetical ascending: 'concern' < 'ok' so ascending=true
      // gives the desired order; nullsFirst=false keeps unreviewed last.
      const { data, error } = await supabase
        .from('atoms')
        .select('*')
        .eq('exam', exam)
        .eq('status', 'pending_review')
        .order('ai_review_status', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(rowToAtom);
    },

    async approveAtom(atomId, reviewerId) {
      const now = new Date().toISOString();
      const u = await supabase
        .from('atoms')
        .update({ status: 'approved', reviewed_by: reviewerId, reviewed_at: now })
        .eq('id', atomId);
      if (u.error) throw u.error;
      const i = await supabase
        .from('review_decisions')
        .insert({ atom_id: atomId, reviewer_id: reviewerId, decision: 'approve' });
      if (i.error) throw i.error;
    },

    async rejectAtom(atomId, reviewerId, reason) {
      const now = new Date().toISOString();
      const u = await supabase
        .from('atoms')
        .update({ status: 'rejected', reviewed_by: reviewerId, reviewed_at: now })
        .eq('id', atomId);
      if (u.error) throw u.error;
      const i = await supabase
        .from('review_decisions')
        .insert({ atom_id: atomId, reviewer_id: reviewerId, decision: 'reject', reason });
      if (i.error) throw i.error;
    },

    async updateAtom(atomId, patch) {
      const row: any = {};
      if (patch.claim !== undefined) row.claim = patch.claim;
      if (patch.canonicalStem !== undefined) row.canonical_stem = patch.canonicalStem;
      if (patch.answer !== undefined) row.answer = patch.answer;
      if (patch.distractors !== undefined) row.distractors = patch.distractors;
      if (patch.citationUrl !== undefined) row.citation_url = patch.citationUrl;
      if (patch.citationLabel !== undefined) row.citation_label = patch.citationLabel;
      const { error } = await supabase.from('atoms').update(row).eq('id', atomId);
      if (error) throw error;
    },
  };
}
