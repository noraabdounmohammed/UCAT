import { Coffee, ArrowRight } from 'lucide-react';

/**
 * Mid-paper break overlay for the 200-Q full mock — mirrors the real
 * UKMLA AKT, which is split into two ~100-question papers with a break
 * between. We show this once when the user has answered Q100, modal
 * over the question. They can resume immediately or take the suggested
 * 10-minute breather.
 *
 * The timer continues running unless we explicitly pause it (we don't
 * — keeping it simple matches a soft enforced break rather than a hard
 * exam-software pause).
 */
export function MockBreak({ onResume }: { onResume: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="max-w-md w-full rounded-3xl bg-gradient-to-br from-stone-100 to-stone-50 dark:from-stone-900 dark:to-stone-800 p-6 shadow-2xl border border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-400">
          <Coffee className="w-5 h-5" />
          <span className="text-[11px] uppercase tracking-widest font-semibold">
            Paper 1 done
          </span>
        </div>
        <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
          Halfway. Take a breather.
        </h2>
        <p className="text-sm text-stone-700 dark:text-stone-300 mb-2">
          You've finished the first 100 questions — exactly the structure of the
          real UKMLA AKT. Stand up, drink water, look out a window.
        </p>
        <p className="text-xs text-stone-600 dark:text-stone-400 mb-5">
          The clock keeps running, so don't take more than 10 minutes if you
          want a faithful simulation.
        </p>
        <button
          type="button"
          onClick={onResume}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
        >
          Start paper 2
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
