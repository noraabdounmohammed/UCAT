const LEGACY_CURRICULUM_ID = 'default';
const UKMLA_SCOPE = 'ukmla-akt';

const CURRICULUM_KEY_SUFFIXES = [
  'user_concepts',
  'seen_question_ids',
  'practice_sessions_history',
  'custom_filters',
  'filter_categories',
  'filter_assignments',
  'deleted_concepts',
  'concept-practice-store',
  'filter_migrated_v2',
] as const;

export function getUserCurriculumId(userId?: string | null) {
  return userId ? `${UKMLA_SCOPE}-${userId}` : LEGACY_CURRICULUM_ID;
}

/**
 * Before launch, StudyEdit stored concept progress under the shared `default_*`
 * localStorage namespace. Copy that state once into the first signed-in user's
 * scoped namespace so an existing learner does not appear to lose progress.
 *
 * This is deliberately a copy, not a move: the legacy data remains available
 * for rollback while all new writes go to the user-scoped keys.
 */
export function migrateLegacyCurriculumState(userId?: string | null) {
  if (!userId || typeof window === 'undefined') return;

  const scopedId = getUserCurriculumId(userId);
  const marker = `${scopedId}_legacy_progress_migrated_v1`;
  if (window.localStorage.getItem(marker) === 'true') return;

  CURRICULUM_KEY_SUFFIXES.forEach(suffix => {
    const oldKey = `${LEGACY_CURRICULUM_ID}_${suffix}`;
    const newKey = `${scopedId}_${suffix}`;
    if (window.localStorage.getItem(newKey) !== null) return;

    const legacyValue = window.localStorage.getItem(oldKey);
    if (legacyValue !== null) window.localStorage.setItem(newKey, legacyValue);
  });

  const legacyEmptyFlag = window.localStorage.getItem(`${LEGACY_CURRICULUM_ID}_is_empty`);
  const scopedEmptyKey = `${scopedId}_is_empty`;
  if (legacyEmptyFlag !== null && window.localStorage.getItem(scopedEmptyKey) === null) {
    window.localStorage.setItem(scopedEmptyKey, legacyEmptyFlag);
  }

  window.localStorage.setItem(marker, 'true');
}
