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
  countApprovedByExam(exam: Exam): Promise<number>;
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

    async countApprovedByExam(exam) {
      const { count, error } = await supabase
        .from('atoms')
        .select('*', { count: 'exact', head: true })
        .eq('exam', exam)
        .eq('status', 'approved');
      if (error) throw error;
      return count ?? 0;
    },
  };
}
