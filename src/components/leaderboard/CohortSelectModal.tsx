import { useState } from 'react';
import type { CohortRepository } from '@/atom/cohortRepository';
import { UK_MEDICAL_SCHOOLS } from '@/leaderboard/ukMedicalSchools';

export interface CohortSelectModalProps {
  repo: CohortRepository;
  onCohortSet: () => void;
}

/**
 * Inline form (not a literal overlay modal) shown on /leaderboard when the user
 * has no `cohort_school` set. Captures the school (closed dropdown of UK
 * medical schools — see `ukMedicalSchools.ts` for the rationale) + a display
 * name, persists via `repo.setMyCohort`. On success, fires `onCohortSet` so
 * the parent hook can refresh the leaderboard.
 */
export function CohortSelectModal({ repo, onCohortSet }: CohortSelectModalProps) {
  const [school, setSchool] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit =
    school.trim().length > 0 && displayName.trim().length > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await repo.setMyCohort(school.trim(), displayName.trim());
      onCohortSet();
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Failed to save your cohort.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4"
      aria-label="Pick your cohort"
    >
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Join your cohort</h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Pick your medical school to see how you stack up against your peers
          this week. You can use any name you like as your handle.
        </p>
      </div>

      <label className="block text-sm">
        <span className="text-stone-700 dark:text-stone-300">Medical school</span>
        <select
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          className="w-full border border-stone-300 dark:border-stone-700 rounded-lg p-2 mt-1 text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
          aria-label="Medical school"
        >
          <option value="">Select your medical school…</option>
          {UK_MEDICAL_SCHOOLS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="text-stone-700 dark:text-stone-300">Display name</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your handle (visible to your cohort)"
          className="w-full border border-stone-300 dark:border-stone-700 rounded-lg p-2 mt-1 text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
          autoComplete="off"
        />
      </label>

      {errorMessage && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className={
          'w-full px-4 py-3 rounded-lg text-sm font-medium ' +
          (canSubmit
            ? 'bg-stone-900 text-white hover:bg-stone-800'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed')
        }
      >
        {submitting ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
