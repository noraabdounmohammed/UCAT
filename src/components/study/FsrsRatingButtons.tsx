import type { FsrsRatingValue } from '@/atom/types';

const RATINGS: Array<{ value: FsrsRatingValue; label: string }> = [
  { value: 1, label: 'Forgot' },
  { value: 2, label: 'Hard' },
  { value: 3, label: 'Good' },
  { value: 4, label: 'Easy' },
];

export function FsrsRatingButtons({ onPick }: { onPick: (r: FsrsRatingValue) => void }) {
  return (
    <div className="flex gap-2">
      {RATINGS.map(r => (
        <button
          key={r.value}
          type="button"
          onClick={() => onPick(r.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-100 text-sm font-medium"
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
