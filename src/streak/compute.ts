/**
 * Compute consecutive-days streak ending at today or yesterday.
 *
 * Rules (v1, no grace day):
 * - A "day" is a calendar date in the user's *local* timezone (YYYY-MM-DD).
 *   This keeps the streak intact for late-night sessions that would
 *   otherwise spill over the UTC date boundary.
 * - Streak counts back from today (if today has a review) or yesterday
 *   (if today has no review yet but yesterday did) — this lets the user
 *   maintain their streak status before they've done today's session.
 * - Any gap > 1 day breaks the streak.
 * - Multiple reviews on the same day count as one day.
 *
 * Plan 7B will add Duolingo-style grace days.
 */
function dayKey(d: Date): string {
  // Local-timezone ISO date (YYYY-MM-DD), not UTC.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeStreak(reviewDates: Date[], now: Date): number {
  if (reviewDates.length === 0) return 0;

  const uniqueDays = new Set(reviewDates.map(dayKey));
  const todayKey = dayKey(now);
  const yesterday = new Date(now.getTime() - 86_400_000);
  const yesterdayKey = dayKey(yesterday);

  // Streak must end at today or yesterday.
  let cursor: string;
  if (uniqueDays.has(todayKey)) cursor = todayKey;
  else if (uniqueDays.has(yesterdayKey)) cursor = yesterdayKey;
  else return 0;

  // Walk back day-by-day in local time. We construct each cursor at noon
  // local to avoid DST edges accidentally landing the cursor on a wrong day.
  const [cy, cm, cd] = cursor.split('-').map(Number);
  let cursorDate = new Date(cy, cm - 1, cd, 12, 0, 0);
  let streak = 0;
  while (uniqueDays.has(dayKey(cursorDate))) {
    streak += 1;
    cursorDate = new Date(cursorDate.getTime() - 86_400_000);
  }
  return streak;
}
