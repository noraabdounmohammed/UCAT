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

// Create the concept store
export const useConceptStore = create<ConceptPracticeState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      filterState: {
        mastery_levels: [],
        searchQuery: '',
        custom_filters: []
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
          const response = await fetch('/conceptModel.json');
          const data = await response.json();
          const concepts = data.concepts || [];
          
          // Load user concepts from localStorage
          const storedUserConcepts = localStorage.getItem('user_concepts');
          const userConcepts = storedUserConcepts ? JSON.parse(storedUserConcepts) : [];
          
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
          
          const allConcepts = [...normalizedConcepts, ...normalizedUserConcepts];
          
          // Load custom filters
          const storedFilters = localStorage.getItem('custom_filters');
          const customFilters = storedFilters ? JSON.parse(storedFilters) : [];
          
          const filteredConcepts = filterConcepts(allConcepts, get().filterState);
          const stats = calculateStats(filteredConcepts);
          const filterOptions = extractFilterOptions(allConcepts);
          
          set({ 
            concepts: allConcepts,
            filteredConcepts,
            stats,
            filterOptions,
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
        
        // Save to localStorage
        const userConcepts = updatedConcepts.filter(c => c.concept_id.startsWith('user_'));
        localStorage.setItem('user_concepts', JSON.stringify(userConcepts));
        
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
        
        // Save user concepts to localStorage
        const userConcepts = updatedConcepts.filter(c => c.concept_id.startsWith('user_'));
        localStorage.setItem('user_concepts', JSON.stringify(userConcepts));
        
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
        
        // Update localStorage
        const userConcepts = updatedConcepts.filter(c => c.concept_id.startsWith('user_'));
        localStorage.setItem('user_concepts', JSON.stringify(userConcepts));
        
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
        
        localStorage.setItem('custom_filters', JSON.stringify(updatedFilters));
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
        
        localStorage.setItem('custom_filters', JSON.stringify(updatedFilters));
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
        
        localStorage.setItem('custom_filters', JSON.stringify(updatedFilters));
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
        localStorage.setItem('filter_categories', JSON.stringify(updatedCategories));
      },

      // Practice functions
      startPractice: async (practiceConfig?: PracticeConfig) => {
        set({ isLoading: true });
        
        const currentState = get();
        const conceptsToUse = currentState.filteredConcepts.length > 0 
          ? currentState.filteredConcepts 
          : currentState.concepts;
        
        if (conceptsToUse.length === 0) {
          console.warn('No concepts available for practice');
          set({ isLoading: false });
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
          set({ isLoading: false });
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
        
        // Save user concepts to localStorage
        const userConcepts = updatedConcepts.filter(c => c.concept_id && c.concept_id.startsWith('user_'));
        localStorage.setItem('user_concepts', JSON.stringify(userConcepts));
        
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
      name: 'concept-practice-store',
      partialize: (state) => ({
        filterState: state.filterState,
        activeView: state.activeView,
        customFilters: state.customFilters,
        filterCategories: state.filterCategories
      })
    }
  )
);
