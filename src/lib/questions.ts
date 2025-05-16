import { supabase } from './supabase';
import { PracticeFilterOptions } from '@/types/practice';
import questionsJson from '../data/questions.json';

export async function fetchQuestions(filters: PracticeFilterOptions) {
  try {
    let filteredQuestions = questionsJson.questions;

    // Apply topic filters if any are selected
    if (filters.topics.length > 0) {
      filteredQuestions = filteredQuestions.filter(q => 
        filters.topics.includes(q.main_topic as any)
      );
    }

    // Apply micro skill filters if any are selected
    if (filters.microSkills.length > 0) {
      filteredQuestions = filteredQuestions.filter(q => 
        filters.microSkills.includes(q.micro_skill)
      );
    }

    // Apply difficulty filter if not adaptive
    if (filters.difficulty !== 'adaptive') {
      filteredQuestions = filteredQuestions.filter(q => 
        q.difficulty.toLowerCase() === filters.difficulty.toLowerCase()
      );
    }

    // Shuffle questions and limit to 5
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  } catch (error) {
    console.error('Error in fetchQuestions:', error);
    throw error;
  }
}

export async function fetchQuestionCounts() {
  try {
    const questions = questionsJson.questions;
    const topicCounts: Record<string, number> = {};
    const skillCounts: Record<string, number> = {};

    questions.forEach(question => {
      // Count by topic
      topicCounts[question.main_topic] = (topicCounts[question.main_topic] || 0) + 1;
      
      // Count by skill
      skillCounts[question.micro_skill] = (skillCounts[question.micro_skill] || 0) + 1;
    });

    return {
      topicCounts,
      skillCounts
    };
  } catch (error) {
    console.error('Error fetching question counts:', error);
    throw error;
  }
}

export async function fetchUserProgress() {
  // Since we're using local data, we'll return mock progress data
  return {
    topics: {
      'Percentages': { correct: 8, incorrect: 2, total: 10 },
      'Data Interpretation': { correct: 6, incorrect: 4, total: 10 },
      'Rates & Speed': { correct: 7, incorrect: 3, total: 10 }
    },
    skills: {
      'Percentage Increase': { correct: 4, incorrect: 1, total: 5 },
      'Average Calculation': { correct: 3, incorrect: 2, total: 5 },
      'Ranking from Bar Chart': { correct: 4, incorrect: 1, total: 5 },
      'Percentage of Total': { correct: 3, incorrect: 2, total: 5 },
      'Efficiency (Distance / Fuel)': { correct: 4, incorrect: 1, total: 5 }
    }
  };
}