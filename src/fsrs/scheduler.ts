import { fsrs, generatorParameters, createEmptyCard, Rating } from 'ts-fsrs';
import type { Card, Grade } from 'ts-fsrs';
import type { FsrsCardState, FsrsReviewResult, FsrsScheduler } from './types';
import type { FsrsRatingValue } from '@/atom/types';

const params = generatorParameters({
  enable_fuzz: true,
  request_retention: 0.9, // target 90% recall
});

const f = fsrs(params);

/**
 * Map our 1..4 rating onto ts-fsrs Rating enum.
 */
function toFsrsRating(r: FsrsRatingValue): Grade {
  switch (r) {
    case 1: return Rating.Again;
    case 2: return Rating.Hard;
    case 3: return Rating.Good;
    case 4: return Rating.Easy;
  }
}

function tsCardToState(
  card: Card,
  lastReviewAt: Date | null,
  reps: number,
  lapses: number,
): FsrsCardState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    dueAt: new Date(card.due),
    lastReviewAt,
    reps,
    lapses,
  };
}

function stateToTsCard(state: FsrsCardState): Card {
  // Reconstruct a ts-fsrs Card from our persisted state.
  const card = createEmptyCard(state.lastReviewAt ?? new Date(0));
  card.stability = state.stability;
  card.difficulty = state.difficulty;
  card.due = state.dueAt;
  card.reps = state.reps;
  card.lapses = state.lapses;
  card.last_review = state.lastReviewAt ?? undefined;
  return card;
}

export function createFsrsScheduler(): FsrsScheduler {
  return {
    initialState(now = new Date()) {
      const card = createEmptyCard(now);
      return tsCardToState(card, null, 0, 0);
    },

    applyReview(state, rating, now = new Date()): FsrsReviewResult {
      const card = stateToTsCard(state);
      const result = f.next(card, now, toFsrsRating(rating));
      const newCard = result.card;
      const intervalDays = Math.max(
        0,
        (new Date(newCard.due).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const newLapses = rating === 1 ? state.lapses + 1 : state.lapses;
      return {
        newState: tsCardToState(newCard, now, state.reps + 1, newLapses),
        intervalDays,
      };
    },

    isDue(state, now = new Date()) {
      return state.dueAt.getTime() <= now.getTime();
    },
  };
}
