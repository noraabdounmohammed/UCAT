import type { UserAtomState } from '@/atom/types';
import type { FsrsCardState } from './types';

export function fromUserAtomState(row: UserAtomState): FsrsCardState {
  return {
    stability: row.stability,
    difficulty: row.difficulty,
    dueAt: new Date(row.dueAt),
    lastReviewAt: row.lastReviewAt ? new Date(row.lastReviewAt) : null,
    reps: row.reps,
    lapses: row.lapses,
  };
}

export function toUserAtomState(
  userId: string,
  atomId: string,
  state: FsrsCardState,
): UserAtomState {
  return {
    userId,
    atomId,
    stability: state.stability,
    difficulty: state.difficulty,
    dueAt: state.dueAt.toISOString(),
    lastReviewAt: state.lastReviewAt ? state.lastReviewAt.toISOString() : null,
    reps: state.reps,
    lapses: state.lapses,
  };
}
