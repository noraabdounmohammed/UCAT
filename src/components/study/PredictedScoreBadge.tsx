import type { UsePredictedScoreResult } from '@/hooks/usePredictedScore';

type BadgeProps = Pick<UsePredictedScoreResult, 'predictedScore' | 'atomCount' | 'totalAtoms' | 'status'>;

export function PredictedScoreBadge({ predictedScore, atomCount, totalAtoms, status }: BadgeProps) {
  if (status === 'error') return null;

  if (status === 'loading') {
    return (
      <div className="flex justify-center">
        <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-2 inline-flex items-center gap-2 text-sm">
          <span className="text-stone-400">—</span>
          <span className="text-stone-500">predicted</span>
        </div>
      </div>
    );
  }

  if (atomCount === 0) {
    return (
      <div className="flex justify-center">
        <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-2 inline-flex items-center gap-2 text-sm">
          <span className="text-stone-700 dark:text-stone-300">Start a session to see your predicted score.</span>
        </div>
      </div>
    );
  }

  const pct = Math.round(predictedScore * 100);
  return (
    <div className="flex justify-center">
      <div
        className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-2 inline-flex items-center gap-3 text-sm"
        title="Mean recall across the questions you've covered, projected 1 week forward. Drops when you get questions wrong."
      >
        <span className="text-2xl font-semibold text-stone-900 dark:text-stone-100">{pct}%</span>
        <span className="text-stone-500">7-day recall</span>
        <span className="text-stone-300 dark:text-stone-700">·</span>
        <span className="text-stone-500">{atomCount} / {totalAtoms} questions</span>
      </div>
    </div>
  );
}
