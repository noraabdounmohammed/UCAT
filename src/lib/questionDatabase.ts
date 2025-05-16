import { MainTopic, Difficulty } from '@/types/practice';
import fs from 'fs';
import path from 'path';

// Define the Question interface
export interface Question {
  id: string;
  topic: MainTopic;
  microSkill: string;
  difficulty: Difficulty;
  content: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  timeLimit: number;
}

// Define the database structure
export interface QuestionDatabase {
  questions: Record<string, Question>;
  topicIndex: Record<MainTopic, string[]>;
  skillIndex: Record<string, string[]>;
  difficultyIndex: Record<Difficulty, string[]>;
  lastUpdated: string;
}

// Database file path
const DB_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'questionDatabase.json');
const BACKUP_DIR = path.join(process.cwd(), 'src', 'data', 'backups');

// Initialize an empty database
const emptyDatabase: QuestionDatabase = {
  questions: {},
  topicIndex: {},
  skillIndex: {},
  difficultyIndex: {},
  lastUpdated: new Date().toISOString()
};

/**
 * Load the question database
 */
export const loadQuestionDatabase = async (): Promise<QuestionDatabase> => {
  try {
    // Check if the database file exists
    if (!fs.existsSync(DB_FILE_PATH)) {
      // Create the database file with an empty database
      await saveQuestionDatabase(emptyDatabase);
      return emptyDatabase;
    }

    // Read the database file
    const data = await fs.promises.readFile(DB_FILE_PATH, 'utf8');
    return JSON.parse(data) as QuestionDatabase;
  } catch (error) {
    console.error('Error loading question database:', error);
    return emptyDatabase;
  }
};

/**
 * Save the question database
 */
export const saveQuestionDatabase = async (database: QuestionDatabase): Promise<boolean> => {
  try {
    // Create a backup of the current database
    if (fs.existsSync(DB_FILE_PATH)) {
      // Ensure backup directory exists
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }

      // Create a backup with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUP_DIR, `questionDatabase-${timestamp}.json`);
      await fs.promises.copyFile(DB_FILE_PATH, backupPath);
    }

    // Update the lastUpdated timestamp
    database.lastUpdated = new Date().toISOString();

    // Save the database
    await fs.promises.writeFile(DB_FILE_PATH, JSON.stringify(database, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving question database:', error);
    return false;
  }
};

/**
 * Add a question to the database
 */
export const addQuestion = async (question: Question): Promise<boolean> => {
  try {
    const database = await loadQuestionDatabase();

    // Generate a unique ID if not provided
    if (!question.id) {
      question.id = `q${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    // Add the question to the database
    database.questions[question.id] = question;

    // Update the indexes
    // Topic index
    if (!database.topicIndex[question.topic]) {
      database.topicIndex[question.topic] = [];
    }
    if (!database.topicIndex[question.topic].includes(question.id)) {
      database.topicIndex[question.topic].push(question.id);
    }

    // Skill index
    if (!database.skillIndex[question.microSkill]) {
      database.skillIndex[question.microSkill] = [];
    }
    if (!database.skillIndex[question.microSkill].includes(question.id)) {
      database.skillIndex[question.microSkill].push(question.id);
    }

    // Difficulty index
    if (!database.difficultyIndex[question.difficulty]) {
      database.difficultyIndex[question.difficulty] = [];
    }
    if (!database.difficultyIndex[question.difficulty].includes(question.id)) {
      database.difficultyIndex[question.difficulty].push(question.id);
    }

    // Save the database
    return await saveQuestionDatabase(database);
  } catch (error) {
    console.error('Error adding question:', error);
    return false;
  }
};

/**
 * Update a question in the database
 */
export const updateQuestion = async (question: Question): Promise<boolean> => {
  try {
    const database = await loadQuestionDatabase();

    // Check if the question exists
    if (!database.questions[question.id]) {
      console.error(`Question with ID ${question.id} not found`);
      return false;
    }

    const oldQuestion = database.questions[question.id];

    // Update indexes if topic, skill, or difficulty changed
    if (oldQuestion.topic !== question.topic) {
      // Remove from old topic index
      database.topicIndex[oldQuestion.topic] = database.topicIndex[oldQuestion.topic].filter(
        id => id !== question.id
      );

      // Add to new topic index
      if (!database.topicIndex[question.topic]) {
        database.topicIndex[question.topic] = [];
      }
      database.topicIndex[question.topic].push(question.id);
    }

    if (oldQuestion.microSkill !== question.microSkill) {
      // Remove from old skill index
      database.skillIndex[oldQuestion.microSkill] = database.skillIndex[oldQuestion.microSkill].filter(
        id => id !== question.id
      );

      // Add to new skill index
      if (!database.skillIndex[question.microSkill]) {
        database.skillIndex[question.microSkill] = [];
      }
      database.skillIndex[question.microSkill].push(question.id);
    }

    if (oldQuestion.difficulty !== question.difficulty) {
      // Remove from old difficulty index
      database.difficultyIndex[oldQuestion.difficulty] = database.difficultyIndex[oldQuestion.difficulty].filter(
        id => id !== question.id
      );

      // Add to new difficulty index
      if (!database.difficultyIndex[question.difficulty]) {
        database.difficultyIndex[question.difficulty] = [];
      }
      database.difficultyIndex[question.difficulty].push(question.id);
    }

    // Update the question
    database.questions[question.id] = question;

    // Save the database
    return await saveQuestionDatabase(database);
  } catch (error) {
    console.error('Error updating question:', error);
    return false;
  }
};

/**
 * Delete a question from the database
 */
export const deleteQuestion = async (questionId: string): Promise<boolean> => {
  try {
    const database = await loadQuestionDatabase();

    // Check if the question exists
    if (!database.questions[questionId]) {
      console.error(`Question with ID ${questionId} not found`);
      return false;
    }

    const question = database.questions[questionId];

    // Remove from indexes
    database.topicIndex[question.topic] = database.topicIndex[question.topic].filter(
      id => id !== questionId
    );
    database.skillIndex[question.microSkill] = database.skillIndex[question.microSkill].filter(
      id => id !== questionId
    );
    database.difficultyIndex[question.difficulty] = database.difficultyIndex[question.difficulty].filter(
      id => id !== questionId
    );

    // Delete the question
    delete database.questions[questionId];

    // Save the database
    return await saveQuestionDatabase(database);
  } catch (error) {
    console.error('Error deleting question:', error);
    return false;
  }
};

/**
 * Get questions by topic
 */
export const getQuestionsByTopic = async (topic: MainTopic): Promise<Question[]> => {
  try {
    const database = await loadQuestionDatabase();
    const questionIds = database.topicIndex[topic] || [];
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
    const database = await loadQuestionDatabase();
    const questionIds = database.skillIndex[skillId] || [];
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
    const database = await loadQuestionDatabase();
    const questionIds = database.difficultyIndex[difficulty] || [];
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
    const database = await loadQuestionDatabase();
    return Object.values(database.questions);
  } catch (error) {
    console.error('Error getting all questions:', error);
    return [];
  }
};

/**
 * Import questions from JSON
 */
export const importQuestions = async (questions: Question[]): Promise<{ success: number; failed: number; errors: string[] }> => {
  try {
    const database = await loadQuestionDatabase();
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const question of questions) {
      try {
        // Generate a unique ID if not provided
        if (!question.id) {
          question.id = `q${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }

        // Add the question to the database
        database.questions[question.id] = question;

        // Update the indexes
        // Topic index
        if (!database.topicIndex[question.topic]) {
          database.topicIndex[question.topic] = [];
        }
        if (!database.topicIndex[question.topic].includes(question.id)) {
          database.topicIndex[question.topic].push(question.id);
        }

        // Skill index
        if (!database.skillIndex[question.microSkill]) {
          database.skillIndex[question.microSkill] = [];
        }
        if (!database.skillIndex[question.microSkill].includes(question.id)) {
          database.skillIndex[question.microSkill].push(question.id);
        }

        // Difficulty index
        if (!database.difficultyIndex[question.difficulty]) {
          database.difficultyIndex[question.difficulty] = [];
        }
        if (!database.difficultyIndex[question.difficulty].includes(question.id)) {
          database.difficultyIndex[question.difficulty].push(question.id);
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Error importing question: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Save the database
    await saveQuestionDatabase(database);

    return results;
  } catch (error) {
    console.error('Error importing questions:', error);
    return {
      success: 0,
      failed: questions.length,
      errors: [`Error importing questions: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
};

/**
 * Export questions to JSON
 */
export const exportQuestions = async (options?: {
  topics?: MainTopic[];
  skills?: string[];
  difficulties?: Difficulty[];
}): Promise<{ questions: Question[]; count: number }> => {
  try {
    const database = await loadQuestionDatabase();
    let questionIds: string[] = [];

    if (options) {
      // Filter by topic
      if (options.topics && options.topics.length > 0) {
        const topicIds = options.topics.flatMap(topic => database.topicIndex[topic] || []);
        questionIds = questionIds.length === 0 ? topicIds : questionIds.filter(id => topicIds.includes(id));
      }

      // Filter by skill
      if (options.skills && options.skills.length > 0) {
        const skillIds = options.skills.flatMap(skill => database.skillIndex[skill] || []);
        questionIds = questionIds.length === 0 ? skillIds : questionIds.filter(id => skillIds.includes(id));
      }

      // Filter by difficulty
      if (options.difficulties && options.difficulties.length > 0) {
        const difficultyIds = options.difficulties.flatMap(difficulty => database.difficultyIndex[difficulty] || []);
        questionIds = questionIds.length === 0 ? difficultyIds : questionIds.filter(id => difficultyIds.includes(id));
      }
    }

    // If no filters were applied, return all questions
    if (questionIds.length === 0) {
      questionIds = Object.keys(database.questions);
    }

    // Get the questions
    const questions = questionIds.map(id => database.questions[id]);

    return {
      questions,
      count: questions.length
    };
  } catch (error) {
    console.error('Error exporting questions:', error);
    return {
      questions: [],
      count: 0
    };
  }
};

/**
 * Get database statistics
 */
export const getDatabaseStats = async (): Promise<{
  totalQuestions: number;
  topicCounts: Record<MainTopic, number>;
  skillCounts: Record<string, number>;
  difficultyCounts: Record<Difficulty, number>;
  lastUpdated: string;
}> => {
  try {
    const database = await loadQuestionDatabase();
    
    return {
      totalQuestions: Object.keys(database.questions).length,
      topicCounts: Object.fromEntries(
        Object.entries(database.topicIndex).map(([topic, ids]) => [topic, ids.length])
      ) as Record<MainTopic, number>,
      skillCounts: Object.fromEntries(
        Object.entries(database.skillIndex).map(([skill, ids]) => [skill, ids.length])
      ),
      difficultyCounts: Object.fromEntries(
        Object.entries(database.difficultyIndex).map(([difficulty, ids]) => [difficulty, ids.length])
      ) as Record<Difficulty, number>,
      lastUpdated: database.lastUpdated
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return {
      totalQuestions: 0,
      topicCounts: {} as Record<MainTopic, number>,
      skillCounts: {},
      difficultyCounts: {} as Record<Difficulty, number>,
      lastUpdated: new Date().toISOString()
    };
  }
};
