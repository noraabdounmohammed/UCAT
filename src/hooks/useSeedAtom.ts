import { useState } from 'react';
import type { DraftAtomInput, SeedRepository } from '@/atom/seedRepository';

export interface UseSeedAtomDeps {
  repo: SeedRepository;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export interface UseSeedAtomResult {
  status: Status;
  lastAtomId: string | null;
  errorMessage: string | null;
  submit: (input: DraftAtomInput) => Promise<void>;
  reset: () => void;
}

export function useSeedAtom(deps: UseSeedAtomDeps): UseSeedAtomResult {
  const [status, setStatus] = useState<Status>('idle');
  const [lastAtomId, setLastAtomId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (input: DraftAtomInput) => {
    setStatus('submitting');
    setErrorMessage(null);
    try {
      const { id } = await deps.repo.createDraftAtom(input);
      setLastAtomId(id);
      setStatus('success');
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Failed to create atom');
      setLastAtomId(null);
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setLastAtomId(null);
    setErrorMessage(null);
  };

  return { status, lastAtomId, errorMessage, submit, reset };
}
