// Progress utility functions for tracking question progress

export interface QuestionProgress {
  questionId: string;
  conceptId: string;
  isCorrect: boolean;
  attemptedAt: Date;
  timeSpent?: number;
}

export interface SessionProgress {
  totalQuestions: number;
  completedQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageTimePerQuestion?: number;
}

// Update progress for a single question
export function updateQuestionProgress(
  currentProgress: SessionProgress,
  questionResult: {
    isCorrect: boolean;
    timeSpent?: number;
  }
): SessionProgress {
  const updatedProgress: SessionProgress = {
    ...currentProgress,
    completedQuestions: currentProgress.completedQuestions + 1,
    correctAnswers: questionResult.isCorrect 
      ? currentProgress.correctAnswers + 1 
      : currentProgress.correctAnswers,
    incorrectAnswers: !questionResult.isCorrect 
      ? currentProgress.incorrectAnswers + 1 
      : currentProgress.incorrectAnswers,
  };

  // Update average time if time data is available
  if (questionResult.timeSpent !== undefined && currentProgress.averageTimePerQuestion !== undefined) {
    const totalTime = currentProgress.averageTimePerQuestion * currentProgress.completedQuestions;
    updatedProgress.averageTimePerQuestion = 
      (totalTime + questionResult.timeSpent) / updatedProgress.completedQuestions;
  } else if (questionResult.timeSpent !== undefined) {
    updatedProgress.averageTimePerQuestion = questionResult.timeSpent;
  }

  return updatedProgress;
}

// Calculate progress percentage
export function calculateProgressPercentage(progress: SessionProgress): number {
  if (progress.totalQuestions === 0) return 0;
  return Math.round((progress.completedQuestions / progress.totalQuestions) * 100);
}

// Calculate accuracy percentage
export function calculateAccuracy(progress: SessionProgress): number {
  if (progress.completedQuestions === 0) return 0;
  return Math.round((progress.correctAnswers / progress.completedQuestions) * 100);
}

// Initialize session progress
export function initializeSessionProgress(totalQuestions: number): SessionProgress {
  return {
    totalQuestions,
    completedQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    averageTimePerQuestion: undefined,
  };
}

// Save progress to local storage
export function saveProgressToLocalStorage(
  sessionId: string,
  progress: SessionProgress
): void {
  try {
    const key = `practice_session_${sessionId}`;
    localStorage.setItem(key, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save progress to local storage:', error);
  }
}

// Load progress from local storage
export function loadProgressFromLocalStorage(sessionId: string): SessionProgress | null {
  try {
    const key = `practice_session_${sessionId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load progress from local storage:', error);
  }
  return null;
}

// Clear progress from local storage
export function clearProgressFromLocalStorage(sessionId: string): void {
  try {
    const key = `practice_session_${sessionId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear progress from local storage:', error);
  }
}
