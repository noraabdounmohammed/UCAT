/**
 * Question Cache Service
 *
 * Manages cached questions in Supabase. Questions are generated once from
 * JSON concepts and stored for all users to access instantly.
 */

import { supabase } from '@/lib/supabase';
import { normaliseFlashcardForCache, validateFlashcardCandidate } from '@/services/flashcardQuality';

export interface CachedQuestion {
  id: string;
  concept_id: string;
  concept_title: string;
  concept_content: string | null;
  specialty: string;
  custom_filters: string[];
  filter_categories: any[];
  question_stem: string;
  question_text: string;
  options: { id: string; text: string }[];
  correct_answer: string;
  key_fact: string | null;
  explanation: string | null;
  citation_id: string | null;
  question_format: string;
  difficulty: string;
  generated_at: string;
  status: string;
  quality_gate_version?: string | null;
  quality_checked_at?: string | null;
  quality_score?: number | null;
  vignette_image_url?: string | null;
  explanation_image_url?: string | null;
  memory_hook?: string | null;
  is_featured?: boolean;
  priority?: number;
  condition_name?: string | null;
}

export interface QuestionInsert {
  concept_id: string;
  concept_title: string;
  concept_content?: string;
  specialty: string;
  custom_filters: string[];
  filter_categories?: any[];
  question_stem: string;
  question_text: string;
  options: { id: string; text: string }[];
  correct_answer: string;
  key_fact?: string;
  explanation?: string;
  citation_id?: string;
  question_format?: string;
  difficulty?: string;
  quality_gate_version?: string;
  quality_checked_at?: string;
  quality_score?: number;
}

export interface FilterOptions {
  specialty?: string;
  customFilters?: string[];
  questionFormat?: string;
  limit?: number;
}

const prepareCachedQuestions = (questions: CachedQuestion[]): CachedQuestion[] => questions.flatMap(question => {
  if (question.question_format !== 'flashcard') return [question];

  const quality = validateFlashcardCandidate(question, question.concept_content ?? '');
  if (!quality.pass) {
    console.warn('Rejected cached flashcard at serve time', {
      id: question.id,
      concept_id: question.concept_id,
      reasons: quality.reasons,
    });
    return [];
  }

  return [{ ...question, question_stem: quality.front, question_text: quality.front }];
});

export const questionCacheService = {
  async hasQuestionsForConcept(conceptId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('cached_questions')
      .select('*', { count: 'exact', head: true })
      .eq('concept_id', conceptId)
      .eq('status', 'active');

    if (error) {
      console.error('Error checking cached questions:', error);
      return false;
    }

    return (count ?? 0) > 0;
  },

  async getQuestionsForConcepts(conceptIds: string[]): Promise<CachedQuestion[]> {
    if (conceptIds.length === 0) return [];

    console.log('🔍 Looking for cached questions for concepts:', conceptIds.slice(0, 3));

    const { data, error } = await supabase
      .from('cached_questions')
      .select('*')
      .in('concept_id', conceptIds)
      .eq('status', 'active');

    if (error) {
      console.error('❌ Error fetching cached questions:', error);
      return [];
    }

    const prepared = prepareCachedQuestions((data || []) as CachedQuestion[]);
    console.log(`✅ Found ${prepared.length} publishable cached questions`);
    return prepared;
  },

  async getFilteredQuestions(filters: FilterOptions): Promise<CachedQuestion[]> {
    let query = supabase
      .from('cached_questions')
      .select('*')
      .eq('status', 'active');

    if (filters.specialty) query = query.eq('specialty', filters.specialty);
    if (filters.customFilters && filters.customFilters.length > 0) query = query.overlaps('custom_filters', filters.customFilters);
    if (filters.questionFormat) query = query.eq('question_format', filters.questionFormat);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching filtered questions:', error);
      return [];
    }

    return prepareCachedQuestions((data || []) as CachedQuestion[]);
  },

  async saveQuestion(question: QuestionInsert): Promise<CachedQuestion | null> {
    const prepared = normaliseFlashcardForCache(question as any);
    if (!prepared.quality.pass) {
      console.warn('Refusing to cache low-quality flashcard', {
        concept_id: question.concept_id,
        reasons: prepared.quality.reasons,
      });
      return null;
    }

    const insertQuestion = prepared.question as QuestionInsert;
    console.log('💾 Attempting to save question to cache:', {
      concept_id: insertQuestion.concept_id,
      title: insertQuestion.concept_title,
    });

    const { data, error } = await supabase
      .from('cached_questions')
      .insert({
        ...insertQuestion,
        generated_at: new Date().toISOString(),
        status: 'active',
        ...(insertQuestion.question_format === 'flashcard' ? {
          quality_gate_version: 'flashcard_deterministic_v1_2026-08-27',
          quality_checked_at: new Date().toISOString(),
          quality_score: 100,
        } : {}),
      } as any)
      .select()
      .single();

    console.log('💾 Save result:', { success: !error, error: error?.message, code: error?.code });

    if (error) {
      if (error.code === '23505') {
        const existing = await this.getQuestionsForConcepts([insertQuestion.concept_id]);
        return existing.find(q => q.question_stem === insertQuestion.question_stem) || null;
      }
      if (error.code === '42501') return null;
      console.error('Error saving question:', error);
      return null;
    }

    return data;
  },

  async saveQuestions(questions: QuestionInsert[]): Promise<CachedQuestion[]> {
    if (questions.length === 0) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const questionsWithMeta = questions.flatMap(question => {
      const prepared = normaliseFlashcardForCache(question as any);
      if (!prepared.quality.pass) {
        console.warn('Refusing to batch-cache low-quality flashcard', {
          concept_id: question.concept_id,
          reasons: prepared.quality.reasons,
        });
        return [];
      }

      const clean = prepared.question as QuestionInsert;
      return [{
        ...clean,
        generated_at: new Date().toISOString(),
        status: 'active',
        ...(clean.question_format === 'flashcard' ? {
          quality_gate_version: 'flashcard_deterministic_v1_2026-08-27',
          quality_checked_at: new Date().toISOString(),
          quality_score: 100,
        } : {}),
      }];
    });

    if (questionsWithMeta.length === 0) return [];

    const { data, error } = await supabase
      .from('cached_questions')
      .upsert(questionsWithMeta as any, {
        onConflict: 'concept_id,question_stem',
        ignoreDuplicates: true,
      })
      .select();

    if (error) {
      if (error.code === '42501') return [];
      console.error('Error batch saving questions:', error);
      return [];
    }

    return prepareCachedQuestions((data || []) as CachedQuestion[]);
  },

  async getSpecialties(): Promise<string[]> {
    const { data, error } = await supabase
      .from('cached_questions')
      .select('specialty')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching specialties:', error);
      return [];
    }

    return [...new Set(data?.map(d => d.specialty) || [])].sort();
  },

  async getFiltersForSpecialty(specialty: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('cached_questions')
      .select('custom_filters')
      .eq('specialty', specialty)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching filters:', error);
      return [];
    }

    const allFilters = data?.flatMap(d => d.custom_filters || []) || [];
    return [...new Set(allFilters)].sort();
  },

  async getQuestionCountBySpecialty(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('cached_questions')
      .select('specialty')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching question counts:', error);
      return {};
    }

    const counts: Record<string, number> = {};
    data?.forEach(d => {
      counts[d.specialty] = (counts[d.specialty] || 0) + 1;
    });
    return counts;
  },

  async recordQuestionServed(questionId: string): Promise<void> {
    await supabase.rpc('increment_question_served', { question_id: questionId });
  },

  async getFeaturedQuestions(limit?: number): Promise<CachedQuestion[]> {
    let query = supabase
      .from('cached_questions')
      .select('*')
      .eq('is_featured', true)
      .eq('status', 'active')
      .order('priority', { ascending: false });

    if (limit) query = query.limit(limit);
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching featured questions:', error);
      return [];
    }

    return prepareCachedQuestions((data || []) as CachedQuestion[]);
  },

  async getFeaturedByCondition(conditionName: string): Promise<CachedQuestion[]> {
    const { data, error } = await supabase
      .from('cached_questions')
      .select('*')
      .eq('is_featured', true)
      .eq('condition_name', conditionName)
      .eq('status', 'active')
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching featured questions by condition:', error);
      return [];
    }

    return prepareCachedQuestions((data || []) as CachedQuestion[]);
  },

  async getFeaturedBySpecialty(specialty: string): Promise<CachedQuestion[]> {
    const { data, error } = await supabase
      .from('cached_questions')
      .select('*')
      .eq('is_featured', true)
      .eq('specialty', specialty)
      .eq('status', 'active')
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching featured questions by specialty:', error);
      return [];
    }

    return prepareCachedQuestions((data || []) as CachedQuestion[]);
  },

  async getFeaturedForConcept(conceptTitle: string): Promise<CachedQuestion | null> {
    const { data, error } = await supabase
      .from('cached_questions')
      .select('*')
      .eq('is_featured', true)
      .eq('concept_title', conceptTitle)
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    const prepared = prepareCachedQuestions([data as CachedQuestion]);
    return prepared[0] ?? null;
  },
};

export default questionCacheService;
