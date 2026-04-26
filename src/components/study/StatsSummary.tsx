import { useEffect, useState } from 'react';
import type { UserAtomState } from '@/atom/types';
import type { UserStateRepository } from '@/atom/userStateRepository';

interface StatsSummaryProps {
  userId: string;
  repo: UserStateRepository;
  /** When `true`, render a compact 3-cell layout suited to inline display. */
  compact?: boolean;
}

interface ComputedStats {
  total: number;
  mastered: number;
  inProgress: number;
  mistakes: number;
}

/** Pure: classify each user_atom_state row into mastered / in-progress / mistakes. */
export function computeStats(rows: UserAtomState[]): ComputedStats {
  let mastered = 0;
  let inProgress = 0;
  let mistakes = 0;
  for (const r of rows) {
    if (r.lapses >= 1) {
      mistakes++;
    } else if (r.reps >= 3) {
      mastered++;
    } else if (r.reps >= 1) {
      inProgress++;
    }
  }
  return { total: rows.length, mastered, inProgress, mistakes };
}

/**
 * Tiny stats card shown above the FSRS session on /study + /mistakes so the
 * user knows their overall position in the bank — not just the 5-50 they're
 * about to drill in this session. Empty user → returns null.
 */
export function StatsSummary({ userId, repo, compact = false }: StatsSummaryProps) {
  const [stats, setStats] = useState<ComputedStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;
    repo
      .listAllForUser(userId)
      .then((rows) => {
        if (!cancelled) setStats(computeStats(rows));
      })
      .catch(() => { /* silent — non-critical chrome */ });
    return () => { cancelled = true; };
  }, [userId, repo]);

  if (!stats || stats.total === 0) return null;

  const cells: Array<{ label: string; value: number; tone: string }> = [
    {
      label: 'answered',
      value: stats.total,
      tone: 'text-stone-900 dark:text-stone-100',
    },
    {
      label: 'mastered',
      value: stats.mastered,
      tone: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      label: 'mistakes',
      value: stats.mistakes,
      tone: 'text-amber-700 dark:text-amber-400',
    },
  ];

  return (
    <div
      className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-3"
      aria-label="Your stats"
    >
      <div className={`grid ${compact ? 'grid-cols-3 gap-2' : 'grid-cols-3 gap-4'}`}>
        {cells.map((c) => (
          <div key={c.label} className="text-center">
            <div className={`text-2xl font-semibold ${c.tone}`}>{c.value}</div>
            <div className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 mt-0.5">
              {c.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
