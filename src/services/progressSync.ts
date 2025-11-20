import { supabase } from '@/lib/supabase';
import type { ConceptNode } from '@/types/conceptTypes';

export interface UserConcept {
  user_id: string;
  curriculum_id: string;
  concept_id: string;
  title: string;
  content: string;
  custom_filters: string[];
  mastery_level: number;
  attempts: number;
  correct: number;
  incorrect: number;
  last_practiced: string | null;
}

export interface PracticeSession {
  user_id: string;
  curriculum_id: string;
  session_date: string;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  duration_seconds: number;
  concepts_practiced: string[];
}

export class ProgressSyncService {
  /**
   * Sync user concepts to Supabase
   */
  static async syncConcepts(
    userId: string,
    curriculumId: string,
    concepts: ConceptNode[]
  ): Promise<void> {
    try {
      const conceptsData = concepts.map(concept => ({
        user_id: userId,
        curriculum_id: curriculumId,
        concept_id: concept.concept_id,
        title: concept.title,
        content: concept.content,
        custom_filters: concept.custom_filters || [],
        mastery_level: concept.mastery_data?.mastery_level || 0,
        attempts: concept.mastery_data?.attempts || 0,
        correct: concept.mastery_data?.correct || 0,
        incorrect: concept.mastery_data?.incorrect || 0,
        last_practiced: concept.mastery_data?.last_practiced || null,
      }));

      // Upsert concepts (insert or update if exists)
      const { error } = await supabase
        .from('user_concepts')
        .upsert(conceptsData, {
          onConflict: 'user_id,curriculum_id,concept_id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to sync concepts:', error);
      throw error;
    }
  }

  /**
   * Load user concepts from Supabase
   */
  static async loadConcepts(
    userId: string,
    curriculumId: string
  ): Promise<ConceptNode[]> {
    try {
      const { data, error } = await supabase
        .from('user_concepts')
        .select('*')
        .eq('user_id', userId)
        .eq('curriculum_id', curriculumId);

      if (error) throw error;

      return (data || []).map(concept => ({
        concept_id: concept.concept_id,
        title: concept.title,
        content: concept.content,
        custom_filters: concept.custom_filters || [],
        prerequisites: [],
        mastery_data: {
          mastery_level: concept.mastery_level,
          attempts: concept.attempts,
          correct: concept.correct,
          incorrect: concept.incorrect,
          last_practiced: concept.last_practiced,
        },
        created_at: new Date(concept.created_at),
        updated_at: new Date(concept.updated_at),
      }));
    } catch (error) {
      console.error('Failed to load concepts:', error);
      return [];
    }
  }

  /**
   * Update a single concept's mastery data
   */
  static async updateConceptMastery(
    userId: string,
    curriculumId: string,
    conceptId: string,
    masteryData: {
      mastery_level: number;
      attempts: number;
      correct: number;
      incorrect: number;
      last_practiced: string;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_concepts')
        .update({
          mastery_level: masteryData.mastery_level,
          attempts: masteryData.attempts,
          correct: masteryData.correct,
          incorrect: masteryData.incorrect,
          last_practiced: masteryData.last_practiced,
        })
        .eq('user_id', userId)
        .eq('curriculum_id', curriculumId)
        .eq('concept_id', conceptId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update concept mastery:', error);
      throw error;
    }
  }

  /**
   * Delete a concept
   */
  static async deleteConcept(
    userId: string,
    curriculumId: string,
    conceptId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_concepts')
        .delete()
        .eq('user_id', userId)
        .eq('curriculum_id', curriculumId)
        .eq('concept_id', conceptId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete concept:', error);
      throw error;
    }
  }

  /**
   * Save practice session
   */
  static async savePracticeSession(
    userId: string,
    curriculumId: string,
    session: Omit<PracticeSession, 'user_id' | 'curriculum_id'>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: userId,
          curriculum_id: curriculumId,
          ...session,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save practice session:', error);
      throw error;
    }
  }

  /**
   * Load practice sessions
   */
  static async loadPracticeSessions(
    userId: string,
    curriculumId: string,
    limit: number = 50
  ): Promise<PracticeSession[]> {
    try {
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('curriculum_id', curriculumId)
        .order('session_date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to load practice sessions:', error);
      return [];
    }
  }

  /**
   * Migrate localStorage data to Supabase
   */
  static async migrateFromLocalStorage(
    userId: string,
    curriculumId: string
  ): Promise<boolean> {
    try {
      // Check if already migrated
      const migrationKey = `${curriculumId}_migrated_to_supabase`;
      if (localStorage.getItem(migrationKey)) {
        return false; // Already migrated
      }

      // Load from localStorage
      const userConceptsKey = `${curriculumId}_user_concepts`;
      const storedData = localStorage.getItem(userConceptsKey);
      
      if (!storedData) {
        // No data to migrate
        localStorage.setItem(migrationKey, 'true');
        return false;
      }

      const concepts: ConceptNode[] = JSON.parse(storedData);
      
      if (concepts.length > 0) {
        // Sync to Supabase
        await this.syncConcepts(userId, curriculumId, concepts);
        
        // Verify sync worked by loading back
        const loadedConcepts = await this.loadConcepts(userId, curriculumId);
        
        if (loadedConcepts.length === 0) {
          console.error('Migration failed: Concepts not found in Supabase after sync');
          return false; // Don't mark as migrated if sync failed
        }
        
        // Load practice sessions if they exist
        const sessionsKey = `${curriculumId}_practice_sessions_history`;
        const sessionsData = localStorage.getItem(sessionsKey);
        
        if (sessionsData) {
          const sessions = JSON.parse(sessionsData);
          for (const session of sessions.slice(0, 50)) {
            await this.savePracticeSession(userId, curriculumId, session);
          }
        }
      }

      // Mark as migrated only if successful
      localStorage.setItem(migrationKey, 'true');
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }

  /**
   * Clear all user data for a curriculum
   */
  static async clearCurriculumData(
    userId: string,
    curriculumId: string
  ): Promise<void> {
    try {
      // Delete all concepts
      await supabase
        .from('user_concepts')
        .delete()
        .eq('user_id', userId)
        .eq('curriculum_id', curriculumId);

      // Delete all sessions
      await supabase
        .from('practice_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('curriculum_id', curriculumId);

      // Delete filters and categories
      await supabase
        .from('custom_filters')
        .delete()
        .eq('user_id', userId)
        .eq('curriculum_id', curriculumId);

      await supabase
        .from('filter_categories')
        .delete()
        .eq('user_id', userId)
        .eq('curriculum_id', curriculumId);
    } catch (error) {
      console.error('Failed to clear curriculum data:', error);
      throw error;
    }
  }
}
