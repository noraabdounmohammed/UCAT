/**
 * Daily question generation limits
 * Tracks and enforces per-user daily limits until payments are implemented
 */

const DAILY_LIMIT = 100;
const STORAGE_KEY = 'daily_question_count';

// Users with unlimited access (no daily limit)
const UNLIMITED_USERS = [
  'noraabdounmohammed@gmail.com'
];

// Check if email has unlimited access
export function hasUnlimitedAccess(email?: string): boolean {
  if (!email) return false;
  return UNLIMITED_USERS.includes(email.toLowerCase());
}

interface DailyUsage {
  date: string; // YYYY-MM-DD format
  count: number;
  userId?: string;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get the current daily usage from localStorage
 */
function getDailyUsage(userId?: string): DailyUsage {
  try {
    const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
    const stored = localStorage.getItem(key);
    if (stored) {
      const usage: DailyUsage = JSON.parse(stored);
      // Reset if it's a new day
      if (usage.date !== getTodayDate()) {
        return { date: getTodayDate(), count: 0, userId };
      }
      return usage;
    }
  } catch (error) {
    console.error('Error reading daily usage:', error);
  }
  return { date: getTodayDate(), count: 0, userId };
}

/**
 * Save the daily usage to localStorage
 */
function saveDailyUsage(usage: DailyUsage): void {
  try {
    const key = usage.userId ? `${STORAGE_KEY}_${usage.userId}` : STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(usage));
  } catch (error) {
    console.error('Error saving daily usage:', error);
  }
}

/**
 * Get the number of questions remaining for today
 */
export function getRemainingQuestions(userId?: string): number {
  const usage = getDailyUsage(userId);
  return Math.max(0, DAILY_LIMIT - usage.count);
}

/**
 * Get the current daily usage count
 */
export function getDailyUsageCount(userId?: string): number {
  return getDailyUsage(userId).count;
}

/**
 * Get the daily limit
 */
export function getDailyLimit(): number {
  return DAILY_LIMIT;
}

/**
 * Check if user can generate more questions
 */
export function canGenerateQuestions(requestedCount: number, userId?: string): boolean {
  const remaining = getRemainingQuestions(userId);
  return remaining >= requestedCount;
}

/**
 * Check how many questions can actually be generated (may be less than requested)
 */
export function getAllowedQuestionCount(requestedCount: number, userId?: string): number {
  const remaining = getRemainingQuestions(userId);
  return Math.min(requestedCount, remaining);
}

/**
 * Record that questions were generated
 */
export function recordQuestionsGenerated(count: number, userId?: string): void {
  const usage = getDailyUsage(userId);
  usage.count += count;
  saveDailyUsage(usage);
  console.log(`📊 Daily question usage: ${usage.count}/${DAILY_LIMIT} (added ${count})`);
}

/**
 * Get usage info for display
 */
export function getUsageInfo(userId?: string): {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
} {
  const usage = getDailyUsage(userId);
  const remaining = Math.max(0, DAILY_LIMIT - usage.count);
  return {
    used: usage.count,
    limit: DAILY_LIMIT,
    remaining,
    percentUsed: Math.round((usage.count / DAILY_LIMIT) * 100)
  };
}
