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

export interface ReviewEventStats {
  /** Total `review_events` rows for the user — every "Next" click counts. */
  totalAttempts: number;
  /** Attempts with rating >= 3 (Good, Easy). */
  correctAttempts: number;
  /** Attempts with rating <= 2 (Forgot, Hard). */
  wrongAttempts: number;
}

export interface UserStateRepository {
  listDueForUser(userId: string, asOf: Date, limit: number): Promise<UserAtomState[]>;
  listMistakeAtomsForUser(userId: string, since: Date, limit: number): Promise<UserAtomState[]>;
  listAllForUser(userId: string): Promise<UserAtomState[]>;
  listReviewEventDates(userId: string, since: Date): Promise<Date[]>;
  /**
   * Aggregate count of every rating the user has ever clicked. Powers the
   * StatsSummary "ATTEMPTS / CORRECT / WRONG" cells — matches the user's
   * mental model ("I clicked through 15 questions") rather than the
   * deduplicated unique-atom count from `listAllForUser`.
   */
  getReviewEventStats(userId: string): Promise<ReviewEventStats>;
  upsertState(state: UserAtomState): Promise<void>;
  insertReviewEvent(ev: Omit<ReviewEvent, 'id' | 'createdAt'>): Promise<void>;
  /**
   * Returns every atom_id the user has any state for. Used by buildStudyQueue
   * to exclude already-seen atoms from the variety / fresh-pristine pools.
   */
  listSeenAtomIds(userId: string): Promise<string[]>;
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

    async listMistakeAtomsForUser(userId, since, limit) {
      const { data, error } = await supabase
        .from('user_atom_state')
        .select('*')
        .eq('user_id', userId)
        .gte('lapses', 1)
        .gte('last_review_at', since.toISOString())
        .order('last_review_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(rowToState);
    },

    async listAllForUser(userId) {
      const { data, error } = await supabase
        .from('user_atom_state')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map(rowToState);
    },

    async listReviewEventDates(userId, since) {
      const { data, error } = await supabase
        .from('review_events')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => new Date(r.created_at));
    },

    async getReviewEventStats(userId) {
      const { data, error } = await supabase
        .from('review_events')
        .select('rating')
        .eq('user_id', userId);
      if (error) throw error;
      const rows = data ?? [];
      let correct = 0;
      let wrong = 0;
      for (const r of rows as { rating: number }[]) {
        if (r.rating >= 3) correct++;
        else wrong++;
      }
      return { totalAttempts: rows.length, correctAttempts: correct, wrongAttempts: wrong };
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

    async listSeenAtomIds(userId) {
      const { data, error } = await supabase
        .from('user_atom_state')
        .select('atom_id')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.atom_id as string);
    },
  };
}
