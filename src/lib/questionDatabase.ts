import { MainTopic, Difficulty } from '@/types/practice';

// Define the Question interface
export interface Question {
  id: string;
  section: string; // Section identifier (e.g., 'QR', 'VR', 'DM', 'SJ')
  topic: MainTopic;
  microSkill: string;
  difficulty: Difficulty;
  content: string;
  options?: string[];
  correctAnswer?: number;
  correctOption?: number; // Legacy property for backward compatibility
  explanation?: string;
  imageUrl?: string;
  videoUrl?: string;
  tags?: string[];
  timeLimit?: number;
  // Data visualization properties
  data_type?: string;
  data_block?: Array<{ label: string; value: number }> | Record<string, unknown> | null;
  // Table data structure
  table?: {
    columns?: string[];
    rows?: Array<Array<string | number>>;
  };
  // Chart data structure
  chart?: {
    type?: string;
    data?: Array<{label?: string; value?: number}> | Record<string, unknown>;
  };
}

// Define the database structure
export interface QuestionDatabase {
  questions: Record<string, Question>;
  sectionIndex: Record<string, string[]>; // Index for filtering by section
  topicIndex: Record<MainTopic, string[]>;
  skillIndex: Record<string, string[]>;
  difficultyIndex: Record<string, string[]>;
  lastUpdated: string;
}

/**
 * Rebuild all indices in the database based on the current questions
 * This ensures that even if someone manually edits the JSON file, the indices will be updated
 */
export const rebuildDatabaseIndices = (database: QuestionDatabase): QuestionDatabase => {
  // Create new empty indices
  const sectionIndex: Record<string, string[]> = {};
  const topicIndex: Record<string, string[]> = {};
  const skillIndex: Record<string, string[]> = {};
  const difficultyIndex: Record<string, string[]> = {
    easy: [],
    medium: [],
    hard: [],
    adaptive: []
  };
  
  // Process each question to rebuild indices
  Object.entries(database.questions).forEach(([id, question]) => {
    // Add to section index
    if (question.section) {
      if (!sectionIndex[question.section]) {
        sectionIndex[question.section] = [];
      }
      sectionIndex[question.section].push(id);
    }
    
    // Add to topic index
    if (question.topic) {
      if (!topicIndex[question.topic]) {
        topicIndex[question.topic] = [];
      }
      topicIndex[question.topic].push(id);
    }
    
    // Add to skill index
    if (question.microSkill) {
      if (!skillIndex[question.microSkill]) {
        skillIndex[question.microSkill] = [];
      }
      skillIndex[question.microSkill].push(id);
    }
    
    // Add to difficulty index
    if (question.difficulty) {
      const difficultyKey = Array.isArray(question.difficulty) ? question.difficulty[0] : question.difficulty;
      if (!difficultyIndex[difficultyKey]) {
        difficultyIndex[difficultyKey] = [];
      }
      difficultyIndex[difficultyKey].push(id);
    }
  });
  
  // Return updated database with rebuilt indices
  return {
    ...database,
    sectionIndex,
    topicIndex: topicIndex as Record<MainTopic, string[]>,
    skillIndex,
    difficultyIndex,
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Load the question database directly from the JSON file and rebuild indices
 */
export const loadQuestionDatabase = async (): Promise<QuestionDatabase> => {
  try {
    // Import the question database directly in development
    // In production, we'll include it as a static asset
    let data;
    
    if (import.meta.env.DEV) {
      // In development, import directly from the source
      const module = await import('../data/ukmlaDatabase.json');
      data = module.default;
    } else {
      // In production, fetch from the root path
      const response = await fetch('/ukmlaDatabase.json');
      if (!response.ok) {
        throw new Error(`Failed to load question database: ${response.statusText}`);
      }
      data = await response.json();
    }
    
    // Handle the case where the JSON file contains only questions without indices
    // This allows users to maintain a simpler JSON file with just questions
    const questionsData = {
      questions: data.questions || (typeof data === 'object' ? data : {}),
      sectionIndex: {},
      topicIndex: {} as Record<MainTopic, string[]>,
      skillIndex: {},
      difficultyIndex: {
        easy: [],
        medium: [],
        hard: [],
        adaptive: []
      },
      lastUpdated: new Date().toISOString()
    };
    
    // Rebuild indices to ensure they're up-to-date with the questions
    // This allows users to edit questions directly in the JSON file
    // without having to manually update the indices
    return rebuildDatabaseIndices(questionsData as QuestionDatabase);
  } catch (error) {
    console.error('Error loading question database:', error);
    // Return an empty database structure
    return {
      questions: {},
      sectionIndex: {},
      topicIndex: {} as Record<MainTopic, string[]>,
      skillIndex: {},
      difficultyIndex: {
        easy: [],
        medium: [],
        hard: [],
        adaptive: []
      },
      lastUpdated: new Date().toISOString()
    };
  }
};

/**
 * Get questions by section
 */
export const getQuestionsBySection = async (section: string): Promise<Question[]> => {
  try {
    // Load the current database
    const database = await loadQuestionDatabase();
    
    // Get the question IDs for the section
    const questionIds = database.sectionIndex[section] || [];
    
    // Return the questions
    return questionIds.map(id => database.questions[id]);
  } catch (error) {
    console.error('Error getting questions by section:', error);
    return [];
  }
};

/**
 * Get questions by topic
 */
export const getQuestionsByTopic = async (topic: MainTopic): Promise<Question[]> => {
  try {
    // Load the current database
    const database = await loadQuestionDatabase();
    
    // Get the question IDs for the topic
    const questionIds = database.topicIndex[topic] || [];
    
    // Return the questions
    return questionIds.map(id => database.questions[id]);
  } catch (error) {
    console.error('Error getting questions by topic:', error);
    return [];
  }
};

/**
 * Get questions by skill
 */
export const getQuestionsBySkill = async (skillId: string): Promise<Question[]> => {
  try {
    // Load the current database
    const database = await loadQuestionDatabase();
    
    // Get the question IDs for the skill
    const questionIds = database.skillIndex[skillId] || [];
    
    // Return the questions
    return questionIds.map(id => database.questions[id]);
  } catch (error) {
    console.error('Error getting questions by skill:', error);
    return [];
  }
};

/**
 * Get questions by difficulty
 */
export const getQuestionsByDifficulty = async (difficulty: Difficulty): Promise<Question[]> => {
  try {
    // Load the current database
    const database = await loadQuestionDatabase();
    
    // Get the question IDs for the difficulty
    const difficultyKey = Array.isArray(difficulty) ? difficulty[0] : difficulty;
    const questionIds = database.difficultyIndex[difficultyKey] || [];
    
    // Return the questions
    return questionIds.map(id => database.questions[id]);
  } catch (error) {
    console.error('Error getting questions by difficulty:', error);
    return [];
  }
};

/**
 * Get all questions
 */
export const getAllQuestions = async (): Promise<Question[]> => {
  try {
    // Load the current database
    const database = await loadQuestionDatabase();
    
    // Return all questions
    return Object.values(database.questions);
  } catch (error) {
    console.error('Error getting all questions:', error);
    return [];
  }
};
