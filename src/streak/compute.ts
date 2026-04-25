/**
 * Compute consecutive-days streak ending at today or yesterday.
 *
 * Rules (v1, no grace day):
 * - A "day" is a UTC calendar date (YYYY-MM-DD).
 * - Streak counts back from today (if today has a review) or yesterday
 *   (if today has no review yet but yesterday did) — this lets the user
 *   maintain their streak status before they've done today's session.
 * - Any gap > 1 day breaks the streak.
 * - Multiple reviews on the same day count as one day.
 *
 * Plan 7B will add Duolingo-style grace days.
 */
export function computeStreak(reviewDates: Date[], now: Date): number {
  if (reviewDates.length === 0) return 0;

  const dayKey = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD UTC

  const uniqueDays = new Set(reviewDates.map(dayKey));
  const todayKey = dayKey(now);
  const yesterday = new Date(now.getTime() - 86_400_000);
  const yesterdayKey = dayKey(yesterday);

  // Streak must end at today or yesterday.
  let cursor: string;
  if (uniqueDays.has(todayKey)) cursor = todayKey;
  else if (uniqueDays.has(yesterdayKey)) cursor = yesterdayKey;
  else return 0;

  let streak = 0;
  let cursorDate = new Date(`${cursor}T12:00:00Z`);
  while (uniqueDays.has(dayKey(cursorDate))) {
    streak += 1;
    cursorDate = new Date(cursorDate.getTime() - 86_400_000);
  }
  return streak;
}
