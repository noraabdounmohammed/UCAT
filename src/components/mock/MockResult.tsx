export interface MockResultProps {
  correct: number;
  total: number;
  percentage: number;
  timeUsedSec: number;
}

export function MockResult({ correct, total, percentage, timeUsedSec }: MockResultProps) {
  const m = Math.floor(timeUsedSec / 60);
  const s = timeUsedSec % 60;
  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-6 max-w-md mx-auto text-center space-y-3">
      <div className="text-4xl font-semibold text-stone-900">{correct} / {total}</div>
      <div className="text-stone-700">{percentage.toFixed(0)}%</div>
      <div className="text-xs text-stone-500">Time used: {m}m {s}s</div>
    </div>
  );
}
