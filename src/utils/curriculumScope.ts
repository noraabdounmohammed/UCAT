const LEGACY_CURRICULUM_ID = 'default';
const UKMLA_SCOPE = 'ukmla-akt';
const LEGACY_OWNER_KEY = 'studyedit_legacy_progress_owner_v1';

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
 * Older StudyEdit builds stored progress under a shared `default_*` namespace.
 * The first signed-in account on an upgraded browser may claim that legacy state;
 * subsequent accounts start clean, preventing cross-account progress leakage.
 */
export function migrateLegacyCurriculumState(userId?: string | null) {
  if (!userId || typeof window === 'undefined') return;

  const scopedId = getUserCurriculumId(userId);
  const marker = `${scopedId}_legacy_progress_migrated_v1`;
  if (window.localStorage.getItem(marker) === 'true') return;

  const existingOwner = window.localStorage.getItem(LEGACY_OWNER_KEY);
  if (existingOwner && existingOwner !== userId) {
    window.localStorage.setItem(marker, 'true');
    return;
  }

  const hasLegacyProgress = CURRICULUM_KEY_SUFFIXES.some(suffix =>
    window.localStorage.getItem(`${LEGACY_CURRICULUM_ID}_${suffix}`) !== null
  );

  if (!hasLegacyProgress) {
    window.localStorage.setItem(marker, 'true');
    return;
  }

  if (!existingOwner) window.localStorage.setItem(LEGACY_OWNER_KEY, userId);

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
