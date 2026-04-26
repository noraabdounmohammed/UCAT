import type { CohortLeaderboardRow } from '@/atom/cohortRepository';

export interface LeaderboardTableProps {
  rows: CohortLeaderboardRow[];
  /** The auth user's id, used to highlight their row with a "(you)" badge. */
  currentUserId: string;
}

/**
 * Compact rank table — left rank | name (with "(you)" badge for the auth user)
 * | reviews this week. Empty state is a soft, encouraging line rather than
 * silence.
 */
export function LeaderboardTable({ rows, currentUserId }: LeaderboardTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-stone-50 border border-stone-200 p-6 text-center">
        <div className="text-sm text-stone-700">No reviews yet this week.</div>
        <div className="text-xs text-stone-500 mt-1">
          Be the first — head to Study and rate a few atoms.
        </div>
      </div>
    );
  }

  return (
    <table className="w-full text-sm" aria-label="Cohort leaderboard">
      <thead>
        <tr className="text-xs text-stone-500 text-left">
          <th className="py-2 px-2 w-10">#</th>
          <th className="py-2 px-2">Name</th>
          <th className="py-2 px-2 text-right w-20">Reviews</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const rank = i + 1;
          const isYou = r.userId === currentUserId;
          return (
            <tr
              key={r.userId}
              data-rank={rank}
              className={
                'border-t border-stone-100 ' +
                (isYou ? 'bg-amber-50' : '')
              }
            >
              <td className="py-2 px-2 text-stone-500 font-medium">{rank}</td>
              <td className="py-2 px-2 text-stone-900">
                <span>{r.displayName}</span>
                {isYou && (
                  <span className="ml-1 text-xs text-amber-700 font-medium">
                    (you)
                  </span>
                )}
              </td>
              <td className="py-2 px-2 text-right tabular-nums text-stone-900">
                {r.reviewsThisWeek}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
