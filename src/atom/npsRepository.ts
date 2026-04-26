import type { SupabaseClient } from '@supabase/supabase-js';

export interface NpsRepository {
  submitNps(
    userId: string,
    score: number,
    comment: string | null,
    context: string,
  ): Promise<void>;
}

export function createNpsRepository(supabase: SupabaseClient): NpsRepository {
  return {
    async submitNps(userId, score, comment, context) {
      const { error } = await supabase.from('nps_responses').insert({
        user_id: userId,
        score,
        comment,
        context,
      });
      if (error) throw error;
    },
  };
}
