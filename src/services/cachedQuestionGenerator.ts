/**
 * Cached Question Generator
 *
 * Checks Supabase cache first, generates with AI if missing, saves to cache.
 * Uses your existing AI prompts from aiQuestionGenerator.ts
 */

import { questionCacheService, type CachedQuestion, type QuestionInsert } from './questionCacheService';
import { jsonConceptLoader, type ResolvedJsonConcept } from './jsonConceptLoader';
import { generateQuestionFromConcept } from './aiQuestionGenerator';
import { UKMLA_QUALITY_INSTRUCTIONS, reviewUKMLAQuestion, validateUKMLAQuestion } from './questionQuality';
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
const cleanBlock = (value: unknown) => String(value || '')
  .replace(/\r\n?/g, '\n')
  .split('\n')
  .map(line => line.replace(/[\t ]+/g, ' ').trim())
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

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
  const rawStem = cleanBlock(stem);
  const cleanLeadIn = normalise(leadIn);
  if (!rawStem || !cleanLeadIn) return rawStem;
  const stemAsOneLine = normalise(rawStem);
  if (stemAsOneLine.endsWith(cleanLeadIn)) {
    const lastIndex = rawStem.toLowerCase().lastIndexOf(cleanLeadIn.toLowerCase());
    if (lastIndex >= 0) return rawStem.slice(0, lastIndex).trim();
  }
  return rawStem;
}

function isUsableCachedQuestion(cached: CachedQuestion, requestedFormat: string): boolean {
  if (!Array.isArray(cached.options) || cached.options.length < 2 || !normalise(cached.correct_answer)) return false;
  const format = cached.question_format || requestedFormat;
  if (format !== 'ukmla_sba') return true;

  const leadIn = getCachedLeadIn(cached);
  if (!leadIn) return false;
  const clinicalVignette = stripLeadInFromStem(cached.question_stem, leadIn);
  return validateUKMLAQuestion({
    clinical_vignette: clinicalVignette,
    question: leadIn,
    options: cached.options,
    correct_answer: cached.correct_answer,
  }).pass;
}

/**
 * A structurally valid cached item is still stale if it was generated from an
 * older source atom. This comparison gives us automatic cache invalidation
 * whenever the canonical concept content changes.
 */
function isCacheSourceCurrent(cached: CachedQuestion, concept: ResolvedJsonConcept | null): boolean {
  if (!concept) return false;
  const currentContent = normalise(concept.content);
  const cachedContent = normalise(cached.concept_content);
  return Boolean(currentContent && cachedContent && currentContent === cachedContent);
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
      // Resolve source truth before trusting cache. A cached question generated
      // from superseded concept content is treated as a cache miss.
      const concept = await jsonConceptLoader.getConceptById(conceptId);
      const cached = await questionCacheService.getQuestionsForConcepts([conceptId]);
      const usableCached = cached.filter(q =>
        isUsableCachedQuestion(q, questionFormat) && isCacheSourceCurrent(q, concept)
      );

      if (cached.length > usableCached.length && process.env.NODE_ENV === 'development') {
        console.log('Ignoring stale or malformed cached questions', {
          conceptId,
          cached: cached.length,
          usable: usableCached.length,
          canonicalConceptId: concept?.canonical_concept_id,
          sourceTruth: concept?.source_truth,
        });
      }

      if (usableCached.length > 0) {
        const toUse = usableCached.slice(0, questionCount);
        for (const q of toUse) {
          results.push({
            question: this.cachedToQuestionData(q),
            fromCache: true
          });
        }

        // Top up if filtering malformed/stale cache entries left us short.
        if (toUse.length < questionCount) {
          const generated = await this.generateAndCache(conceptId, {
            questionCount: questionCount - toUse.length,
            questionFormat,
            difficulty
          });
          generated.forEach(q => results.push({ question: q, fromCache: false }));
        }
      } else {
        // Generate with AI when cache is empty, malformed or source-stale.
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
      const canonicalConcept = await jsonConceptLoader.getConceptById(concept.concept_id);
      const cachedForConcept = (cachedByConcept[concept.concept_id] || [])
        .filter(q => isCacheSourceCurrent(q, canonicalConcept));

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
        let aiQuestion: any = null;

        // New UKMLA items pass through a generation brief + deterministic lint + adversarial review.
        // A single retry keeps quality high without creating an unbounded latency/cost loop.
        const maxAttempts = format === 'ukmla_sba' ? 2 : 1;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const candidate = await generateQuestionFromConcept(
            conceptNode,
            format as any,
            format === 'ukmla_sba' ? UKMLA_QUALITY_INSTRUCTIONS : undefined
          );

          if (format !== 'ukmla_sba') {
            aiQuestion = candidate;
            break;
          }

          const quality = await reviewUKMLAQuestion(candidate, conceptNode);
          if (quality.pass) {
            aiQuestion = candidate;
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ UKMLA item passed quality gate', { conceptId, score: quality.score, attempt: attempt + 1 });
            }
            break;
          }

          console.warn('Rejecting generated UKMLA item', {
            conceptId,
            score: quality.score,
            reasons: quality.reasons,
            attempt: attempt + 1,
          });
        }

        if (!aiQuestion) {
          console.warn('No generated UKMLA item passed the quality gate', { conceptId });
          continue;
        }

        const leadIn = normalise(aiQuestion.question);
        const vignette = format === 'ukmla_sba' ? cleanBlock(aiQuestion.clinical_vignette) : normalise(aiQuestion.clinical_vignette);
        // For UKMLA, rebuild the combined stem from the two canonical fields rather than trusting AI formatting.
        const fullStem = format === 'ukmla_sba'
          ? [vignette, leadIn].filter(Boolean).join('\n\n')
          : normalise(aiQuestion.question_stem || aiQuestion.stem || [vignette, leadIn].filter(Boolean).join(' '));

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
          options: aiQuestion.options || [],
          correctAnswer: aiQuestion.correct_answer || aiQuestion.correctAnswer || '',
          explanation: aiQuestion.explanation || '',
          keyFact: aiQuestion.key_fact || aiQuestion.keyFact || '',
          citation_id: aiQuestion.citation_id || null,
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
          options: aiQuestion.options || [],
          correct_answer: aiQuestion.correct_answer || aiQuestion.correctAnswer || '',
          key_fact: aiQuestion.key_fact || aiQuestion.keyFact || '',
          explanation: aiQuestion.explanation || '',
          citation_id: aiQuestion.citation_id || null,
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
    const clinicalVignette = leadIn ? stripLeadInFromStem(cached.question_stem, leadIn) : cleanBlock(cached.question_stem);

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
      const [existing, concept] = await Promise.all([
        questionCacheService.getQuestionsForConcepts([conceptId]),
        jsonConceptLoader.getConceptById(conceptId)
      ]);
      const hasUsableCached = existing.some(q =>
        isUsableCachedQuestion(q, options.questionFormat || 'ukmla_sba') &&
        isCacheSourceCurrent(q, concept)
      );

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