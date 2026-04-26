import type { Atom, Exam, UserAtomState } from '@/atom/types';
import type { AtomRepository } from '@/atom/repository';
import type { UserStateRepository } from '@/atom/userStateRepository';

export interface BuildQueueDeps {
  userId: string;
  exam: Exam;
  asOf: Date;
  maxAtoms: number;
  /**
   * When true, include atoms with `status = 'pending_review'` AND
   * `source_type = 'ai-draft'` in the top-up phase. The AtomRenderer is
   * responsible for showing a "not yet clinician-reviewed" disclaimer for
   * any returned atom whose `status !== 'approved'`.
   */
  includeUnreviewed: boolean;
  atomRepo: AtomRepository;
  userStateRepo: UserStateRepository;
}

/**
 * Builds the FSRS session queue, optionally topping up with unseen atoms when
 * the user's `user_atom_state`-driven due list is short of `maxAtoms`.
 *
 * Two phases:
 *   1. Existing due rows from `user_atom_state` (FSRS-scheduled review).
 *   2. If short of `maxAtoms`, top up with brand-new atoms from the `atoms`
 *      table that the user has never seen, returned as pristine
 *      `UserAtomState` rows (`reps=0, lastReviewAt=null`). `useFsrsSession`'s
 *      isPristine branch then seeds them via the FSRS scheduler.
 *
 * This is the seam that lets a brand-new user (no history) actually start
 * studying, and lets returning users see new atoms once their existing queue
 * is exhausted. It also propagates the unreviewed-AI-draft opt-in.
 */
export async function buildStudyQueue(deps: BuildQueueDeps): Promise<UserAtomState[]> {
  const dueRows = await deps.userStateRepo.listDueForUser(deps.userId, deps.asOf, deps.maxAtoms);
  if (dueRows.length >= deps.maxAtoms) return dueRows;

  const remainingSlots = deps.maxAtoms - dueRows.length;
  const seenIds = dueRows.map(r => r.atomId);

  const fresh = await deps.atomRepo.listAvailableForExam(deps.exam, {
    includeUnreviewedAiDrafts: deps.includeUnreviewed,
    excludeAtomIds: seenIds,
    limit: remainingSlots,
  });

  const pristine: UserAtomState[] = fresh.map(a => atomToPristineState(deps.userId, a, deps.asOf));
  return [...dueRows, ...pristine];
}

function atomToPristineState(userId: string, atom: Atom, asOf: Date): UserAtomState {
  return {
    userId,
    atomId: atom.id,
    stability: 0,
    difficulty: 0,
    dueAt: asOf.toISOString(),
    lastReviewAt: null,
    reps: 0,
    lapses: 0,
  };
}
