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
import { StorageManager } from '@/utils/storageManager';

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
      getCurriculumId: () => curriculumId, // Method to get curriculum ID
      filterState: {
        mastery_levels: [], // Start with no filters selected - show all
        searchQuery: '',
        custom_filters: [], // Will be populated when concepts are loaded
        cascading_mode: false // Default to OR mode (match ANY selected filter)
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
      practiceConfig: {
        target_bloom_levels: [],
        target_formats: [],
        target_mastery_levels: [],
        question_count: 10,
        custom_prompt: ''
      },
      currentSessionAnswers: [],
      sessionStartTime: null,

      // Load concepts from JSON file
      loadConcepts: async () => {
        set({ isLoading: true });
        try {
          // Check if this curriculum should start empty or was spec-generated
          const isEmpty = localStorage.getItem(`${curriculumId}_is_empty`);
          const isSpecGenerated = localStorage.getItem(`${curriculumId}_spec_generated`);
          
          // Also check if there are any user concepts - if not, treat as empty
          const existingUserConcepts = localStorage.getItem(getCurriculumKey(curriculumId, 'user_concepts'));
          const hasUserConcepts = existingUserConcepts && JSON.parse(existingUserConcepts).length > 0;
          
          let concepts: any[] = [];
          
          console.log(`ConceptStore: Loading concepts for curriculum ${curriculumId}, isEmpty flag:`, isEmpty, 'specGenerated:', isSpecGenerated, 'hasUserConcepts:', hasUserConcepts);
          
          // NEVER load default concepts - all curriculums start empty
          console.log(`ConceptStore: Never loading default concepts - all curriculums start empty`);
          
          if (isSpecGenerated) {
            console.log('ConceptStore: Spec-generated curriculum - only loading user concepts');
          } else {
            console.log('ConceptStore: Starting with empty concepts');
          }
          
          // Load user concepts from localStorage (curriculum-specific)
          const storedUserConceptsData = localStorage.getItem(getCurriculumKey(curriculumId, 'user_concepts'));
          const userConcepts = storedUserConceptsData ? JSON.parse(storedUserConceptsData) : [];
          
          // Load deleted concepts list to exclude them (curriculum-specific)
          const deletedConceptsStr = localStorage.getItem(getCurriculumKey(curriculumId, 'deleted_concepts'));
          const deletedConceptIds = deletedConceptsStr ? JSON.parse(deletedConceptsStr) : [];
          
          // Ensure all concepts have required properties
          const normalizedConcepts = concepts.map((concept: any) => {
            const masteryData = concept.mastery_data || {
              attempts: 0,
              correct: 0,
              incorrect: 0,
              mastery_level: 0,
              last_practiced: null
            };
            
            // Normalize mastery level to 0-2 range (convert old 5-level system to 3-level)
            if (masteryData.mastery_level > 2) {
              masteryData.mastery_level = 0; // Reset to unseen if using old system
            }
            
            return {
              ...concept,
              content: concept.content || concept.description || concept.knowledge || 'No content available',
              custom_filters: concept.custom_filters || concept.tags || [],
              prerequisites: concept.prerequisites || [],
              mastery_data: masteryData
            };
          });
          
          const normalizedUserConcepts = userConcepts.map((concept: any) => {
            const masteryData = concept.mastery_data || {
              attempts: 0,
              correct: 0,
              incorrect: 0,
              mastery_level: 0,
              last_practiced: null
            };
            
            // Normalize mastery level to 0-2 range (convert old 5-level system to 3-level)
            if (masteryData.mastery_level > 2) {
              masteryData.mastery_level = 0; // Reset to unseen if using old system
            }
            
            return {
              ...concept,
              content: concept.content || concept.description || concept.knowledge || 'No content available',
              custom_filters: concept.custom_filters || concept.tags || [],
              prerequisites: concept.prerequisites || [],
              mastery_data: masteryData
            };
          });
          
          // Filter out deleted concepts
          const filteredNormalizedConcepts = normalizedConcepts.filter(
            (concept: any) => !deletedConceptIds.includes(concept.concept_id)
          );
          const filteredUserConcepts = normalizedUserConcepts.filter(
            (concept: any) => !deletedConceptIds.includes(concept.concept_id)
          );
          
          const allConcepts = [...filteredNormalizedConcepts, ...filteredUserConcepts];
          
          // Load custom filters (curriculum-specific)
          const customFiltersKey = getCurriculumKey(curriculumId, 'custom_filters');
          let storedFilters = localStorage.getItem(customFiltersKey);
          
          // Check for legacy custom filters (before curriculum-specific storage)
          if (!storedFilters) {
            const legacyFiltersKey = 'custom_filters';
            const legacyFilters = localStorage.getItem(legacyFiltersKey);
            if (legacyFilters) {
              console.log(`ConceptStore: Found legacy custom filters, migrating to curriculum-specific storage`);
              storedFilters = legacyFilters;
              // Save to new location
              localStorage.setItem(customFiltersKey, legacyFilters);
              // Optionally remove legacy (but keep for other curriculums that might need it)
            }
          }
          
          const customFilters = storedFilters ? JSON.parse(storedFilters) : [];
          console.log(`ConceptStore: Loading custom filters for ${curriculumId}:`);
          console.log('  - Key:', customFiltersKey);
          console.log('  - Raw stored data:', storedFilters);
          console.log('  - Parsed filters:', JSON.stringify(customFilters, null, 2));
          console.log('  - Count:', customFilters.length);
          
          // Also check for any localStorage keys that might contain filters
          console.log('  - All localStorage keys containing "filter":');
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('filter')) {
              console.log(`    ${key}: ${localStorage.getItem(key)}`);
            }
          }
          
          // Load filter categories (curriculum-specific)
          const categoriesKey = getCurriculumKey(curriculumId, 'filter_categories');
          const storedCategories = localStorage.getItem(categoriesKey);
          const filterCategories = storedCategories ? JSON.parse(storedCategories) : [];
          console.log(`ConceptStore: Loading filter categories for ${curriculumId}:`);
          console.log('  - Key:', categoriesKey);
          console.log('  - Raw stored data:', storedCategories);
          console.log('  - Parsed categories:', filterCategories);
          console.log('  - Count:', filterCategories.length);
          
          const filterOptions = extractFilterOptions(allConcepts);
          
          // Debug: Check what concepts we have and their custom filters
          console.log(`ConceptStore: Loaded ${allConcepts.length} concepts for ${curriculumId}`);
          console.log('ConceptStore: Sample concepts with custom filters:');
          allConcepts.slice(0, 3).forEach((concept, index) => {
            console.log(`  ${index + 1}. ${concept.title}: custom_filters =`, concept.custom_filters);
          });
          console.log('ConceptStore: Extracted filter options:');
          console.log('  - custom_filters:', filterOptions.custom_filters);
          console.log('  - custom_filters count:', filterOptions.custom_filters.length);
          
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
              ...currentFilterState
              // Keep existing custom filters - don't clear them
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
            filterCategories,
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
      addConcept: async (concept: Omit<ConceptNode, 'concept_id' | 'created_at' | 'updated_at'>) => {
        const newConcept: ConceptNode = {
          ...concept,
          concept_id: concept.concept_id 
            ? concept.concept_id 
            : `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        const currentState = get();
        const updatedConcepts = [...currentState.concepts, newConcept];
        
        // Check storage before saving
        const dataSize = JSON.stringify(updatedConcepts).length * 2;
        await StorageManager.checkBeforeSave(dataSize);
        
        // Persist full concept list (curriculum-specific)
        localStorage.setItem(getCurriculumKey(curriculumId, 'user_concepts'), JSON.stringify(updatedConcepts));
        
        // Only remove the empty flag if this is a manual user action (not during initialization)
        // We can detect this by checking if we have any user concepts now
        if (updatedConcepts.length > 0) {
          console.log(`ConceptStore: Removing empty flag for ${curriculumId} - user added concept`);
          localStorage.removeItem(`${curriculumId}_is_empty`);
        }
        
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
        
        console.log('🔍 Filters still in use by remaining concepts:', Array.from(allFiltersInUse));
        
        // Clean up filter assignments - only remove assignments for filters not used by ANY concept
        const assignmentsKey = getCurriculumKey(curriculumId, 'filter_assignments');
        const currentAssignments = JSON.parse(localStorage.getItem(assignmentsKey) || '{}');
        const cleanedAssignments: Record<string, string> = {};
        
        console.log('📋 Current filter assignments:', currentAssignments);
        
        // Keep assignments for filters that are still used by ANY remaining concept
        Object.entries(currentAssignments).forEach(([filter, categoryId]) => {
          if (allFiltersInUse.has(filter)) {
            cleanedAssignments[filter] = categoryId as string;
            console.log(`✅ Keeping assignment: ${filter} -> ${categoryId}`);
          } else {
            console.log(`🗑️ Removing unused filter assignment: ${filter} -> ${categoryId}`);
          }
        });
        
        console.log('🧹 Cleaned assignments:', cleanedAssignments);
        
        // Update assignments if they changed
        if (Object.keys(cleanedAssignments).length !== Object.keys(currentAssignments).length) {
          localStorage.setItem(assignmentsKey, JSON.stringify(cleanedAssignments));
        }
        
        // Clean up filter categories - ONLY remove if NO filters are assigned to them
        // Get all category IDs that still have filters assigned
        const categoriesWithAssignedFilters = new Set(Object.values(cleanedAssignments));
        
        console.log('📂 Categories with assigned filters:', Array.from(categoriesWithAssignedFilters));
        console.log('📂 Current categories:', currentState.filterCategories.map((c: any) => `${c.name} (${c.id})`));
        
        let updatedCategories = currentState.filterCategories.filter(category => {
          // Keep if ID is referenced OR if slug(name) is referenced in assignments
          const slug = category.name.toLowerCase().replace(/\s+/g, '-');
          const hasAssignedFilters =
            categoriesWithAssignedFilters.has(category.id) ||
            categoriesWithAssignedFilters.has(slug as any);

          if (!hasAssignedFilters) {
            console.log(`🗑️ Removing category with no assigned filters: ${category.name} (${category.id})`);
          } else {
            console.log(`✅ Keeping category: ${category.name} (${category.id}) - has assigned filters`);
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
          console.log('🧱 Rebuilt categories from assignments:', updatedCategories);
        }

        console.log('📂 Updated categories:', updatedCategories.map((c: any) => `${c.name} (${c.id})`));

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
        console.log(`ConceptStore: Clearing all concepts for curriculum ${curriculumId}`);
        
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
        const questionCount = practiceConfig?.question_count || 10;
        
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
          
          // Use the specified number of concepts, up to what's available
          const conceptsForQuestions = conceptsToUse.slice(0, Math.min(questionCount, conceptsToUse.length));
          
          // Update the actual count being generated
          set({ generatingQuestionCount: conceptsForQuestions.length });
          
          console.log(`🎯 Practice Session: Generating ${conceptsForQuestions.length} questions from ${conceptsToUse.length} available concepts`);
          
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
          
          const questionPromises = conceptsForQuestions.map(async (concept) => {
            try {
              // Use config-based approach to prevent missing parameters
              return await generateQuestionWithConfig({
                concept,
                format: targetFormat as 'flashcard' | 'ukmla_sba' | 'sba' | 'emq' | 'true_false' | 'ranking',
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
          generatingQuestionCount: 0
        });
      },

      updateMastery: (conceptId: string, isCorrect: boolean) => {
        const currentState = get();
        
        // Track answer in current session
        const sessionAnswer = {
          questionId: `q_${Date.now()}`,
          conceptId,
          isCorrect,
          timestamp: new Date().toISOString()
        };
        
        const updatedSessionAnswers = [...currentState.currentSessionAnswers, sessionAnswer];
        
        // Development logging
        if (process.env.NODE_ENV === 'development') {
          console.log('🎯 updateMastery called:', { conceptId, isCorrect, sessionAnswers: updatedSessionAnswers.length });
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
            
            // Simplified mastery level: 0 = unseen, 1 = incorrect, 2 = correct
            let newMastery = 0;
            
            if (newAttempts === 0) {
              // Never attempted
              newMastery = 0; // Unseen
            } else {
              // Based on most recent answer
              newMastery = isCorrect ? 2 : 1; // Correct or Incorrect
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
