import { describe, it, expect } from 'vitest';
import { computeStreak } from '@/streak/compute';

const TODAY = new Date('2026-04-25T10:00:00Z');

function utcDate(yyyy_mm_dd: string): Date {
  return new Date(`${yyyy_mm_dd}T12:00:00Z`); // mid-day UTC
}

describe('computeStreak', () => {
  it('returns 0 for empty review history', () => {
    expect(computeStreak([], TODAY)).toBe(0);
  });

  it('returns 1 if user reviewed today only', () => {
    expect(computeStreak([utcDate('2026-04-25')], TODAY)).toBe(1);
  });

  it('returns 3 for three consecutive days ending today', () => {
    const dates = [utcDate('2026-04-23'), utcDate('2026-04-24'), utcDate('2026-04-25')];
    expect(computeStreak(dates, TODAY)).toBe(3);
  });

  it('returns 2 for two consecutive days ending yesterday (gap of 0 to today is acceptable)', () => {
    const dates = [utcDate('2026-04-23'), utcDate('2026-04-24')];
    expect(computeStreak(dates, TODAY)).toBe(2);
  });

  it('returns 0 if last review was more than 1 day ago', () => {
    const dates = [utcDate('2026-04-22'), utcDate('2026-04-23')];
    expect(computeStreak(dates, TODAY)).toBe(0);
  });

  it('handles multiple reviews per day as a single day', () => {
    const dates = [
      new Date('2026-04-25T08:00:00Z'),
      new Date('2026-04-25T14:00:00Z'),
      new Date('2026-04-24T16:00:00Z'),
    ];
    expect(computeStreak(dates, TODAY)).toBe(2);
  });

  it('breaks streak on a gap', () => {
    const dates = [
      utcDate('2026-04-20'),
      utcDate('2026-04-22'), // gap on 21st
      utcDate('2026-04-23'),
      utcDate('2026-04-24'),
      utcDate('2026-04-25'),
    ];
    expect(computeStreak(dates, TODAY)).toBe(4); // 22-25 = 4 consecutive ending today
  });
});
