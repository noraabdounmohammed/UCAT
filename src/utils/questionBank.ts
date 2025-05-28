import { useState, useEffect } from 'react';
import { TopicStructure, MicroSkill, MainTopic } from '@/types/practice';

// Type definitions for our question structure
export interface QuestionIndex {
  sections: {
    [sectionKey: string]: {
      name: string;
      topics: {
        [topicKey: string]: {
          file: string;
          count: number;
          microSkills: string[];
        };
      };
    };
  };
  lastUpdated: string;
}

export interface Question {
  id: string;
  section: string;
  set_id: string;
  set_name: string;
  question_stem: string;
  individual_question: string;
  options: string[];
  correct_answer: string;
  worked_solution: string;
  data_type: string;
  data_block: Array<{ label: string; value: number }>;
  explanation_audio_url: string | null;
  main_topic: string;
  micro_skill: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  created_at: string;
}

import { loadQuestionDatabase } from '@/lib/questionDatabase';

// Function to load the question index from the centralized database
export async function loadQuestionIndex(): Promise<QuestionIndex> {
  try {
    // Load from the centralized database instead of index.json
    const database = await loadQuestionDatabase();
    
    // Convert the centralized database format to the expected QuestionIndex format
    const index: QuestionIndex = {
      sections: {
        'QR': {
          name: 'Quantitative Reasoning',
          topics: {}
        },
        'VR': {
          name: 'Verbal Reasoning',
          topics: {}
        },
        'DM': {
          name: 'Decision Making',
          topics: {}
        },
        'SJ': {
          name: 'Situational Judgement',
          topics: {}
        }
      },
      lastUpdated: database.lastUpdated
    };
    
    // Generate topics from the topicIndex in the database
    Object.entries(database.topicIndex).forEach(([topicKey, questionIds]) => {
      // Get all microSkills for this topic
      const microSkills = new Set<string>();
      let sectionKey = 'QR'; // Default section
      
      // Find which section this topic belongs to by checking the first question
      if (questionIds.length > 0) {
        const firstQuestion = database.questions[questionIds[0]];
        if (firstQuestion && firstQuestion.section) {
          sectionKey = firstQuestion.section;
        }
      }
      
      // Collect all microSkills for this topic
      questionIds.forEach(id => {
        const question = database.questions[id];
        if (question && question.microSkill) {
          microSkills.add(question.microSkill);
        }
      });
      
      // Add the topic to the appropriate section index
      if (index.sections[sectionKey]) {
        index.sections[sectionKey].topics[topicKey] = {
          file: '', // No longer using file paths
          count: questionIds.length,
          microSkills: Array.from(microSkills)
        };
      }
    });
    
    return index;
  } catch (error) {
    console.error('Failed to load question index from database:', error);
    throw new Error('Failed to load question data from centralized database');
  }
}

// Function to count questions in the centralized database
export async function getDynamicQuestionCounts(section?: string): Promise<{
  topics: Record<string, number>;
  skills: Record<string, number>;
  total: number;
}> {
  try {
    // Load the centralized database
    const database = await loadQuestionDatabase();
    const topicCounts: Record<string, number> = {};
    const skillCounts: Record<string, number> = {};
    let totalQuestions = 0;
    
    // Get the question IDs for the specified section, or all questions if no section is specified
    const questionIds = section ? (database.sectionIndex[section] || []) : Object.keys(database.questions);
    
    // Count questions by topic and skill
    for (const id of questionIds) {
      const question = database.questions[id];
      if (!question) continue;
      
      // Count by topic
      const topic = question.topic;
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      
      // Count by skill
      const skill = question.microSkill;
      if (skill) {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      }
      
      // Increment total count
      totalQuestions++;
    }
    
    console.log('Question counts:', { topics: topicCounts, skills: skillCounts, total: totalQuestions });
    
    return {
      topics: topicCounts,
      skills: skillCounts,
      total: totalQuestions
    };
  } catch (error) {
    console.error('Failed to get dynamic question counts:', error);
    return { topics: {}, skills: {}, total: 0 };
  }
}

// Function to dynamically generate the topic structure based on the questions in the centralized database
export async function getDynamicTopicStructure(section?: string): Promise<TopicStructure[]> {
  try {
    // Load the centralized database
    const database = await loadQuestionDatabase();
    const topicStructure: TopicStructure[] = [];
    const topicSkillMap: Record<string, Set<string>> = {};
    const skillDetailsMap: Record<string, MicroSkill> = {};
    
    // Get question IDs for the specified section if provided
    const questionIds = section ? (database.sectionIndex[section] || []) : Object.keys(database.questions);
    
    // Process only questions from the specified section
    for (const id of questionIds) {
      const question = database.questions[id];
      if (!question) continue;
      const topicName = question.topic;
      const microSkill = question.microSkill;
      
      if (topicName && microSkill) {
        // Initialize topic in the map if it doesn't exist
        if (!topicSkillMap[topicName]) {
          topicSkillMap[topicName] = new Set<string>();
        }
        
        // Add skill to the topic's skill set
        topicSkillMap[topicName].add(microSkill);
        
        // Store skill details if not already stored
        if (!skillDetailsMap[microSkill]) {
          // Create a more user-friendly display name from the ID
          const displayName = microSkill
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
            
          skillDetailsMap[microSkill] = {
            id: microSkill,
            name: displayName, // Convert ID to a readable name
            topic: topicName as MainTopic
          };
        }
      }
    }
    
    // Convert the maps to the expected TopicStructure format
    for (const [topicName, skillSet] of Object.entries(topicSkillMap)) {
      const skills = Array.from(skillSet).map(skillId => skillDetailsMap[skillId]);
      
      if (skills.length > 0) {
        topicStructure.push({
          topic: topicName as MainTopic,
          skills: skills
        });
      }
    }
    
    console.log('Generated topic structure:', topicStructure);
    return topicStructure;
  } catch (error) {
    console.error('Failed to generate dynamic topic structure:', error);
    return [];
  }
}

// Function to load questions for specific topics from the centralized database
export async function loadQuestionsForTopics(section: string, topics: string[]): Promise<Question[]> {
  try {
    // Load from the centralized database
    const database = await loadQuestionDatabase();
    const allQuestions: Question[] = [];
    
    // Get question IDs for this section
    const sectionQuestionIds = database.sectionIndex[section] || [];
    if (sectionQuestionIds.length === 0) {
      console.warn(`No questions found for section ${section}`);
      return [];
    }
    
    // Filter questions by the requested topics
    for (const topic of topics) {
      const topicQuestionIds = database.topicIndex[topic as MainTopic] || [];
      
      // Find questions that are both in the section and in the topic
      const filteredIds = topicQuestionIds.filter(id => sectionQuestionIds.includes(id));
      
      // Convert each question to the expected format
      for (const id of filteredIds) {
        const dbQuestion = database.questions[id];
        if (dbQuestion) {
          // Map from our centralized format to the expected Question format
          const question: Question = {
            id: dbQuestion.id,
            section: dbQuestion.section,
            set_id: '',
            set_name: '',
            question_stem: '',
            individual_question: dbQuestion.content,
            options: dbQuestion.options || [],
            correct_answer: String.fromCharCode(65 + (dbQuestion.correctAnswer || 0)),
            worked_solution: dbQuestion.explanation || '',
            data_type: '',
            data_block: [],
            explanation_audio_url: null,
            main_topic: dbQuestion.topic,
            micro_skill: dbQuestion.microSkill,
            difficulty: dbQuestion.difficulty.charAt(0).toUpperCase() + 
              dbQuestion.difficulty.slice(1) as 'Easy' | 'Medium' | 'Hard',
            created_at: new Date().toISOString()
          };
          
          allQuestions.push(question);
        }
      }
    }
    
    console.log(`Loaded ${allQuestions.length} questions for topics:`, topics);
    return allQuestions;
  } catch (error) {
    console.error('Failed to load questions for topics from database:', error);
    throw new Error('Failed to load question data from centralized database');
  }
}

// Function to load all questions for a section from the centralized database
// Function to get available sections from the centralized database
export async function getAvailableSections(): Promise<string[]> {
  try {
    const database = await loadQuestionDatabase();
    return Object.keys(database.sectionIndex || {});
  } catch (error) {
    console.error('Failed to get sections from database:', error);
    return [];
  }
}

// Cache for storing questions by section to prevent redundant loading
const questionsBySection: Record<string, Question[]> = {};

export async function loadQuestionsForSection(section: string): Promise<Question[]> {
  try {
    // Check cache first to avoid redundant loading
    if (questionsBySection[section]) {
      return questionsBySection[section];
    }
    
    // Load questions directly from the centralized database
    const database = await loadQuestionDatabase();
    
    // Get question IDs for this section
    const questionIds = database.sectionIndex[section] || [];
    
    if (questionIds.length === 0) {
      // Silently return empty array instead of logging warning
      return [];
    }
    
    // Map the questions to the expected format - avoid logging each question
    const questions = questionIds.map(id => {
      const dbQuestion = database.questions[id];
      if (!dbQuestion) return null;
      
      // Map all required fields from the database question to our Question type
      // Ensure all required fields are present and properly formatted
      const mappedQuestion = {
        id: dbQuestion.id,
        section: dbQuestion.section,
        set_id: dbQuestion.id,
        set_name: dbQuestion.topic,
        
        // For the question content, use content field or create from question data
        question_stem: '',
        individual_question: dbQuestion.content,
        
        // Ensure options is an array of strings
        options: Array.isArray(dbQuestion.options) ? dbQuestion.options : [],
        
        // Convert correctAnswer from index to letter format (0 -> A, 1 -> B, etc.)
        correct_answer: typeof dbQuestion.correctAnswer === 'number' 
          ? String.fromCharCode(65 + dbQuestion.correctAnswer) 
          : 'A',
        
        // Use explanation field for worked solution
        worked_solution: dbQuestion.explanation || '',
        
        // Initialize empty data fields
        data_type: '',
        data_block: [],
        explanation_audio_url: null,
        
        // Topic and skill information
        main_topic: dbQuestion.topic,
        micro_skill: dbQuestion.microSkill, // This must match exactly with the ID in filters
        
        // Format difficulty with first letter capitalized
        difficulty: typeof dbQuestion.difficulty === 'string'
          ? dbQuestion.difficulty.charAt(0).toUpperCase() + dbQuestion.difficulty.slice(1) as 'Easy' | 'Medium' | 'Hard'
          : 'Medium',
          
        created_at: new Date().toISOString()
      } as Question;
      
      return mappedQuestion;
    }).filter(q => q !== null) as Question[];
    
    // Store in cache for future use
    questionsBySection[section] = questions;
    
    return questions;
  } catch (error) {
    console.error('Failed to load questions for section from database:', error);
    throw new Error(`Failed to load questions for section ${section}`);
  }
}

// Custom hook to get all available sections
export function useSections() {
  const [sections, setSections] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        setLoading(true);
        // Get available sections from the database
        const availableSections = await getAvailableSections();
        
        // Map section IDs to their names and details
        const sectionData = availableSections.map((id: string) => ({
          id,
          name: id === 'QR' ? 'Quantitative Reasoning' :
                id === 'VR' ? 'Verbal Reasoning' :
                id === 'DM' ? 'Decision Making' :
                id === 'SJ' ? 'Situational Judgement' : id
        }));
        
        setSections(sectionData);
      } catch (err) {
        console.error('Error fetching sections:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch sections'));
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

  return { sections, loading, error };
}

// Custom hook to get topics for a section
export function useTopics(section: string) {
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTopics() {
      try {
        if (!section) {
          setTopics([]);
          setLoading(false);
          return;
        }
        
        const index = await loadQuestionIndex();
        const sectionData = index.sections[section];
        
        if (!sectionData) {
          setTopics([]);
          setLoading(false);
          return;
        }
        
        const topicsData = Object.keys(sectionData.topics);
        setTopics(topicsData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    }

    fetchTopics();
  }, [section]);

  return { topics, loading, error };
}

// Custom hook to get micro skills for a topic
export function useMicroSkills(section: string, topic: string) {
  const [microSkills, setMicroSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchMicroSkills() {
      try {
        if (!section || !topic) {
          setMicroSkills([]);
          setLoading(false);
          return;
        }
        
        const index = await loadQuestionIndex();
        const topicData = index.sections[section]?.topics[topic];
        
        if (!topicData) {
          setMicroSkills([]);
          setLoading(false);
          return;
        }
        
        setMicroSkills(topicData.microSkills);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    }

    fetchMicroSkills();
  }, [section, topic]);

  return { microSkills, loading, error };
}

// Function to get all available micro skills across all topics in a section
export async function getAllMicroSkillsForSection(section: string): Promise<string[]> {
  try {
    const index = await loadQuestionIndex();
    const sectionData = index.sections[section];
    
    if (!sectionData) {
      return [];
    }
    
    const allMicroSkills = new Set<string>();
    
    Object.values(sectionData.topics).forEach(topic => {
      topic.microSkills.forEach(skill => allMicroSkills.add(skill));
    });
    
    return Array.from(allMicroSkills);
  } catch (error) {
    console.error('Failed to load micro skills for section:', error);
    throw new Error('Failed to load question data');
  }
}
