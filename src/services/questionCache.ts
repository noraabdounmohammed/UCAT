/**
 * Question Cache Service
 * Caches generated questions to avoid regenerating the same content.
 * Uses localStorage for instant access + Supabase for cloud backup.
 */

import { supabase } from '@/lib/supabase';

export interface CachedQuestion {
  concept_id: string;
  question_data: any;
  citation_id: string | null;
  generated_at: string;
}

const CACHE_KEY_PREFIX = 'question_cache_';

/**
 * Get cached question from localStorage first, then Supabase
 */
export async function getCachedQuestion(conceptId: string, userId?: string): Promise<CachedQuestion | null> {
  // 1. Check localStorage first (instant)
  const localKey = `${CACHE_KEY_PREFIX}${conceptId}`;
  const localData = localStorage.getItem(localKey);
  
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      console.log('📦 Cache hit (localStorage):', conceptId);
      return parsed;
    } catch (e) {
      console.warn('Failed to parse local cache:', e);
    }
  }

  // 2. Check Supabase if user is logged in
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('cached_questions')
        .select('*')
        .eq('concept_id', conceptId)
        .single();

      if (data && !error) {
        console.log('☁️ Cache hit (Supabase):', conceptId);
        // Save to localStorage for next time
        localStorage.setItem(localKey, JSON.stringify({
          concept_id: data.concept_id,
          question_data: data.question_json,
          citation_id: data.citation_id,
          generated_at: data.created_at
        }));
        return {
          concept_id: data.concept_id,
          question_data: data.question_json,
          citation_id: data.citation_id,
          generated_at: data.created_at
        };
      }
    } catch (e) {
      console.warn('Supabase cache lookup failed:', e);
    }
  }

  console.log('❌ Cache miss:', conceptId);
  return null;
}

/**
 * Save question to cache (localStorage + Supabase)
 */
export async function cacheQuestion(
  conceptId: string,
  questionData: any,
  citationId: string | null,
  userId?: string
): Promise<void> {
  const cacheEntry: CachedQuestion = {
    concept_id: conceptId,
    question_data: questionData,
    citation_id: citationId,
    generated_at: new Date().toISOString()
  };

  // 1. Save to localStorage (instant)
  const localKey = `${CACHE_KEY_PREFIX}${conceptId}`;
  try {
    localStorage.setItem(localKey, JSON.stringify(cacheEntry));
    console.log('💾 Cached to localStorage:', conceptId);
  } catch (e) {
    console.warn('Failed to cache to localStorage:', e);
  }

  // 2. Save to Supabase (background, fire-and-forget)
  if (userId) {
    supabase
      .from('cached_questions')
      .upsert({
        concept_id: conceptId,
        question_json: questionData,
        citation_id: citationId,
        user_id: userId,
        created_at: cacheEntry.generated_at
      }, { onConflict: 'concept_id' })
      .then(({ error }) => {
        if (error) {
          console.warn('Failed to cache to Supabase:', error);
        } else {
          console.log('☁️ Cached to Supabase:', conceptId);
        }
      });
  }
}

/**
 * Clear cache for a specific concept
 */
export function clearCachedQuestion(conceptId: string): void {
  const localKey = `${CACHE_KEY_PREFIX}${conceptId}`;
  localStorage.removeItem(localKey);
  console.log('🗑️ Cleared cache:', conceptId);
}

/**
 * Get all cached concept IDs from localStorage
 */
export function getCachedConceptIds(): string[] {
  const ids: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_KEY_PREFIX)) {
      ids.push(key.replace(CACHE_KEY_PREFIX, ''));
    }
  }
  return ids;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { localCount: number; totalSize: string } {
  const ids = getCachedConceptIds();
  let totalBytes = 0;
  
  ids.forEach(id => {
    const data = localStorage.getItem(`${CACHE_KEY_PREFIX}${id}`);
    if (data) {
      totalBytes += data.length * 2; // UTF-16 encoding
    }
  });

  return {
    localCount: ids.length,
    totalSize: `${(totalBytes / 1024).toFixed(1)} KB`
  };
}
