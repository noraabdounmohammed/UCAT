import { describe, it, expect } from 'vitest';
import { parseNumeric } from '@/components/study/CalcRenderer';

describe('parseNumeric', () => {
  it('parses bare integers', () => {
    expect(parseNumeric('5')).toBe(5);
    expect(parseNumeric('1500')).toBe(1500);
    expect(parseNumeric('0')).toBe(0);
  });

  it('parses decimals (incl. leading-dot form)', () => {
    expect(parseNumeric('5.5')).toBe(5.5);
    expect(parseNumeric('.5')).toBe(0.5);
    expect(parseNumeric('30.0')).toBe(30);
  });

  it('parses negatives', () => {
    expect(parseNumeric('-5')).toBe(-5);
    expect(parseNumeric('-0.5')).toBe(-0.5);
  });

  it('strips thousand separators', () => {
    expect(parseNumeric('1,500')).toBe(1500);
    expect(parseNumeric('1,000,000')).toBe(1000000);
  });

  it('accepts a number followed by a unit', () => {
    expect(parseNumeric('5 mg')).toBe(5);
    expect(parseNumeric('1500 ml')).toBe(1500);
    expect(parseNumeric('5.5 mg/kg')).toBe(5.5);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseNumeric('  5  ')).toBe(5);
    expect(parseNumeric('\t1500\n')).toBe(1500);
  });

  it('rejects empty or non-numeric input', () => {
    expect(parseNumeric('')).toBeNull();
    expect(parseNumeric('   ')).toBeNull();
    expect(parseNumeric('mg')).toBeNull();
    expect(parseNumeric('abc')).toBeNull();
  });

  it('rejects multi-number expressions (no "5 to 10")', () => {
    expect(parseNumeric('5 to 10')).toBeNull();
    expect(parseNumeric('between 5 and 10')).toBeNull();
    expect(parseNumeric('5 mg + 10 mg')).toBeNull();
    expect(parseNumeric('5/10')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(parseNumeric(null as unknown as string)).toBeNull();
    expect(parseNumeric(undefined as unknown as string)).toBeNull();
    expect(parseNumeric(5 as unknown as string)).toBeNull();
  });
});
