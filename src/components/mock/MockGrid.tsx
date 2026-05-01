import { Bookmark } from 'lucide-react';

interface MockGridProps {
  total: number;
  currentIndex: number;
  picks: Record<number, { correct: boolean; choiceIndex: number }>;
  flagged: Set<number>;
  /** True once the exam has been submitted — show correct/wrong colors. */
  reviewMode?: boolean;
  onJump: (index: number) => void;
}

/**
 * Question navigator grid — same idea as the sidebar in the real Pearson
 * VUE / Practique UI. Each cell is a numbered button with state colors:
 *
 *   - Plain stone: not yet attempted
 *   - Stone with dot: answered (live exam — color blind)
 *   - Amber border: flagged for review
 *   - Solid stone-900: currently viewed
 *   - Emerald (review mode only): answered correctly
 *   - Red (review mode only): answered wrongly
 */
export function MockGrid({ total, currentIndex, picks, flagged, reviewMode, onJump }: MockGridProps) {
  return (
    <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 font-semibold">
          {reviewMode ? 'Your answers' : 'Questions'}
        </span>
        <span className="text-[11px] text-stone-500 dark:text-stone-400">
          {Object.keys(picks).length} / {total} {reviewMode ? '' : 'answered'}
        </span>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: total }, (_, i) => {
          const isCurrent = i === currentIndex;
          const isAnswered = picks[i] !== undefined;
          const isFlag = flagged.has(i);
          let cls =
            'relative flex items-center justify-center h-8 rounded text-[11px] font-semibold transition-colors';
          if (reviewMode && isAnswered) {
            cls += picks[i].correct
              ? ' bg-emerald-500 text-white'
              : ' bg-red-500 text-white';
          } else if (isCurrent) {
            cls += ' bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900';
          } else if (isAnswered) {
            cls +=
              ' bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600';
          } else {
            cls +=
              ' bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700';
          }
          if (isFlag && !reviewMode) {
            cls += ' ring-2 ring-amber-400';
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => onJump(i)}
              className={cls}
              aria-label={`Jump to question ${i + 1}${isFlag ? ' (flagged)' : ''}${isAnswered ? ' (answered)' : ''}`}
              title={`Q${i + 1}${isFlag ? ' · flagged' : ''}${isAnswered ? ' · answered' : ''}`}
            >
              {i + 1}
              {isFlag && !reviewMode && (
                <Bookmark
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 text-amber-500 fill-amber-500"
                  strokeWidth={2}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
