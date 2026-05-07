/**
 * Shared helpers for reading curriculum-scoped localStorage keys.
 *
 * The main problem: when a user accesses /concept-practice directly (no
 * curriculum prop), the store curriculumId is 'default'. But the actual
 * data was saved under an imported curriculum ID like
 * 'imported-pub-ukmla-akt-2024'. We need a robust scan that finds any
 * matching key rather than failing silently.
 */

/**
 * Find a localStorage value by curriculum-scoped suffix.
 * Strategy:
 *   1. Exact match: `${curriculumId}_${suffix}`
 *   2. Base-ID match: strip 'imported-pub-' prefix and match by first segment
 *   3. Any-key scan: if curriculumId is generic ('default') or still no match,
 *      pick the key with the most data (largest parsed array / object)
 */
export function getCurriculumStorageValue(
  curriculumId: string,
  suffix: string,
  defaultValue: string = '[]',
): string {
  // 1. Exact match
  const exact = localStorage.getItem(`${curriculumId}_${suffix}`);
  if (exact) return exact;

  const baseCid = curriculumId.replace(/^imported-pub-/, '').split('-')[0];
  const isGeneric = curriculumId === 'default' || baseCid === 'default' || baseCid.length < 3;

  let bestValue: string | null = null;
  let bestScore = -1;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.endsWith(`_${suffix}`)) continue;
    // 2. If we have a real ID, only consider keys that contain it
    if (!isGeneric && !key.includes(baseCid)) continue;

    const val = localStorage.getItem(key);
    if (!val) continue;

    try {
      const parsed = JSON.parse(val);
      const score = Array.isArray(parsed)
        ? parsed.length
        : typeof parsed === 'object' && parsed !== null
        ? Object.keys(parsed).length
        : 0;
      if (score > bestScore) {
        bestScore = score;
        bestValue = val;
      }
    } catch {
      // skip malformed entries
    }
  }

  return bestValue ?? defaultValue;
}

/** Convenience: parse the result as JSON with a typed default. */
export function getCurriculumStorageParsed<T>(
  curriculumId: string,
  suffix: string,
  defaultValue: T,
): T {
  try {
    const raw = getCurriculumStorageValue(curriculumId, suffix, JSON.stringify(defaultValue));
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}
