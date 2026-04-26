import type { CurriculumGoals } from '@/stores/goalsStore';

export interface PaceMetrics {
  reviewsPerDay: number;
  minutesPerDay: number;
  newConceptsPerDay: number;
  accuracyTrend: number; // slope of accuracy over time
  currentAccuracy: number;
  currentCoverage: number;
  totalConcepts: number;
  attemptedConcepts: number;
}

export interface ETAResult {
  daysToGoal: number | null;
  targetDate: string | null;
  status: 'on-track' | 'at-risk' | 'behind' | 'ahead' | 'no-goal';
  confidence: 'high' | 'medium' | 'low';
  requiredPace?: {
    reviewsPerDay?: number;
    minutesPerDay?: number;
    newConceptsPerDay?: number;
  };
  message: string;
}

/**
 * Calculate ETA for coverage goal
 */
export function calculateCoverageETA(
  pace: PaceMetrics,
  goals: CurriculumGoals
): ETAResult {
  if (!goals.coverageTarget) {
    return {
      daysToGoal: null,
      targetDate: null,
      status: 'no-goal',
      confidence: 'high',
      message: 'No coverage goal set',
    };
  }

  const targetConcepts = goals.coverageTarget * pace.totalConcepts;
  const neededConcepts = targetConcepts - pace.attemptedConcepts;

  if (neededConcepts <= 0) {
    return {
      daysToGoal: 0,
      targetDate: new Date().toISOString(),
      status: 'ahead',
      confidence: 'high',
      message: `Coverage goal achieved! ${Math.round(pace.currentCoverage * 100)}% of concepts attempted`,
    };
  }

  if (pace.newConceptsPerDay <= 0) {
    return {
      daysToGoal: null,
      targetDate: null,
      status: 'behind',
      confidence: 'low',
      message: 'No new concepts being attempted. Start practicing to make progress!',
    };
  }

  const daysToGoal = Math.ceil(neededConcepts / pace.newConceptsPerDay);
  const targetDate = new Date(Date.now() + daysToGoal * 24 * 60 * 60 * 1000).toISOString();

  // Determine status if deadline exists
  let status: ETAResult['status'] = 'on-track';
  if (goals.deadlineISO) {
    const deadlineDays = Math.ceil(
      (new Date(goals.deadlineISO).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    const buffer = Math.max(3, deadlineDays * 0.1); // 10% buffer or 3 days
    
    if (daysToGoal <= deadlineDays - buffer) {
      status = 'ahead';
    } else if (daysToGoal <= deadlineDays) {
      status = 'on-track';
    } else if (daysToGoal <= deadlineDays + buffer) {
      status = 'at-risk';
    } else {
      status = 'behind';
    }
  }

  // Calculate required pace if behind
  const requiredPace: ETAResult['requiredPace'] = {};
  if (goals.deadlineISO && status !== 'ahead') {
    const deadlineDays = Math.ceil(
      (new Date(goals.deadlineISO).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    if (deadlineDays > 0) {
      requiredPace.newConceptsPerDay = Math.ceil(neededConcepts / deadlineDays);
    }
  }

  const confidence = pace.newConceptsPerDay > 5 ? 'high' : pace.newConceptsPerDay > 2 ? 'medium' : 'low';

  return {
    daysToGoal,
    targetDate,
    status,
    confidence,
    requiredPace,
    message: `${daysToGoal} days to ${Math.round(goals.coverageTarget * 100)}% coverage at current pace`,
  };
}

/**
 * Calculate ETA for accuracy goal
 */
export function calculateAccuracyETA(
  pace: PaceMetrics,
  goals: CurriculumGoals
): ETAResult {
  if (!goals.accuracyTarget) {
    return {
      daysToGoal: null,
      targetDate: null,
      status: 'no-goal',
      confidence: 'high',
      message: 'No accuracy goal set',
    };
  }

  const accuracyGap = goals.accuracyTarget - pace.currentAccuracy;

  if (accuracyGap <= 0) {
    return {
      daysToGoal: 0,
      targetDate: new Date().toISOString(),
      status: 'ahead',
      confidence: 'high',
      message: `Accuracy goal achieved! Currently at ${Math.round(pace.currentAccuracy * 100)}%`,
    };
  }

  // If no positive trend, can't estimate
  if (pace.accuracyTrend <= 0) {
    return {
      daysToGoal: null,
      targetDate: null,
      status: 'behind',
      confidence: 'low',
      message: 'Accuracy not improving. Focus on reviewing weak concepts!',
    };
  }

  // Estimate days based on trend (conservative)
  const daysToGoal = Math.ceil(accuracyGap / pace.accuracyTrend);
  const targetDate = new Date(Date.now() + daysToGoal * 24 * 60 * 60 * 1000).toISOString();

  // Determine status if deadline exists
  let status: ETAResult['status'] = 'on-track';
  if (goals.deadlineISO) {
    const deadlineDays = Math.ceil(
      (new Date(goals.deadlineISO).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    const buffer = Math.max(3, deadlineDays * 0.1);
    
    if (daysToGoal <= deadlineDays - buffer) {
      status = 'ahead';
    } else if (daysToGoal <= deadlineDays) {
      status = 'on-track';
    } else if (daysToGoal <= deadlineDays + buffer) {
      status = 'at-risk';
    } else {
      status = 'behind';
    }
  }

  const confidence = pace.reviewsPerDay > 30 ? 'high' : pace.reviewsPerDay > 10 ? 'medium' : 'low';

  return {
    daysToGoal,
    targetDate,
    status,
    confidence,
    message: `${daysToGoal} days to ${Math.round(goals.accuracyTarget * 100)}% accuracy at current pace`,
  };
}

/**
 * Calculate overall status combining all goals
 */
export function calculateOverallStatus(
  pace: PaceMetrics,
  goals: CurriculumGoals
): {
  status: ETAResult['status'];
  message: string;
  coverageETA: ETAResult;
  accuracyETA: ETAResult;
} {
  const coverageETA = calculateCoverageETA(pace, goals);
  const accuracyETA = calculateAccuracyETA(pace, goals);

  // Overall status is the worst of the two
  const statuses: ETAResult['status'][] = [coverageETA.status, accuracyETA.status];
  const statusPriority: Record<ETAResult['status'], number> = {
    'behind': 4,
    'at-risk': 3,
    'on-track': 2,
    'ahead': 1,
    'no-goal': 0,
  };

  const worstStatus = statuses.reduce((worst, current) => 
    statusPriority[current] > statusPriority[worst] ? current : worst
  );

  let message = '';
  if (worstStatus === 'ahead') {
    message = "You're ahead of schedule! Keep up the great work 🎉";
  } else if (worstStatus === 'on-track') {
    message = "You're on track to meet your goals 👍";
  } else if (worstStatus === 'at-risk') {
    message = "You're slightly behind. Consider increasing your daily practice ⚠️";
  } else if (worstStatus === 'behind') {
    message = "You're falling behind. Let's adjust your goals or increase practice time 🚨";
  } else {
    message = "Set your goals to track progress";
  }

  return {
    status: worstStatus,
    message,
    coverageETA,
    accuracyETA,
  };
}

/**
 * Calculate pace metrics from session history
 */
export function calculatePaceMetrics(
  sessions: Array<{ date: string; items: number; accuracy: number; minutes: number }>,
  totalConcepts: number,
  attemptedConcepts: number,
  currentAccuracy: number
): PaceMetrics {
  const now = Date.now();
  const last14Days = sessions.filter(s => 
    (now - new Date(s.date).getTime()) <= 14 * 24 * 60 * 60 * 1000
  );

  if (last14Days.length === 0) {
    return {
      reviewsPerDay: 0,
      minutesPerDay: 0,
      newConceptsPerDay: 0,
      accuracyTrend: 0,
      currentAccuracy,
      currentCoverage: totalConcepts > 0 ? attemptedConcepts / totalConcepts : 0,
      totalConcepts,
      attemptedConcepts,
    };
  }

  // Calculate averages
  const totalReviews = last14Days.reduce((sum, s) => sum + s.items, 0);
  const totalMinutes = last14Days.reduce((sum, s) => sum + s.minutes, 0);
  const days = Math.max(1, last14Days.length);

  const reviewsPerDay = totalReviews / days;
  const minutesPerDay = totalMinutes / days;

  // Estimate new concepts per day (rough heuristic: ~30% of reviews are new)
  const newConceptsPerDay = reviewsPerDay * 0.3;

  // Calculate accuracy trend (simple linear regression on last 7 sessions)
  const recentSessions = last14Days.slice(-7);
  let accuracyTrend = 0;
  if (recentSessions.length >= 3) {
    const firstAccuracy = recentSessions[0].accuracy;
    const lastAccuracy = recentSessions[recentSessions.length - 1].accuracy;
    const daysDiff = Math.max(1, recentSessions.length);
    accuracyTrend = (lastAccuracy - firstAccuracy) / daysDiff;
  }

  return {
    reviewsPerDay,
    minutesPerDay,
    newConceptsPerDay,
    accuracyTrend,
    currentAccuracy,
    currentCoverage: totalConcepts > 0 ? attemptedConcepts / totalConcepts : 0,
    totalConcepts,
    attemptedConcepts,
  };
}
