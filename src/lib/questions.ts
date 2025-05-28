// Supabase will be used for user progress tracking in the future
import { PracticeFilterOptions, TopicStructure } from '@/types/practice';
import { loadQuestionsForSection, getDynamicQuestionCounts, getDynamicTopicStructure, Question } from '../utils/questionBank';

// Define a type for question with topic property
interface QuestionWithTopic extends Question {
  topic?: string;
}

// Define a type for question with user interaction
interface QuestionWithInteraction extends Question {
  user_interaction?: string;
}

// Cache for storing previously computed question counts to prevent redundant calculations
const questionCountCache: Record<string, number> = {};

export async function fetchQuestions(filters: PracticeFilterOptions) {
  try {
    // Make sure we have a section specified
    if (!filters.section) {
      console.error('No section specified in filters');
      return [];
    }
    const section = filters.section;
    
    // Load questions based on selected topics and/or skills
    let questions: Question[] = [];
    
    // Check if we have either topics or skills selected
    const hasTopics = filters.topics.length > 0;
    const hasSkills = filters.microSkills.length > 0;
    
    if (!hasTopics && !hasSkills) {
      // If neither topics nor skills are selected, return empty array
      console.log('No topics or skills selected');
      return [];
    }
    
    // Always load all questions for the section first
    console.log(`Loading all questions for section ${section}`);
    questions = await loadQuestionsForSection(section);
    
    // Debug the loaded questions
    console.log('Loaded questions:', questions);
    
    let finalQuestions: Question[] = [];
    
    // If we have topics selected, get questions for those topics
    if (hasTopics) {
      console.log('Filtering by topics:', filters.topics);
      // Check for topic compatibility with more flexible matching
      const topicQuestions = questions.filter(q => {
        // Get the topic from the question, with fallbacks for different formats
        const questionTopic = q.main_topic || (q as QuestionWithTopic).topic;
        if (!questionTopic) return false;
        
        // Check if any of the selected topics match this question
        return filters.topics.some(topic => {
          // Handle both string and object topics
          const topicValue = typeof topic === 'string' ? topic : String(topic);
          return String(questionTopic).toLowerCase() === topicValue.toLowerCase();
        });
      });
      finalQuestions = [...finalQuestions, ...topicQuestions];
      console.log(`After topic filtering: ${topicQuestions.length} questions`);
    }
    
    // If we have skills selected, get questions for those skills
    if (hasSkills) {
      console.log('Filtering by micro skills:', filters.microSkills);
      
      // Log all available micro_skills in the questions for debugging
      const availableMicroSkills = new Set(questions.map(q => q.micro_skill));
      console.log('Available micro_skills in questions:', Array.from(availableMicroSkills));
      
      // Log each question's micro_skill for detailed debugging
      questions.forEach(q => {
        console.log(`Question ${q.id} has micro_skill: '${q.micro_skill}'`);
      });
      
      const skillQuestions = questions.filter(q => {
        const matches = filters.microSkills.includes(q.micro_skill);
        console.log(`Question ${q.id} with micro_skill '${q.micro_skill}' matches filter: ${matches}`);
        return matches;
      });
      
      finalQuestions = [...finalQuestions, ...skillQuestions];
      console.log(`After skill filtering: ${skillQuestions.length} questions`);
    }
    
    // Remove duplicates
    const uniqueIds = new Set();
    questions = finalQuestions.filter(q => {
      if (uniqueIds.has(q.id)) return false;
      uniqueIds.add(q.id);
      return true;
    });
    
    console.log(`Final question count after filtering: ${questions.length} questions`);
    
    // Apply difficulty filter if not adaptive
    if (filters.difficulty !== 'adaptive') {
      console.log('Filtering by difficulty:', filters.difficulty);
      questions = questions.filter(q => {
        const difficultyMatches = q.difficulty.toLowerCase() === filters.difficulty.toLowerCase();
        return difficultyMatches;
      });
      console.log(`After difficulty filtering: ${questions.length} questions`);
    }
    
    // Shuffle questions and limit to 5
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const result = shuffled.slice(0, 5);
    console.log(`Returning ${result.length} questions after shuffling and limiting`);
    return result;
  } catch (error) {
    console.error('Error in fetchQuestions:', error);
    throw error;
  }
}

export async function fetchQuestionCounts(section?: string) {
  try {
    // Get dynamic counts by actually loading and counting questions in each file
    const dynamicCounts = await getDynamicQuestionCounts(section);
    
    // Return in a format that works with both the practice page and dashboard
    return {
      // For the practice page
      topics: dynamicCounts.topics,
      skills: dynamicCounts.skills,
      total: dynamicCounts.total,
      // For the dashboard
      topicCounts: dynamicCounts.topics,
      skillCounts: dynamicCounts.skills
    };
  } catch (error) {
    console.error('Error fetching question counts:', error);
    throw error;
  }
}

// Function to fetch the dynamic topic structure based on actual questions
export async function fetchDynamicTopicStructure(section?: string): Promise<TopicStructure[]> {
  try {
    return await getDynamicTopicStructure(section);
  } catch (error) {
    console.error('Error in fetchDynamicTopicStructure:', error);
    return [];
  }
}

// Create a cache key from filter options to enable memoization
function createCacheKey(filters: PracticeFilterOptions): string {
  return JSON.stringify({
    section: filters.section,
    topics: [...filters.topics].sort(),
    microSkills: [...filters.microSkills].sort(),
    difficulty: Array.isArray(filters.difficulty) ? [...filters.difficulty].sort() : filters.difficulty,
    interactionStatus: [...filters.interactionStatus].sort()
  });
}

/**
 * Count the number of questions that match the given filters
 * This function is optimized to prevent flickering by:
 * 1. Using a cache to avoid redundant calculations
 * 2. Minimizing console logs that can slow down rendering
 * 3. Using a single pass through the data where possible
 */
export async function countFilteredQuestions(filters: PracticeFilterOptions): Promise<number> {
  try {
    // Check if we have a cached result for these exact filters
    const cacheKey = createCacheKey(filters);
    if (questionCountCache[cacheKey] !== undefined) {
      return questionCountCache[cacheKey];
    }
    
    // Make sure we have a section specified
    if (!filters.section) {
      return 0;
    }
    
    // Load all questions for the section
    const allQuestions = await loadQuestionsForSection(filters.section);
    
    // If no questions found, return 0
    if (!allQuestions || allQuestions.length === 0) {
      questionCountCache[cacheKey] = 0;
      return 0;
    }
    
    // If no filters are applied, return the total count
    if (filters.topics.length === 0 && filters.microSkills.length === 0) {
      const count = allQuestions.length;
      questionCountCache[cacheKey] = count;
      return count;
    }
    
    // Filter questions based on selected criteria (using a single pass through the data)
    const filteredQuestions = allQuestions.filter(question => {
      // Topic filter
      if (filters.topics.length > 0) {
        const questionTopic = question.main_topic || (question as QuestionWithTopic).topic;
        if (!questionTopic) return false;
        
        // Check if any of the selected topics match this question
        const topicMatches = filters.topics.some(topic => {
          const topicValue = typeof topic === 'string' ? topic : String(topic);
          return String(questionTopic).toLowerCase() === topicValue.toLowerCase();
        });
        
        if (!topicMatches) return false;
      }
      
      // Micro skill filter
      if (filters.microSkills.length > 0) {
        if (!filters.microSkills.includes(question.micro_skill)) {
          return false;
        }
      }
      
      // Difficulty filter
      if (filters.difficulty) {
        const difficulties = Array.isArray(filters.difficulty) ? filters.difficulty : [filters.difficulty];
        if (difficulties.length > 0 && difficulties[0] !== 'adaptive') {
          const normalizedDifficulty = question.difficulty.toLowerCase();
          if (!difficulties.some(d => d.toLowerCase() === normalizedDifficulty)) {
            return false;
          }
        }
      }
      
      // Interaction status filter (if applicable)
      if (filters.interactionStatus && filters.interactionStatus.length > 0) {
        // In a real app, this would check the user's interaction status with this question
        // For now, we'll assume all questions are 'unseen' unless specified otherwise
        const status = (question as QuestionWithInteraction).user_interaction || 'unseen';
        if (!filters.interactionStatus.includes(status)) {
          return false;
        }
      }
      
      // If it passed all filters, include it
      return true;
    });
    
    const finalCount = filteredQuestions.length;
    
    // Cache the result for future use
    questionCountCache[cacheKey] = finalCount;
    
    return finalCount;
  } catch (error) {
    console.error('Error counting filtered questions:', error);
    return 0;
  }
}

// Function to fetch user progress data
export async function fetchUserProgress(section?: string) {
  try {
    // In a real app, this would be an API call to fetch the user's actual progress
    // For now, we'll simulate with data that would come from a user progress tracking system
    
    // This function simulates fetching question attempt data from a database
    // In a real app, this would be actual user data from a database
    const fetchUserAttemptData = () => {
      // This simulates the raw data of which questions the user has attempted
      // In a real app, this would be fetched from a database based on the user's ID
      return {
        // Each key is a question ID, and the value indicates if it was answered correctly
        'qr-percent-change-1': true,  // correct
        'qr-percent-change-2': false, // incorrect
        'qr-percent-of-1': true,      // correct
        'qr-ratio-simplification-1': true, // correct
        'vr-main-idea-1': true,       // correct
        'vr-inference-1': false,      // incorrect
        'dm-deductive-1': true,       // correct
        'sj-ethical-1': true,         // correct
      } as Record<string, boolean>;
    };
    
    // This function simulates fetching the mapping of questions to skills and topics
    // In a real app, this would be fetched from a database or derived from the question metadata
    const fetchQuestionMetadata = () => {
      return {
        // QR section
        'qr-percent-change-1': { skill: 'percent-change', topic: 'Percentages' },
        'qr-percent-change-2': { skill: 'percent-change', topic: 'Percentages' },
        'qr-percent-change-3': { skill: 'percent-change', topic: 'Percentages' },
        'qr-percent-of-1': { skill: 'percent-of', topic: 'Percentages' },
        'qr-percent-of-2': { skill: 'percent-of', topic: 'Percentages' },
        'qr-ratio-simplification-1': { skill: 'ratio-simplification', topic: 'Ratios' },
        'qr-ratio-simplification-2': { skill: 'ratio-simplification', topic: 'Ratios' },
        'qr-ratio-word-problems-1': { skill: 'ratio-word-problems', topic: 'Ratios' },
        'qr-ratio-proportions-1': { skill: 'ratio-proportions', topic: 'Ratios' },
        'qr-fraction-operations-1': { skill: 'fraction-operations', topic: 'Fractions' },
        'qr-fraction-operations-2': { skill: 'fraction-operations', topic: 'Fractions' },
        'qr-algebra-equations-1': { skill: 'algebra-equations', topic: 'Algebra' },
        'qr-algebra-word-problems-1': { skill: 'algebra-word-problems', topic: 'Algebra' },
        
        // VR section
        'vr-main-idea-1': { skill: 'identify-main-idea', topic: 'Reading Comprehension' },
        'vr-main-idea-2': { skill: 'identify-main-idea', topic: 'Reading Comprehension' },
        'vr-inference-1': { skill: 'draw-inferences', topic: 'Reading Comprehension' },
        'vr-arguments-1': { skill: 'evaluate-arguments', topic: 'Critical Reasoning' },
        'vr-strengthen-1': { skill: 'strengthen-weaken', topic: 'Critical Reasoning' },
        
        // DM section
        'dm-deductive-1': { skill: 'deductive-reasoning', topic: 'Logical Reasoning' },
        'dm-inductive-1': { skill: 'inductive-reasoning', topic: 'Logical Reasoning' },
        'dm-probability-1': { skill: 'basic-probability', topic: 'Probability' },
        'dm-conditional-1': { skill: 'conditional-probability', topic: 'Probability' },
        
        // SJ section
        'sj-ethical-1': { skill: 'ethical-dilemma', topic: 'Ethical Dilemmas' },
        'sj-conflict-1': { skill: 'conflict-resolution', topic: 'Ethical Dilemmas' },
        'sj-conduct-1': { skill: 'professional-conduct', topic: 'Professional Behavior' },
      } as Record<string, { skill: string; topic: string }>;
    };
    
    // Get the user's attempt data and question metadata
    const userAttempts = fetchUserAttemptData();
    const questionMetadata = fetchQuestionMetadata();
    
    // Filter questions by section if specified
    const sectionPrefix = section ? section.toLowerCase() + '-' : '';
    
    // Initialize progress tracking objects
    const skillProgress: Record<string, { correct: number; incorrect: number; total: number }> = {};
    const topicProgress: Record<string, { correct: number; incorrect: number; total: number }> = {};
    
    // Process each question in the metadata
    Object.entries(questionMetadata).forEach(([questionId, metadata]) => {
      // Skip if not in the requested section
      if (section && !questionId.startsWith(sectionPrefix)) return;
      
      const { skill, topic } = metadata;
      
      // Initialize skill progress if not exists
      if (!skillProgress[skill]) {
        skillProgress[skill] = { correct: 0, incorrect: 0, total: 0 };
      }
      
      // Initialize topic progress if not exists
      if (!topicProgress[topic]) {
        topicProgress[topic] = { correct: 0, incorrect: 0, total: 0 };
      }
      
      // Check if the user has attempted this question
      if (questionId in userAttempts) {
        // Update skill progress
        if (userAttempts[questionId]) {
          skillProgress[skill].correct += 1;
        } else {
          skillProgress[skill].incorrect += 1;
        }
        skillProgress[skill].total += 1;
      }
    });
    
    // Calculate topic totals based on skills
    // Group skills by topic
    const topicSkillMap: Record<string, string[]> = {};
    Object.entries(questionMetadata).forEach(([, metadata]) => {
      const { skill, topic } = metadata;
      if (!topicSkillMap[topic]) {
        topicSkillMap[topic] = [];
      }
      if (!topicSkillMap[topic].includes(skill)) {
        topicSkillMap[topic].push(skill);
      }
    });
    
    // Calculate topic totals
    Object.entries(topicSkillMap).forEach(([topic, skills]) => {
      if (!topicProgress[topic]) {
        topicProgress[topic] = { correct: 0, incorrect: 0, total: 0 };
      }
      
      skills.forEach(skill => {
        if (skillProgress[skill]) {
          topicProgress[topic].correct += skillProgress[skill].correct;
          topicProgress[topic].incorrect += skillProgress[skill].incorrect;
          topicProgress[topic].total += skillProgress[skill].total;
        }
      });
    });
    
    return {
      topics: topicProgress,
      skills: skillProgress
    };
  } catch (error) {
    console.error('Error fetching user progress:', error);
    return {
      topics: {},
      skills: {}
    };
  }
}