import { trackEvent } from './posthog';

/**
 * Stable event-name union — kept narrow so accidental typos at call sites
 * fail at type-check time rather than silently shipping mismatched events.
 */
export type TrackedEvent =
  | 'session_started'
  | 'session_completed'
  | 'atom_rated'
  | 'mock_started'
  | 'mock_finished'
  | 'paywall_shown'
  | 'upgrade_clicked'
  | 'nps_submitted'
  | 'voice_session_started';

/**
 * Fire-and-forget. Never await this in render paths — instrumentation must
 * never block UI flow. The underlying trackEvent already swallows missing
 * configuration; we additionally swallow any unexpected runtime errors.
 */
export function track(
  event: TrackedEvent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>,
): void {
  trackEvent(event, props).catch(() => {
    // Intentional: analytics failures must not break the UI.
  });
}
