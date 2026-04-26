import type { CurriculumGoals } from '@/stores/goalsStore';
import type { PaceMetrics } from './etaCalculator';

export interface ConceptForSession {
  id: string;
  title: string;
  masteryScore: number;
  lastReviewed?: string;
  custom_filters?: string[];
  attempts: number;
}

export interface SessionPlan {
  concepts: ConceptForSession[];
  breakdown: {
    due: number;
    weak: number;
    unseen: number;
  };
  estimatedMinutes: number;
  rationale: string[];
  categoryMix: Record<string, number>;
}

/**
 * Generate a goal-aligned practice session
 */
export function generateNextSession(
  allConcepts: ConceptForSession[],
  goals: CurriculumGoals,
  pace: PaceMetrics,
  targetItems: number = 40
): SessionPlan {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Categorize concepts
  const dueConcepts = allConcepts.filter((c) => {
    if (!c.lastReviewed || c.attempts === 0) return false;
    const daysSince = (now - new Date(c.lastReviewed).getTime()) / oneDayMs;
    // Simple SRS: review if >1 day for weak, >3 days for medium, >7 days for strong
    if (c.masteryScore < 0.5) return daysSince > 1;
    if (c.masteryScore < 0.7) return daysSince > 3;
    return daysSince > 7;
  });

  const weakConcepts = allConcepts
    .filter((c) => c.attempts > 0 && c.masteryScore < 0.6)
    .sort((a, b) => a.masteryScore - b.masteryScore);

  const unseenConcepts = allConcepts.filter((c) => c.attempts === 0);

  // Determine allocation based on goals
  const accuracyGap = goals.accuracyTarget ? goals.accuracyTarget - pace.currentAccuracy : 0;
  const coverageGap = goals.coverageTarget ? goals.coverageTarget - pace.currentCoverage : 0;

  let dueCount = 0;
  let weakCount = 0;
  let unseenCount = 0;
  const rationale: string[] = [];

  // Always prioritize due items (SRS)
  dueCount = Math.min(dueConcepts.length, Math.floor(targetItems * 0.3));
  let remaining = targetItems - dueCount;

  if (dueCount > 0) {
    rationale.push(`${dueCount} due reviews to maintain retention`);
  }

  // Allocate based on goal gaps
  if (accuracyGap > 0 && coverageGap > 0) {
    // Both goals need work
    const accuracyWeight = accuracyGap / (accuracyGap + coverageGap);
    weakCount = Math.min(weakConcepts.length, Math.floor(remaining * accuracyWeight));
    unseenCount = Math.min(unseenConcepts.length, remaining - weakCount);
    
    if (weakCount > 0) {
      rationale.push(`${weakCount} weak concepts to boost accuracy (${Math.round(accuracyGap * 100)}% gap)`);
    }
    if (unseenCount > 0) {
      rationale.push(`${unseenCount} new concepts to increase coverage (${Math.round(coverageGap * 100)}% gap)`);
    }
  } else if (accuracyGap > 0) {
    // Focus on accuracy
    weakCount = Math.min(weakConcepts.length, remaining);
    unseenCount = Math.min(unseenConcepts.length, Math.max(0, remaining - weakCount));
    
    if (weakCount > 0) {
      rationale.push(`${weakCount} weak concepts to reach ${Math.round((goals.accuracyTarget || 0) * 100)}% accuracy`);
    }
  } else if (coverageGap > 0) {
    // Focus on coverage
    unseenCount = Math.min(unseenConcepts.length, remaining);
    weakCount = Math.min(weakConcepts.length, Math.max(0, remaining - unseenCount));
    
    if (unseenCount > 0) {
      rationale.push(`${unseenCount} new concepts to reach ${Math.round((goals.coverageTarget || 0) * 100)}% coverage`);
    }
  } else {
    // Goals met or no goals - balanced review
    weakCount = Math.min(weakConcepts.length, Math.floor(remaining * 0.5));
    unseenCount = Math.min(unseenConcepts.length, remaining - weakCount);
    
    rationale.push('Balanced mix to maintain progress');
  }

  // Select concepts
  const selectedConcepts: ConceptForSession[] = [
    ...dueConcepts.slice(0, dueCount),
    ...weakConcepts.slice(0, weakCount),
    ...unseenConcepts.slice(0, unseenCount),
  ];

  // Shuffle to mix categories
  const shuffled = selectedConcepts.sort(() => Math.random() - 0.5);

  // Calculate category mix
  const categoryMix: Record<string, number> = {};
  shuffled.forEach((c) => {
    const category = c.custom_filters?.[0] || 'Uncategorized';
    categoryMix[category] = (categoryMix[category] || 0) + 1;
  });

  // Estimate time (assume ~45 seconds per item on average)
  const estimatedMinutes = Math.ceil((shuffled.length * 45) / 60);

  return {
    concepts: shuffled,
    breakdown: {
      due: dueCount,
      weak: weakCount,
      unseen: unseenCount,
    },
    estimatedMinutes,
    rationale,
    categoryMix,
  };
}

/**
 * Format category mix for display
 */
export function formatCategoryMix(categoryMix: Record<string, number>): string {
  const sorted = Object.entries(categoryMix)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  
  if (sorted.length === 0) return 'No concepts';
  
  return sorted.map(([cat, count]) => `${count} ${cat}`).join(', ');
}
