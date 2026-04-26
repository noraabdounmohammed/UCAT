import { describe, it, expect } from 'vitest';
import { computeStreak } from '@/streak/compute';

// Mid-day local clock — never crosses a day boundary in any timezone.
const TODAY = new Date(2026, 3, 25, 10, 0, 0); // 2026-04-25 10:00 local

function localDate(yyyy_mm_dd: string): Date {
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // local noon — never crosses a day boundary
}

const STRICT = { graceDaysPerWeek: 0 } as const;

describe('computeStreak', () => {
  it('returns 0 for empty review history', () => {
    expect(computeStreak([], TODAY)).toBe(0);
  });

  // ---- strict-mode tests (graceDaysPerWeek: 0) preserve the v1 semantics ----

  it('strict: returns 1 if user reviewed today only', () => {
    expect(computeStreak([localDate('2026-04-25')], TODAY, STRICT)).toBe(1);
  });

  it('strict: returns 3 for three consecutive days ending today', () => {
    const dates = [localDate('2026-04-23'), localDate('2026-04-24'), localDate('2026-04-25')];
    expect(computeStreak(dates, TODAY, STRICT)).toBe(3);
  });

  it('strict: returns 2 for two consecutive days ending yesterday', () => {
    const dates = [localDate('2026-04-23'), localDate('2026-04-24')];
    expect(computeStreak(dates, TODAY, STRICT)).toBe(2);
  });

  it('strict: returns 0 if last review was more than 1 day ago', () => {
    const dates = [localDate('2026-04-22'), localDate('2026-04-23')];
    expect(computeStreak(dates, TODAY, STRICT)).toBe(0);
  });

  it('strict: handles multiple reviews per day as a single day', () => {
    const dates = [
      new Date(2026, 3, 25, 8, 0, 0),
      new Date(2026, 3, 25, 14, 0, 0),
      new Date(2026, 3, 24, 16, 0, 0),
    ];
    expect(computeStreak(dates, TODAY, STRICT)).toBe(2);
  });

  it('strict: breaks streak on a gap', () => {
    const dates = [
      localDate('2026-04-20'),
      localDate('2026-04-22'), // gap on 21st
      localDate('2026-04-23'),
      localDate('2026-04-24'),
      localDate('2026-04-25'),
    ];
    expect(computeStreak(dates, TODAY, STRICT)).toBe(4); // 22-25 = 4 consecutive ending today
  });

  // ---- grace-day tests (default graceDaysPerWeek=1, Duolingo style) ----

  it('with grace=1, missing one day in a long run still counts as streak', () => {
    // Reviewed Apr 19, 20, 21, 22 (gap on 23), 24, 25.
    // Strict would return 2 (Apr 24 + Apr 25). Grace forgives Apr 23 and resumes back through Apr 19.
    const dates = [
      localDate('2026-04-19'),
      localDate('2026-04-20'),
      localDate('2026-04-21'),
      localDate('2026-04-22'),
      // gap on Apr 23 — forgiven
      localDate('2026-04-24'),
      localDate('2026-04-25'),
    ];
    expect(computeStreak(dates, TODAY)).toBe(7); // 6 review days + 1 forgiven
  });

  it('with grace=1, missing two days inside the same week breaks the streak', () => {
    // Apr 19, 20, 21 (gap Apr 22), 23 (gap Apr 24), 25 — two gaps in 7-day window.
    const dates = [
      localDate('2026-04-19'),
      localDate('2026-04-20'),
      localDate('2026-04-21'),
      // gap Apr 22 — forgiven
      localDate('2026-04-23'),
      // gap Apr 24 — NO grace left in window
      localDate('2026-04-25'),
    ];
    // From cursor=Apr 25: streak=1. Apr 24 missing → grace consumed, streak=2.
    // Apr 23 has review → streak=3. Apr 22 missing, grace exhausted in window → break.
    expect(computeStreak(dates, TODAY)).toBe(3);
  });

  it('grace=0 falls back to strict behaviour', () => {
    // Same input as the grace=1 test above; with grace=0 the gap on Apr 23 ends the run.
    const dates = [
      localDate('2026-04-19'),
      localDate('2026-04-20'),
      localDate('2026-04-21'),
      localDate('2026-04-22'),
      localDate('2026-04-24'),
      localDate('2026-04-25'),
    ];
    expect(computeStreak(dates, TODAY, { graceDaysPerWeek: 0 })).toBe(2); // Apr 24 + 25 only
  });

  it('with default grace, today missing but yesterday present still counts as streak', () => {
    // Today no review; yesterday has one. Grace allows starting from yesterday (existing v1 behaviour).
    const dates = [localDate('2026-04-23'), localDate('2026-04-24')];
    expect(computeStreak(dates, TODAY)).toBe(3); // Apr 24, Apr 23, plus 1 grace forgiveness back
  });
});
