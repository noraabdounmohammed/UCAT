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

export interface AtomRepository {
  listApprovedByExam(exam: Exam): Promise<Atom[]>;
  listFreeTier(exam: Exam): Promise<Atom[]>;
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
