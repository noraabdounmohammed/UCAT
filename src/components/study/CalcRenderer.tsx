import { useRef, useState } from 'react';
import type { Atom } from '@/atom/types';
import { UnreviewedAtomChip } from './UnreviewedAtomChip';
import type { AtomRated } from './AtomRenderer';

/**
 * DRUG CALCULATION renderer.
 *
 * For atoms with `question_kind='calc'` where the answer is numeric (or
 * a number with a unit). Shows a number-input field and accepts an
 * answer if within ±5% of the expected value (tolerates the
 * float-precision miss + minor rounding).
 *
 * Answer parsing is forgiving:
 *   "5 mg" → 5
 *   "5.5 mg/kg" → 5.5
 *   "1500 ml" → 1500
 *   ".5" → 0.5
 *
 * Same FSRS rating contract: correct → 3, wrong → 1, Easy → 4.
 */
const TOLERANCE = 0.05; // ±5%

/**
 * Parse a single numeric value from user input. Accepts:
 *   "5", "5.5", "0.5", ".5", "1500", "1,500"
 *   "5 mg", "1500 ml", "5.5 mg/kg"  ← number + trailing unit
 *   "  5 "                          ← surrounding whitespace
 *
 * Rejects multi-number expressions (we want the user to commit to one
 * answer, not "5 to 10"):
 *   "5 to 10" → null
 *   "between 5 and 10" → null
 *   "5 mg + 10 mg" → null
 *
 * Used for both user input and the canonical answer string. The
 * canonical answer should always be a single number (we store
 * '180', not '180 mg'), so this strictness doesn't bite us.
 */
export function parseNumeric(raw: string): number | null {
  if (typeof raw !== 'string') return null;
  // Strip thousand separators + leading/trailing whitespace.
  const cleaned = raw.replace(/,/g, '').trim();
  if (cleaned.length === 0) return null;
  // Match number at the start (optionally followed by a unit), OR a number
  // surrounded only by whitespace. Rejects strings with multiple numbers.
  const all = cleaned.match(/-?\d+(?:\.\d+)?|\.\d+/g);
  if (!all || all.length !== 1) return null;
  const n = parseFloat(all[0]);
  return Number.isFinite(n) ? n : null;
}

export function CalcRenderer({ atom, onRated }: { atom: Atom; onRated: (r: AtomRated) => void }) {
  const startedAt = useRef(performance.now());
  const [typed, setTyped] = useState('');
  const [submitted, setSubmitted] = useState<{ correct: boolean } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted) return;
    const userN = parseNumeric(typed);
    const expectedN = parseNumeric(atom.answer);
    if (userN === null || expectedN === null) {
      setSubmitted({ correct: false });
      return;
    }
    // ±5% tolerance, with absolute floor of 0.01 for very small answers.
    const tol = Math.max(Math.abs(expectedN * TOLERANCE), 0.01);
    setSubmitted({ correct: Math.abs(userN - expectedN) <= tol });
  };

  const advance = (override?: 'easy') => {
    if (!submitted) return;
    const responseMs = Math.round(performance.now() - startedAt.current);
    if (override === 'easy') {
      onRated({ rating: 4, confidence: 4, responseMs });
      return;
    }
    if (submitted.correct) {
      onRated({ rating: 3, confidence: 3, responseMs });
    } else {
      onRated({ rating: 1, confidence: 1, responseMs });
    }
  };

  return (
    <div className="space-y-4">
      <UnreviewedAtomChip atom={atom} />
      <div className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400">
        Drug calculation
      </div>
      <h2 className="text-lg font-medium text-stone-900 dark:text-stone-100">
        {atom.canonicalStem}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          inputMode="decimal"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={!!submitted}
          placeholder="Type your number…"
          autoFocus
          autoComplete="off"
          className={[
            'w-full px-4 py-3 rounded-lg border text-sm bg-white dark:bg-stone-900',
            'text-stone-900 dark:text-stone-100 placeholder-stone-400',
            'focus:outline-none focus:ring-2 focus:ring-stone-500',
            submitted?.correct
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
              : submitted && !submitted.correct
                ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                : 'border-stone-300 dark:border-stone-700',
          ].join(' ')}
          aria-label="Your numeric answer"
        />
        {!submitted && (
          <button
            type="submit"
            disabled={typed.trim().length === 0}
            className="w-full px-4 py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50"
          >
            Submit
          </button>
        )}
      </form>

      {submitted && (
        <div className="space-y-3 pt-1">
          <div className="rounded-lg bg-stone-50 dark:bg-stone-900 p-3 border border-stone-200 dark:border-stone-800">
            <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-1">
              {submitted.correct ? 'Correct' : 'Not quite'}
            </div>
            <div className="font-medium text-stone-900 dark:text-stone-100">
              {atom.answer}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              ±5 % tolerance accepted
            </div>
            {atom.explanation && (
              <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                <div className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-1">
                  Why
                </div>
                <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
                  {atom.explanation}
                </p>
                {atom.explanationSource && (
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-2 italic">
                    Paraphrased from {atom.explanationSource}
                  </div>
                )}
              </div>
            )}
            <a
              href={atom.citationUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-stone-600 dark:text-stone-400 hover:underline mt-2 inline-block"
            >
              Source: {atom.citationLabel} →
            </a>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => advance()}
              className="flex-1 px-4 py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200"
            >
              Next question
            </button>
            {submitted.correct && (
              <button
                type="button"
                onClick={() => advance('easy')}
                className="px-4 py-3 rounded-full border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                Easy
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
