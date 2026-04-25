import type { FsrsRatingValue } from '@/atom/types';

export function SessionSummary({
  totalAtoms,
  ratings,
  streakDays,
}: {
  totalAtoms: number;
  ratings: FsrsRatingValue[];
  streakDays: number;
}) {
  const right = ratings.filter(r => r >= 3).length;
  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-6 max-w-md mx-auto text-center space-y-2">
      <div className="text-4xl font-semibold text-stone-900">
        {right} / {totalAtoms}
      </div>
      <div className="text-sm text-stone-600">streak day {streakDays} 🔥</div>
      <div className="text-xs text-stone-500">
        Predicted exam-day score arrives in Plan 6.
      </div>
    </div>
  );
}
