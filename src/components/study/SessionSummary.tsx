import type { Atom, FsrsRatingValue } from '@/atom/types';
import { SessionTakeaways } from './SessionTakeaways';

export function SessionSummary({
  totalAtoms,
  ratings,
  rated,
  streakDays,
}: {
  totalAtoms: number;
  ratings: FsrsRatingValue[];
  rated?: { atom: Atom; rating: FsrsRatingValue; correct: boolean }[];
  streakDays: number;
}) {
  const right = ratings.filter(r => r >= 3).length;
  return (
    <div className="max-w-md mx-auto space-y-3">
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 text-center space-y-2">
        <div className="text-4xl font-semibold text-stone-900 dark:text-stone-100">
          {right} / {totalAtoms}
        </div>
        <div className="text-sm text-stone-600 dark:text-stone-400">streak day {streakDays} 🔥</div>
      </div>
      {rated && rated.length > 0 && <SessionTakeaways results={rated} />}
    </div>
  );
}
