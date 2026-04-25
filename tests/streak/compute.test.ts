import { describe, it, expect } from 'vitest';
import { computeStreak } from '@/streak/compute';

// Mid-day local clock — never crosses a day boundary in any timezone.
const TODAY = new Date(2026, 3, 25, 10, 0, 0); // 2026-04-25 10:00 local

function localDate(yyyy_mm_dd: string): Date {
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // local noon — never crosses a day boundary
}

describe('computeStreak', () => {
  it('returns 0 for empty review history', () => {
    expect(computeStreak([], TODAY)).toBe(0);
  });

  it('returns 1 if user reviewed today only', () => {
    expect(computeStreak([localDate('2026-04-25')], TODAY)).toBe(1);
  });

  it('returns 3 for three consecutive days ending today', () => {
    const dates = [localDate('2026-04-23'), localDate('2026-04-24'), localDate('2026-04-25')];
    expect(computeStreak(dates, TODAY)).toBe(3);
  });

  it('returns 2 for two consecutive days ending yesterday (gap of 0 to today is acceptable)', () => {
    const dates = [localDate('2026-04-23'), localDate('2026-04-24')];
    expect(computeStreak(dates, TODAY)).toBe(2);
  });

  it('returns 0 if last review was more than 1 day ago', () => {
    const dates = [localDate('2026-04-22'), localDate('2026-04-23')];
    expect(computeStreak(dates, TODAY)).toBe(0);
  });

  it('handles multiple reviews per day as a single day', () => {
    const dates = [
      new Date(2026, 3, 25, 8, 0, 0),
      new Date(2026, 3, 25, 14, 0, 0),
      new Date(2026, 3, 24, 16, 0, 0),
    ];
    expect(computeStreak(dates, TODAY)).toBe(2);
  });

  it('breaks streak on a gap', () => {
    const dates = [
      localDate('2026-04-20'),
      localDate('2026-04-22'), // gap on 21st
      localDate('2026-04-23'),
      localDate('2026-04-24'),
      localDate('2026-04-25'),
    ];
    expect(computeStreak(dates, TODAY)).toBe(4); // 22-25 = 4 consecutive ending today
  });
});
