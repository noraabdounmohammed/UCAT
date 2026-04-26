export interface SessionState {
  /** atom IDs in due-queue order */
  atomIds: string[];
  /** atoms already rated this session, in order */
  ratedAtomIds: string[];
  /** the cap (default 5-7 for the 3-min session) */
  maxAtoms: number;
}

export function pickNextAtomId(state: SessionState): string | null {
  if (state.ratedAtomIds.length >= state.maxAtoms) return null;
  for (const id of state.atomIds) {
    if (!state.ratedAtomIds.includes(id)) return id;
  }
  return null;
}

export function isSessionDone(state: SessionState): boolean {
  return pickNextAtomId(state) === null;
}
