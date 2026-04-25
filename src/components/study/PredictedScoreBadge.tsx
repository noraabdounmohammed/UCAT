import type { UsePredictedScoreResult } from '@/hooks/usePredictedScore';

type BadgeProps = Pick<UsePredictedScoreResult, 'predictedScore' | 'atomCount' | 'totalAtoms' | 'status'>;

export function PredictedScoreBadge({ predictedScore, atomCount, totalAtoms, status }: BadgeProps) {
  if (status === 'error') return null;

  if (status === 'loading') {
    return (
      <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-2 inline-flex items-center gap-2 text-sm">
        <span className="text-stone-400">—</span>
        <span className="text-stone-500">predicted</span>
      </div>
    );
  }

  if (atomCount === 0) {
    return (
      <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-2 inline-flex items-center gap-2 text-sm">
        <span className="text-stone-700">Start a session to see your predicted score.</span>
      </div>
    );
  }

  const pct = Math.round(predictedScore * 100);
  return (
    <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-2 inline-flex items-center gap-3 text-sm">
      <span className="text-2xl font-semibold text-stone-900">{pct}%</span>
      <span className="text-stone-500">predicted</span>
      <span className="text-stone-300">·</span>
      <span className="text-stone-500">{atomCount} / {totalAtoms} atoms</span>
    </div>
  );
}
