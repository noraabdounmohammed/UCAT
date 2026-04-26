import { useEffect, useState } from 'react';
import type { UserStateRepository, ReviewEventStats } from '@/atom/userStateRepository';

interface StatsSummaryProps {
  userId: string;
  repo: UserStateRepository;
}

/**
 * Lifetime "you've answered N questions, got M wrong" counter shown above
 * the FSRS session on /study + /mistakes.
 *
 * **Counts every attempt, not unique atoms.** Earlier version counted
 * unique `user_atom_state` rows (which UPSERT, so collapsed repeats).
 * The user reported 15 attempts but seeing "5 ANSWERED" — confusing.
 * This version reads `review_events` and shows real attempt counts that
 * match the user's mental model ("every Next click counts").
 *
 * Renders nothing until the user has at least one attempt.
 */
export function StatsSummary({ userId, repo }: StatsSummaryProps) {
  const [stats, setStats] = useState<ReviewEventStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;
    repo
      .getReviewEventStats(userId)
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => { /* silent — non-critical chrome */ });
    return () => { cancelled = true; };
  }, [userId, repo]);

  if (!stats || stats.totalAttempts === 0) return null;

  const correctRate = Math.round((stats.correctAttempts / stats.totalAttempts) * 100);

  const cells: Array<{ label: string; value: string; tone: string }> = [
    {
      label: 'attempts',
      value: String(stats.totalAttempts),
      tone: 'text-stone-900 dark:text-stone-100',
    },
    {
      label: 'correct',
      value: String(stats.correctAttempts),
      tone: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      label: 'wrong',
      value: String(stats.wrongAttempts),
      tone: 'text-amber-700 dark:text-amber-400',
    },
  ];

  return (
    <div
      className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-3"
      aria-label="Your stats"
      title={`${correctRate}% correct across ${stats.totalAttempts} lifetime attempts`}
    >
      <div className="grid grid-cols-3 gap-4">
        {cells.map((c) => (
          <div key={c.label} className="text-center">
            <div className={`text-2xl font-semibold ${c.tone}`}>{c.value}</div>
            <div className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 mt-0.5">
              {c.label}
            </div>
          </div>
        ))}
      </div>
      <div className="text-center text-[11px] text-stone-500 dark:text-stone-400 mt-2">
        {correctRate}% correct overall
      </div>
    </div>
  );
}
