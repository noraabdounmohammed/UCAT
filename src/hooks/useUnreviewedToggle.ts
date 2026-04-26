import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'studyedit:include-unreviewed-ai-drafts';

function readInitial(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Persisted opt-in for "include AI-drafted, not-yet-reviewed questions".
 * Value lives in `localStorage` so it survives across pages without a global
 * store. Storage failures (private mode, quota) silently fall back to false.
 */
export function useUnreviewedToggle(): {
  value: boolean;
  setValue: (next: boolean) => void;
} {
  const [value, setLocal] = useState<boolean>(readInitial);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore — storage failure must not break the flow.
    }
  }, [value]);

  const setValue = useCallback((next: boolean) => setLocal(next), []);

  return { value, setValue };
}
