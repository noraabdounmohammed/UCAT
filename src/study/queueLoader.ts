import type { Atom, Exam, QuestionKind, UserAtomState } from '@/atom/types';
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
  /**
   * Filter to a single top-level topic (e.g. "cardiology") — matches
   * lowercased `topic_path[0]`. When set, the variety/due/fresh dance is
   * skipped: every atom in the session matches the filter.
   */
  filterTopic?: string;
  /**
   * Filter to a single question kind. The virtual value `'case'` means
   * "any atom attached to a clinical case", regardless of its kind.
   */
  filterKind?: QuestionKind | 'case';
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
  // Filtered drilling: when the user explicitly picks a topic or format,
  // skip the variety/due dance. Pull the largest reasonable pool of unseen
  // matching atoms, take the first maxAtoms. Repeats only if they exhaust
  // the unseen pool — that's a real signal they've covered the filter.
  if (deps.filterTopic || deps.filterKind) {
    return buildFilteredQueue(deps);
  }

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

/**
 * Map a user-facing topic key (the dashboard chip) to the set of
 * `topic_path[0]` values it should match in the bank. Keys are
 * lowercase. Most topics map to themselves, but a few have synonyms
 * because the seed scripts used different labels for related concepts.
 */
const TOPIC_SYNONYMS: Record<string, string[]> = {
  cardiology:       ['cardiology', 'cardiovascular'],
  cardiovascular:   ['cardiology', 'cardiovascular'],
  endocrinology:    ['endocrinology'],
  respiratory:      ['respiratory'],
  gastroenterology: ['gastroenterology'],
  renal:            ['renal'],
  neurology:        ['neurology'],
  haematology:      ['haematology'],
  paediatrics:      ['paediatrics'],
  obstetrics:       ['obstetrics'],
  psychiatry:       ['psychiatry'],
  infection:        ['infection', 'immunology'],     // anaphylaxis lives in Immunology
  surgery:          ['surgery', 'orthopaedics'],     // surgical sub-specialties together
  dermatology:      ['dermatology'],
  orthopaedics:     ['orthopaedics'],
  immunology:       ['immunology'],
  calculations:     ['calculations'],
};

function topicMatches(filterKey: string, topicPath0: string): boolean {
  const synonyms = TOPIC_SYNONYMS[filterKey] ?? [filterKey];
  return synonyms.includes(topicPath0.toLowerCase());
}

/**
 * Filtered drill: pull a generous pool of unseen atoms via the RPC, filter
 * client-side by topic / kind, take the first maxAtoms.
 *
 * Topic match is case-insensitive AND honors a synonym map so e.g. clicking
 * "Cardiology" returns atoms tagged either "Cardiology" or "Cardiovascular"
 * (the older EMQ seed used the latter label).
 *
 * Bypasses variety reservation — if the user explicitly chose "calc only"
 * we don't dilute it with EMQs/cases. Bypasses FSRS-due — picking a topic
 * is a deliberate study choice, not a spaced-repetition session.
 */
async function buildFilteredQueue(deps: BuildQueueDeps): Promise<UserAtomState[]> {
  const POOL_LIMIT = 200; // covers the largest filter (topic with the most atoms)
  const fresh = await deps.atomRepo.listFreshUnseenForExam({
    exam: deps.exam,
    includeUnreviewedAiDrafts: deps.includeUnreviewed,
    limit: POOL_LIMIT,
  });

  const topic = deps.filterTopic?.toLowerCase();
  const kind = deps.filterKind;
  const matched = fresh.filter(a => {
    if (topic) {
      const t0 = (a.topicPath?.[0] ?? '');
      if (!topicMatches(topic, t0)) return false;
    }
    if (kind) {
      if (kind === 'case') {
        if (!a.caseId) return false;
      } else {
        const k = a.questionKind ?? 'sba';
        if (k !== kind) return false;
      }
    }
    return true;
  });

  return matched
    .slice(0, deps.maxAtoms)
    .map(a => atomToPristineState(deps.userId, a, deps.asOf));
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
