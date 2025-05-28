// Supabase will be used for user progress tracking in the future
import { PracticeFilterOptions, TopicStructure, InteractionStatus } from '@/types/practice';
import { loadQuestionsForSection, getDynamicQuestionCounts, getDynamicTopicStructure, Question } from '../utils/questionBank';

// Define a type for question with topic property
interface QuestionWithTopic extends Question {
  topic: string;
}

// Define a type for question with user interaction
interface QuestionWithInteraction extends Question {
  user_interaction: InteractionStatus;
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
    
    // Load all questions for the section
    const allQuestions = await loadQuestionsForSection(section);
    
    if (!allQuestions || allQuestions.length === 0) {
      console.error(`No questions found for section: ${section}`);
      return [];
    }
    
    // Use the same filtering logic as in countFilteredQuestions to ensure consistency
    const hasTopicFilter = filters.topics.length > 0;
    const hasSkillFilter = filters.microSkills.length > 0;
    const hasDifficultyFilter = filters.difficulty && filters.difficulty !== 'adaptive';
    const hasStatusFilter = filters.interactionStatus && filters.interactionStatus.length > 0;
    
    // If no filters are applied, use all questions
    if (!hasTopicFilter && !hasSkillFilter && !hasDifficultyFilter && !hasStatusFilter) {
      // Shuffle questions and limit to 10 (or another appropriate number)
      const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 10);
    }
    
    // Filter questions based on selected criteria
    const filteredQuestions = allQuestions.filter(question => {
      // Topic filter
      if (hasTopicFilter) {
        const questionTopic = question.main_topic || (question as QuestionWithTopic).topic;
        if (!questionTopic) return false;
        
        // Normalize the question topic for comparison
        const normalizedQuestionTopic = String(questionTopic).toLowerCase().trim();
        
        // Check if any of the selected topics match this question
        const topicMatches = filters.topics.some(topic => {
          // Normalize the filter topic for comparison
          const topicValue = typeof topic === 'string' ? topic : String(topic);
          const normalizedFilterTopic = topicValue.toLowerCase().trim();
          
          // Use flexible matching to handle variations in topic naming
          return normalizedQuestionTopic === normalizedFilterTopic || 
                 normalizedQuestionTopic.includes(normalizedFilterTopic) || 
                 normalizedFilterTopic.includes(normalizedQuestionTopic);
        });
        
        if (!topicMatches) return false;
      }
      
      // Micro skill filter
      if (hasSkillFilter) {
        const questionMicroSkill = question.micro_skill;
        if (!questionMicroSkill) return false;
        
        // Normalize the question micro skill for comparison
        const normalizedQuestionMicroSkill = String(questionMicroSkill).toLowerCase().trim();
        
        // Check if any of the selected micro skills match this question
        const microSkillMatches = filters.microSkills.some(skill => {
          // Normalize the filter micro skill for comparison
          const normalizedFilterMicroSkill = String(skill).toLowerCase().trim();
          
          // Use flexible matching to handle variations in skill naming
          return normalizedQuestionMicroSkill === normalizedFilterMicroSkill || 
                 normalizedQuestionMicroSkill.includes(normalizedFilterMicroSkill) || 
                 normalizedFilterMicroSkill.includes(normalizedQuestionMicroSkill) ||
                 // Handle ID-based matching (e.g., 'percent-change' vs 'Percentage Change')
                 (normalizedQuestionMicroSkill.replace(/\s+/g, '-') === normalizedFilterMicroSkill) ||
                 (normalizedFilterMicroSkill.replace(/\s+/g, '-') === normalizedQuestionMicroSkill);
        });
        
        if (!microSkillMatches) return false;
      }
      
      // Difficulty filter
      if (hasDifficultyFilter) {
        // Skip difficulty filtering if 'adaptive' is selected
        if (filters.difficulty === 'adaptive') {
          // Adaptive difficulty means we include all difficulties
          // No filtering needed
        } else {
          // Get the difficulty from the question, defaulting to 'medium' if not present
          const questionDifficulty = question.difficulty || 'Medium';
          
          // Normalize the question difficulty for comparison
          const normalizedQuestionDifficulty = String(questionDifficulty).toLowerCase().trim();
          
          // Get the filter difficulties as an array
          const difficulties = Array.isArray(filters.difficulty) ? filters.difficulty : [filters.difficulty];
          
          // Check if any of the selected difficulties match this question
          const difficultyMatches = difficulties.some(difficulty => {
            // Skip 'adaptive' as it's a special case that includes all difficulties
            if (difficulty === 'adaptive') return true;
            
            // Normalize the filter difficulty for comparison
            const normalizedFilterDifficulty = String(difficulty).toLowerCase().trim();
            
            return normalizedQuestionDifficulty === normalizedFilterDifficulty;
          });
          
          if (!difficultyMatches) return false;
        }
      }
      
      // Interaction status filter (if applicable)
      if (hasStatusFilter) {
        // In a real app, this would check the user's interaction status with this question
        // For now, we'll assume all questions are 'unseen' unless specified otherwise
        const defaultStatus: InteractionStatus = 'unseen';
        const questionStatus = (question as QuestionWithInteraction).user_interaction || defaultStatus;
        
        // Normalize the question status for comparison
        const normalizedQuestionStatus = String(questionStatus).toLowerCase().trim();
        
        // Check if any of the selected interaction statuses match this question
        const statusMatches = filters.interactionStatus.some(status => {
          // Normalize the filter status for comparison
          const normalizedFilterStatus = String(status).toLowerCase().trim();
          
          return normalizedQuestionStatus === normalizedFilterStatus;
        });
        
        if (!statusMatches) return false;
      }
      
      // If it passed all filters, include it
      return true;
    });
    
    // If no questions match the filters, return an empty array
    if (filteredQuestions.length === 0) {
      console.warn('No questions match the selected filters');
      return [];
    }
    
    // Shuffle questions and limit to 10 (or another appropriate number)
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
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
    // Clear the cache if it gets too large to prevent memory issues
    if (Object.keys(questionCountCache).length > 100) {
      // Keep only the 20 most recently used keys
      const keysToKeep = Object.keys(questionCountCache).slice(-20);
      const newCache: Record<string, number> = {};
      keysToKeep.forEach(key => {
        newCache[key] = questionCountCache[key];
      });
      Object.assign(questionCountCache, newCache);
    }
    
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
    
    // If no specific filters are applied, return the total count
    const hasTopicFilter = filters.topics.length > 0;
    const hasSkillFilter = filters.microSkills.length > 0;
    const hasDifficultyFilter = filters.difficulty && filters.difficulty !== 'adaptive';
    const hasStatusFilter = filters.interactionStatus && filters.interactionStatus.length > 0;
    
    if (!hasTopicFilter && !hasSkillFilter && !hasDifficultyFilter && !hasStatusFilter) {
      const count = allQuestions.length;
      questionCountCache[cacheKey] = count;
      return count;
    }
    
    // Filter questions based on selected criteria (using a single pass through the data)
    const filteredQuestions = allQuestions.filter(question => {
      // Topic filter
      if (hasTopicFilter) {
        // Get the topic from either main_topic or topic property
        const questionTopic = question.main_topic || (question as QuestionWithTopic).topic;
        
        // If question has no topic, it can't match a topic filter
        if (!questionTopic) {
          return false;
        }
        
        // Normalize the question topic for comparison
        const normalizedQuestionTopic = String(questionTopic).toLowerCase().trim();
        
        // Check if any of the selected topics match this question
        // Use includes instead of exact match to handle partial matches
        const topicMatches = filters.topics.some(topic => {
          // Normalize the filter topic for comparison
          const topicValue = typeof topic === 'string' ? topic : String(topic);
          const normalizedFilterTopic = topicValue.toLowerCase().trim();
          
          // Check for exact match or if the question topic contains the filter topic
          return normalizedQuestionTopic === normalizedFilterTopic || 
                 normalizedQuestionTopic.includes(normalizedFilterTopic) || 
                 normalizedFilterTopic.includes(normalizedQuestionTopic);
        });
        
        if (!topicMatches) {
          return false;
        }
      }
      
      // Micro skill filter
      if (hasSkillFilter) {
        // Get the micro skill from the question
        const questionMicroSkill = question.micro_skill;
        
        // If question has no micro skill, it can't match a skill filter
        if (!questionMicroSkill) {
          return false;
        }
        
        // Normalize the question micro skill for comparison
        const normalizedQuestionMicroSkill = String(questionMicroSkill).toLowerCase().trim();
        
        // Check if any of the selected micro skills match this question
        const microSkillMatches = filters.microSkills.some(skill => {
          // Normalize the filter micro skill for comparison
          const normalizedFilterMicroSkill = String(skill).toLowerCase().trim();
          
          // Use flexible matching to handle variations in skill naming
          return normalizedQuestionMicroSkill === normalizedFilterMicroSkill || 
                 normalizedQuestionMicroSkill.includes(normalizedFilterMicroSkill) || 
                 normalizedFilterMicroSkill.includes(normalizedQuestionMicroSkill) ||
                 // Handle ID-based matching (e.g., 'percent-change' vs 'Percentage Change')
                 (normalizedQuestionMicroSkill.replace(/\s+/g, '-') === normalizedFilterMicroSkill) ||
                 (normalizedFilterMicroSkill.replace(/\s+/g, '-') === normalizedQuestionMicroSkill);
        });
        
        if (!microSkillMatches) {
          return false;
        }
      }
      
      // Difficulty filter
      if (hasDifficultyFilter) {
        // Skip difficulty filtering if 'adaptive' is selected
        if (filters.difficulty === 'adaptive') {
          // Adaptive difficulty means we include all difficulties
          // No filtering needed
        } else {
          // Get the difficulty from the question, defaulting to 'medium' if not present
          const questionDifficulty = question.difficulty || 'Medium';
          
          // Normalize the question difficulty for comparison
          const normalizedQuestionDifficulty = String(questionDifficulty).toLowerCase().trim();
          
          // Get the filter difficulties as an array
          const difficulties = Array.isArray(filters.difficulty) ? filters.difficulty : [filters.difficulty];
          
          // Check if any of the selected difficulties match this question
          const difficultyMatches = difficulties.some(difficulty => {
            // Skip 'adaptive' as it's a special case that includes all difficulties
            if (difficulty === 'adaptive') return true;
            
            // Normalize the filter difficulty for comparison
            const normalizedFilterDifficulty = String(difficulty).toLowerCase().trim();
            
            return normalizedQuestionDifficulty === normalizedFilterDifficulty;
          });
          
          if (!difficultyMatches) {
            return false;
          }
        }
      }
      
      // Interaction status filter (if applicable)
      if (hasStatusFilter) {
        // In a real app, this would check the user's interaction status with this question
        // For now, we'll assume all questions are 'unseen' unless specified otherwise
        const defaultStatus: InteractionStatus = 'unseen';
        
        // Get the interaction status from the question or use the default
        const questionStatus = (question as QuestionWithInteraction).user_interaction || defaultStatus;
        
        // Normalize the question status for comparison
        const normalizedQuestionStatus = String(questionStatus).toLowerCase().trim();
        
        // Check if any of the selected interaction statuses match this question
        const statusMatches = filters.interactionStatus.some(status => {
          // Normalize the filter status for comparison
          const normalizedFilterStatus = String(status).toLowerCase().trim();
          
          return normalizedQuestionStatus === normalizedFilterStatus;
        });
        
        if (!statusMatches) {
          return false;
        }
      }
      
      // If it passed all filters, include it
      return true;
    });
    
    const finalCount = filteredQuestions.length;
    
    // Only log minimal information in production
    if (finalCount === 0 && (hasTopicFilter || hasSkillFilter || hasDifficultyFilter || hasStatusFilter)) {
      console.log('No questions match the selected filters:', {
        section: filters.section,
        topicsCount: filters.topics.length,
        microSkillsCount: filters.microSkills.length,
        difficulty: filters.difficulty
      });
    }
    
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