interface UnreviewedToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
}

/**
 * Small switch + label that lets a user opt in to AI-drafted, not-yet-
 * clinician-reviewed questions. Used on /study and /mock. The atoms it
 * unlocks all carry an inline disclaimer chip in the renderer.
 */
export function UnreviewedToggle({ value, onChange }: UnreviewedToggleProps) {
  return (
    <label
      className="flex items-start gap-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3 cursor-pointer text-left"
    >
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-stone-300 text-stone-900 accent-stone-900 focus:ring-stone-500"
        aria-label="Include AI-drafted questions that have not yet been reviewed by a doctor"
      />
      <span className="flex-1 leading-snug">
        <span className="block text-sm font-medium text-stone-900 dark:text-stone-100">
          Include AI-drafted questions
        </span>
        <span className="block text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          Unlocks the full bank but the questions haven't been reviewed by a clinician yet. Each one shows a disclaimer.
        </span>
      </span>
    </label>
  );
}
