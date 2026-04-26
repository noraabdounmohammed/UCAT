import type { ConfidenceValue } from '@/atom/types';

const LABELS: Record<ConfidenceValue, string> = {
  1: 'Guessed',
  2: 'Unsure',
  3: 'Confident',
  4: 'Certain',
};

export function ConfidenceButtons({ onPick }: { onPick: (c: ConfidenceValue) => void }) {
  return (
    <div className="flex gap-2" aria-label="How sure are you?">
      {[1, 2, 3, 4].map(n => (
        <button
          key={n}
          type="button"
          aria-label={`How sure: ${LABELS[n as ConfidenceValue]}`}
          onClick={() => onPick(n as ConfidenceValue)}
          className="flex-1 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-100 text-sm"
        >
          {LABELS[n as ConfidenceValue]}
        </button>
      ))}
    </div>
  );
}
