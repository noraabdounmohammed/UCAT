import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserAtomState, ReviewEvent, FsrsRatingValue, ConfidenceValue } from './types';

function rowToState(row: any): UserAtomState {
  return {
    userId: row.user_id,
    atomId: row.atom_id,
    stability: row.stability,
    difficulty: row.difficulty,
    dueAt: row.due_at,
    lastReviewAt: row.last_review_at ?? null,
    reps: row.reps,
    lapses: row.lapses,
  };
}

export interface UserStateRepository {
  listDueForUser(userId: string, asOf: Date, limit: number): Promise<UserAtomState[]>;
  upsertState(state: UserAtomState): Promise<void>;
  insertReviewEvent(ev: Omit<ReviewEvent, 'id' | 'createdAt'>): Promise<void>;
}

export function createUserStateRepository(supabase: SupabaseClient): UserStateRepository {
  return {
    async listDueForUser(userId, asOf, limit) {
      const { data, error } = await supabase
        .from('user_atom_state')
        .select('*')
        .eq('user_id', userId)
        .lte('due_at', asOf.toISOString())
        .order('due_at', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(rowToState);
    },

    async upsertState(state) {
      const { error } = await supabase.from('user_atom_state').upsert(
        {
          user_id: state.userId,
          atom_id: state.atomId,
          stability: state.stability,
          difficulty: state.difficulty,
          due_at: state.dueAt,
          last_review_at: state.lastReviewAt,
          reps: state.reps,
          lapses: state.lapses,
        },
        { onConflict: 'user_id,atom_id' },
      );
      if (error) throw error;
    },

    async insertReviewEvent(ev) {
      const { error } = await supabase.from('review_events').insert({
        user_id: ev.userId,
        atom_id: ev.atomId,
        variant_id: ev.variantId,
        rating: ev.rating as FsrsRatingValue,
        confidence: ev.confidence as ConfidenceValue | null,
        response_ms: ev.responseMs,
      });
      if (error) throw error;
    },
  };
}
