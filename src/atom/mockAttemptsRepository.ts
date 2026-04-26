import type { SupabaseClient } from '@supabase/supabase-js';

export interface MockAttempt {
  userId: string;
  exam: string;
  atomCount: number;
  correct: number;
  total: number;
  percentage: number;
  durationSec: number;
  timeUsedSec: number;
  finished: boolean;
  startedAt: Date;
  finishedAt: Date;
}

export interface MockAttemptsRepository {
  saveAttempt(attempt: MockAttempt): Promise<void>;
}

export function createMockAttemptsRepository(supabase: SupabaseClient): MockAttemptsRepository {
  return {
    async saveAttempt(attempt) {
      const { error } = await supabase.from('mock_attempts').insert({
        user_id: attempt.userId,
        exam: attempt.exam,
        atom_count: attempt.atomCount,
        correct: attempt.correct,
        total: attempt.total,
        percentage: attempt.percentage,
        duration_sec: attempt.durationSec,
        time_used_sec: attempt.timeUsedSec,
        finished: attempt.finished,
        started_at: attempt.startedAt.toISOString(),
        finished_at: attempt.finishedAt.toISOString(),
      });
      if (error) throw error;
    },
  };
}
