// Supabase will be used for user progress tracking in the future
import { PracticeFilterOptions, TopicStructure } from '@/types/practice';
import { loadQuestionsForTopics, getDynamicQuestionCounts, getDynamicTopicStructure, Question } from '../utils/questionBank';

export async function fetchQuestions(filters: PracticeFilterOptions) {
  try {
    // Default to QR section if not specified
    const section = filters.section || 'QR';
    
    // Load questions based on selected topics
    let questions: Question[] = [];
    
    if (filters.topics.length > 0) {
      // Load questions for selected topics
      questions = await loadQuestionsForTopics(section, filters.topics);
    } else {
      // If no topics selected, return empty array
      return [];
    }
    
    // Apply micro skill filters if any are selected
    if (filters.microSkills.length > 0) {
      questions = questions.filter(q => 
        filters.microSkills.includes(q.micro_skill)
      );
    }
    
    // Apply difficulty filter if not adaptive
    if (filters.difficulty !== 'adaptive') {
      questions = questions.filter(q => 
        q.difficulty.toLowerCase() === filters.difficulty.toLowerCase()
      );
    }
    
    // Shuffle questions and limit to 5
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
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

// Function to fetch user progress data
export async function fetchUserProgress(section?: string) {
  try {
    // In a real app, this would be an API call
    // For now, we'll simulate with static data based on section
    if (section === 'QR') {
      return {
        topics: {
          'Percentages': { correct: 12, incorrect: 3, total: 15 },
          'Ratios': { correct: 8, incorrect: 7, total: 15 },
          'Fractions': { correct: 5, incorrect: 2, total: 7 },
          'Algebra': { correct: 3, incorrect: 5, total: 8 },
        },
        skills: {
          'percent-change': { correct: 5, incorrect: 1, total: 6 },
          'percent-of': { correct: 7, incorrect: 2, total: 9 },
          'ratio-simplification': { correct: 4, incorrect: 3, total: 7 },
          'fraction-operations': { correct: 5, incorrect: 2, total: 7 },
        }
      };
    } else if (section === 'VR') {
      return {
        topics: {
          'Reading Comprehension': { correct: 8, incorrect: 4, total: 12 },
          'Critical Reasoning': { correct: 6, incorrect: 5, total: 11 },
        },
        skills: {
          'identify-main-idea': { correct: 4, incorrect: 2, total: 6 },
          'draw-inferences': { correct: 4, incorrect: 2, total: 6 },
          'evaluate-arguments': { correct: 3, incorrect: 3, total: 6 },
          'strengthen-weaken': { correct: 3, incorrect: 2, total: 5 },
        }
      };
    } else if (section === 'DM') {
      return {
        topics: {
          'Logical Reasoning': { correct: 7, incorrect: 3, total: 10 },
          'Data Analysis': { correct: 5, incorrect: 6, total: 11 },
        },
        skills: {
          'logical-deduction': { correct: 4, incorrect: 1, total: 5 },
          'pattern-recognition': { correct: 3, incorrect: 2, total: 5 },
          'data-interpretation': { correct: 3, incorrect: 3, total: 6 },
          'decision-analysis': { correct: 2, incorrect: 3, total: 5 },
        }
      };
    } else if (section === 'SJ') {
      return {
        topics: {
          'Professional Behavior': { correct: 6, incorrect: 2, total: 8 },
          'Ethical Dilemmas': { correct: 4, incorrect: 3, total: 7 },
        },
        skills: {
          'ethical-dilemma': { correct: 4, incorrect: 1, total: 5 },
          'conflict-resolution': { correct: 3, incorrect: 2, total: 5 },
          'professional-conduct': { correct: 3, incorrect: 2, total: 5 },
        }
      };
    } else {
      // Default or other sections
      return {
        topics: {},
        skills: {}
      };
    }
  } catch (error) {
    console.error('Error fetching user progress:', error);
    throw error;
  }
}