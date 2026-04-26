import { useState } from 'react';

export interface NpsPromptProps {
  onSubmit: (payload: { score: number; comment: string }) => void;
  onDismiss: () => void;
  /** Optional headline override — defaults to the standard NPS prompt copy. */
  headline?: string;
}

/**
 * Mobile-first NPS card. Renders 11 score buttons (0-10), an optional comment
 * textarea, and Submit + "Not now" actions. The parent owns persistence and
 * the "shown once per device" gate.
 */
export function NpsPrompt({ onSubmit, onDismiss, headline }: NpsPromptProps) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  const submitDisabled = score === null;

  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-6 max-w-md mx-auto space-y-4">
      <div className="text-base font-semibold text-stone-900">
        {headline ?? 'How likely are you to recommend this app to a friend?'}
      </div>
      <p className="text-xs text-stone-500">0 = Not at all likely, 10 = Extremely likely</p>

      <div
        role="group"
        aria-label="NPS score"
        className="grid grid-cols-11 gap-1"
      >
        {Array.from({ length: 11 }, (_, i) => i).map(n => {
          const selected = score === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              onClick={() => setScore(n)}
              className={
                'h-9 rounded-md text-sm font-medium border transition-colors ' +
                (selected
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50')
              }
            >
              {n}
            </button>
          );
        })}
      </div>

      <label className="block">
        <span className="text-xs text-stone-600">
          Anything specific that drove that score? (optional)
        </span>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-stone-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          placeholder="What stood out, good or bad?"
        />
      </label>

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          Not now
        </button>
        <button
          type="button"
          disabled={submitDisabled}
          onClick={() => {
            if (score === null) return;
            onSubmit({ score, comment });
          }}
          className={
            'px-4 py-2 rounded-lg text-sm font-medium ' +
            (submitDisabled
              ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
              : 'bg-stone-900 text-white hover:bg-stone-800')
          }
        >
          Submit
        </button>
      </div>
    </div>
  );
}
