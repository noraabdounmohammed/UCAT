import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  ConceptNode, 
  ConceptFilterState,
  ConceptStats,
  ConceptFilterOptions,
  PracticeConfig,
  ConceptPracticeState,
  CustomFilter,
  FilterCategory
} from '@/types/conceptTypes';
import { generateQuestionWithConfig } from '@/services/aiQuestionGenerator';
import { questionCacheService } from '@/services/questionCacheService';
import { jsonConceptLoader } from '@/services/jsonConceptLoader';
import { StorageManager } from '@/utils/storageManager';
import { supabase } from '@/lib/supabase';
import { getAllowedQuestionCount, recordQuestionsGenerated, getRemainingQuestions } from '@/utils/questionLimits';
import { createFsrsScheduler } from '@/fsrs/scheduler';
import type { FsrsCardState } from '@/fsrs/types';

const fsrsScheduler = createFsrsScheduler();

function fsrsStateFromMastery(md: any): FsrsCardState {
  if (md?.fsrs_stability != null) {
    return {
      stability: md.fsrs_stability,
      difficulty: md.fsrs_difficulty ?? 5,
      dueAt: md.fsrs_due_at ? new Date(md.fsrs_due_at) : new Date(),
      lastReviewAt: md.fsrs_last_review ? new Date(md.fsrs_last_review) : null,
      reps: md.fsrs_reps ?? 0,
      lapses: md.fsrs_lapses ?? 0,
    };
  }
  return fsrsScheduler.initialState();
}

function fsrsRatingFromCorrect(isCorrect: boolean, attempts: number): 1 | 2 | 3 | 4 {
  if (!isCorrect) return 1; // Again
  if (attempts <= 1) return 3; // Good on first attempt
  return 3; // Good — user can manually rate 4 (Easy) in future
}

// Calculate statistics from filtered concepts
function calculateStats(concepts: ConceptNode[]): ConceptStats {
  const stats = {
    total: concepts.length,
    by_mastery: {} as Record<number, number>,
    by_custom_filter: {} as Record<string, number>
  };

  concepts.forEach(concept => {
    // Custom filters
    concept.custom_filters?.forEach(filter => {
      stats.by_custom_filter[filter] = (stats.by_custom_filter[filter] || 0) + 1;
    });

    // Mastery level
    const masteryLevel = concept.mastery_data?.mastery_level || 0;
    stats.by_mastery[masteryLevel] = (stats.by_mastery[masteryLevel] || 0) + 1;
  });

  return stats;
}

// Extract filter options from concepts
function extractFilterOptions(concepts: ConceptNode[]): ConceptFilterOptions {
  const customFilterTags = new Set<string>();

  concepts.forEach(concept => {
    concept.custom_filters?.forEach(filter => customFilterTags.add(filter));
  });

  return {
    mastery_levels: [
      { level: 0, name: 'Unseen' },
      { level: 1, name: 'Incorrect' },
      { level: 2, name: 'Correct' }
    ],
    custom_filters: Array.from(customFilterTags)
  };
}

// Filter concepts based on current filter state
function filterConcepts(concepts: ConceptNode[], filterState: ConceptFilterState): ConceptNode[] {
  return concepts.filter(concept => {
    // Search query filter
    if (filterState.searchQuery) {
      const query = filterState.searchQuery.toLowerCase();
      const searchableText = [
        concept.title,
        concept.content || ''
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }

    // Custom filters with AND/OR logic
    if (filterState.custom_filters && filterState.custom_filters.length > 0) {
      const conceptFilters = concept.custom_filters || [];
      
      if (filterState.cascading_mode) {
        // AND mode: concept must have ALL selected filters
        const hasAllFilters = filterState.custom_filters.every(filter => conceptFilters.includes(filter));
        if (!hasAllFilters) {
          return false;
        }
      } else {
        // OR mode: concept must have AT LEAST ONE selected filter
        const hasAnyFilter = filterState.custom_filters.some(filter => conceptFilters.includes(filter));
        if (!hasAnyFilter) {
          return false;
        }
      }
    }

    // Mastery level filter
    if (filterState.mastery_levels && filterState.mastery_levels.length > 0) {
      if (!filterState.mastery_levels.includes(concept.mastery_data.mastery_level)) {
        return false;
      }
    }

    return true;
  });
}

// Helper function to get curriculum-specific localStorage keys
const getCurriculumKey = (curriculumId: string, key: string) => {
  return `${curriculumId}_${key}`;
};

// Create the concept store with curriculum context
export const createConceptStore = (curriculumId: string = 'default') => {
  const store = create<ConceptPracticeState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      curriculumId, // Expose as plain state field for easy access by consumers
      getCurriculumId: () => curriculumId, // Method to get curriculum ID
      getDueConcepts: () => {
        const { concepts } = get();
        const now = Date.now();
        return concepts.filter(c => {
          const dueAt = c.mastery_data?.fsrs_due_at;
          if (!dueAt) return false; // unseen — not "due", but handled separately
          return new Date(dueAt).getTime() <= now;
        });
      },
      filterState: {
        mastery_levels: [], // Start with no filters selected - show all
        searchQuery: '',
        custom_filters: [], // Will be populated when concepts are loaded
        cascading_mode: true // Default to AND mode (cascading filters - only show related filters)
      },
      filterOptions: {
        mastery_levels: [
          { level: 0, name: 'Unseen' },
          { level: 1, name: 'Incorrect' },
          { level: 2, name: 'Correct' }
        ],
        custom_filters: []
      },
      concepts: [],
      filteredConcepts: [],
      stats: {
        total: 0,
        by_mastery: {},
        by_custom_filter: {}
      },
      practiceSelection: null,
      activeView: 'grid',
      customFilters: [],
      filterCategories: [],
      
      // Practice state
      isPracticing: false,
      practiceQuestions: [],
      generatingQuestionCount: 0,
      practiceError: null,
      practiceConfig: {
        target_bloom_levels: [],
        target_formats: [],
        target_mastery_levels: [],
        question_count: 10,
        custom_prompt: ''
      },
      currentSessionAnswers: [],
      sessionStartTime: null,

      // Migrate old filterState to enable cascading mode by default
      migrateFilterState: () => {
        const currentState = get();
        if (currentState.filterState.cascading_mode === undefined || currentState.filterState.cascading_mode === false) {

          set({ 
            filterState: { 
              ...currentState.filterState, 
              cascading_mode: true 
            } 
          });
        }
      },

      // Load concepts from localStorage INSTANTLY, then sync Supabase in background
      loadConcepts: async () => {
        // Run migration first (sync, fast)
        get().migrateFilterState();
        
        // === INSTANT LOAD FROM LOCALSTORAGE (no await, no blocking) ===
        const userConceptsKey = getCurriculumKey(curriculumId, 'user_concepts');
        const storedUserConceptsData = localStorage.getItem(userConceptsKey);
        const userConcepts: any[] = storedUserConceptsData ? JSON.parse(storedUserConceptsData) : [];
        
        // Load deleted concepts list
        const deletedConceptsStr = localStorage.getItem(getCurriculumKey(curriculumId, 'deleted_concepts'));
        const deletedConceptIds = deletedConceptsStr ? JSON.parse(deletedConceptsStr) : [];
        
        // Normalize concepts (fast, sync)
        const normalizedConcepts = userConcepts.map((concept: any) => {
          const masteryData = concept.mastery_data || {
            attempts: 0, correct: 0, incorrect: 0, mastery_level: 0, last_practiced: null
          };
          if (masteryData.mastery_level > 2) masteryData.mastery_level = 0;
          return {
            ...concept,
            content: concept.content || concept.description || concept.knowledge || 'No content available',
            custom_filters: concept.custom_filters || concept.tags || [],
            prerequisites: concept.prerequisites || [],
            mastery_data: masteryData
          };
        });
        
        // Filter out deleted concepts
        const allConcepts = normalizedConcepts.filter(
          (concept: any) => !deletedConceptIds.includes(concept.concept_id)
        );
        
        // Batch localStorage reads
        const customFiltersKey = getCurriculumKey(curriculumId, 'custom_filters');
        const categoriesKey = getCurriculumKey(curriculumId, 'filter_categories');
        const migrationKey = `${curriculumId}_filter_migrated_v2`;
        
        let storedFilters = localStorage.getItem(customFiltersKey);
        let storedCategories = localStorage.getItem(categoriesKey);
        const alreadyMigrated = localStorage.getItem(migrationKey);
        
        if (!storedFilters) {
          const legacyFilters = localStorage.getItem('custom_filters');
          if (legacyFilters) {
            storedFilters = legacyFilters;
            localStorage.setItem(customFiltersKey, legacyFilters);
          }
        }

        // Fallback: search for filter_categories under a matching key
        // When curriculumId is 'default' (no prop passed), scan ALL keys and pick any that has data
        if (!storedCategories) {
          const baseCurriculumId = curriculumId.replace(/^imported-pub-/, '').split('-')[0];
          const isGenericId = curriculumId === 'default' || baseCurriculumId === 'default';
          let bestKey: string | null = null;
          let bestLen = 0;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.includes('filter_categories')) continue;
            // If we have a real curriculum ID, prefer keys that contain it
            if (!isGenericId && !key.includes(baseCurriculumId)) continue;
            const val = localStorage.getItem(key) || '[]';
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed) && parsed.length > bestLen) {
                bestLen = parsed.length;
                bestKey = key;
                storedCategories = val;
              }
            } catch { /* skip malformed */ }
          }
          // Also try to resolve the custom_filters from the same curriculum key
          if (bestKey && !storedFilters) {
            const sibling = bestKey.replace('filter_categories', 'custom_filters');
            const sf = localStorage.getItem(sibling);
            if (sf) storedFilters = sf;
          }
        }
        
        const customFilters = storedFilters ? JSON.parse(storedFilters) : [];
        const filterCategories = storedCategories ? JSON.parse(storedCategories) : [];
        const filterOptions = extractFilterOptions(allConcepts);
        
        let updatedFilterState;
        if (!alreadyMigrated) {
          updatedFilterState = { mastery_levels: [], searchQuery: '', custom_filters: [] };
          localStorage.setItem(migrationKey, 'true');
        } else {
          updatedFilterState = { ...get().filterState };
        }
        
        const filteredConcepts = filterConcepts(allConcepts, updatedFilterState);
        const stats = calculateStats(filteredConcepts);
        
        // === SET STATE IMMEDIATELY (UI renders now) ===
        set({ 
          concepts: allConcepts,
          filteredConcepts,
          stats,
          filterOptions,
          filterState: updatedFilterState,
          customFilters,
          filterCategories,
          isLoading: false 
        });

        // === FALLBACK: load from JSON files if no localStorage concepts ===
        // This makes /concept-practice work on fresh deploy without any setup
        if (allConcepts.length === 0) {
          jsonConceptLoader.loadAllCurriculums().then(curriculums => {
            const jsonConcepts: ConceptNode[] = [];
            const allCustomFilters = new Set<string>();

            curriculums.forEach(curr => {
              curr.concepts.forEach((concept, idx) => {
                concept.custom_filters?.forEach(f => allCustomFilters.add(f));
                jsonConcepts.push({
                  concept_id: `${curr.file}_${idx}`,
                  title: concept.title,
                  content: concept.content,
                  custom_filters: concept.custom_filters || [],
                  prerequisites: [],
                  mastery_data: {
                    mastery_level: 0,
                    attempts: 0,
                    correct: 0,
                    incorrect: 0,
                    last_practiced: null
                  }
                });
              });
            });

            if (jsonConcepts.length > 0) {
              const jsonFilterOptions = extractFilterOptions(jsonConcepts);
              const jsonFiltered = filterConcepts(jsonConcepts, get().filterState);
              const jsonStats = calculateStats(jsonFiltered);
              set({
                concepts: jsonConcepts,
                filteredConcepts: jsonFiltered,
                stats: jsonStats,
                filterOptions: jsonFilterOptions,
                isLoading: false
              });
            }
          }).catch(() => {
            // JSON load failed — page shows empty state, not a crash
          });
        }
        
        // === BACKGROUND SUPABASE SYNC (non-blocking, fire-and-forget) ===
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user && allConcepts.length > 0) {
            // Future: sync progress to Supabase here
          }
        }).catch(() => {
          // Silently ignore - localStorage is primary
        });
      },

      // Update filter state
      updateFilterState: (newFilterState: Partial<ConceptFilterState>) => {
        const currentState = get();
        const updatedFilterState = { ...currentState.filterState, ...newFilterState };
        const filteredConcepts = filterConcepts(currentState.concepts, updatedFilterState);
        const stats = calculateStats(filteredConcepts);
        
        set({ 
          filterState: updatedFilterState,
          filteredConcepts,
          stats
        });
      },

      // Reset filters to default (show all)
      resetFilters: () => {
        const currentState = get();
        const defaultFilterState: ConceptFilterState = {
          mastery_levels: [],
          searchQuery: '',
          custom_filters: []
        };
        const filteredConcepts = filterConcepts(currentState.concepts, defaultFilterState);
        const stats = calculateStats(filteredConcepts);
        
        set({ 
          filterState: defaultFilterState,
          filteredConcepts,
          stats
        });
      },


      // Add new concept
      addConcept: async (concept: Omit<ConceptNode, 'concept_id' | 'created_at' | 'updated_at'> & { concept_id?: string }) => {
        console.log('🔵 addConcept called with:', concept.title);
        
        const newConcept: ConceptNode = {
          ...concept,
          concept_id: concept.concept_id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        console.log('🔵 New concept created with ID:', newConcept.concept_id);
        
        const currentState = get();
        const updatedConcepts = [...currentState.concepts, newConcept];
        
        console.log('🔵 Total concepts after adding:', updatedConcepts.length);
        
        // Check storage before saving
        try {
          const dataSize = JSON.stringify(updatedConcepts).length * 2;
          await StorageManager.checkBeforeSave(dataSize);
        } catch (error) {
          console.error('❌ Storage check failed:', error);
          throw error;
        }
        
        // ALWAYS save to localStorage first (primary storage)
        try {
          const storageKey = getCurriculumKey(curriculumId, 'user_concepts');
          localStorage.setItem(storageKey, JSON.stringify(updatedConcepts));
          console.log('✅ Saved to localStorage:', storageKey, 'Count:', updatedConcepts.length);
        } catch (error) {
          console.error('❌ Failed to save to localStorage:', error);
          throw error;
        }
        
        // Supabase sync disabled for performance - localStorage is primary storage
        // TODO: Implement batch Supabase sync after bulk operations complete
        
        // Only remove the empty flag if this is a manual user action
        if (updatedConcepts.length > 0) {
          localStorage.removeItem(`${curriculumId}_is_empty`);
        }
        
        const filteredConcepts = filterConcepts(updatedConcepts, currentState.filterState);
        const stats = calculateStats(filteredConcepts);
        const filterOptions = extractFilterOptions(updatedConcepts);
        
        console.log('✅ Concept added successfully. Updating state...');
        
        set({ 
          concepts: updatedConcepts,
          filteredConcepts,
          stats,
          filterOptions
        });
        
        console.log('✅ State updated. New concept count:', updatedConcepts.length);
      },

      // Update existing concept
      updateConcept: (conceptId: string, updates: Partial<ConceptNode>) => {
        const currentState = get();
        const updatedConcepts = currentState.concepts.map(concept =>
          concept.concept_id === conceptId 
            ? { ...concept, ...updates, updated_at: new Date() }
            : concept
        );
        
        // Persist full concept list (curriculum-specific)
        localStorage.setItem(getCurriculumKey(curriculumId, 'user_concepts'), JSON.stringify(updatedConcepts));
        
        const filteredConcepts = filterConcepts(updatedConcepts, currentState.filterState);
        const stats = calculateStats(filteredConcepts);
        const filterOptions = extractFilterOptions(updatedConcepts);
        
        set({ 
          concepts: updatedConcepts,
          filteredConcepts,
          stats,
          filterOptions
        });
      },

      // Delete concept
      deleteConcept: (conceptId: string) => {
        const currentState = get();
        const updatedConcepts = currentState.concepts.filter(c => c.concept_id !== conceptId);
        
        // Add to deleted concepts list to prevent reloading from JSON (curriculum-specific)
        const deletedConceptsStr = localStorage.getItem(getCurriculumKey(curriculumId, 'deleted_concepts'));
        const deletedConceptIds = deletedConceptsStr ? JSON.parse(deletedConceptsStr) : [];
        if (!deletedConceptIds.includes(conceptId)) {
          deletedConceptIds.push(conceptId);
          localStorage.setItem(getCurriculumKey(curriculumId, 'deleted_concepts'), JSON.stringify(deletedConceptIds));
        }
        
        // Persist full concept list (curriculum-specific)
        localStorage.setItem(getCurriculumKey(curriculumId, 'user_concepts'), JSON.stringify(updatedConcepts));
        
        // Clean up orphaned filter categories and assignments
        // Check ALL remaining concepts (including both user and curriculum concepts)
        const allFiltersInUse = new Set<string>();
        updatedConcepts.forEach(concept => {
          concept.custom_filters?.forEach(filter => allFiltersInUse.add(filter));
        });
        

        
        // Clean up filter assignments - only remove assignments for filters not used by ANY concept
        const assignmentsKey = getCurriculumKey(curriculumId, 'filter_assignments');
        const currentAssignments = JSON.parse(localStorage.getItem(assignmentsKey) || '{}');
        const cleanedAssignments: Record<string, string> = {};
        

        
        // Keep assignments for filters that are still used by ANY remaining concept
        Object.entries(currentAssignments).forEach(([filter, categoryId]) => {
          if (allFiltersInUse.has(filter)) {
            cleanedAssignments[filter] = categoryId as string;

          } else {

          }
        });
        

        
        // Update assignments if they changed
        if (Object.keys(cleanedAssignments).length !== Object.keys(currentAssignments).length) {
          localStorage.setItem(assignmentsKey, JSON.stringify(cleanedAssignments));
        }
        
        // Clean up filter categories - ONLY remove if NO filters are assigned to them
        // Get all category IDs that still have filters assigned
        const categoriesWithAssignedFilters = new Set(Object.values(cleanedAssignments));
        


        
        let updatedCategories = currentState.filterCategories.filter(category => {
          // Keep if ID is referenced OR if slug(name) is referenced in assignments
          const slug = category.name.toLowerCase().replace(/\s+/g, '-');
          const hasAssignedFilters =
            categoriesWithAssignedFilters.has(category.id) ||
            categoriesWithAssignedFilters.has(slug as any);

          if (!hasAssignedFilters) {

          } else {

          }

          return hasAssignedFilters;
        });

        // Fallback: if no categories remain but assignments exist, rebuild minimal categories from assignment category keys
        if (updatedCategories.length === 0 && categoriesWithAssignedFilters.size > 0) {
          const prettyName = (key: string) => key.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
          const defaultColor = (key: string) => {
            if (key === 'system') return '#3B82F6';
            if (key === 'presentation') return '#8B5CF6';
            if (key === 'condition') return '#EF4444';
            return '#6B7280';
          };

          updatedCategories = Array.from(categoriesWithAssignedFilters).map((key) => ({
            id: String(key),
            name: prettyName(String(key)),
            color: defaultColor(String(key)),
            description: `Auto-rebuilt category: ${prettyName(String(key))}`,
            created_at: new Date()
          }));

        }



        // Persist categories so the UI reflects the current state
        const categoriesKey = getCurriculumKey(curriculumId, 'filter_categories');
        localStorage.setItem(categoriesKey, JSON.stringify(updatedCategories));
        
        const filteredConcepts = filterConcepts(updatedConcepts, currentState.filterState);
        const stats = calculateStats(filteredConcepts);
        const filterOptions = extractFilterOptions(updatedConcepts);
        
        set({ 
          concepts: updatedConcepts,
          filteredConcepts,
          stats,
          filterOptions,
          filterCategories: updatedCategories
        });
      },

      // Clear all concepts and reset curriculum to empty state
      clearAllConcepts: () => {

        
        // Clear all localStorage data for this curriculum
        localStorage.removeItem(getCurriculumKey(curriculumId, 'user_concepts'));
        localStorage.removeItem(getCurriculumKey(curriculumId, 'deleted_concepts'));
        
        // Clear filter categories and assignments since no concepts exist
        localStorage.removeItem(getCurriculumKey(curriculumId, 'filter_categories'));
        localStorage.removeItem(getCurriculumKey(curriculumId, 'filter_assignments'));
        
        // Mark curriculum as empty
        localStorage.setItem(`${curriculumId}_is_empty`, 'true');
        
        // Reset store state
        const filterOptions = {
          mastery_levels: [
            { level: 0, name: 'Unseen' },
            { level: 1, name: 'Incorrect' },
            { level: 2, name: 'Correct' }
          ],
          custom_filters: []
        };
        
        set({ 
          concepts: [],
          filteredConcepts: [],
          stats: { total: 0, by_mastery: {}, by_custom_filter: {} },
          filterOptions,
          filterCategories: []
        });
      },

      setActiveView: (view: 'simple' | 'grid' | 'mastery' | 'dashboard') => {
        set({ activeView: view });
      },

      // Custom Filter Management
      createCustomFilter: (filter: Omit<CustomFilter, 'id' | 'created_at'>) => {
        const newFilter: CustomFilter = {
          ...filter,
          id: `filter_${Date.now()}`,
          created_at: new Date()
        };
        
        const currentState = get();
        const updatedFilters = [...currentState.customFilters, newFilter];
        
        const filterOptions = extractFilterOptions(currentState.concepts);
        
        set({ 
          customFilters: updatedFilters,
          filterOptions
        });
        
        localStorage.setItem(getCurriculumKey(curriculumId, 'custom_filters'), JSON.stringify(updatedFilters));
      },

      updateCustomFilter: (filterId: string, updates: Partial<CustomFilter>) => {
        const currentState = get();
        const updatedFilters = currentState.customFilters.map(filter =>
          filter.id === filterId ? { ...filter, ...updates } : filter
        );
        
        const filterOptions = extractFilterOptions(currentState.concepts);
        
        set({ 
          customFilters: updatedFilters,
          filterOptions
        });
        
        localStorage.setItem(getCurriculumKey(curriculumId, 'custom_filters'), JSON.stringify(updatedFilters));
      },

      deleteCustomFilter: (filterId: string) => {
        const currentState = get();
        const updatedFilters = currentState.customFilters.filter(filter => filter.id !== filterId);
        
        // Remove this filter from all concepts
        const updatedConcepts = currentState.concepts.map(concept => ({
          ...concept,
          custom_filters: concept.custom_filters?.filter(f => f !== filterId) || []
        }));
        
        const filterOptions = extractFilterOptions(updatedConcepts);
        const filteredConcepts = filterConcepts(updatedConcepts, currentState.filterState);
        const stats = calculateStats(filteredConcepts);
        
        set({ 
          customFilters: updatedFilters,
          concepts: updatedConcepts,
          filteredConcepts,
          stats,
          filterOptions
        });
        
        localStorage.setItem(getCurriculumKey(curriculumId, 'custom_filters'), JSON.stringify(updatedFilters));
      },

      // Filter Category Management
      createFilterCategory: (category: Omit<FilterCategory, 'id' | 'created_at'>) => {
        // Generate a stable slug ID so it aligns with assignment keys like "system", "presentation", etc.
        const slug = (category.name || '')
          .toString()
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-');

        const newCategory: FilterCategory = {
          ...category,
          id: slug || `category_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          created_at: new Date()
        };
        
        const currentState = get();
        const updatedCategories = [...currentState.filterCategories, newCategory];
        
        set({ filterCategories: updatedCategories });
        localStorage.setItem(getCurriculumKey(curriculumId, 'filter_categories'), JSON.stringify(updatedCategories));
      },

      updateFilterCategory: (categoryId: string, updates: Partial<FilterCategory>) => {
        const currentState = get();
        const updatedCategories = currentState.filterCategories.map(category =>
          category.id === categoryId ? { ...category, ...updates } : category
        );
        
        set({ filterCategories: updatedCategories });
        localStorage.setItem(getCurriculumKey(curriculumId, 'filter_categories'), JSON.stringify(updatedCategories));
      },

      deleteFilterCategory: (categoryId: string) => {
        const currentState = get();
        const updatedCategories = currentState.filterCategories.filter(category => category.id !== categoryId);
        
        set({ filterCategories: updatedCategories });
        localStorage.setItem(getCurriculumKey(curriculumId, 'filter_categories'), JSON.stringify(updatedCategories));
      },

      // Practice functions
      setPracticeSelection: (ids: string[] | null) => {
        set({ practiceSelection: ids });
      },
      startPractice: async (practiceConfig?: PracticeConfig) => {
        const startTime = Date.now();
        
        // Calculate actual question count first
        const requestedCount = practiceConfig?.question_count || 10;
        
        // Check daily limit - get user ID if available
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        const remaining = getRemainingQuestions(userId);
        
        if (remaining === 0) {
          console.warn('⚠️ Daily question limit reached (100/day)');
          set({ 
            isLoading: false, 
            isPracticing: false,
            practiceError: 'You\'ve reached your daily limit of 100 questions. Come back tomorrow!'
          });
          return;
        }
        
        // Cap to remaining allowance
        const questionCount = getAllowedQuestionCount(requestedCount, userId);
        if (questionCount < requestedCount) {
          console.log(`📊 Limiting questions from ${requestedCount} to ${questionCount} (daily limit)`);
        }
        
        set({ isLoading: true, isPracticing: true, currentSessionAnswers: [], sessionStartTime: startTime, generatingQuestionCount: questionCount });
        
        const currentState = get();
        
        console.log('🔍 Practice Selection Debug:', {
          practiceSelection: currentState.practiceSelection,
          practiceSelectionLength: currentState.practiceSelection?.length,
          totalConcepts: currentState.concepts.length,
          filteredConcepts: currentState.filteredConcepts.length
        });
        
        // If a targeted selection exists, honor it
        let conceptsToUse = currentState.filteredConcepts.length > 0 
          ? currentState.filteredConcepts 
          : currentState.concepts;
        if (currentState.practiceSelection && currentState.practiceSelection.length > 0) {
          const idSet = new Set(currentState.practiceSelection);
          conceptsToUse = currentState.concepts.filter(c => idSet.has(c.concept_id));
          console.log('✅ Using practice selection:', {
            selectedIds: currentState.practiceSelection,
            conceptsToUse: conceptsToUse.length,
            conceptTitles: conceptsToUse.map(c => c.title).slice(0, 3)
          });
        }
        
        if (conceptsToUse.length === 0) {
          console.warn('⚠️ No concepts available for practice');
          set({ isLoading: false, isPracticing: false });
          return;
        }

        try {
          // Generate questions from concepts
          const questionCount = practiceConfig?.question_count || 10;
          const targetFormat = practiceConfig?.target_formats?.[0] || 'ukmla_sba';
          
          console.log('🎯 Practice Config Debug:', {
            practiceConfig,
            questionCount,
            targetFormat,
            conceptsToUseLength: conceptsToUse.length
          });
          
          // FSRS-aware ordering: due first, then unseen, then not-yet-due
          // Within each bucket, randomise to avoid repetitive ordering
          const nowMs = Date.now();
          const shuffled = [...conceptsToUse].sort((a, b) => {
            const mdA = a.mastery_data;
            const mdB = b.mastery_data;
            const dueA = mdA?.fsrs_due_at ? new Date(mdA.fsrs_due_at).getTime() : null;
            const dueB = mdB?.fsrs_due_at ? new Date(mdB.fsrs_due_at).getTime() : null;
            const unseenA = !mdA?.fsrs_due_at && (mdA?.attempts ?? 0) === 0;
            const unseenB = !mdB?.fsrs_due_at && (mdB?.attempts ?? 0) === 0;
            const isDueA = dueA !== null && dueA <= nowMs;
            const isDueB = dueB !== null && dueB <= nowMs;
            // Priority: overdue > unseen > not-yet-due
            const priorityA = isDueA ? 0 : unseenA ? 1 : 2;
            const priorityB = isDueB ? 0 : unseenB ? 1 : 2;
            if (priorityA !== priorityB) return priorityA - priorityB;
            // Within the same priority: due→sort by dueAt asc; unseen/not-due→randomise
            if (priorityA === 0 && dueA !== null && dueB !== null) return dueA - dueB;
            return Math.random() - 0.5;
          });
          // Use the specified number of concepts, up to what's available (hard cap: 40 per session)
          const MAX_SESSION_SIZE = 40;
          const conceptsForQuestions = shuffled.slice(0, Math.min(questionCount, shuffled.length, MAX_SESSION_SIZE));
          
          // Update the actual count being generated
          set({ generatingQuestionCount: conceptsForQuestions.length });
          

          
          // For mind maps, create a single unified mind map from all concepts
          if (targetFormat === 'mindmap') {
            console.log('🗺️ Creating unified mind map from concepts:', {
              conceptsForMindMap: conceptsForQuestions.length,
              conceptTitles: conceptsForQuestions.map(c => c.title).slice(0, 5),
              totalAvailable: conceptsToUse.length
            });
            
            // Create a single "question" that contains all concepts for the unified mind map
            const unifiedMindMap = {
              id: 'unified_mindmap',
              concept_id: 'unified',
              title: 'Unified Mind Map',
              content: 'Combined concepts mind map',
              custom_filters: [],
              format: 'mindmap' as const,
              // Add required fields for compatibility
              question: 'Unified Mind Map',
              options: [],
              correct_answer: '',
              explanation: 'Combined mind map of all selected concepts',
              // Special field for mind map: include all concepts
              allConcepts: conceptsForQuestions
            };
            
            console.log('🗺️ Generated unified mind map:', {
              conceptsIncluded: conceptsForQuestions.length,
              mindMapData: unifiedMindMap
            });
            
            set({ 
              practiceQuestions: [unifiedMindMap], // Single question containing all concepts
              isLoading: false 
            });
            return;
          }
          
          // Load seen question IDs for this user (per-curriculum, persisted in localStorage)
          const seenKey = getCurriculumKey(curriculumId, 'seen_question_ids');
          const seenRaw = localStorage.getItem(seenKey);
          const seenQuestionIds: Set<string> = new Set(seenRaw ? JSON.parse(seenRaw) : []);

          // Check cache first, generate only if needed
          const cachedQuestions = await questionCacheService.getQuestionsForConcepts(
            conceptsForQuestions.map(c => c.concept_id)
          );
          
          // Group cached questions by concept
          const cachedByConcept: Record<string, any[]> = {};
          for (const q of cachedQuestions) {
            if (!cachedByConcept[q.concept_id]) {
              cachedByConcept[q.concept_id] = [];
            }
            cachedByConcept[q.concept_id].push(q);
          }

          // Track which question IDs we serve this session (to save back)
          const newlySeenIds: string[] = [];
          
          // Generate missing questions
          const questionPromises = conceptsForQuestions.map(async (concept) => {
            // Check if we have cached questions for this concept
            const allCachedForConcept = cachedByConcept[concept.concept_id] || [];
            
            // Filter out questions the user has already seen
            const unseenCached = allCachedForConcept.filter(q => !seenQuestionIds.has(q.id));
            
            if (unseenCached.length > 0) {
              // Pick a random unseen cached question
              const cached = unseenCached[Math.floor(Math.random() * unseenCached.length)];
              newlySeenIds.push(cached.id);
              return {
                id: cached.id,
                concept_id: cached.concept_id,
                question_stem: cached.question_stem,
                question: cached.question_text,
                options: cached.options,
                correct_answer: cached.correct_answer,
                explanation: cached.explanation,
                format: cached.question_format,
                key_fact: cached.key_fact,
                citation_id: cached.citation_id
              };
            }
            
            // All cached questions seen (or none exist) — generate a fresh one
            if (allCachedForConcept.length > 0) {
              console.log(`🔄 All ${allCachedForConcept.length} cached questions seen for "${concept.title}" — generating fresh`);
            }
            
            // Generate with AI and cache
            try {
              const generated = await generateQuestionWithConfig({
                concept,
                format: targetFormat as 'flashcard' | 'ukmla_sba' | 'sba' | 'emq' | 'true_false' | 'ranking',
                customPrompt: practiceConfig?.custom_prompt,
                customFlashcardPrompt: practiceConfig?.custom_flashcard_prompt
              });
              
              // Save to cache (fire and forget)
              questionCacheService.saveQuestion({
                concept_id: concept.concept_id,
                concept_title: concept.title,
                concept_content: concept.content,
                specialty: curriculumId,
                custom_filters: concept.custom_filters || [],
                filter_categories: (concept as any).filter_categories || [],
                question_stem: (generated as any).question_stem || (generated as any).stem || '',
                question_text: (generated as any).question || (generated as any).clinical_vignette || '',
                options: (generated as any).options || [],
                correct_answer: (generated as any).correct_answer || '',
                key_fact: (generated as any).key_fact || '',
                explanation: (generated as any).explanation || '',
                citation_id: (generated as any).citation_id || null,
                question_format: targetFormat,
                difficulty: 'medium'
              }).catch(err => console.error('Failed to cache question:', err));
              
              return generated;
            } catch (error) {
              console.error(`Failed to generate question for concept ${concept.concept_id}:`, error);
              // Return a fallback question
              return {
                id: `fallback_${concept.concept_id}`,
                concept_id: concept.concept_id,
                question: `What do you know about ${concept.title}?`,
                options: ['A lot', 'Some', 'A little', 'Nothing'],
                correct_answer: 0,
                explanation: concept.content || 'No explanation available',
                bloom_level: 'remember' as const,
                format: 'mcq' as const
              };
            }
          });

          const questions = await Promise.all(questionPromises);
          
          // Persist newly seen question IDs so user won't get the same q again
          if (newlySeenIds.length > 0) {
            const updatedSeen = [...seenQuestionIds, ...newlySeenIds];
            // Cap at 2000 entries to avoid unbounded growth (oldest dropped first)
            const capped = updatedSeen.slice(-2000);
            localStorage.setItem(seenKey, JSON.stringify(capped));
          }
          
          // Record questions generated for daily limit tracking
          recordQuestionsGenerated(questions.length, userId);
          
          set({ 
            isPracticing: true,
            practiceQuestions: questions,
            practiceConfig: practiceConfig || currentState.practiceConfig,
            isLoading: false,
            practiceError: null
          });
        } catch (error) {
          console.error('Failed to start practice:', error);
          set({ isLoading: false, isPracticing: false });
        }
      },

      endPractice: () => {
        const currentState = get();
        
        // Calculate session statistics from actual answers
        const totalAnswers = currentState.currentSessionAnswers.length;
        const correctAnswers = currentState.currentSessionAnswers.filter(a => a.isCorrect).length;
        const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
        
        // Calculate actual session duration
        const endTime = Date.now();
        const startTime = currentState.sessionStartTime || endTime;
        const durationMs = endTime - startTime;
        const actualMinutes = Math.max(1, Math.round(durationMs / 60000)); // Convert ms to minutes
        
        const sessionStats = {
          date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          completedAt: new Date().toISOString(), // ISO timestamp for proper date parsing
          totalQuestions: totalAnswers, // Total number of questions answered
          correctAnswers: correctAnswers, // Number of correct answers
          accuracy: accuracy, // Percentage (for backward compatibility)
          duration: actualMinutes * 60, // Duration in seconds (TrackDashboard converts to minutes)
          minutes: actualMinutes, // Minutes (for backward compatibility)
          concepts_practiced: currentState.currentSessionAnswers.map(a => a.conceptId).filter(Boolean),
          formats: Array.from(new Set((currentState.practiceQuestions || []).map((q: any) => q.format).filter(Boolean))) as string[]
        };
        
        // Save session to curriculum-specific localStorage
        const sessionsKey = getCurriculumKey(curriculumId, 'practice_sessions_history');
        const existingSessions = localStorage.getItem(sessionsKey);
        const sessions = existingSessions ? JSON.parse(existingSessions) : [];
        
        // Add new session and keep only last 50 sessions
        sessions.unshift(sessionStats);
        const trimmedSessions = sessions.slice(0, 50);
        localStorage.setItem(sessionsKey, JSON.stringify(trimmedSessions));
        
        console.log('📊 Practice session saved:', {
          curriculumId,
          sessionsKey,
          sessionStats,
          totalSessionsStored: trimmedSessions.length
        });
        
        set({ 
          isPracticing: false,
          practiceQuestions: [],
          currentSessionAnswers: [],
          sessionStartTime: null,
          generatingQuestionCount: 0,
          practiceError: null
        });
      },

      updateMastery: (conceptId: string, isCorrect: boolean) => {
        const currentState = get();
        const now = new Date();
        
        // Track answer in current session
        const sessionAnswer = {
          questionId: `q_${Date.now()}`,
          conceptId,
          isCorrect,
          timestamp: now.toISOString()
        };
        
        const updatedSessionAnswers = [...currentState.currentSessionAnswers, sessionAnswer];
        
        // Find the concept first
        const targetConcept = currentState.concepts.find(c => c.concept_id === conceptId);
        if (!targetConcept) {
          console.error('❌ Concept not found for mastery update:', conceptId);
          return;
        }
        
        const updatedConcepts = currentState.concepts.map((concept: ConceptNode) => {
          if (concept.concept_id === conceptId) {
            const masteryData = concept.mastery_data || {
              mastery_level: 0,
              attempts: 0,
              correct: 0,
              incorrect: 0,
              last_practiced: null
            };
            
            const newAttempts = (masteryData.attempts || 0) + 1;
            const newCorrect = (masteryData.correct || 0) + (isCorrect ? 1 : 0);
            const newIncorrect = (masteryData.incorrect || 0) + (isCorrect ? 0 : 1);
            const newMastery = isCorrect ? 2 : 1;

            // ── FSRS scheduling ──────────────────────────────────────────
            const prevFsrs = fsrsStateFromMastery(masteryData);
            const rating = fsrsRatingFromCorrect(isCorrect, newAttempts);
            const { newState, intervalDays } = fsrsScheduler.applyReview(prevFsrs, rating, now);

            if (process.env.NODE_ENV === 'development') {
              console.log('📊 FSRS update:', {
                concept: concept.title,
                rating,
                intervalDays: intervalDays.toFixed(1),
                stability: newState.stability.toFixed(2),
                dueAt: newState.dueAt.toISOString(),
                isCorrect
              });
            }
            
            return {
              ...concept,
              mastery_data: {
                ...masteryData,
                mastery_level: newMastery,
                last_practiced: now.toISOString(),
                attempts: newAttempts,
                correct: newCorrect,
                incorrect: newIncorrect,
                // FSRS fields
                fsrs_stability: newState.stability,
                fsrs_difficulty: newState.difficulty,
                fsrs_due_at: newState.dueAt.toISOString(),
                fsrs_last_review: now.toISOString(),
                fsrs_reps: newState.reps,
                fsrs_lapses: newState.lapses,
              }
            };
          }
          return concept;
        });
        
        // Persist full concept list (curriculum-specific)
        localStorage.setItem(getCurriculumKey(curriculumId, 'user_concepts'), JSON.stringify(updatedConcepts));
        
        const filteredConcepts = filterConcepts(updatedConcepts, currentState.filterState);
        const stats = calculateStats(filteredConcepts);
        
        set({ 
          concepts: updatedConcepts,
          filteredConcepts,
          stats,
          currentSessionAnswers: updatedSessionAnswers
        });
      }
    }),
    {
      name: getCurriculumKey(curriculumId, 'concept-practice-store'),
      version: 2, // Increment version to force migration
      partialize: (state) => ({
        filterState: state.filterState,
        activeView: state.activeView,
        customFilters: state.customFilters,
        filterCategories: state.filterCategories
      }),
      migrate: (persistedState: any, version: number) => {
        // Migration for version 2: ensure all filters are selected by default
        if (version < 2) {
          return {
            ...persistedState,
            filterState: {
              mastery_levels: [0, 1, 2], // Select all mastery levels
              searchQuery: '',
              custom_filters: persistedState.filterState?.custom_filters || []
            }
          };
        }
        return persistedState;
      }
    }
  )
  );
  
  // Attach curriculum ID as a property that's always correct
  (store as any).curriculumId = curriculumId;
  return store;
};

// Default export for backward compatibility
export const useConceptStore = createConceptStore('default');
