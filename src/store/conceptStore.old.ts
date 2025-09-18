import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  ConceptNode, 
  ConceptFilterState,
  ConceptStats,
  ConceptFilterOptions,
  PracticeConfig,
  ConceptPracticeState,
  CustomFilter
} from '@/types/conceptTypes';
import { generateQuestionFromConcept } from '@/services/aiQuestionGenerator';

// Helper function to calculate stats from concepts
function calculateStats(concepts: ConceptNode[]): ConceptStats {
  const stats = {
    total: concepts.length,
    by_system: {} as Record<string, number>,
    by_condition: {} as Record<string, number>,
    by_presentation: {} as Record<string, number>,
    by_competency: {} as Record<string, number>,
    by_domain: {} as Record<string, number>,
    by_subject: {} as Record<string, number>,
    by_topic: {} as Record<string, number>,
    by_mastery: {} as Record<number, number>,
    by_difficulty: {} as Record<string, number>,
    by_bloom_level: {} as Record<string, number>,
    by_question_format: {} as Record<string, number>,
    by_custom_filter: {} as Record<string, number>,
    due_for_review: 0
  };

  concepts.forEach(concept => {
    // Custom filters
    concept.custom_filters?.forEach(filter => {
      stats.by_custom_filter[filter] = (stats.by_custom_filter[filter] || 0) + 1;
    });

    // Mastery level
    const masteryLevel = concept.mastery_data.mastery_level;
    stats.by_mastery[masteryLevel] = (stats.by_mastery[masteryLevel] || 0) + 1;

    // Due for review (simplified check)
    if (concept.mastery_data.next_review_at) {
      const reviewDate = new Date(concept.mastery_data.next_review_at);
      if (reviewDate <= new Date()) {
        stats.due_for_review++;
      }
    }
  });

  return stats;
}

// Helper function to extract filter options from concepts
function extractFilterOptions(concepts: ConceptNode[], customFilters: CustomFilter[] = []): ConceptFilterOptions {
  const customFilterTags = new Set<string>();

  concepts.forEach(concept => {
    // Custom filters from the simplified structure
    concept.custom_filters?.forEach(filter => customFilterTags.add(filter));
  });

  return {
    systems: [],
    conditions: [],
    presentations: [],
    competencies: [],
    domains: [],
    subjects: [],
    topics: [],
    subtopics: [],
    difficulty: ['easy', 'medium', 'hard'],
    mastery_levels: [
      { level: 0, name: 'Not Started' },
      { level: 1, name: 'Learning' },
      { level: 2, name: 'Developing' },
      { level: 3, name: 'Proficient' },
      { level: 4, name: 'Mastered' }
    ],
    tags: [],
    bloom_levels: [],
    question_formats: [],
    custom_filters: Array.from(customFilterTags)
  };
}

// Helper function to filter concepts based on filter state
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
    if (filterState.custom_filters.length > 0) {
      const conceptFilters = concept.custom_filters || [];
      if (!filterState.custom_filters.some(filter => conceptFilters.includes(filter))) {
        return false;
      }
    }

    // Mastery level filter
    if (filterState.mastery_levels.length > 0) {
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
        systems: [],
        conditions: [],
        presentations: [],
        competencies: [],
        difficulty: [],
        mastery_levels: [],
        tags: [],
        searchQuery: '',
        custom_filters: []
      },
      filterOptions: {
        systems: [],
        conditions: [],
        presentations: [],
        competencies: [],
        domains: [],
        subjects: [],
        topics: [],
        subtopics: [],
        difficulty: ['easy', 'medium', 'hard'],
        mastery_levels: [
          { level: 0, name: 'Not Started' },
          { level: 1, name: 'Learning' },
          { level: 2, name: 'Developing' },
          { level: 3, name: 'Proficient' },
          { level: 4, name: 'Mastered' }
        ],
        tags: [],
        bloom_levels: [],
        question_formats: [],
        custom_filters: []
      },
      concepts: [],
      filteredConcepts: [],
      stats: {
        total: 0,
        by_system: {},
        by_condition: {},
        by_presentation: {},
        by_competency: {},
        // Generic stats
        by_domain: {},
        by_subject: {},
        by_topic: {},
        by_mastery: {},
        by_difficulty: {},
        // New stats
        by_bloom_level: {} as Record<string, number>,
        by_question_format: {} as Record<string, number>,
        due_for_review: 0
      },
      isPracticing: false,
      practiceQuestions: [],
      practiceConfig: {
        target_bloom_levels: [],
        target_formats: [],
        use_spaced_repetition: false,
        question_count: 10
      },
      activeView: 'grid',
      customFilters: [],
      filterCategories: [],

      // Actions
      loadConcepts: async () => {
        set({ isLoading: true });
        try {
          const deletedConceptsStr = localStorage.getItem('deleted_concepts');
          const deletedConceptIds = deletedConceptsStr ? JSON.parse(deletedConceptsStr) : [];
          
          const editedConceptsStr = localStorage.getItem('edited_concepts');
          const editedConcepts = editedConceptsStr ? JSON.parse(editedConceptsStr) : {};

          // Load concepts from JSON file
          const response = await fetch('/conceptModel.json');
          const data = await response.json();
          
          // Filter out deleted concepts and apply edits
          let concepts: ConceptNode[] = (data.concepts || []).filter(
            (c: ConceptNode) => !deletedConceptIds.includes(c.concept_id)
          );
          
          // Apply edits to base concepts and ensure mastery_data exists
          concepts = concepts.map((c: ConceptNode) => {
            const editedConcept = editedConcepts[c.concept_id] ? { ...c, ...editedConcepts[c.concept_id] } : c;
            
            // Ensure mastery_data exists for all concepts
            return {
              ...editedConcept,
              mastery_data: editedConcept.mastery_data || {
                attempts: 0,
                correct: 0,
                incorrect: 0,
                mastery_level: 0,
                last_practiced: null,
                next_review_at: null
              }
            };
          });

          // Load user-created concepts from localStorage
          const storedConcepts = localStorage.getItem('user_concepts');
          if (storedConcepts) {
            const userConcepts = JSON.parse(storedConcepts);
            
            // Filter out deleted user concepts and apply edits
            const activeUserConcepts = userConcepts.filter(
              (c: ConceptNode) => !deletedConceptIds.includes(c.concept_id)
            );
            
            const editedUserConcepts = activeUserConcepts.map((c: ConceptNode) => {
              if (editedConcepts[c.concept_id]) {
                return { ...c, ...editedConcepts[c.concept_id] };
              }
              return c;
            });
            
            // Ensure all user concepts have mastery_data initialized
            const userConceptsWithMastery = editedUserConcepts.map((c: ConceptNode) => ({
              ...c,
              mastery_data: c.mastery_data || {
                attempts: 0,
                correct: 0,
                incorrect: 0,
                mastery_level: 0,
                last_practiced: null,
                next_review_at: null
              }
            }));
            
            // Merge with existing concepts
            concepts = [...concepts, ...userConceptsWithMastery];
          }

          // Extract filter options
          const filterOptions = extractFilterOptions(concepts);
          
          // Apply current filters
          const currentState = get();
          const filteredConcepts = filterConcepts(concepts, currentState.filterState);
          
          // Calculate stats
          const stats = calculateStats(filteredConcepts);
          
          set({ 
            concepts, 
            filteredConcepts, 
            filterOptions, 
            stats,
            isLoading: false 
          });
        } catch (error) {
          console.error('Error loading concepts:', error);
          set({ isLoading: false });
        }
      },

      setFilter: (filterState: ConceptFilterState) => {
        const currentState = get();
        const filteredConcepts = filterConcepts(currentState.concepts, filterState);
        const stats = calculateStats(filteredConcepts);
        
        set({ 
          filterState, 
          filteredConcepts,
          stats
        });
      },

      updateFilter: (updates: Partial<ConceptFilterState>) => {
        const currentState = get();
        const newFilterState = { ...currentState.filterState, ...updates };
        const filteredConcepts = filterConcepts(currentState.concepts, newFilterState);
        const stats = calculateStats(filteredConcepts);
        
        set({ 
          filterState: newFilterState, 
          filteredConcepts,
          stats
        });
      },

      resetFilter: () => {
        const currentState = get();
        const emptyFilter: ConceptFilterState = {
          systems: [],
          conditions: [],
          presentations: [],
          competencies: [],
          difficulty: [],
          mastery_levels: [],
          tags: [],
          searchQuery: ''
        };
        
        const filteredConcepts = filterConcepts(currentState.concepts, emptyFilter);
        const stats = calculateStats(filteredConcepts);
        
        set({ 
          filterState: emptyFilter, 
          filteredConcepts,
          stats
        });
      },

      clearFilters: () => {
        const currentState = get();
        const emptyFilter: ConceptFilterState = {
          systems: [],
          conditions: [],
          presentations: [],
          competencies: [],
          difficulty: [],
          mastery_levels: [],
          tags: [],
          searchQuery: ''
        };
        
        const filteredConcepts = filterConcepts(currentState.concepts, emptyFilter);
        const stats = calculateStats(filteredConcepts);
        
        set({ 
          filterState: emptyFilter, 
          filteredConcepts,
          stats
        });
      },

      startPractice: async (practiceConfig?: PracticeConfig) => {
        set({ isLoading: true });
        
        const currentState = get();
        let filteredConcepts = [...currentState.filteredConcepts];
        
        // Remove duplicates based on concept_id to ensure all unique concepts are included
        const uniqueConcepts = filteredConcepts.filter((concept, index, self) => 
          index === self.findIndex(c => c.concept_id === concept.concept_id)
        );
        filteredConcepts = uniqueConcepts;
        
        console.log('Practice concepts before filters:', filteredConcepts.length, filteredConcepts.map(c => c.concept_id));
        
        // Apply practice config filters if provided
        if (practiceConfig) {
          // Filter by bloom levels - but include concepts without bloom_levels if they exist
          if (practiceConfig.target_bloom_levels && practiceConfig.target_bloom_levels.length > 0) {
            filteredConcepts = filteredConcepts.filter(c => 
              c.bloom_levels?.some(level => practiceConfig.target_bloom_levels?.includes(level)) || 
              !c.bloom_levels || c.bloom_levels.length === 0
            );
          }
          
          // Filter by question formats - but include concepts without question_formats for flashcards
          if (practiceConfig.target_formats && practiceConfig.target_formats.length > 0 && 
              !practiceConfig.target_formats.includes('flashcard')) {
            filteredConcepts = filteredConcepts.filter(c => 
              c.question_formats?.some(format => practiceConfig.target_formats?.includes(format)) ||
              !c.question_formats || c.question_formats.length === 0
            );
          }
          
          
          console.log('Final practice concepts:', filteredConcepts.length, filteredConcepts.map(c => c.concept_id));
          
          // Generate practice questions from filtered concepts using AI generation
          const questionPromises = filteredConcepts.map(async (concept) => {
            // Determine the format to use
            const format = practiceConfig.target_formats && practiceConfig.target_formats.length > 0 
              ? practiceConfig.target_formats[0] 
              : 'ukmla_sba';
              
            try {
              // Generate question using AI service
              const generatedQuestion = await generateQuestionFromConcept(
                concept, 
                format as 'ukmla_sba' | 'flashcard',
                practiceConfig.custom_prompt,
                practiceConfig.custom_flashcard_prompt
              );
              
              // Transform to match expected format
              return {
                id: generatedQuestion.id,
                concept_id: generatedQuestion.concept_id,
                title: concept.title,
                tags: concept.tags || [],
                format: generatedQuestion.format,
                question: generatedQuestion.clinical_vignette 
                  ? `${generatedQuestion.clinical_vignette}\n\n${generatedQuestion.question_stem}`
                  : generatedQuestion.question_stem,
                options: generatedQuestion.options.map(opt => opt.text),
                correctAnswer: generatedQuestion.correct_answer,
                explanation: generatedQuestion.explanation
              };
            } catch (error) {
              console.error('Failed to generate question for concept:', concept.concept_id, error);
              // Ensure concept_id is valid for fallback
              const conceptId = concept.concept_id || `concept-${Date.now()}`;
              
              // Return a fallback flashcard question that will still track mastery
              return {
                id: `flash-${conceptId}-${Date.now()}`,
                concept_id: conceptId,
                title: concept.title,
                tags: concept.tags || [],
                format: 'flashcard',
                question: `Study this concept: ${concept.title}\n\n${concept.description || concept.knowledge?.decision_rule || 'Review this concept.'}`,
                options: ['Show Answer', 'Continue'],
                correctAnswer: 'A',
                explanation: concept.knowledge?.decision_rule || concept.description || `Key concept: ${concept.title}`
              };
            }
          });
          
          // Wait for all questions to be generated
          const questions = await Promise.all(questionPromises);
          
          
          set({ 
            isPracticing: true,
            practiceQuestions: questions,
            practiceConfig,
            isLoading: false
          });
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
        const updatedConcepts = currentState.concepts.map((concept: ConceptNode) => {
          if (concept.concept_id === conceptId) {
            // Update mastery data
            const mastery = { ...concept.mastery_data };
            mastery.attempts += 1;
            
            if (isCorrect) {
              mastery.correct += 1;
            } else {
              mastery.incorrect += 1;
            }
            
            // Calculate new mastery level (0-4)
            // Simple algorithm: based on % correct with minimum attempts
            const correctRate = mastery.correct / mastery.attempts;
            let newLevel = 0;
            
            if (mastery.attempts >= 1) {
              if (correctRate >= 0.9 && mastery.attempts >= 3) {
                newLevel = 4; // Mastered
              } else if (correctRate >= 0.7) {
                newLevel = 3; // Competent
              } else if (correctRate >= 0.5) {
                newLevel = 2; // Developing
              } else {
                newLevel = 1; // Introduced
              }
            }
            
            mastery.mastery_level = newLevel;
            mastery.last_practiced = new Date().toISOString();
            
            return { ...concept, mastery_data: mastery };
          }
          return concept;
        });
        
        // Recalculate filtered concepts and stats
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

      // CRUD operations for concepts
      addConcept: (newConcept: Partial<ConceptNode>) => {
        const currentState = get();
        const concept: ConceptNode = {
          concept_id: newConcept.concept_id || `concept-${Date.now()}`,
          title: newConcept.title || 'New Concept',
          description: newConcept.description || '',
          tags: newConcept.tags || [],
          bloom_levels: newConcept.bloom_levels || ['understand'],
          knowledge: newConcept.knowledge || { decision_rule: '', key_facts: [] },
          relationships: newConcept.relationships || [],
          taxonomy: newConcept.taxonomy || { domain: 'Medicine', subject: '', topic: '', subtopic: '' },
          mastery_data: {
            attempts: 0,
            correct: 0,
            incorrect: 0,
            mastery_level: 0,
            last_practiced: null
          }
        };
        
        const updatedConcepts = [...currentState.concepts, concept];
        
        // Save to localStorage
        const storedConcepts = localStorage.getItem('user_concepts');
        const userConcepts = storedConcepts ? JSON.parse(storedConcepts) : [];
        userConcepts.push(concept);
        localStorage.setItem('user_concepts', JSON.stringify(userConcepts));
        
        // Update state and recalculate everything including filter options
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

      updateConcept: (conceptId: string, updates: Partial<ConceptNode>) => {
        const currentState = get();
        const updatedConcepts = currentState.concepts.map((concept: ConceptNode) => {
          if (concept.concept_id === conceptId) {
            return { ...concept, ...updates };
          }
          return concept;
        });
        
        // Save edit to localStorage
        const editedConceptsStr = localStorage.getItem('edited_concepts');
        const editedConcepts = editedConceptsStr ? JSON.parse(editedConceptsStr) : {};
        editedConcepts[conceptId] = { ...editedConcepts[conceptId], ...updates };
        localStorage.setItem('edited_concepts', JSON.stringify(editedConcepts));
        
        // Also update user_concepts if it's a user-created concept
        const storedConcepts = localStorage.getItem('user_concepts');
        if (storedConcepts) {
          const userConcepts = JSON.parse(storedConcepts);
          const updatedUserConcepts = userConcepts.map((c: ConceptNode) => 
            c.concept_id === conceptId ? { ...c, ...updates } : c
          );
          localStorage.setItem('user_concepts', JSON.stringify(updatedUserConcepts));
        }
        
        // Update state and recalculate everything including filter options
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

      deleteConcept: (conceptId: string) => {
        const currentState = get();
        const updatedConcepts = currentState.concepts.filter(
          (concept: ConceptNode) => concept.concept_id !== conceptId
        );
        
        // Track deleted concept in localStorage
        const deletedConceptsStr = localStorage.getItem('deleted_concepts');
        const deletedConcepts = deletedConceptsStr ? JSON.parse(deletedConceptsStr) : [];
        if (!deletedConcepts.includes(conceptId)) {
          deletedConcepts.push(conceptId);
          localStorage.setItem('deleted_concepts', JSON.stringify(deletedConcepts));
        }
        
        // Remove from user_concepts if it exists there
        const storedConcepts = localStorage.getItem('user_concepts');
        if (storedConcepts) {
          const userConcepts = JSON.parse(storedConcepts);
          const updatedUserConcepts = userConcepts.filter(
            (c: ConceptNode) => c.concept_id !== conceptId
          );
          localStorage.setItem('user_concepts', JSON.stringify(updatedUserConcepts));
        }
        
        // Update state and recalculate everything including filter options
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
        
        // Update filter options
        const filterOptions = extractFilterOptions(currentState.concepts, updatedFilters);
        
        set({ 
          customFilters: updatedFilters,
          filterOptions
        });
        
        // Persist to localStorage
        localStorage.setItem('custom_filters', JSON.stringify(updatedFilters));
      },

      updateCustomFilter: (filterId: string, updates: Partial<CustomFilter>) => {
        const currentState = get();
        const updatedFilters = currentState.customFilters.map(filter =>
          filter.id === filterId ? { ...filter, ...updates } : filter
        );
        
        // Update filter options
        const filterOptions = extractFilterOptions(currentState.concepts, updatedFilters);
        
        set({ 
          customFilters: updatedFilters,
          filterOptions
        });
        
        // Persist to localStorage
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
        
        // Update filter options and recalculate
        const filterOptions = extractFilterOptions(updatedConcepts, updatedFilters);
        const filteredConcepts = filterConcepts(updatedConcepts, currentState.filterState, updatedFilters);
        const stats = calculateStats(filteredConcepts);
        
        set({ 
          customFilters: updatedFilters,
          concepts: updatedConcepts,
          filteredConcepts,
          stats,
          filterOptions
        });
        
        // Persist to localStorage
        localStorage.setItem('custom_filters', JSON.stringify(updatedFilters));
        localStorage.setItem('user_concepts', JSON.stringify(updatedConcepts.filter(c => !c.concept_id.startsWith('concept_default_'))));
      },

      createFilterCategory: (category: Omit<FilterCategory, 'id' | 'created_at'>) => {
        const newCategory: FilterCategory = {
          ...category,
          id: `category_${Date.now()}`,
          created_at: new Date()
        };
        
        const currentState = get();
        const updatedCategories = [...currentState.filterCategories, newCategory];
        
        set({ filterCategories: updatedCategories });
        
        // Persist to localStorage
        localStorage.setItem('filter_categories', JSON.stringify(updatedCategories));
      },

      loadCustomFilters: () => {
        try {
          const filtersStr = localStorage.getItem('custom_filters');
          const categoriesStr = localStorage.getItem('filter_categories');
          
          const customFilters = filtersStr ? JSON.parse(filtersStr) : [];
          const filterCategories = categoriesStr ? JSON.parse(categoriesStr) : [];
          
          set({ 
            customFilters,
            filterCategories
          });
        } catch (error) {
          console.error('Error loading custom filters:', error);
        }
      }
    }),
    {
      name: 'concept-practice-store',
      partialize: (state) => ({
        // Only persist filter state - concepts are managed via localStorage separately
        filterState: state.filterState
      })
    }
  )
);
