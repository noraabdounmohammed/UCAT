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

const normalise = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim();

function isLeadIn(value: unknown): boolean {
  const clean = normalise(value);
  return Boolean(clean && clean.length <= 180 && clean.endsWith('?'));
}

function finalQuestionSentence(value: unknown): string {
  const clean = normalise(value);
  if (!clean) return '';
  const match = clean.match(/([^.!?]{8,180}\?)\s*$/);
  return match?.[1]?.trim() || '';
}

function getCachedLeadIn(cached: CachedQuestion): string {
  if (isLeadIn(cached.question_text)) return normalise(cached.question_text);
  const fromStem = finalQuestionSentence(cached.question_stem);
  return isLeadIn(fromStem) ? fromStem : '';
}

function stripLeadInFromStem(stem: unknown, leadIn: string): string {
  const cleanStem = normalise(stem);
  const cleanLeadIn = normalise(leadIn);
  if (!cleanStem || !cleanLeadIn) return cleanStem;
  if (cleanStem.endsWith(cleanLeadIn)) {
    return cleanStem.slice(0, -cleanLeadIn.length).trim();
  }
  return cleanStem;
}

function isUsableCachedQuestion(cached: CachedQuestion, requestedFormat: string): boolean {
  if (!Array.isArray(cached.options) || cached.options.length < 2 || !normalise(cached.correct_answer)) return false;
  const format = cached.question_format || requestedFormat;
  if (format !== 'ukmla_sba') return true;
  return Boolean(getCachedLeadIn(cached));
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
      // 1. Check cache, but never surface malformed UKMLA questions.
      const cached = await questionCacheService.getQuestionsForConcepts([conceptId]);
      const usableCached = cached.filter(q => isUsableCachedQuestion(q, questionFormat));

      if (usableCached.length > 0) {
        const toUse = usableCached.slice(0, questionCount);
        for (const q of toUse) {
          results.push({
            question: this.cachedToQuestionData(q),
            fromCache: true
          });
        }

        // Top up if filtering malformed cache entries left us short.
        if (toUse.length < questionCount) {
          const generated = await this.generateAndCache(conceptId, {
            questionCount: questionCount - toUse.length,
            questionFormat,
            difficulty
          });
          generated.forEach(q => results.push({ question: q, fromCache: false }));
        }
      } else {
        // 2. Generate with AI when cache is empty or malformed.
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

    const concepts = await jsonConceptLoader.getConceptsByFilter(filterName);
    const conceptIds = concepts.map(c => c.concept_id);
    const cached = await questionCacheService.getQuestionsForConcepts(conceptIds);

    const cachedByConcept: Record<string, CachedQuestion[]> = {};
    for (const q of cached) {
      if (!isUsableCachedQuestion(q, questionFormat)) continue;
      if (!cachedByConcept[q.concept_id]) cachedByConcept[q.concept_id] = [];
      cachedByConcept[q.concept_id].push(q);
    }

    const results: GeneratedQuestion[] = [];

    for (const concept of concepts) {
      const cachedForConcept = cachedByConcept[concept.concept_id] || [];

      if (cachedForConcept.length > 0) {
        const toUse = cachedForConcept.slice(0, questionCount);
        for (const q of toUse) {
          results.push({
            question: this.cachedToQuestionData(q),
            fromCache: true
          });
        }
      } else {
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

    return results.sort(() => Math.random() - 0.5).slice(0, questionCount * 10);
  },

  /**
   * Generate question with AI and save to cache
   */
  async generateAndCache(
    conceptId: string,
    options: GenerateOptions
  ): Promise<QuestionData[]> {
    const concept = await jsonConceptLoader.getConceptById(conceptId);
    if (!concept) {
      console.error(`Concept not found: ${conceptId}`);
      return [];
    }

    try {
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

      const count = options.questionCount || 1;
      const format = options.questionFormat || 'ukmla_sba';
      const results: QuestionData[] = [];
      const questionsToCache: QuestionInsert[] = [];

      for (let i = 0; i < count; i++) {
        const aiQuestion = await generateQuestionFromConcept(conceptNode, format as any);

        const leadIn = normalise((aiQuestion as any).question);
        const vignette = normalise((aiQuestion as any).clinical_vignette);
        const fullStem = normalise((aiQuestion as any).question_stem || (aiQuestion as any).stem || [vignette, leadIn].filter(Boolean).join(' '));

        // UKMLA questions without a real lead-in are unsafe to cache/display.
        if (format === 'ukmla_sba' && !isLeadIn(leadIn)) {
          console.warn('Skipping malformed generated UKMLA question with no valid lead-in', { conceptId });
          continue;
        }

        const questionData: QuestionData = {
          id: `${conceptId}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
          format: format as any,
          stem: fullStem || concept.title,
          question_stem: fullStem,
          clinical_vignette: vignette,
          question: leadIn || fullStem,
          options: (aiQuestion as any).options || [],
          correctAnswer: (aiQuestion as any).correct_answer || (aiQuestion as any).correctAnswer || '',
          explanation: (aiQuestion as any).explanation || '',
          keyFact: (aiQuestion as any).key_fact || (aiQuestion as any).keyFact || '',
          citation_id: (aiQuestion as any).citation_id || null,
          concept_id: conceptId
        };

        results.push(questionData);

        questionsToCache.push({
          concept_id: conceptId,
          concept_title: concept.title,
          concept_content: concept.content,
          specialty: concept.curriculum,
          custom_filters: concept.custom_filters,
          filter_categories: concept.filter_categories,
          question_stem: fullStem,
          // question_text is deliberately the lead-in only, never a vignette fallback.
          question_text: leadIn,
          options: (aiQuestion as any).options || [],
          correct_answer: (aiQuestion as any).correct_answer || (aiQuestion as any).correctAnswer || '',
          key_fact: (aiQuestion as any).key_fact || (aiQuestion as any).keyFact || '',
          explanation: (aiQuestion as any).explanation || '',
          citation_id: (aiQuestion as any).citation_id || null,
          question_format: format,
          difficulty: options.difficulty || 'medium'
        });
      }

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
   * Convert cached question to QuestionData format while restoring UKMLA structure.
   */
  cachedToQuestionData(cached: CachedQuestion): QuestionData {
    const leadIn = getCachedLeadIn(cached);
    const clinicalVignette = leadIn ? stripLeadInFromStem(cached.question_stem, leadIn) : normalise(cached.question_stem);

    return {
      id: cached.id,
      format: cached.question_format as any,
      stem: cached.question_stem,
      question_stem: cached.question_stem,
      clinical_vignette: cached.question_format === 'ukmla_sba' ? clinicalVignette : undefined,
      question: leadIn || cached.question_text,
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
    coverage: number;
  }> {
    const [cachedBySpecialty, totalConcepts] = await Promise.all([
      questionCacheService.getQuestionCountBySpecialty(),
      jsonConceptLoader.getTotalConceptCount()
    ]);

    const totalCached = Object.values(cachedBySpecialty).reduce((a, b) => a + b, 0);
    const uniqueConceptsCovered = Math.floor(totalCached / 1.5);

    return {
      totalCached,
      bySpecialty: cachedBySpecialty,
      totalConcepts,
      coverage: Math.round((uniqueConceptsCovered / totalConcepts) * 100)
    };
  },

  /**
   * Pre-generate questions for a set of concepts
   */
  async preGenerateForConcepts(
    conceptIds: string[],
    options: GenerateOptions = {}
  ): Promise<{ generated: number; cached: number }> {
    let generated = 0;
    let cached = 0;

    for (const conceptId of conceptIds) {
      const existing = await questionCacheService.getQuestionsForConcepts([conceptId]);
      const hasUsableCached = existing.some(q => isUsableCachedQuestion(q, options.questionFormat || 'ukmla_sba'));

      if (hasUsableCached) {
        cached++;
      } else {
        const newQuestions = await this.generateAndCache(conceptId, options);
        if (newQuestions.length > 0) generated++;
      }
    }

    return { generated, cached };
  }
};

export default cachedQuestionGenerator;
