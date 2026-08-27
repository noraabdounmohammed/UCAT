export type HapticFeedback = 'tap' | 'success' | 'warning';

const HAPTIC_PATTERNS: Record<HapticFeedback, number | number[]> = {
  tap: 8,
  success: [10, 28, 18],
  warning: [24, 38, 24],
};

/**
 * Best-effort haptic feedback for StudyEdit practice interactions.
 *
 * The web/PWA path uses the Vibration API when the browser/device exposes it.
 * Unsupported browsers (notably iOS Safari) simply no-op, so haptics can never
 * block answering or navigation. Keeping this behind one helper also gives the
 * Capacitor shell a single place to swap in native haptics later.
 */
export function triggerHaptic(feedback: HapticFeedback): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;

  try {
    navigator.vibrate(HAPTIC_PATTERNS[feedback]);
  } catch {
    // Haptics are enhancement-only and must never interrupt a study session.
  }
}

export function triggerAnswerHaptic(isCorrect: boolean): void {
  triggerHaptic(isCorrect ? 'success' : 'warning');
}
