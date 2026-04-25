import type { SupabaseClient } from '@supabase/supabase-js';
import type { AtomSourceType, Exam } from './types';

export interface DraftAtomInput {
  exam: Exam;
  topicPath: string[];
  claim: string;
  canonicalStem: string;
  answer: string;
  distractors: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  citationUrl: string;
  citationLabel: string;
  sourceType: AtomSourceType;
  highYield?: boolean;
}

export interface SeedRepository {
  createDraftAtom(input: DraftAtomInput): Promise<{ id: string }>;
}

export function createSeedRepository(supabase: SupabaseClient): SeedRepository {
  return {
    async createDraftAtom(input) {
      const { data, error } = await supabase
        .from('atoms')
        .insert({
          exam: input.exam,
          topic_path: input.topicPath,
          claim: input.claim,
          canonical_stem: input.canonicalStem,
          answer: input.answer,
          distractors: input.distractors,
          difficulty: input.difficulty,
          citation_url: input.citationUrl,
          citation_label: input.citationLabel,
          source_type: input.sourceType,
          high_yield: input.highYield ?? false,
          status: 'pending_review',
        })
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id };
    },
  };
}
