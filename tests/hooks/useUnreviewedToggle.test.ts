import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUnreviewedToggle } from '@/hooks/useUnreviewedToggle';

const KEY = 'studyedit:include-unreviewed-ai-drafts';

describe('useUnreviewedToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to false when storage is empty', () => {
    const { result } = renderHook(() => useUnreviewedToggle());
    expect(result.current.value).toBe(false);
  });

  it('reads true from storage on init', () => {
    localStorage.setItem(KEY, 'true');
    const { result } = renderHook(() => useUnreviewedToggle());
    expect(result.current.value).toBe(true);
  });

  it('persists changes to localStorage', () => {
    const { result } = renderHook(() => useUnreviewedToggle());
    act(() => result.current.setValue(true));
    expect(result.current.value).toBe(true);
    expect(localStorage.getItem(KEY)).toBe('true');

    act(() => result.current.setValue(false));
    expect(result.current.value).toBe(false);
    expect(localStorage.getItem(KEY)).toBe('false');
  });
});
