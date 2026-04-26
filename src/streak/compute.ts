/**
 * Compute consecutive-days streak ending at today or yesterday.
 *
 * Rules:
 * - A "day" is a calendar date in the user's *local* timezone (YYYY-MM-DD).
 *   This keeps the streak intact for late-night sessions that would
 *   otherwise spill over the UTC date boundary.
 * - Streak counts back from today (if today has a review) or yesterday
 *   (if today has no review yet but yesterday did) — this lets the user
 *   maintain their streak status before they've done today's session.
 * - Up to `graceDaysPerWeek` (default 1) missed days inside any rolling
 *   7-day window are forgiven (Duolingo-style grace). The grace day is
 *   auto-redeemed; the user doesn't have to click anything.
 * - Multiple reviews on the same day count as one day.
 * - Pass `{ graceDaysPerWeek: 0 }` for the strict streak (no forgiveness).
 */
function dayKey(d: Date): string {
  // Local-timezone ISO date (YYYY-MM-DD), not UTC.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface ComputeStreakOptions {
  /** Forgiven missed days per rolling 7-day window. Default: 1 (Duolingo). */
  graceDaysPerWeek?: number;
}

export function computeStreak(
  reviewDates: Date[],
  now: Date,
  opts?: ComputeStreakOptions,
): number {
  const grace = opts?.graceDaysPerWeek ?? 1;
  if (reviewDates.length === 0) return 0;

  const uniqueDays = new Set(reviewDates.map(dayKey));
  const todayKey = dayKey(now);
  const yesterday = new Date(now.getTime() - 86_400_000);
  const yesterdayKey = dayKey(yesterday);

  // Streak must end at today or yesterday.
  let cursor: string;
  if (uniqueDays.has(todayKey)) cursor = todayKey;
  else if (uniqueDays.has(yesterdayKey)) cursor = yesterdayKey;
  else if (grace > 0) {
    // Even with grace, the most recent review must be within the grace window
    // of today. Otherwise the streak is dead and grace can't resurrect it.
    // Walk back from today up to `grace` days; if we find a review, start there.
    let foundCursor: string | null = null;
    for (let back = 2; back <= grace + 1; back++) {
      const candidate = new Date(now.getTime() - back * 86_400_000);
      if (uniqueDays.has(dayKey(candidate))) {
        foundCursor = dayKey(candidate);
        break;
      }
    }
    if (!foundCursor) return 0;
    cursor = foundCursor;
  } else {
    return 0;
  }

  // Walk back day-by-day in local time. We construct each cursor at noon
  // local to avoid DST edges accidentally landing the cursor on a wrong day.
  const [cy, cm, cd] = cursor.split('-').map(Number);
  let cursorDate = new Date(cy, cm - 1, cd, 12, 0, 0);
  let streak = 0;
  let graceLeft = grace;
  let graceWindowStart: Date | null = null;

  while (true) {
    if (uniqueDays.has(dayKey(cursorDate))) {
      streak += 1;
    } else if (graceLeft > 0) {
      // Forgiven day — open (or extend) the grace window.
      if (!graceWindowStart) graceWindowStart = new Date(cursorDate);
      streak += 1;
      graceLeft -= 1;
    } else {
      break;
    }

    const prev = new Date(cursorDate.getTime() - 86_400_000);
    // Reset grace once we step out of the rolling 7-day window in which it was used.
    if (graceWindowStart && (graceWindowStart.getTime() - prev.getTime()) > 7 * 86_400_000) {
      graceLeft = grace;
      graceWindowStart = null;
    }
    cursorDate = prev;
  }

  return streak;
}
