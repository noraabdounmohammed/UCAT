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
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  source?: string;
  author?: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
  version?: number;
  timeLimit?: number;
}

// Define the database structure
export interface QuestionDatabase {
  questions: Record<string, Question>;
  sectionIndex: Record<string, string[]>; // Index for filtering by section
  topicIndex: Record<MainTopic, string[]>;
  skillIndex: Record<string, string[]>;
  difficultyIndex: Record<Difficulty, string[]>;
  lastUpdated: string;
}

// These constants are used in the application to provide default values when needed
// They are now used directly where needed rather than as separate constants

/**
 * Rebuild all indices in the database based on the current questions
 * This ensures that even if someone manually edits the JSON file, the indices will be updated
 */
export const rebuildDatabaseIndices = (database: QuestionDatabase): QuestionDatabase => {
  // Create new empty indices
  const sectionIndex: Record<string, string[]> = {};
  const topicIndex: Record<string, string[]> = {};
  const skillIndex: Record<string, string[]> = {};
  const difficultyIndex: Record<Difficulty, string[]> = {};
  
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
      if (!difficultyIndex[question.difficulty]) {
        difficultyIndex[question.difficulty] = [];
      }
      difficultyIndex[question.difficulty].push(id);
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
    // Always load directly from the JSON file
    const response = await fetch('/src/data/questionDatabase.json');
    if (!response.ok) {
      throw new Error(`Failed to load question database: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle the case where the JSON file contains only questions without indices
    // This allows users to maintain a simpler JSON file with just questions
    const questionsData = {
      questions: data.questions || (typeof data === 'object' ? data : {}),
      sectionIndex: {},
      topicIndex: {},
      skillIndex: {},
      difficultyIndex: {},
      lastUpdated: new Date().toISOString()
    };
    
    // Rebuild indices to ensure they're up-to-date with the questions
    // This allows users to edit questions directly in the JSON file
    // without having to manually update the indices
    return rebuildDatabaseIndices(questionsData as QuestionDatabase);
  } catch (error) {
    console.error('Error loading question database:', error);
    
    // Return an empty database if there's an error
    return {
      questions: {},
      sectionIndex: {} as Record<string, string[]>,
      topicIndex: {} as Record<MainTopic, string[]>,
      skillIndex: {} as Record<string, string[]>,
      difficultyIndex: {} as Record<Difficulty, string[]>,
      lastUpdated: new Date().toISOString()
    };
  }
};

/**
 * This function is now a placeholder since we're editing the JSON file directly.
 * In a real application, you would implement server-side code to save changes to the file.
 * This version only saves the questions without any indices.
 */
export const saveQuestionDatabase = async (database: QuestionDatabase): Promise<boolean> => {
  try {
    // Extract just the questions to save to the file (no indices)
    const questionsOnly = {
      questions: database.questions
    };
    
    // For debugging purposes
    console.log('Questions-only JSON:', JSON.stringify(questionsOnly, null, 2));
    
    // In a browser environment, we can't directly write to files on the server
    // Instead, we'll provide instructions for manual saving
    console.log('To save changes to the database:');
    console.log('1. Copy the JSON content from the editor (contains only questions, no indices)');
    console.log('2. Open src/data/questionDatabase.json');
    console.log('3. Replace the content with your copied JSON');
    
    // Return the questions-only JSON for the UI to display
    return true;
  } catch (error) {
    console.error('Error saving question database:', error);
    console.error('Error processing database:', error);
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
    
    // Calculate counts
    const totalQuestions = Object.keys(database.questions).length;
    
    // Topic counts
    const topicCounts: Record<MainTopic, number> = {
      'Percentages': 0,
      'Ratios': 0,
      'Rates & Speed': 0,
      'Unit Conversions': 0,
      'Data Interpretation': 0,
      'Averages & Statistics': 0,
      'Measurement & Geometry': 0,
      'Trend Extrapolation': 0
    };
    Object.entries(database.topicIndex).forEach(([topic, ids]) => {
      topicCounts[topic as MainTopic] = ids.length;
    });
    
    // Skill counts
    const skillCounts: Record<string, number> = {};
    Object.entries(database.skillIndex).forEach(([skill, ids]) => {
      skillCounts[skill] = ids.length;
    });
    
    // Difficulty counts
    const difficultyCounts: Record<Difficulty, number> = {
      'easy': 0,
      'medium': 0,
      'hard': 0,
      'adaptive': 0
    };
    Object.entries(database.difficultyIndex).forEach(([difficulty, ids]) => {
      difficultyCounts[difficulty as Difficulty] = ids.length;
    });
    
    return {
      totalQuestions,
      topicCounts,
      skillCounts,
      difficultyCounts,
      lastUpdated: database.lastUpdated
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return {
      totalQuestions: 0,
      topicCounts: {
        'Percentages': 0,
        'Ratios': 0,
        'Rates & Speed': 0,
        'Unit Conversions': 0,
        'Data Interpretation': 0,
        'Averages & Statistics': 0,
        'Measurement & Geometry': 0,
        'Trend Extrapolation': 0
      } as Record<MainTopic, number>,
      skillCounts: {},
      difficultyCounts: {
        'easy': 0,
        'medium': 0,
        'hard': 0,
        'adaptive': 0
      } as Record<Difficulty, number>,
      lastUpdated: new Date().toISOString()
    };
  }
};

/**
 * Generate real question content based on topic and microSkill
 * This is used when placeholder questions are detected
 */
const getRealQuestionContent = (topic: MainTopic, microSkill: string) => {
  // Default content structure
  const content = {
    question: '',
    options: ['', '', '', '', ''],
    correctOption: 0,
    explanation: ''
  };
  
  // Generate content based on topic and microSkill
  if (topic === 'Ratios' && microSkill === 'Ratio Simplification') {
    content.question = 'If the ratio of boys to girls in a class is 3:5, and there are 24 boys, how many girls are there in the class?';
    content.options = [
      '30 girls',
      '35 girls',
      '40 girls',
      '45 girls',
      '50 girls'
    ];
    content.correctOption = 2; // Index of '40 girls'
    content.explanation = 'To solve this problem, we set up a proportion. If the ratio of boys to girls is 3:5, and there are 24 boys, then:\n\nboys/girls = 3/5\n24/x = 3/5\n\nCross multiply:\n24 × 5 = 3 × x\n120 = 3x\nx = 40\n\nTherefore, there are 40 girls in the class.';
  } else if (topic === 'Percentages') {
    content.question = 'A store is offering a 25% discount on all items. If an item originally costs $80, what is the sale price?';
    content.options = [
      '$55',
      '$60',
      '$65',
      '$70',
      '$75'
    ];
    content.correctOption = 1; // Index of '$60'
    content.explanation = 'To find the sale price, we calculate the discount amount and subtract it from the original price.\n\nDiscount = 25% of $80 = 0.25 × $80 = $20\nSale price = Original price - Discount = $80 - $20 = $60';
  } else if (topic === 'Rates & Speed') {
    content.question = 'If a car travels 240 miles in 4 hours, what is its average speed in miles per hour?';
    content.options = [
      '55 mph',
      '60 mph',
      '65 mph',
      '70 mph',
      '75 mph'
    ];
    content.correctOption = 1; // Index of '60 mph'
    content.explanation = 'Average speed = Distance ÷ Time\nAverage speed = 240 miles ÷ 4 hours = 60 miles per hour';
  } else {
    // Default content for other topics
    content.question = `This is a sample question about ${topic} focusing on ${microSkill || 'general concepts'}.`;
    content.options = [
      'Option A',
      'Option B',
      'Option C',
      'Option D',
      'Option E'
    ];
    content.correctOption = 2; // Index of 'Option C'
    content.explanation = `This is a detailed explanation of the correct answer for this ${topic} question.`;
  }
  
  return content;
};

/**
 * Migrate questions from topic-specific files to the centralized database
 * This function fetches all topic-specific JSON files and consolidates them into a single database
 */
export const migrateQuestionsToDatabase = async (): Promise<boolean> => {
  try {
    // Load the current database
    const database = await loadQuestionDatabase();
    
    // Define the topics and their file paths
    const topicFiles = [
      { topic: 'Percentages', file: '/src/data/questions/qr/percentages.json' },
      { topic: 'Ratios', file: '/src/data/questions/qr/ratios.json' },
      { topic: 'Rates & Speed', file: '/src/data/questions/qr/rates_speed.json' },
      { topic: 'Unit Conversions', file: '/src/data/questions/qr/conversions.json' },
      { topic: 'Data Interpretation', file: '/src/data/questions/qr/data_interpretation.json' },
      { topic: 'Geometry', file: '/src/data/questions/qr/geometry.json' },
      { topic: 'Currency', file: '/src/data/questions/qr/currency.json' }
    ];
    
    // Process each topic file
    for (const { topic, file } of topicFiles) {
      try {
        // Fetch the topic-specific file
        const response = await fetch(file);
        if (!response.ok) {
          console.error(`Failed to fetch ${file}: ${response.statusText}`);
          continue;
        }
        
        const questions = await response.json();
        console.log(`Processing ${questions.length} questions from ${topic}`);
        
        // Process each question in the topic file
        for (const questionData of questions) {
          // Generate a unique ID if not present
          const questionId = questionData.id || `${topic.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          // Check if this is a placeholder question with generic options
          const hasGenericOptions = questionData.options?.some((opt: string) => /^[A-E]\. Option \d+$/.test(opt)) || false;
          const hasGenericSolution = questionData.worked_solution?.includes('Step-by-step breakdown') || false;
          
          // Create the question object
          let mappedQuestion: Question;
          
          // If this is a placeholder, create a more meaningful question based on the topic
          if (hasGenericOptions || hasGenericSolution) {
            // Get real content based on the topic
            const realContent = getRealQuestionContent(topic as MainTopic, questionData.micro_skill || '');
            
            // Map the question to the centralized format with real content
            mappedQuestion = {
              id: questionId,
              section: questionData.section || 'QR', // Default to QR if section is not specified
              topic: questionData.main_topic as MainTopic || topic as MainTopic,
              microSkill: questionData.micro_skill || '',
              difficulty: (questionData.difficulty?.toLowerCase() as Difficulty) || 'medium',
              content: realContent.question,
              options: realContent.options,
              correctOption: realContent.correctOption,
              explanation: realContent.explanation,
              // Additional metadata
              createdAt: questionData.created_at || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {
                setId: questionData.set_id,
                setName: questionData.set_name,
                questionStem: questionData.question_stem,
                dataType: questionData.data_type,
                dataBlock: questionData.data_block
              }
            };
          } else {
            // Map the question to the centralized format with original content
            mappedQuestion = {
              id: questionId,
              section: questionData.section || 'QR', // Default to QR if section is not specified
              topic: questionData.main_topic as MainTopic || topic as MainTopic,
              microSkill: questionData.micro_skill || '',
              difficulty: (questionData.difficulty?.toLowerCase() as Difficulty) || 'medium',
              content: questionData.individual_question || questionData.question_stem || '',
              options: questionData.options?.map((opt: string) => opt.replace(/^[A-E]\.\s*/, '')) || [],
              correctOption: questionData.correct_answer ? questionData.correct_answer.charCodeAt(0) - 'A'.charCodeAt(0) : 0,
              explanation: questionData.worked_solution || '',
              // Additional metadata
              createdAt: questionData.created_at || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {
                setId: questionData.set_id,
                setName: questionData.set_name,
                questionStem: questionData.question_stem,
                dataType: questionData.data_type,
                dataBlock: questionData.data_block
              }
            };
          }
          
          // Add the question to the database
          database.questions[questionId] = mappedQuestion;
          
          // Update indexes
          // Topic index
          if (!database.topicIndex[mappedQuestion.topic]) {
            database.topicIndex[mappedQuestion.topic] = [];
          }
          if (!database.topicIndex[mappedQuestion.topic].includes(questionId)) {
            database.topicIndex[mappedQuestion.topic].push(questionId);
          }
          
          // Skill index
          if (mappedQuestion.microSkill) {
            if (!database.skillIndex[mappedQuestion.microSkill]) {
              database.skillIndex[mappedQuestion.microSkill] = [];
            }
            if (!database.skillIndex[mappedQuestion.microSkill].includes(questionId)) {
              database.skillIndex[mappedQuestion.microSkill].push(questionId);
            }
          }
          
          // Difficulty index
          if (mappedQuestion.difficulty) {
            if (!database.difficultyIndex[mappedQuestion.difficulty]) {
              database.difficultyIndex[mappedQuestion.difficulty] = [];
            }
            if (!database.difficultyIndex[mappedQuestion.difficulty].includes(questionId)) {
              database.difficultyIndex[mappedQuestion.difficulty].push(questionId);
            }
          }
        }
        
        console.log(`Successfully migrated ${questions.length} questions from ${topic}`);
      } catch (error) {
        console.error(`Error processing topic ${topic}:`, error);
      }
    }
    
    // Save the updated database
    await saveQuestionDatabase(database);
    console.log('All questions have been migrated to the centralized database');
    
    return true;
  } catch (error) {
    console.error('Error migrating questions to database:', error);
    return false;
  }
};
