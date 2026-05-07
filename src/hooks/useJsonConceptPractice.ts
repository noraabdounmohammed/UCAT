/**
 * useJsonConceptPractice Hook
 * 
 * Loads JSON concepts, checks/fetches cached questions, manages practice session.
 * Drop-in replacement for the old concept store logic.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { jsonConceptLoader } from '@/services/jsonConceptLoader';
import { cachedQuestionGenerator } from '@/services/cachedQuestionGenerator';
import type { QuestionData } from '@/components/practice/questionTypes';
import type { JsonConcept } from '@/services/jsonConceptLoader';

export interface FilterState {
  specialties: string[];
  customFilters: string[];
  searchQuery: string;
  questionCount: number;
  questionFormat: 'ukmla_sba' | 'flashcard' | 'emq';
}

export interface PracticeState {
  concepts: (JsonConcept & { concept_id: string; curriculum: string })[];
  filteredConcepts: (JsonConcept & { concept_id: string; curriculum: string })[];
  isLoading: boolean;
  isPracticing: boolean;
  practiceQuestions: QuestionData[];
  isLoadingQuestions: boolean;
  error: string | null;
  filterState: FilterState;
  availableFilters: { category: string; filters: string[] }[];
  availableSpecialties: string[];
  stats: {
    totalConcepts: number;
    totalQuestionsCached: number;
    coverage: number;
  };
}

export interface PracticeActions {
  setFilterState: (filters: Partial<FilterState>) => void;
  startPractice: () => Promise<void>;
  endPractice: () => void;
  generateMissingQuestions: () => Promise<void>;
}

export function useJsonConceptPractice(): PracticeState & PracticeActions {
  // State
  const [allConcepts, setAllConcepts] = useState<(JsonConcept & { concept_id: string; curriculum: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<QuestionData[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableFilters, setAvailableFilters] = useState<{ category: string; filters: string[] }[]>([]);
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);
  const [stats, setStats] = useState({ totalConcepts: 0, totalQuestionsCached: 0, coverage: 0 });
  
  const [filterState, setFilterState] = useState<FilterState>({
    specialties: [],
    customFilters: [],
    searchQuery: '',
    questionCount: 10,
    questionFormat: 'ukmla_sba'
  });

  // Load all concepts on mount
  useEffect(() => {
    loadAllConcepts();
  }, []);

  const loadAllConcepts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load all curriculums
      const curriculums = await jsonConceptLoader.loadAllCurriculums();
      
      // Flatten to single array with IDs
      const flatConcepts: (JsonConcept & { concept_id: string; curriculum: string })[] = [];
      curriculums.forEach(curr => {
        curr.concepts.forEach((concept, idx) => {
          flatConcepts.push({
            ...concept,
            concept_id: `${curr.file}_${idx}`,
            curriculum: curr.name
          });
        });
      });
      
      setAllConcepts(flatConcepts);
      
      // Load available filters
      const [filters, specialties, cacheStats] = await Promise.all([
        jsonConceptLoader.getAllFilters(),
        jsonConceptLoader.getAllSpecialties(),
        cachedQuestionGenerator.getCacheStats()
      ]);
      
      setAvailableFilters(filters);
      setAvailableSpecialties(specialties);
      setStats({
        totalConcepts: cacheStats.totalConcepts,
        totalQuestionsCached: cacheStats.totalCached,
        coverage: cacheStats.coverage
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load concepts');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter concepts based on current filter state
  const filteredConcepts = useMemo(() => {
    return allConcepts.filter(concept => {
      // Specialty filter
      if (filterState.specialties.length > 0) {
        const matchesSpecialty = filterState.specialties.some(spec => 
          concept.curriculum === spec || concept.custom_filters.includes(spec)
        );
        if (!matchesSpecialty) return false;
      }
      
      // Custom filter tags
      if (filterState.customFilters.length > 0) {
        const matchesFilters = filterState.customFilters.some(filter => 
          concept.custom_filters.includes(filter)
        );
        if (!matchesFilters) return false;
      }
      
      // Search query
      if (filterState.searchQuery) {
        const query = filterState.searchQuery.toLowerCase();
        const matchesSearch = 
          concept.title.toLowerCase().includes(query) ||
          concept.content.toLowerCase().includes(query) ||
          concept.custom_filters.some(f => f.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [allConcepts, filterState]);

  // Start practice - get cached or generate questions
  const startPractice = useCallback(async () => {
    if (filteredConcepts.length === 0) return;
    
    setIsLoadingQuestions(true);
    setError(null);
    
    try {
      // Get concept IDs
      const conceptIds = filteredConcepts.map(c => c.concept_id);
      
      // Get questions (cached or generate)
      const generated = await cachedQuestionGenerator.getQuestionsForConcepts(
        conceptIds.slice(0, 20), // Limit to first 20 concepts
        {
          questionCount: Math.ceil(filterState.questionCount / conceptIds.length),
          questionFormat: filterState.questionFormat,
          difficulty: 'medium'
        }
      );
      
      // Take requested count
      const questions = generated.map(g => g.question).slice(0, filterState.questionCount);
      
      if (questions.length === 0) {
        throw new Error('No questions available for selected filters');
      }
      
      setPracticeQuestions(questions);
      setIsPracticing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start practice');
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [filteredConcepts, filterState]);

  // End practice
  const endPractice = useCallback(() => {
    setIsPracticing(false);
    setPracticeQuestions([]);
  }, []);

  // Generate missing questions for filtered concepts
  const generateMissingQuestions = useCallback(async () => {
    setIsLoadingQuestions(true);
    setError(null);
    
    try {
      const conceptIds = filteredConcepts.slice(0, 10).map(c => c.concept_id);
      const result = await cachedQuestionGenerator.preGenerateForConcepts(conceptIds, {
        questionCount: 2,
        questionFormat: filterState.questionFormat
      });
      
      // Refresh stats
      const cacheStats = await cachedQuestionGenerator.getCacheStats();
      setStats({
        totalConcepts: cacheStats.totalConcepts,
        totalQuestionsCached: cacheStats.totalCached,
        coverage: cacheStats.coverage
      });
      
      alert(`Generated ${result.generated} new questions, ${result.cached} already cached`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [filteredConcepts, filterState]);

  // Update filter state
  const updateFilterState = useCallback((updates: Partial<FilterState>) => {
    setFilterState(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    // State
    concepts: allConcepts,
    filteredConcepts,
    isLoading,
    isPracticing,
    practiceQuestions,
    isLoadingQuestions,
    error,
    filterState,
    availableFilters,
    availableSpecialties,
    stats,
    
    // Actions
    setFilterState: updateFilterState,
    startPractice,
    endPractice,
    generateMissingQuestions
  };
}

export default useJsonConceptPractice;
