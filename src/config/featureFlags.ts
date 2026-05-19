/**
 * Feature Flags
 * 
 * Central configuration for enabling/disabling features.
 * Change these flags to control app behavior without modifying core logic.
 */

/**
 * AI Question Generation
 * 
 * When TRUE: Questions are generated via AI if not found in cache
 * When FALSE: Only cached questions are served, no AI generation
 * 
 * Set to FALSE for initial release/trial to:
 * - Ensure instant question loading
 * - Avoid API costs
 * - Provide consistent user experience
 * 
 * Set to TRUE for development/full feature mode
 */
export const ENABLE_AI_GENERATION = false;
