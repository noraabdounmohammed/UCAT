import type { SupabaseClient } from '@supabase/supabase-js';
import type { Atom, Exam } from './types';

/**
 * Maps a snake_case Supabase row to the camelCase Atom domain type.
 * Tolerates rows already in camelCase (e.g. test fixtures) by falling back.
 */
function rowToAtom(row: any): Atom {
  return {
    id: row.id,
    exam: row.exam,
    topicPath: row.topic_path ?? row.topicPath ?? [],
    claim: row.claim,
    canonicalStem: row.canonical_stem ?? row.canonicalStem,
    answer: row.answer,
    distractors: row.distractors ?? [],
    difficulty: row.difficulty,
    imageUrl: row.image_url ?? row.imageUrl ?? null,
    imageAlt: row.image_alt ?? row.imageAlt ?? null,
    citationUrl: row.citation_url ?? row.citationUrl,
    citationLabel: row.citation_label ?? row.citationLabel,
    sourceType: row.source_type ?? row.sourceType,
    prereqAtomIds: row.prereq_atom_ids ?? row.prereqAtomIds ?? [],
    highYield: row.high_yield ?? row.highYield,
    freeTier: row.free_tier ?? row.freeTier,
    reviewedBy: row.reviewed_by ?? row.reviewedBy ?? null,
    reviewedAt: row.reviewed_at ?? row.reviewedAt ?? null,
    status: row.status,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    aiReviewStatus: row.ai_review_status ?? row.aiReviewStatus ?? null,
    aiReviewNotes: row.ai_review_notes ?? row.aiReviewNotes ?? null,
    aiReviewedAt: row.ai_reviewed_at ?? row.aiReviewedAt ?? null,
    explanation: row.explanation ?? null,
    explanationSource: row.explanation_source ?? row.explanationSource ?? null,
    explanationGeneratedAt: row.explanation_generated_at ?? row.explanationGeneratedAt ?? null,
    questionKind: row.question_kind ?? row.questionKind ?? 'sba',
    caseId: row.case_id ?? row.caseId ?? null,
  };
}

export interface ListAvailableOptions {
  /**
   * When true, include atoms with `status = 'pending_review'` AND
   * `source_type = 'ai-draft'` — the AI-drafted atoms that haven't been
   * cleared by Nora's review queue yet. Callers MUST surface a disclaimer
   * to the user when this is set, since the content has not been
   * clinician-verified.
   */
  includeUnreviewedAiDrafts?: boolean;
  /** Optional cap on returned rows. */
  limit?: number;
  /** Optional list of atom IDs to exclude (e.g. already in the user's queue). */
  excludeAtomIds?: string[];
}

export interface AtomRepository {
  listApprovedByExam(exam: Exam): Promise<Atom[]>;
  listFreeTier(exam: Exam): Promise<Atom[]>;
  /**
   * Like `listApprovedByExam` but with optional inclusion of unreviewed
   * AI drafts. This is the new preferred method for /study + /mock; pages
   * pass the user's `includeUnreviewedAiDrafts` toggle through.
   */
  listAvailableForExam(exam: Exam, opts?: ListAvailableOptions): Promise<Atom[]>;
  getById(id: string): Promise<Atom | null>;
  /**
   * Batched `getById` — single round-trip via `.in('id', ids)`. Used by
   * `useFsrsSession` to hydrate the queue in one request instead of N.
   */
  getByIds(ids: string[]): Promise<Atom[]>;
  /**
   * HEAD-only count of atoms reachable for the user, mirroring the same
   * `includeUnreviewedAiDrafts` filter as `listAvailableForExam`. Used by
   * `usePredictedScore` so the "covered / total" denominator reflects the
   * actual pool the user is drilling — not just the approved subset.
   */
  countAvailableForExam(exam: Exam, opts?: ListAvailableOptions): Promise<number>;
  countApprovedByExam(exam: Exam): Promise<number>;
  /**
   * Pulls atoms of the "newer kinds" (calc / EMQ) OR atoms attached to a
   * clinical case — the content the user most needs to see if they have a
   * long FSRS-due backlog of older SBA atoms. `buildStudyQueue` reserves a
   * couple of slots per session for this so variety isn't starved.
   */
  listVarietyForExam(exam: Exam, opts?: ListAvailableOptions): Promise<Atom[]>;
}

export function createAtomRepository(supabase: SupabaseClient): AtomRepository {
  return {
    async listApprovedByExam(exam) {
      const { data, error } = await supabase
        .from('atoms')
        .select('*')
        .eq('exam', exam)
        .eq('status', 'approved')
        .order('high_yield', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToAtom);
    },

    async listAvailableForExam(exam, opts = {}) {
      // We can't express "(status='approved') OR (status='pending_review' AND
      // source_type='ai-draft')" in a single PostgREST `.eq` chain, so we use
      // a string-form `.or(...)` for the predicate.
      let q = supabase
        .from('atoms')
        .select('*')
        .eq('exam', exam);

      if (opts.includeUnreviewedAiDrafts) {
        q = q.or('status.eq.approved,and(status.eq.pending_review,source_type.eq.ai-draft)');
      } else {
        q = q.eq('status', 'approved');
      }

      if (opts.excludeAtomIds && opts.excludeAtomIds.length > 0) {
        // Postgrest `not.in` syntax: `(id1,id2,...)`.
        const list = `(${opts.excludeAtomIds.map(id => `"${id}"`).join(',')})`;
        q = q.not('id', 'in', list);
      }

      q = q
        .order('high_yield', { ascending: false })
        .order('created_at', { ascending: false });

      if (opts.limit) q = q.limit(opts.limit);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(rowToAtom);
    },

    async listFreeTier(exam) {
      const { data, error } = await supabase
        .from('atoms')
        .select('*')
        .eq('exam', exam)
        .eq('status', 'approved')
        .eq('free_tier', true)
        .limit(50);
      if (error) throw error;
      return (data ?? []).map(rowToAtom);
    },

    async getById(id) {
      const { data, error } = await supabase
        .from('atoms')
        .select('*')
        .eq('id', id)
        .limit(1)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null; // no rows
        throw error;
      }
      return data ? rowToAtom(data) : null;
    },

    async getByIds(ids) {
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('atoms')
        .select('*')
        .in('id', ids);
      if (error) throw error;
      return (data ?? []).map(rowToAtom);
    },

    async countApprovedByExam(exam) {
      const { count, error } = await supabase
        .from('atoms')
        .select('*', { count: 'exact', head: true })
        .eq('exam', exam)
        .eq('status', 'approved');
      if (error) throw error;
      return count ?? 0;
    },

    async countAvailableForExam(exam, opts = {}) {
      let q = supabase
        .from('atoms')
        .select('*', { count: 'exact', head: true })
        .eq('exam', exam);

      if (opts.includeUnreviewedAiDrafts) {
        q = q.or('status.eq.approved,and(status.eq.pending_review,source_type.eq.ai-draft)');
      } else {
        q = q.eq('status', 'approved');
      }

      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },

    async listVarietyForExam(exam, opts = {}) {
      // Pull "newer kind" content (calc / emq / case-bound), excluding atoms
      // the user has already seen. Approved by default; pending_review +
      // ai-draft when includeUnreviewedAiDrafts is true.
      let q = supabase
        .from('atoms')
        .select('*')
        .eq('exam', exam)
        .or('question_kind.eq.calc,question_kind.eq.emq,case_id.not.is.null');

      if (opts.includeUnreviewedAiDrafts) {
        q = q.or('status.eq.approved,and(status.eq.pending_review,source_type.eq.ai-draft)');
      } else {
        q = q.eq('status', 'approved');
      }

      if (opts.excludeAtomIds && opts.excludeAtomIds.length > 0) {
        // PostgREST chokes on very long IN lists; cap the exclusion list at
        // 200 to keep the URL under typical limits. Worst case the user gets
        // a stale repeat — acceptable for variety injection.
        const trimmed = opts.excludeAtomIds.slice(0, 200);
        const list = `(${trimmed.map(id => `"${id}"`).join(',')})`;
        q = q.not('id', 'in', list);
      }

      q = q
        .order('high_yield', { ascending: false })
        .order('created_at', { ascending: false });

      if (opts.limit) q = q.limit(opts.limit);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(rowToAtom);
    },
  };
}
