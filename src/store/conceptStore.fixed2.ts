import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  ConceptNode, 
  ConceptFilterState,
  ConceptStats,
  ConceptFilterOptions,
  PracticeConfig,
  ConceptPracticeState
} from '@/types/conceptTypes';
import { generateQuestionFromConcept } from '@/services/aiQuestionGenerator';

// Helper function to calculate stats from concepts
const calculateStats = (concepts: ConceptNode[]): ConceptStats => {
  const stats: ConceptStats = {
    total: concepts.length,
    // UKMLA-specific stats
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
  };

  concepts.forEach(concept => {
    // Ensure dimensions exists
    if (!concept.dimensions) {
      concept.dimensions = {
        domain: 'Medicine',
        subject: '',
        topic: '',
        subtopic: ''
      };
    }
    
    // Count by system (UKMLA-specific)
    const systems = concept.dimensions?.exam_specific?.ukmla?.systems || [];
    systems.forEach(system => {
      stats.by_system[system] = (stats.by_system[system] || 0) + 1;
    });

    // Count by condition (UKMLA-specific)
    const conditions = concept.dimensions?.exam_specific?.ukmla?.conditions || [];
    conditions.forEach(condition => {
      stats.by_condition[condition] = (stats.by_condition[condition] || 0) + 1;
    });

    // Count by presentation (UKMLA-specific)
    const presentations = concept.dimensions?.exam_specific?.ukmla?.presentations || [];
    presentations.forEach(presentation => {
      stats.by_presentation[presentation] = (stats.by_presentation[presentation] || 0) + 1;
    });

    // Count by competency (UKMLA-specific)
    const competencies = concept.dimensions?.exam_specific?.ukmla?.competencies || [];
    competencies.forEach(competency => {
      stats.by_competency[competency] = (stats.by_competency[competency] || 0) + 1;
    });
    
    // Count by domain (generic)
    const domain = concept.dimensions?.domain;
    if (domain) {
      stats.by_domain[domain] = (stats.by_domain[domain] || 0) + 1;
    }
    
    // Count by subject (generic)
    const subject = concept.dimensions?.subject;
    if (subject) {
      stats.by_subject[subject] = (stats.by_subject[subject] || 0) + 1;
    }
    
    // Count by topic (generic)
    const topic = concept.dimensions?.topic;
    if (topic) {
      stats.by_topic[topic] = (stats.by_topic[topic] || 0) + 1;
    }
    
    // Count by Bloom level
    if (concept.bloom_levels) {
      concept.bloom_levels.forEach(level => {
        if (stats.by_bloom_level) {
          stats.by_bloom_level[level] = (stats.by_bloom_level[level] || 0) + 1;
        }
      });
    }
    
    // Count by question format
    if (concept.question_formats) {
      concept.question_formats.forEach(format => {
        if (stats.by_question_format) {
          stats.by_question_format[format] = (stats.by_question_format[format] || 0) + 1;
        }
      });
    }
    
    // Count by mastery level
    const masteryLevel = concept.mastery_data?.mastery_level || 0;
    stats.by_mastery[masteryLevel] = (stats.by_mastery[masteryLevel] || 0) + 1;
    
    // Count by difficulty (map mastery level to difficulty)
    let difficulty = 'medium';
    if (masteryLevel <= 1) difficulty = 'hard';
    else if (masteryLevel >= 4) difficulty = 'easy';
    stats.by_difficulty[difficulty] = (stats.by_difficulty[difficulty] || 0) + 1;
    
    // Count concepts due for review (implement spaced repetition logic)
    if (concept.mastery_data?.next_review_at) {
      const nextReview = new Date(concept.mastery_data.next_review_at);
      if (nextReview <= new Date()) {
        stats.due_for_review++;
      }
    }
  });

  return stats;
};

// Helper function to extract filter options from concepts
const extractFilterOptions = (concepts: ConceptNode[]): ConceptFilterOptions => {
  return {
    // UKMLA-specific options
    systems: Array.from(new Set(concepts.flatMap(c => c.dimensions?.exam_specific?.ukmla?.systems || []))),
    conditions: Array.from(new Set(concepts.flatMap(c => c.dimensions?.exam_specific?.ukmla?.conditions || []))),
    presentations: Array.from(new Set(concepts.flatMap(c => c.dimensions?.exam_specific?.ukmla?.presentations || []))),
    competencies: Array.from(new Set(concepts.flatMap(c => c.dimensions?.exam_specific?.ukmla?.competencies || []))),
    // Generic options
    domains: Array.from(new Set(concepts.map(c => c.dimensions?.domain).filter(Boolean))),
    subjects: Array.from(new Set(concepts.map(c => c.dimensions?.subject).filter(Boolean))),
    topics: Array.from(new Set(concepts.map(c => c.dimensions?.topic).filter(Boolean))),
    subtopics: Array.from(new Set(concepts.map(c => c.dimensions?.subtopic).filter(Boolean))),
    difficulty: ['easy', 'medium', 'hard'],
    mastery_levels: [0, 1, 2, 3, 4],
    tags: Array.from(new Set(concepts.flatMap(c => c.tags || []))),
    // New options
    bloom_levels: Array.from(new Set(concepts.flatMap(c => c.bloom_levels || []))),
    question_formats: Array.from(new Set(concepts.flatMap(c => c.question_formats || [])))
  };
};

// Helper function to filter concepts based on filter state
const filterConcepts = (concepts: ConceptNode[], filterState: ConceptFilterState) => {
  return concepts.filter((concept: ConceptNode) => {
    // Filter by systems (UKMLA-specific)
    if (filterState.systems && filterState.systems.length > 0) {
      const conceptSystems = concept.dimensions?.exam_specific?.ukmla?.systems || [];
      if (!filterState.systems.some(s => conceptSystems.includes(s))) {
        return false;
      }
    }

    // Filter by conditions (UKMLA-specific)
    if (filterState.conditions && filterState.conditions.length > 0) {
      const conceptConditions = concept.dimensions?.exam_specific?.ukmla?.conditions || [];
      if (!filterState.conditions.some(c => conceptConditions.includes(c))) {
        return false;
      }
    }

    // Filter by presentations (UKMLA-specific)
    if (filterState.presentations && filterState.presentations.length > 0) {
      const conceptPresentations = concept.dimensions?.exam_specific?.ukmla?.presentations || [];
      if (!filterState.presentations.some(p => conceptPresentations.includes(p))) {
        return false;
      }
    }

    // Filter by competencies (UKMLA-specific)
    if (filterState.competencies && filterState.competencies.length > 0) {
      const conceptCompetencies = concept.dimensions?.exam_specific?.ukmla?.competencies || [];
      if (!filterState.competencies.some(c => conceptCompetencies.includes(c))) {
        return false;
      }
    }

    // Filter by mastery level
    if (filterState.mastery_levels && filterState.mastery_levels.length > 0) {
      if (!filterState.mastery_levels.includes(concept.mastery_data.mastery_level)) {
        return false;
      }
    }

    // Filter by tags
    if (filterState.tags && filterState.tags.length > 0) {
      if (!filterState.tags.some(t => concept.tags.includes(t))) {
        return false;
      }
    }

    // Filter by difficulty (converted from mastery level)
    if (filterState.difficulty && filterState.difficulty.length > 0) {
      let difficulty = 'medium';
      const masteryLevel = concept.mastery_data?.mastery_level || 0;
      if (masteryLevel <= 1) difficulty = 'hard';
      else if (masteryLevel >= 4) difficulty = 'easy';
      
      if (!filterState.difficulty.includes(difficulty)) {
        return false;
      }
    }

    // Filter by search query
    if (filterState.searchQuery) {
      const query = filterState.searchQuery.toLowerCase();
      const matchesTitle = concept.title.toLowerCase().includes(query);
      const matchesDescription = concept.description.toLowerCase().includes(query);
      const matchesTags = concept.tags.some(t => t.toLowerCase().includes(query));
      
      return (
        concept.title.toLowerCase().includes(query) ||
        concept.description.toLowerCase().includes(query) ||
        concept.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    return true;
  });
};

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
        searchQuery: ''
      },
      filterOptions: {
        // UKMLA-specific options
        systems: [],
        conditions: [],
        presentations: [],
        competencies: [],
        // Generic options
        domains: [],
        subjects: [],
        topics: [],
        subtopics: [],
        difficulty: [],
        mastery_levels: [],
        tags: [],
        // New options
        bloom_levels: [],
        question_formats: []
      },
      concepts: [],
      filteredConcepts: [],
      stats: {
        total: 0,
        // UKMLA-specific stats
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

      // Actions
      loadConcepts: async () => {
        set({ isLoading: true });
        try {
          // Get deleted concepts from localStorage
          const deletedConceptsStr = localStorage.getItem('deleted_concepts');
          const deletedConceptIds = deletedConceptsStr ? JSON.parse(deletedConceptsStr) : [];
          
          // Get edited concepts from localStorage
          const editedConceptsStr = localStorage.getItem('edited_concepts');
          const editedConcepts = editedConceptsStr ? JSON.parse(editedConceptsStr) : {};
          
          // Load concepts from JSON file
          const response = await fetch('/conceptModel.json');
          const data = await response.json();
          
          // Extract concepts from JSON and filter out deleted ones
          let concepts: ConceptNode[] = (data.concepts || []).filter(
            (c: ConceptNode) => !deletedConceptIds.includes(c.concept_id)
          );
          
          // Apply edits to concepts from the JSON file
          concepts = concepts.map((c: ConceptNode) => {
            if (editedConcepts[c.concept_id]) {
              return { ...c, ...editedConcepts[c.concept_id] };
            }
            return c;
          });
          
          // Load user-created concepts from localStorage
          const storedConcepts = localStorage.getItem('user_concepts');
          if (storedConcepts) {
            const userConcepts = JSON.parse(storedConcepts);
            // Filter out deleted user concepts
            const activeUserConcepts = userConcepts.filter(
              (c: ConceptNode) => !deletedConceptIds.includes(c.concept_id)
            );
            // Apply edits to user concepts
            const editedUserConcepts = activeUserConcepts.map((c: ConceptNode) => {
              if (editedConcepts[c.concept_id]) {
                return { ...c, ...editedConcepts[c.concept_id] };
              }
              return c;
            });
            // Merge user concepts with default concepts
            concepts = [...concepts, ...editedUserConcepts];
          }
          
          // Extract filter options from all concepts
          const filterOptions = extractFilterOptions(concepts);
          
          // Apply current filter to get filtered concepts
          const currentState = get();
          const filteredConcepts = filterConcepts(concepts, currentState.filterState);
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
        
        // Apply practice config filters if provided
        if (practiceConfig) {
          // Filter by bloom levels
          if (practiceConfig.target_bloom_levels && practiceConfig.target_bloom_levels.length > 0) {
            filteredConcepts = filteredConcepts.filter(c => 
              c.bloom_levels?.some(level => practiceConfig.target_bloom_levels?.includes(level))
            );
          }
          
          // Filter by question formats
          if (practiceConfig.target_formats && practiceConfig.target_formats.length > 0) {
            filteredConcepts = filteredConcepts.filter(c => 
              c.question_formats?.some(format => practiceConfig.target_formats?.includes(format))
            );
          }
          
          // Apply spaced repetition if enabled
          if (practiceConfig.use_spaced_repetition) {
            // Sort by due date (concepts with earlier next_review_at come first)
            filteredConcepts.sort((a, b) => {
              const aDate = a.mastery_data.next_review_at ? new Date(a.mastery_data.next_review_at).getTime() : Infinity;
              const bDate = b.mastery_data.next_review_at ? new Date(b.mastery_data.next_review_at).getTime() : Infinity;
              return aDate - bDate;
            });
          }
          
          // Limit to specified question count
          if (practiceConfig.question_count && practiceConfig.question_count < filteredConcepts.length) {
            filteredConcepts = filteredConcepts.slice(0, practiceConfig.question_count);
          }
          
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
              // Return a fallback question
              return {
                id: `fallback-${concept.concept_id}`,
                concept_id: concept.concept_id,
                title: concept.title,
                tags: concept.tags || [],
                format: format,
                question: `Study this concept: ${concept.title}\n\n${concept.description}`,
                options: ['Continue'],
                correctAnswer: 'A',
                explanation: concept.knowledge?.decision_rule || concept.description
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

      setActiveView: (view: 'grid' | 'matrix' | 'tree' | 'graph' | 'mastery') => {
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
          bloom_level: newConcept.bloom_level || 'understand',
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
      }
    }),
    {
      name: 'concept-practice-store',
      partialize: (state) => ({
        // Only persist mastery data and filter state
        concepts: state.concepts.map((c: ConceptNode) => ({
          concept_id: c.concept_id,
          mastery_data: c.mastery_data
        })),
        filterState: state.filterState
      })
    }
  )
);
