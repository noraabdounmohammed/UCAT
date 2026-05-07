/**
 * Cached Question Generator
 * 
 * Checks Supabase cache first, generates with AI if missing, saves to cache.
 * Uses your existing AI prompts from aiQuestionGenerator.ts
 */

import { questionCacheService, type CachedQuestion, type QuestionInsert } from './questionCacheService';
import { jsonConceptLoader } from './jsonConceptLoader';
import { generateQuestionFromConcept } from './aiQuestionGenerator';
import type { QuestionData } from '@/components/practice/questionTypes';
import type { ConceptNode } from '@/types/conceptTypes';

export interface GenerateOptions {
  questionFormat?: 'ukmla_sba' | 'flashcard' | 'emq';
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface GeneratedQuestion {
  question: QuestionData;
  fromCache: boolean;
}

export const cachedQuestionGenerator = {
  /**
   * Get questions for concepts - checks cache first, generates if needed
   */
  async getQuestionsForConcepts(
    conceptIds: string[],
    options: GenerateOptions = {}
  ): Promise<GeneratedQuestion[]> {
    const { questionCount = 1, questionFormat = 'ukmla_sba', difficulty = 'medium' } = options;
    const results: GeneratedQuestion[] = [];

    for (const conceptId of conceptIds) {
      // 1. Check cache
      const cached = await questionCacheService.getQuestionsForConcepts([conceptId]);
      
      if (cached.length > 0) {
        // Use cached questions
        const toUse = cached.slice(0, questionCount);
        for (const q of toUse) {
          results.push({
            question: this.cachedToQuestionData(q),
            fromCache: true
          });
        }
      } else {
        // 2. Generate with AI
        const generated = await this.generateAndCache(conceptId, {
          questionCount,
          questionFormat,
          difficulty
        });
        
        for (const q of generated) {
          results.push({
            question: q,
            fromCache: false
          });
        }
      }
    }

    return results;
  },

  /**
   * Get questions by filter - checks cache first
   */
  async getQuestionsByFilter(
    filterName: string,
    options: GenerateOptions = {}
  ): Promise<GeneratedQuestion[]> {
    const { questionCount = 10, questionFormat = 'ukmla_sba' } = options;
    
    // Get concepts with this filter
    const concepts = await jsonConceptLoader.getConceptsByFilter(filterName);
    
    // Check which have cached questions
    const conceptIds = concepts.map(c => c.concept_id);
    const cached = await questionCacheService.getQuestionsForConcepts(conceptIds);
    
    // Group by concept
    const cachedByConcept: Record<string, CachedQuestion[]> = {};
    for (const q of cached) {
      if (!cachedByConcept[q.concept_id]) {
        cachedByConcept[q.concept_id] = [];
      }
      cachedByConcept[q.concept_id].push(q);
    }
    
    const results: GeneratedQuestion[] = [];
    
    // For each concept, use cache or generate
    for (const concept of concepts) {
      const cachedForConcept = cachedByConcept[concept.concept_id] || [];
      
      if (cachedForConcept.length > 0) {
        // Use cached
        const toUse = cachedForConcept.slice(0, questionCount);
        for (const q of toUse) {
          results.push({
            question: this.cachedToQuestionData(q),
            fromCache: true
          });
        }
      } else {
        // Generate and cache
        const generated = await this.generateAndCache(concept.concept_id, {
          ...options,
          questionCount
        });
        
        for (const q of generated) {
          results.push({
            question: q,
            fromCache: false
          });
        }
      }
    }
    
    // Shuffle results for variety
    return results.sort(() => Math.random() - 0.5).slice(0, questionCount * 10);
  },

  /**
   * Generate question with AI and save to cache
   */
  async generateAndCache(
    conceptId: string,
    options: GenerateOptions
  ): Promise<QuestionData[]> {
    // Load concept
    const concept = await jsonConceptLoader.getConceptById(conceptId);
    if (!concept) {
      console.error(`Concept not found: ${conceptId}`);
      return [];
    }
    
    try {
      // Create ConceptNode for AI generator
      const conceptNode: ConceptNode = {
        concept_id: conceptId,
        title: concept.title,
        content: concept.content,
        custom_filters: concept.custom_filters,
        prerequisites: [],
        mastery_data: {
          mastery_level: 0,
          attempts: 0,
          correct: 0,
          incorrect: 0,
          last_practiced: null
        }
      };
      
      // Generate with existing AI service
      const count = options.questionCount || 1;
      const format = options.questionFormat || 'ukmla_sba';
      const results: QuestionData[] = [];
      const questionsToCache: QuestionInsert[] = [];
      
      for (let i = 0; i < count; i++) {
        const aiQuestion = await generateQuestionFromConcept(
          conceptNode,
          format as any
        );
        
        const questionData: QuestionData = {
          id: `${conceptId}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
          format: format as any,
          stem: (aiQuestion as any).question_stem || (aiQuestion as any).stem || concept.title,
          question: (aiQuestion as any).question || (aiQuestion as any).clinical_vignette || '',
          options: (aiQuestion as any).options || [],
          correctAnswer: (aiQuestion as any).correct_answer || (aiQuestion as any).correctAnswer || '',
          explanation: (aiQuestion as any).explanation || '',
          keyFact: (aiQuestion as any).key_fact || (aiQuestion as any).keyFact || '',
          citation_id: (aiQuestion as any).citation_id || null,
          concept_id: conceptId
        };
        
        results.push(questionData);
        
        // Prepare for caching
        questionsToCache.push({
          concept_id: conceptId,
          concept_title: concept.title,
          concept_content: concept.content,
          specialty: concept.curriculum,
          custom_filters: concept.custom_filters,
          filter_categories: concept.filter_categories,
          question_stem: (aiQuestion as any).question_stem || (aiQuestion as any).stem || '',
          question_text: (aiQuestion as any).question || (aiQuestion as any).clinical_vignette || '',
          options: (aiQuestion as any).options || [],
          correct_answer: (aiQuestion as any).correct_answer || (aiQuestion as any).correctAnswer || '',
          key_fact: (aiQuestion as any).key_fact || (aiQuestion as any).keyFact || '',
          explanation: (aiQuestion as any).explanation || '',
          citation_id: (aiQuestion as any).citation_id || null,
          question_format: format,
          difficulty: options.difficulty || 'medium'
        });
      }
      
      // Save to cache (fire and forget)
      if (questionsToCache.length > 0) {
        questionCacheService.saveQuestions(questionsToCache).catch(err => {
          console.error('Failed to cache questions:', err);
        });
      }
      
      return results;
    } catch (error) {
      console.error(`Failed to generate questions for ${conceptId}:`, error);
      return [];
    }
  },

  /**
   * Convert cached question to QuestionData format
   */
  cachedToQuestionData(cached: CachedQuestion): QuestionData {
    return {
      id: cached.id,
      format: cached.question_format as any,
      stem: cached.question_stem,
      question: cached.question_text,
      options: cached.options,
      correctAnswer: cached.correct_answer,
      explanation: cached.explanation || '',
      keyFact: cached.key_fact || '',
      citation_id: cached.citation_id,
      concept_id: cached.concept_id
    };
  },

  /**
   * Get stats about cached questions
   */
  async getCacheStats(): Promise<{
    totalCached: number;
    bySpecialty: Record<string, number>;
    totalConcepts: number;
    coverage: number; // % of concepts with cached questions
  }> {
    const [cachedBySpecialty, totalConcepts] = await Promise.all([
      questionCacheService.getQuestionCountBySpecialty(),
      jsonConceptLoader.getTotalConceptCount()
    ]);
    
    const totalCached = Object.values(cachedBySpecialty).reduce((a, b) => a + b, 0);
    
    // Estimate unique concepts covered (rough)
    const uniqueConceptsCovered = Math.floor(totalCached / 1.5); // Assume ~1.5 questions per concept
    
    return {
      totalCached,
      bySpecialty: cachedBySpecialty,
      totalConcepts,
      coverage: Math.round((uniqueConceptsCovered / totalConcepts) * 100)
    };
  },

  /**
   * Pre-generate questions for a set of concepts
   * Useful for bulk seeding
   */
  async preGenerateForConcepts(
    conceptIds: string[],
    options: GenerateOptions = {}
  ): Promise<{ generated: number; cached: number }> {
    let generated = 0;
    let cached = 0;
    
    for (const conceptId of conceptIds) {
      const hasCached = await questionCacheService.hasQuestionsForConcept(conceptId);
      
      if (hasCached) {
        cached++;
      } else {
        const newQuestions = await this.generateAndCache(conceptId, options);
        if (newQuestions.length > 0) {
          generated++;
        }
      }
    }
    
    return { generated, cached };
  }
};

export default cachedQuestionGenerator;
