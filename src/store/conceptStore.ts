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
      { level: 1, name: 'Learning' },
      { level: 2, name: 'Developing' },
      { level: 3, name: 'Competent' },
      { level: 4, name: 'Mastered' }
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

    // Custom filters
    if (filterState.custom_filters && filterState.custom_filters.length > 0) {
      const conceptFilters = concept.custom_filters || [];
      if (!filterState.custom_filters.some(filter => conceptFilters.includes(filter))) {
        return false;
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
export const createConceptStore = (curriculumId: string = 'default') => create<ConceptPracticeState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      filterState: {
        mastery_levels: [], // Start with no filters selected - show all
        searchQuery: '',
        custom_filters: [] // Will be populated when concepts are loaded
      },
      filterOptions: {
        mastery_levels: [
          { level: 0, name: 'Unseen' },
          { level: 1, name: 'Learning' },
          { level: 2, name: 'Developing' },
          { level: 3, name: 'Competent' },
          { level: 4, name: 'Mastered' }
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
      activeView: 'grid',
      customFilters: [],
      filterCategories: [],
      
      // Practice state
      isPracticing: false,
      practiceQuestions: [],
      practiceConfig: {
        target_bloom_levels: [],
        target_formats: [],
        target_mastery_levels: [],
        question_count: 10,
        custom_prompt: ''
      },

      // Load concepts from JSON file
      loadConcepts: async () => {
        set({ isLoading: true });
        try {
          // Check if this curriculum should start empty or was spec-generated
          const isEmpty = localStorage.getItem(`${curriculumId}_is_empty`);
          const isSpecGenerated = localStorage.getItem(`${curriculumId}_spec_generated`);
          let concepts = [];
          
          console.log(`ConceptStore: Loading concepts for curriculum ${curriculumId}, isEmpty flag:`, isEmpty, 'specGenerated:', isSpecGenerated);
          
          if (!isEmpty && !isSpecGenerated) {
            console.log('ConceptStore: Loading default concepts from JSON');
            const response = await fetch('/conceptModel.json');
            const data = await response.json();
            concepts = data.concepts || [];
          } else if (isSpecGenerated) {
            console.log('ConceptStore: Spec-generated curriculum - only loading user concepts');
          } else {
            console.log('ConceptStore: Starting with empty concepts (fresh curriculum)');
            // Don't remove the flag yet - keep it until user adds concepts
          }
          
          // Load user concepts from localStorage (curriculum-specific)
          const storedUserConcepts = localStorage.getItem(getCurriculumKey(curriculumId, 'user_concepts'));
          const userConcepts = storedUserConcepts ? JSON.parse(storedUserConcepts) : [];
          
          // Load deleted concepts list to exclude them (curriculum-specific)
          const deletedConceptsStr = localStorage.getItem(getCurriculumKey(curriculumId, 'deleted_concepts'));
          const deletedConceptIds = deletedConceptsStr ? JSON.parse(deletedConceptsStr) : [];
          
          // Ensure all concepts have required properties
          const normalizedConcepts = concepts.map((concept: any) => ({
            ...concept,
            content: concept.content || concept.description || concept.knowledge || 'No content available',
            custom_filters: concept.custom_filters || concept.tags || [],
            prerequisites: concept.prerequisites || [],
            mastery_data: concept.mastery_data || {
              attempts: 0,
              correct: 0,
              incorrect: 0,
              mastery_level: 0,
              last_practiced: null
            }
          }));
          
          const normalizedUserConcepts = userConcepts.map((concept: any) => ({
            ...concept,
            content: concept.content || concept.description || concept.knowledge || 'No content available',
            custom_filters: concept.custom_filters || concept.tags || [],
            prerequisites: concept.prerequisites || [],
            mastery_data: concept.mastery_data || {
              attempts: 0,
              correct: 0,
              incorrect: 0,
              mastery_level: 0,
              last_practiced: null
            }
          }));
          
          // Filter out deleted concepts
          const filteredNormalizedConcepts = normalizedConcepts.filter(
            (concept: any) => !deletedConceptIds.includes(concept.concept_id)
          );
          const filteredUserConcepts = normalizedUserConcepts.filter(
            (concept: any) => !deletedConceptIds.includes(concept.concept_id)
          );
          
          const allConcepts = [...filteredNormalizedConcepts, ...filteredUserConcepts];
          
          // Load custom filters (curriculum-specific)
          const storedFilters = localStorage.getItem(getCurriculumKey(curriculumId, 'custom_filters'));
          const customFilters = storedFilters ? JSON.parse(storedFilters) : [];
          
          const filterOptions = extractFilterOptions(allConcepts);
          
          // Force migration to new filter defaults (one-time migration)
          const migrationKey = `${curriculumId}_filter_migrated_v2`;
          const alreadyMigrated = localStorage.getItem(migrationKey);
          
          let updatedFilterState;
          
          if (!alreadyMigrated) {
            console.log('ConceptStore: Migrating to new filter defaults (show all)');
            updatedFilterState = {
              mastery_levels: [], // New default: no filters selected = show all
              searchQuery: '',
              custom_filters: []
            };
            localStorage.setItem(migrationKey, 'true');
          } else {
            // Keep existing filter state for already migrated curriculums
            const currentFilterState = get().filterState;
            updatedFilterState = {
              ...currentFilterState,
              custom_filters: [] // Also clear custom filters for consistency
            };
          }
          
          const filteredConcepts = filterConcepts(allConcepts, updatedFilterState);
          const stats = calculateStats(filteredConcepts);
          
          set({ 
            concepts: allConcepts,
            filteredConcepts,
            stats,
            filterOptions,
            filterState: updatedFilterState,
            customFilters,
            isLoading: false 
          });
        } catch (error) {
          console.error('Failed to load concepts:', error);
          set({ isLoading: false });
        }
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
      addConcept: (concept: Omit<ConceptNode, 'concept_id'>) => {
        const newConcept: ConceptNode = {
          ...concept,
          concept_id: `user_${Date.now()}`,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        const currentState = get();
        const updatedConcepts = [...currentState.concepts, newConcept];
        
        // Save to localStorage (curriculum-specific)
        const userConcepts = updatedConcepts.filter(c => c.concept_id.startsWith('user_'));
        localStorage.setItem(getCurriculumKey(curriculumId, 'user_concepts'), JSON.stringify(userConcepts));
        
        // Remove the empty flag since user is now adding concepts
        localStorage.removeItem(`${curriculumId}_is_empty`);
        
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

      // Update existing concept
      updateConcept: (conceptId: string, updates: Partial<ConceptNode>) => {
        const currentState = get();
        const updatedConcepts = currentState.concepts.map(concept =>
          concept.concept_id === conceptId 
            ? { ...concept, ...updates, updated_at: new Date() }
            : concept
        );
        
        // Save user concepts to localStorage (curriculum-specific)
        const userConcepts = updatedConcepts.filter(c => c.concept_id.startsWith('user_'));
        localStorage.setItem(getCurriculumKey(curriculumId, 'user_concepts'), JSON.stringify(userConcepts));
        
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
        
        // Update localStorage for user concepts (curriculum-specific)
        const userConcepts = updatedConcepts.filter(c => c.concept_id.startsWith('user_'));
        localStorage.setItem(getCurriculumKey(curriculumId, 'user_concepts'), JSON.stringify(userConcepts));
        
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

      setActiveView: (view: 'grid' | 'list') => {
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
        const newCategory: FilterCategory = {
          ...category,
          id: `category_${Date.now()}`,
          created_at: new Date()
        };
        
        const currentState = get();
        const updatedCategories = [...currentState.filterCategories, newCategory];
        
        set({ filterCategories: updatedCategories });
        localStorage.setItem(getCurriculumKey(curriculumId, 'filter_categories'), JSON.stringify(updatedCategories));
      },

      // Practice functions
      startPractice: async (practiceConfig?: PracticeConfig) => {
        set({ isLoading: true, isPracticing: true });
        
        const currentState = get();
        const conceptsToUse = currentState.filteredConcepts.length > 0 
          ? currentState.filteredConcepts 
          : currentState.concepts;
        
        if (conceptsToUse.length === 0) {
          console.warn('No concepts available for practice');
          set({ isLoading: false, isPracticing: false });
          return;
        }

        try {
          // Generate questions from concepts
          const questionCount = practiceConfig?.question_count || 10;
          
          // Use the specified number of concepts, up to what's available
          const conceptsForQuestions = conceptsToUse.slice(0, Math.min(questionCount, conceptsToUse.length));
          
          console.log(`🎯 Practice Session: Generating ${conceptsForQuestions.length} questions from ${conceptsToUse.length} available concepts`);
          
          const questionPromises = conceptsForQuestions.map(async (concept) => {
            try {
              // Use config-based approach to prevent missing parameters
              return await generateQuestionWithConfig({
                concept,
                format: practiceConfig?.target_formats?.[0] as 'flashcard' | 'ukmla_sba' || 'ukmla_sba',
                customPrompt: practiceConfig?.custom_prompt,
                customFlashcardPrompt: practiceConfig?.custom_flashcard_prompt
              });
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
          
          set({ 
            isPracticing: true,
            practiceQuestions: questions,
            practiceConfig: practiceConfig || currentState.practiceConfig,
            isLoading: false 
          });
        } catch (error) {
          console.error('Failed to start practice:', error);
          set({ isLoading: false, isPracticing: false });
        }
      },

      endPractice: () => {
        set({ 
          isPracticing: false,
          practiceQuestions: []
        });
      },

      updateMastery: (conceptId: string, isCorrect: boolean) => {
        const currentState = get();
        
        // Development logging
        if (process.env.NODE_ENV === 'development') {
          console.log('🎯 updateMastery called:', { conceptId, isCorrect });
        }
        
        // Find the concept first to debug
        const targetConcept = currentState.concepts.find(c => c.concept_id === conceptId);
        if (!targetConcept) {
          console.error('❌ Concept not found for mastery update:', conceptId);
          console.log('Available concept IDs:', currentState.concepts.map(c => c.concept_id));
          return;
        }
        
        const updatedConcepts = currentState.concepts.map((concept: ConceptNode) => {
          if (concept.concept_id === conceptId) {
            // Ensure mastery_data exists
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
            
            // Calculate mastery level based on performance and attempts
            let newMastery = 0;
            
            if (newAttempts === 0) {
              // Never attempted
              newMastery = 0; // Unseen
            } else if (newAttempts < 3) {
              // Early attempts - start at Learning level
              newMastery = 1; // Learning
            } else {
              // Calculate success rate for more attempts
              const successRate = newCorrect / newAttempts;
              
              if (successRate >= 0.9) {
                newMastery = 4; // Mastered (90%+ success)
              } else if (successRate >= 0.75) {
                newMastery = 3; // Competent (75%+ success)
              } else if (successRate >= 0.5) {
                newMastery = 2; // Developing (50%+ success)
              } else {
                newMastery = 1; // Learning (below 50% success)
              }
            }
            
            // Development logging
            if (process.env.NODE_ENV === 'development') {
              console.log('📊 Mastery update:', {
                concept: concept.title,
                attempts: newAttempts,
                correct: newCorrect,
                success_rate: newAttempts > 0 ? (newCorrect / newAttempts * 100).toFixed(1) + '%' : '0%',
                old_mastery: masteryData.mastery_level || 0,
                new_mastery: newMastery,
                isCorrect
              });
            }
            
            return {
              ...concept,
              mastery_data: {
                ...masteryData,
                mastery_level: newMastery,
                last_practiced: new Date().toISOString(),
                attempts: newAttempts,
                correct: newCorrect,
                incorrect: newIncorrect
              }
            };
          }
          return concept;
        });
        
        // Save user concepts to localStorage (curriculum-specific)
        const userConcepts = updatedConcepts.filter(c => c.concept_id && c.concept_id.startsWith('user_'));
        localStorage.setItem(getCurriculumKey(curriculumId, 'user_concepts'), JSON.stringify(userConcepts));
        
        const filteredConcepts = filterConcepts(updatedConcepts, currentState.filterState);
        const stats = calculateStats(filteredConcepts);
        
        set({ 
          concepts: updatedConcepts,
          filteredConcepts,
          stats
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
              mastery_levels: [0, 1, 2, 3, 4], // Select all mastery levels
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

// Default export for backward compatibility
export const useConceptStore = createConceptStore('default');
