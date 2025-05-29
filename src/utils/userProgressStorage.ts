import { InteractionStatus } from '@/types/practice';

// Define the structure for user progress data
export interface QuestionProgress {
  id: string;
  status: InteractionStatus;
  lastAttempted: string;
  attempts: number;
}

export interface TopicProgress {
  correct: number;
  incorrect: number;
  skipped: number;
  flagged: number;
  total: number;
}

export interface UserProgress {
  questions: Record<string, QuestionProgress>;
  topics: Record<string, TopicProgress>;
  skills: Record<string, TopicProgress>;
  sections: Record<string, TopicProgress>;
  lastUpdated: string;
}

// Local storage key
const USER_PROGRESS_KEY = 'medicu_user_progress';

// Initialize empty progress data
const emptyProgress: UserProgress = {
  questions: {},
  topics: {},
  skills: {},
  sections: {},
  lastUpdated: new Date().toISOString()
};

/**
 * Get user progress from local storage
 */
export function getUserProgress(): UserProgress {
  try {
    const storedData = localStorage.getItem(USER_PROGRESS_KEY);
    if (!storedData) {
      return emptyProgress;
    }
    return JSON.parse(storedData) as UserProgress;
  } catch (error) {
    console.error('Error loading user progress:', error);
    return emptyProgress;
  }
}

/**
 * Save user progress to local storage
 */
export function saveUserProgress(progress: UserProgress): void {
  try {
    progress.lastUpdated = new Date().toISOString();
    localStorage.setItem(USER_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving user progress:', error);
  }
}

/**
 * Update question status and related topic/skill progress
 */
export function updateQuestionProgress(
  questionId: string, 
  status: InteractionStatus, 
  topic: string, 
  skill: string,
  section: string
): void {
  const progress = getUserProgress();
  
  // Update question data
  const existingQuestion = progress.questions[questionId] || {
    id: questionId,
    status: 'unseen',
    lastAttempted: '',
    attempts: 0
  };
  
  const newQuestion: QuestionProgress = {
    ...existingQuestion,
    status,
    lastAttempted: new Date().toISOString(),
    attempts: existingQuestion.attempts + 1
  };
  
  progress.questions[questionId] = newQuestion;
  
  // Update topic progress
  updateProgressCounts(progress.topics, topic, status, existingQuestion.status);
  
  // Update skill progress
  if (skill) {
    updateProgressCounts(progress.skills, skill, status, existingQuestion.status);
  }
  
  // Update section progress
  if (section) {
    updateProgressCounts(progress.sections, section, status, existingQuestion.status);
  }
  
  // Save updated progress
  saveUserProgress(progress);
}

/**
 * Helper function to update progress counts
 */
function updateProgressCounts(
  collection: Record<string, TopicProgress>,
  key: string,
  newStatus: InteractionStatus,
  oldStatus: InteractionStatus
): void {
  // Initialize if not exists
  if (!collection[key]) {
    collection[key] = {
      correct: 0,
      incorrect: 0,
      skipped: 0,
      flagged: 0,
      total: 0
    };
  }
  
  // Decrement old status count if it exists
  if (oldStatus !== 'unseen') {
    if (oldStatus === 'correct' && collection[key].correct > 0) {
      collection[key].correct--;
    } else if (oldStatus === 'incorrect' && collection[key].incorrect > 0) {
      collection[key].incorrect--;
    } else if (oldStatus === 'skipped' && collection[key].skipped > 0) {
      collection[key].skipped--;
    } else if (oldStatus === 'flagged' && collection[key].flagged > 0) {
      collection[key].flagged--;
    }
  } else {
    // If it was unseen before, increment total
    collection[key].total++;
  }
  
  // Increment new status count
  if (newStatus === 'correct') {
    collection[key].correct++;
  } else if (newStatus === 'incorrect') {
    collection[key].incorrect++;
  } else if (newStatus === 'skipped') {
    collection[key].skipped++;
  } else if (newStatus === 'flagged') {
    collection[key].flagged++;
  }
}

/**
 * Get progress for a specific section
 */
export function getSectionProgress(section: string): TopicProgress {
  const progress = getUserProgress();
  return progress.sections[section] || {
    correct: 0,
    incorrect: 0,
    skipped: 0,
    flagged: 0,
    total: 0
  };
}

/**
 * Get progress for a specific topic
 */
export function getTopicProgress(topic: string): TopicProgress {
  const progress = getUserProgress();
  return progress.topics[topic] || {
    correct: 0,
    incorrect: 0,
    skipped: 0,
    flagged: 0,
    total: 0
  };
}

/**
 * Get progress for a specific skill
 */
export function getSkillProgress(skill: string): TopicProgress {
  const progress = getUserProgress();
  return progress.skills[skill] || {
    correct: 0,
    incorrect: 0,
    skipped: 0,
    flagged: 0,
    total: 0
  };
}

/**
 * Reset all user progress
 */
export function resetUserProgress(): void {
  localStorage.removeItem(USER_PROGRESS_KEY);
}
