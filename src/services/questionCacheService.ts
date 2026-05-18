/**
 * Question Cache Service
 * 
 * Manages cached questions in Supabase. Questions are generated once from
 * JSON concepts and stored for all users to access instantly.
 */

import { supabase } from '@/lib/supabase';

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
  // Image fields for featured questions
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
}

export interface FilterOptions {
  specialty?: string;
  customFilters?: string[];
  questionFormat?: string;
  limit?: number;
}

export const questionCacheService = {
  /**
   * Check if questions exist for a concept
   */
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

  /**
   * Get questions for specific concepts
   */
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
    
    console.log(`✅ Found ${data?.length || 0} cached questions`);
    return data || [];
  },

  /**
   * Get questions with granular filtering
   */
  async getFilteredQuestions(filters: FilterOptions): Promise<CachedQuestion[]> {
    let query = supabase
      .from('cached_questions')
      .select('*')
      .eq('status', 'active');
    
    if (filters.specialty) {
      query = query.eq('specialty', filters.specialty);
    }
    
    if (filters.customFilters && filters.customFilters.length > 0) {
      // Use overlaps for array intersection
      query = query.overlaps('custom_filters', filters.customFilters);
    }
    
    if (filters.questionFormat) {
      query = query.eq('question_format', filters.questionFormat);
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching filtered questions:', error);
      return [];
    }
    
    return data || [];
  },

  /**
   * Save a newly generated question to cache
   * Only works for authenticated users - fails silently for anonymous
   */
  async saveQuestion(question: QuestionInsert): Promise<CachedQuestion | null> {
    console.log('💾 Attempting to save question to cache:', { 
      concept_id: question.concept_id, 
      title: question.concept_title 
    });
    
    const { data, error } = await supabase
      .from('cached_questions')
      .insert({
        ...question,
        generated_at: new Date().toISOString(),
        status: 'active'
      } as any)
      .select()
      .single();
    
    console.log('💾 Save result:', { success: !error, error: error?.message, code: error?.code });
    
    if (error) {
      // Duplicate question - that's fine, just fetch existing
      if (error.code === '23505') {
        const existing = await this.getQuestionsForConcepts([question.concept_id]);
        return existing.find(q => q.question_stem === question.question_stem) || null;
      }
      // RLS error - user might not have permission, fail silently
      if (error.code === '42501') {
        return null;
      }
      console.error('Error saving question:', error);
      return null;
    }
    
    return data;
  },

  /**
   * Save multiple questions in batch
   * Only works for authenticated users - fails silently for anonymous
   */
  async saveQuestions(questions: QuestionInsert[]): Promise<CachedQuestion[]> {
    if (questions.length === 0) return [];
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // Skip caching for anonymous users - RLS requires authentication
    if (!user) {
      return [];
    }
    
    const questionsWithMeta = questions.map(q => ({
      ...q,
      generated_at: new Date().toISOString(),
      status: 'active'
    }));
    
    const { data, error } = await supabase
      .from('cached_questions')
      .upsert(questionsWithMeta as any, {
        onConflict: 'concept_id,question_stem',
        ignoreDuplicates: true
      })
      .select();
    
    if (error) {
      // RLS error - fail silently
      if (error.code === '42501') {
        return [];
      }
      console.error('Error batch saving questions:', error);
      return [];
    }
    
    return data || [];
  },

  /**
   * Get all available specialties
   */
  async getSpecialties(): Promise<string[]> {
    const { data, error } = await supabase
      .from('cached_questions')
      .select('specialty')
      .eq('status', 'active');
    
    if (error) {
      console.error('Error fetching specialties:', error);
      return [];
    }
    
    const specialties = [...new Set(data?.map(d => d.specialty) || [])];
    return specialties.sort();
  },

  /**
   * Get all available custom filters for a specialty
   */
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
    const uniqueFilters = [...new Set(allFilters)];
    return uniqueFilters.sort();
  },

  /**
   * Get question count by specialty
   */
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

  /**
   * Increment times_served counter
   */
  async recordQuestionServed(questionId: string): Promise<void> {
    await supabase.rpc('increment_question_served', { question_id: questionId });
  },

  /**
   * Get featured questions (pre-generated with images)
   * These are high-yield showcase questions for instant experience
   */
  async getFeaturedQuestions(limit?: number): Promise<CachedQuestion[]> {
    let query = supabase
      .from('cached_questions')
      .select('*')
      .eq('is_featured', true)
      .eq('status', 'active')
      .order('priority', { ascending: false });
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching featured questions:', error);
      return [];
    }
    
    return data || [];
  },

  /**
   * Get featured questions by condition/specialty
   */
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
    
    return data || [];
  },

  /**
   * Get featured questions by specialty
   */
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
    
    return data || [];
  },

  /**
   * Check if a featured question exists for a concept
   * Returns the featured question if found, null otherwise
   */
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
    
    if (error) {
      // No featured question found - that's fine
      return null;
    }
    
    return data;
  }
};

export default questionCacheService;
