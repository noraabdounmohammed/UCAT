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
 * Reserve at least this many slots in every session for "fresh-variety" atoms
 * (calc / EMQ / case-bound) the user has never seen. Without this, returning
 * users with a long FSRS-due queue would never encounter newly-added content
 * kinds — they'd see only the old SBA cards they already have due.
 *
 * 2 of every 5-atom session = 40 % new variety; 60 % spaced repetition. This
 * trades a small dose of FSRS adherence for actually surfacing new content.
 */
const VARIETY_SLOTS = 2;

/**
 * Builds the FSRS session queue with three phases:
 *
 *   1. Variety reserve — pull up to VARIETY_SLOTS unseen atoms with
 *      question_kind in (calc, emq) OR case_id IS NOT NULL. Ensures every
 *      session has a taste of the newer formats even when the user has a
 *      backlog of due SBA cards.
 *
 *   2. FSRS-due rows from `user_atom_state` (spaced repetition).
 *
 *   3. If short, top up with brand-new unseen atoms of any kind.
 *
 * Variety + fresh atoms come back from the `next_unseen_atoms_for_user`
 * Postgres RPC, which does the user_atom_state anti-join server-side. No
 * client-side excludeAtomIds list (was capped at 200, risked overwriting
 * existing FSRS state for power users) and no listSeenAtomIds round-trip
 * (was unbounded).
 *
 * Variety + fresh atoms returned as pristine UserAtomState rows;
 * useFsrsSession seeds them via the FSRS scheduler on first attempt.
 */
export async function buildStudyQueue(deps: BuildQueueDeps): Promise<UserAtomState[]> {
  // Phase 1: variety reserve.
  const varietyTarget = Math.min(VARIETY_SLOTS, Math.max(0, deps.maxAtoms - 1));
  const varietyPool = varietyTarget > 0
    ? await deps.atomRepo.listVarietyForExam({
        exam: deps.exam,
        includeUnreviewedAiDrafts: deps.includeUnreviewed,
        limit: varietyTarget,
      })
    : [];
  const varietyPristine: UserAtomState[] = varietyPool.map(a =>
    atomToPristineState(deps.userId, a, deps.asOf),
  );

  // Phase 2: FSRS-due rows for the remaining slots.
  const dueBudget = deps.maxAtoms - varietyPristine.length;
  const dueRows = dueBudget > 0
    ? await deps.userStateRepo.listDueForUser(deps.userId, deps.asOf, dueBudget)
    : [];

  // Phase 3: top up with any brand-new atoms if we're still short. Server
  // already excludes anything in user_atom_state via the RPC's NOT EXISTS,
  // so dueRows can't appear here. Variety atoms haven't been written to
  // user_atom_state yet (they're fresh-pristine), so the fresh RPC may
  // include them — we dedupe client-side at the end.
  const remainingSlots = deps.maxAtoms - varietyPristine.length - dueRows.length;
  const fresh = remainingSlots > 0
    ? await deps.atomRepo.listFreshUnseenForExam({
        exam: deps.exam,
        includeUnreviewedAiDrafts: deps.includeUnreviewed,
        // Over-fetch a small buffer to absorb any variety-overlap dedupe.
        limit: remainingSlots + varietyPristine.length,
      })
    : [];
  const varietyIds = new Set(varietyPristine.map(v => v.atomId));
  const freshPristine: UserAtomState[] = fresh
    .filter(a => !varietyIds.has(a.id))
    .slice(0, remainingSlots)
    .map(a => atomToPristineState(deps.userId, a, deps.asOf));

  // Interleave variety atoms across the queue — early-positioned, not buried
  // at the end. Final slice enforces maxAtoms as a defensive hard cap.
  return interleaveVariety([...dueRows, ...freshPristine], varietyPristine)
    .slice(0, deps.maxAtoms);
}

/**
 * Interleave variety atoms across the queue so they don't all bunch at the
 * front or back. Drops variety into every Nth slot.
 */
function interleaveVariety(
  base: UserAtomState[],
  variety: UserAtomState[],
): UserAtomState[] {
  if (variety.length === 0) return base;
  if (base.length === 0) return variety;
  const out: UserAtomState[] = [];
  const total = base.length + variety.length;
  const step = Math.max(1, Math.floor(total / variety.length));
  let bi = 0;
  let vi = 0;
  for (let i = 0; i < total; i++) {
    // Drop a variety atom every `step` positions; otherwise base.
    const wantVariety = vi < variety.length && (i % step === 0);
    if (wantVariety && vi < variety.length) {
      out.push(variety[vi++]);
    } else if (bi < base.length) {
      out.push(base[bi++]);
    } else if (vi < variety.length) {
      out.push(variety[vi++]);
    }
  }
  return out;
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
