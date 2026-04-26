import React, { useState, useEffect } from 'react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { ConceptNode } from '@/types/conceptTypes';
import { Search, Award, BookOpen, Grid, List, Check, AlertCircle, Plus, ChevronRight, X } from 'lucide-react';
import { ConceptEditorModal } from './ConceptEditorModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

interface ConceptCardProps {
  concept: ConceptNode;
  onEdit: (concept: ConceptNode) => void;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (conceptId: string) => void;
}

const ConceptCard: React.FC<ConceptCardProps> = ({ 
  concept, 
  onEdit, 
  isSelectMode, 
  isSelected, 
  onToggleSelect 
}) => {
  // Get mastery level color (simplified: 0=unseen, 1=incorrect, 2=correct)
  const getMasteryColor = (level: number) => {
    switch(level) {
      case 0: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'; // Unseen
      case 1: return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'; // Incorrect
      case 2: return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'; // Correct
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };
  
  // Get mastery level name
  const getMasteryLabel = (level: number) => {
    switch(level) {
      case 0: return 'Unseen';
      case 1: return 'Incorrect';
      case 2: return 'Correct';
      default: return 'Unknown';
    }
  };

  // Get background color based on accuracy (saturation increases with accuracy)
  const getBackgroundStyle = () => {
    if (attempts === 0) {
      return {}; // Use default gray from className
    }
    
    // Simple red to green gradient based on accuracy
    if (accuracy >= 50) {
      // Green side: 50% = light green, 100% = saturated green
      const intensity = 0.1 + ((accuracy - 50) / 50) * 0.3; // 0.1 to 0.4
      return { backgroundColor: `rgba(34, 197, 94, ${intensity})` }; // green-500
    } else {
      // Red side: 0% = saturated red, 50% = light red
      const intensity = 0.1 + ((50 - accuracy) / 50) * 0.3; // 0.1 to 0.4
      return { backgroundColor: `rgba(239, 68, 68, ${intensity})` }; // red-500
    }
  };

  const attempts = concept.mastery_data?.attempts ?? 0;
  const correct = concept.mastery_data?.correct ?? 0;
  const incorrect = concept.mastery_data?.incorrect ?? (attempts - correct);
  const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

  return (
    <div 
      className={`group rounded-2xl border border-black/[0.08] dark:border-white/[0.08] p-5 shadow-sm hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 relative cursor-pointer flex flex-col h-full`}
      style={{ ...getBackgroundStyle(), backdropFilter: 'blur(100px)' }}
      onClick={() => {
        if (isSelectMode) {
          onToggleSelect(concept.concept_id);
        } else {
          onEdit(concept);
        }
      }}
      data-concept-card
    >
      {isSelectMode && (
        <div className="absolute top-2 right-2 z-20">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(concept.concept_id)}
            className="h-4 w-4"
          />
        </div>
      )}

      {/* Hover Overlay - Ultra Minimal */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center pointer-events-none z-10">
        <div className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-2xl" />
        
        <div className="relative flex flex-col items-center gap-3">
          {/* Concept Title Above Ring */}
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white text-center px-4 max-w-full line-clamp-2">
            {concept.title}
          </h3>
          
          {/* Minimal Progress Ring */}
          <div className="relative">
            <svg width="100" height="100" className="-rotate-90">
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-zinc-200/30 dark:text-zinc-700/30"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="#22c55e"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - (attempts > 0 ? correct / attempts : 0))}`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
              {incorrect > 0 && attempts > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeDasharray={`${(incorrect / attempts) * 2 * Math.PI * 44} ${2 * Math.PI * 44}`}
                  strokeDashoffset={`${-(correct / attempts) * 2 * Math.PI * 44}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl font-semibold text-zinc-900 dark:text-white">
                {accuracy}%
              </div>
            </div>
          </div>

          {/* Minimal Stats */}
          <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
            <div>{accuracy}% accuracy</div>
            <div className="mt-0.5">{correct}/{attempts} attempts correct</div>
          </div>
        </div>
      </div>
      
      <div className="mb-3">
        <div className="px-2.5 py-1 text-[11px] font-medium rounded-full inline-flex items-center bg-white/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300">
          <Award className="h-3 w-3 mr-1.5" />
          {attempts > 0 ? `${accuracy}% accuracy, ${attempts} ${attempts === 1 ? 'attempt' : 'attempts'}` : 'Unseen'}
        </div>
      </div>
      
      <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-2 leading-tight">
        {concept.title}
      </h3>
      
      <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-3 line-clamp-2 leading-relaxed flex-grow">
        {concept.content ? 
          (() => {
            if (concept.content.length <= 120) return concept.content;
            
            // Find the last space before the 120 character limit to avoid cutting words
            const truncated = concept.content.substring(0, 120);
            const lastSpaceIndex = truncated.lastIndexOf(' ');
            const cutPoint = lastSpaceIndex > 80 ? lastSpaceIndex : 120;
            
            return concept.content.substring(0, cutPoint).trim() + '...';
          })() : 
          'No content available'
        }
      </div>
      
      
      <div className="flex flex-wrap gap-1.5 mt-auto">
        {concept.custom_filters?.slice(0, 2).map((filter, index) => (
          <span key={index} className="px-2.5 py-1 text-[11px] font-medium bg-white/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 rounded-full truncate max-w-24">
            {filter}
          </span>
        ))}
        {concept.custom_filters && concept.custom_filters.length > 2 && (
          <span className="px-2.5 py-1 text-[11px] font-medium bg-white/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 rounded-full">
            +{concept.custom_filters.length - 2}
          </span>
        )}
      </div>
    </div>
  );
};

// List item version for more compact view
interface ConceptListItemProps {
  concept: ConceptNode;
  onPractice: (conceptId: string) => void;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (conceptId: string) => void;
}

const ConceptListItem: React.FC<ConceptListItemProps> = ({ concept, onPractice, isSelectMode, isSelected, onToggleSelect }) => {
  const attempts = concept.mastery_data?.attempts ?? 0;
  const correct = concept.mastery_data?.correct ?? 0;
  const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

  // Get background color based on accuracy (saturation increases with accuracy)
  const getBackgroundStyle = () => {
    if (attempts === 0) {
      return {}; // Use default gray from className
    }
    
    // Simple red to green gradient based on accuracy
    if (accuracy >= 50) {
      // Green side: 50% = light green, 100% = saturated green
      const intensity = 0.1 + ((accuracy - 50) / 50) * 0.3; // 0.1 to 0.4
      return { backgroundColor: `rgba(34, 197, 94, ${intensity})` }; // green-500
    } else {
      // Red side: 0% = saturated red, 50% = light red
      const intensity = 0.1 + ((50 - accuracy) / 50) * 0.3; // 0.1 to 0.4
      return { backgroundColor: `rgba(239, 68, 68, ${intensity})` }; // red-500
    }
  };

  const getMasteryLabel = (level: number) => {
    switch(level) {
      case 0: return 'Unseen';
      case 1: return 'Incorrect';
      case 2: return 'Correct';
      default: return 'Unknown';
    }
  };

  return (
    <div 
      className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer bg-gray-50 dark:bg-gray-800"
      style={getBackgroundStyle()}
      onClick={() => {
        if (isSelectMode) {
          onToggleSelect(concept.concept_id);
        }
      }}
    >
      {isSelectMode && (
        <div className="mr-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(concept.concept_id)}
            className="h-4 w-4"
          />
        </div>
      )}
      <div className="flex-1 flex items-center gap-3">
        <div className="px-2.5 py-1 text-[11px] font-medium rounded-full inline-flex items-center bg-white/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300">
          <Award className="h-3 w-3 mr-1.5" />
          {getMasteryLabel(concept.mastery_data?.mastery_level || 0)}
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          {concept.title}
        </h3>
      </div>
      <button
        className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 shadow-md ml-4"
        onClick={() => onPractice(concept.concept_id)}
      >
        Practice
      </button>
    </div>
  );
};

interface ConceptGridViewProps {
  onBulkUploadClick?: () => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export const ConceptGridView: React.FC<ConceptGridViewProps> = ({ onBulkUploadClick, selectedCategory: propSelectedCategory, onCategoryChange }) => {
  const { filteredConcepts, startPractice, updateConcept, deleteConcept, loadConcepts, filterCategories, filterState, updateFilterState, resetFilters, curriculumId } = useConceptStore() as any;
  const [selectedConcepts, setSelectedConcepts] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  
  // Local state for grid view
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'folder'>('grid');
  const [sortBy, setSortBy] = useState<'mastery' | 'alphabetical' | 'system'>('mastery');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // desc = high to low
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [localSelectedCategory, setLocalSelectedCategory] = useState<string>('all');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  
  // Use prop if provided, otherwise use local state
  const selectedCategory = propSelectedCategory !== undefined ? propSelectedCategory : localSelectedCategory;
  const setSelectedCategory = onCategoryChange || setLocalSelectedCategory;
  const [quickFilters] = useState<{
    mastery?: number;
    system?: string;
  }>({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState<ConceptNode | null>(null);
  const [modalMode, setModalMode] = useState<'edit'>('edit');
  const gridContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Exit selection mode when clicking outside
  React.useEffect(() => {
    if (!isSelectMode) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Allow clicking on the selection controls container itself (white space)
      if (target.hasAttribute('data-selection-controls')) {
        setIsSelectMode(false);
        setSelectedConcepts(new Set());
        return;
      }
      
      // Don't exit if clicking on buttons or concept cards
      if (
        target.closest('[data-concept-card]') ||
        target.closest('button') ||
        target.closest('input[type="checkbox"]')
      ) {
        return;
      }
      
      // Exit selection mode for any other click
      setIsSelectMode(false);
      setSelectedConcepts(new Set());
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSelectMode]);
  
  // Reset editing state when modal closes
  React.useEffect(() => {
    if (!editModalOpen) {
      // Small delay to ensure state is reset after animation completes
      const timer = setTimeout(() => {
        setEditingConcept(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [editModalOpen]);
  
  // Define practice handler
  const handlePractice = (conceptId: string) => {
    const concept = filteredConcepts.find(c => c.concept_id === conceptId);
    if (concept) {
      startPractice({
        question_count: 1,
        target_formats: ['ukmla_sba']
      });
    }
  };

  const handleEdit = (concept: ConceptNode) => {
    // Force a clean state before opening the modal
    setEditingConcept(null);
    setEditModalOpen(false);
    
    // Use setTimeout to ensure state updates have been processed
    setTimeout(() => {
      setEditingConcept(concept);
      setModalMode('edit');
      setEditModalOpen(true);
    }, 50);
  };

  const handleDelete = (conceptId: string) => {
    if (confirm('Are you sure you want to delete this concept?')) {
      try {
        // Delete from store
        deleteConcept(conceptId);
        
        // Also delete from localStorage to make it permanent
        const storedConcepts = localStorage.getItem('user_concepts');
        if (storedConcepts) {
          const concepts = JSON.parse(storedConcepts);
          const updatedConcepts = concepts.filter((c: any) => c.concept_id !== conceptId);
          localStorage.setItem('user_concepts', JSON.stringify(updatedConcepts));
        }
        
        // Also try to delete from conceptModel.json if it exists there
        // This requires server-side code, but we'll show a message to the user
        const conceptExists = filteredConcepts.some(c => 
          c.concept_id === conceptId && !c.concept_id.startsWith('user_'));
          
        if (conceptExists) {
          setStatusMessage({
            type: 'info',
            message: `Concept removed from current session. To permanently delete from codebase, edit conceptModel.json.`
          });
        } else {
          setStatusMessage({
            type: 'success',
            message: 'Concept successfully deleted!'
          });
        }
        
        // Force reload concepts
        setTimeout(() => {
          loadConcepts();
        }, 100);
      } catch (error) {
        console.error('Error deleting concept:', error);
        setStatusMessage({
          type: 'error',
          message: 'Failed to delete concept. See console for details.'
        });
      }
    }
  };
  
  // Handle bulk deletion
  const handleBulkDelete = () => {
    if (selectedConcepts.size === 0) {
      setStatusMessage({
        type: 'info',
        message: 'No concepts selected for deletion.'
      });
      return;
    }
    
    // Skip confirmation and proceed directly with deletion
    try {
        // Get the concepts to delete
        const conceptsToDelete = Array.from(selectedConcepts);
        console.log('Deleting concepts:', conceptsToDelete);
        
        // Delete from localStorage first (for bulk imported concepts)
        const storedConcepts = localStorage.getItem('user_concepts');
        if (storedConcepts) {
          const concepts = JSON.parse(storedConcepts);
          console.log('Before deletion - localStorage concepts:', concepts.length);
          const updatedConcepts = concepts.filter((c: any) => !conceptsToDelete.includes(c.concept_id));
          console.log('After deletion - localStorage concepts:', updatedConcepts.length);
          localStorage.setItem('user_concepts', JSON.stringify(updatedConcepts));
        }
        
        // Add to deleted concepts list to prevent them from showing up again
        const deletedConceptsStr = localStorage.getItem('deleted_concepts');
        const deletedConceptIds = deletedConceptsStr ? JSON.parse(deletedConceptsStr) : [];
        const updatedDeletedIds = [...deletedConceptIds, ...conceptsToDelete];
        localStorage.setItem('deleted_concepts', JSON.stringify(updatedDeletedIds));
        
        // Delete each concept from store
        conceptsToDelete.forEach(conceptId => {
          deleteConcept(conceptId);
        });
        
        // Clear selection
        setSelectedConcepts(new Set());
        setIsSelectMode(false);
        
        // Show success message
        setStatusMessage({
          type: 'success',
          message: `Successfully deleted ${conceptsToDelete.length} concepts!`
        });
        
        // Force reload concepts
        setTimeout(() => {
          loadConcepts();
        }, 100);
        
        console.log('Deletion process completed');
    } catch (error) {
      console.error('Error bulk deleting concepts:', error);
      setStatusMessage({
        type: 'error',
        message: 'Failed to delete some concepts. See console for details.'
      });
    }
  };
  
  // Toggle concept selection
  const toggleConceptSelection = (conceptId: string) => {
    setSelectedConcepts(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(conceptId)) {
        newSelection.delete(conceptId);
      } else {
        newSelection.add(conceptId);
      }
      return newSelection;
    });
  };
  
  // Select all displayed concepts
  const selectAllConcepts = () => {
    const allIds = displayedConcepts.map(c => c.concept_id).filter(id => id !== undefined);
    const uniqueIds = [...new Set(allIds)]; // Remove duplicates
    setSelectedConcepts(new Set(uniqueIds));
  };
  
  // Deselect all concepts
  const deselectAllConcepts = () => {
    setSelectedConcepts(new Set());
  };
  
  // Clear status message after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);
  
  // Close category dropdown when view mode changes
  useEffect(() => {
    setIsCategoryDropdownOpen(false);
  }, [viewMode]);


  const handleSaveConcept = (concept: Partial<ConceptNode>) => {
    if (editingConcept) {
      updateConcept(editingConcept.concept_id, concept);
    }
    setEditModalOpen(false);
  };

  // Handle sorting
  const handleSort = (e: React.MouseEvent, key: 'mastery' | 'alphabetical' | 'system') => {
    // Prevent event from bubbling up to parent elements
    e.stopPropagation();
    
    if (sortBy === key) {
      // Toggle direction if clicking the same sort
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      // New sort type, default to descending
      setSortBy(key);
      setSortDirection('desc');
    }
  };

  // Sort concepts
  const sortedConcepts = [...filteredConcepts].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'mastery') {
      // Calculate accuracy for both concepts
      const aAttempts = a.mastery_data?.attempts ?? 0;
      const aCorrect = a.mastery_data?.correct ?? 0;
      const aAccuracy = aAttempts > 0 ? (aCorrect / aAttempts) * 100 : -1; // -1 for unseen
      
      const bAttempts = b.mastery_data?.attempts ?? 0;
      const bCorrect = b.mastery_data?.correct ?? 0;
      const bAccuracy = bAttempts > 0 ? (bCorrect / bAttempts) * 100 : -1; // -1 for unseen
      
      // Sort by accuracy
      comparison = bAccuracy - aAccuracy;
    } else if (sortBy === 'alphabetical') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === 'system') {
      const aSystem = a.dimensions?.exam_specific?.ukmla?.systems?.join(', ') || '';
      const bSystem = b.dimensions?.exam_specific?.ukmla?.systems?.join(', ') || '';
      comparison = aSystem.localeCompare(bSystem);
    }
    
    // Apply sort direction
    return sortDirection === 'desc' ? comparison : -comparison;
  });

  // Apply search and quick filters
  const displayedConcepts = sortedConcepts.filter(concept => {
    // Apply category filter
    if (selectedCategory !== 'all') {
      const filterAssignments = JSON.parse(localStorage.getItem(`${curriculumId}_filter_assignments`) || '{}');
      const conceptFilters = concept.custom_filters || [];
      
      const hasFilterInCategory = conceptFilters.some(filter => 
        filterAssignments[filter] === selectedCategory
      );
      
      if (!hasFilterInCategory) {
        return false;
      }
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = concept.title?.toLowerCase().includes(query) || false;
      const matchesContent = concept.content?.toLowerCase().includes(query) || false;
      const matchesCustomFilters = concept.custom_filters?.some(f => f.toLowerCase().includes(query)) || false;
      
      if (!(matchesTitle || matchesContent || matchesCustomFilters)) {
        return false;
      }
    }
    
    // Apply quick filters
    if (quickFilters.mastery !== undefined && 
        concept.mastery_data.mastery_level !== quickFilters.mastery) {
      return false;
    }
    
    // System filter removed - dimensions property no longer exists on ConceptNode
    // if (quickFilters.system !== undefined && quickFilters.system !== null) {
    //   return false;
    // }
    
    return true;
  });

  // Debug: Log filtering results
  React.useEffect(() => {
    console.log('📊 Filter Results:', {
      selectedCategory,
      totalConcepts: sortedConcepts.length,
      displayedConcepts: displayedConcepts.length,
      curriculumId,
      filterAssignments: JSON.parse(localStorage.getItem(`${curriculumId}_filter_assignments`) || '{}')
    });
  }, [selectedCategory, displayedConcepts.length, sortedConcepts.length, curriculumId]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Status message */}
      {statusMessage && (
        <Alert 
          variant={statusMessage.type === 'error' ? 'destructive' : statusMessage.type === 'success' ? 'default' : 'default'}
          className="mb-4"
        >
          {statusMessage.type === 'error' && <AlertCircle className="h-4 w-4" />}
          {statusMessage.type === 'success' && <Check className="h-4 w-4" />}
          {statusMessage.type === 'info' && <AlertCircle className="h-4 w-4" />}
          <AlertTitle>
            {statusMessage.type === 'error' ? 'Error' : 
             statusMessage.type === 'success' ? 'Success' : 'Information'}
          </AlertTitle>
          <AlertDescription>{statusMessage.message}</AlertDescription>
        </Alert>
      )}

      {/* Horizontal Controls Toolbar */}
      <div className="space-y-4 mb-6">
        
        {/* Top Row: Search + Sort + View + Select */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Search Bar */}
          <div className="flex-1 min-w-[300px] max-w-[400px]">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-[18px] w-[18px] text-zinc-400" />
              </div>
              <input
                type="search"
                placeholder="Search concepts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 text-[15px] bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 transition-all"
              />
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex items-center bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-lg p-1 border border-black/[0.08] dark:border-white/[0.08]">
            <button
              className={`px-3 py-1.5 text-[13px] font-semibold rounded-md transition-all flex items-center gap-1 ${
                sortBy === 'mastery' 
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
              onClick={(e) => handleSort(e, 'mastery')}
            >
              Mastery
              {sortBy === 'mastery' && (
                <span className="text-[10px]">{sortDirection === 'desc' ? '↓' : '↑'}</span>
              )}
            </button>
            <button
              className={`px-3 py-1.5 text-[13px] font-semibold rounded-md transition-all ${
                sortBy === 'alphabetical' 
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
              onClick={(e) => handleSort(e, 'alphabetical')}
            >
              A-Z
            </button>
          </div>

          {/* View Toggle */}
          <button
            className="p-2 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:bg-white/80 dark:hover:bg-zinc-800/80 transition-all"
            onClick={() => {
              if (viewMode === 'grid') setViewMode('list');
              else if (viewMode === 'list') setViewMode('folder');
              else setViewMode('grid');
            }}
            title={viewMode === 'grid' ? 'Switch to List View' : viewMode === 'list' ? 'Switch to Folder View' : 'Switch to Grid View'}
          >
            {viewMode === 'grid' ? <Grid className="h-[18px] w-[18px] text-zinc-600 dark:text-zinc-400" /> : viewMode === 'list' ? <List className="h-[18px] w-[18px] text-zinc-600 dark:text-zinc-400" /> : <BookOpen className="h-[18px] w-[18px] text-zinc-600 dark:text-zinc-400" />}
          </button>

          {/* Category Filter - show in all views */}
          {(() => {
            const storedCategories = JSON.parse(localStorage.getItem(`${curriculumId}_filter_categories`) || '[]');
            const selectedCategoryName = selectedCategory === 'all' 
              ? 'All Categories' 
              : storedCategories.find((c: any) => c.id === selectedCategory)?.name || 'All Categories';
            
            return (
              <div className="relative">
                {/* Dropdown Button */}
                <button
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="px-4 py-2 text-[13px] font-medium text-zinc-700 dark:text-zinc-300 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl hover:bg-white/80 dark:hover:bg-zinc-800/80 rounded-lg border border-black/[0.08] dark:border-white/[0.08] transition-all cursor-pointer flex items-center gap-2 min-w-[160px]"
                >
                  <span className="flex-1 text-left truncate">{selectedCategoryName}</span>
                  <ChevronRight 
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      isCategoryDropdownOpen ? 'rotate-90' : 'rotate-0'
                    }`} 
                  />
                </button>

                {/* Dropdown Menu */}
                {isCategoryDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsCategoryDropdownOpen(false)}
                    />
                    
                    {/* Menu */}
                    <div className="absolute top-full mt-2 right-0 z-50 min-w-[200px] bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl rounded-xl border border-black/[0.08] dark:border-white/[0.08] shadow-xl overflow-hidden">
                      {/* All Categories Option */}
                      <button
                        onClick={() => {
                          console.log('🔵 Selecting: All Categories');
                          setSelectedCategory('all');
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-[13px] font-medium transition-colors flex items-center justify-between ${
                          selectedCategory === 'all'
                            ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-700/50'
                        }`}
                      >
                        <span>All Categories</span>
                        {selectedCategory === 'all' && (
                          <Check className="h-4 w-4" />
                        )}
                      </button>

                      {/* Divider */}
                      {storedCategories.length > 0 && (
                        <div className="h-px bg-black/[0.08] dark:bg-white/[0.08] my-1" />
                      )}

                      {/* Category Options */}
                      {storedCategories.map((category: any) => (
                        <button
                          key={category.id}
                          onClick={() => {
                            console.log('🔵 Selecting category:', category.name, category.id);
                            setSelectedCategory(category.id);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-[13px] font-medium transition-colors flex items-center justify-between ${
                            selectedCategory === category.id
                              ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-700/50'
                          }`}
                        >
                          <span>{category.name}</span>
                          {selectedCategory === category.id && (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Select Multiple Button */}
          <button
            className="px-3 py-2 text-[13px] font-medium text-zinc-700 dark:text-zinc-300 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl hover:bg-white/80 dark:hover:bg-zinc-800/80 rounded-lg border border-black/[0.08] dark:border-white/[0.08] transition-all"
            onClick={() => setIsSelectMode(!isSelectMode)}
          >
            {isSelectMode ? 'Cancel' : 'Select Multiple'}
          </button>
        </div>

      </div>

          {/* Bulk Selection Actions */}
          {isSelectMode && (
            <div className="mb-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4" data-selection-controls>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex gap-2">
                  <button
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all"
                    onClick={selectAllConcepts}
                  >
                    Select All
                  </button>
                  <button
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all"
                    onClick={deselectAllConcepts}
                  >
                    Clear
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 transition-all"
                    onClick={handleBulkDelete}
                    disabled={selectedConcepts.size === 0}
                  >
                    Delete ({selectedConcepts.size})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Concept Grid */}
          <div 
            className={isSelectMode ? "cursor-pointer" : ""}
            onClick={isSelectMode ? () => {
              setIsSelectMode(false);
              setSelectedConcepts(new Set());
            } : undefined}
          >
        {viewMode === 'folder' ? (
          /* Folder View */
          <div className="space-y-4">
            {(() => {
              // Get filter assignments from localStorage
              const filterAssignments = JSON.parse(localStorage.getItem(`${curriculumId}_filter_assignments`) || '{}');
              
              // Group concepts by custom filters
              const folderGroups: Record<string, ConceptNode[]> = {};
              
              displayedConcepts.forEach(concept => {
                if (concept.custom_filters && concept.custom_filters.length > 0) {
                  concept.custom_filters.forEach(filter => {
                    // Check if this filter belongs to the selected category (or show all)
                    const filterCategoryId = filterAssignments[filter];
                    if (selectedCategory === 'all' || filterCategoryId === selectedCategory) {
                      if (!folderGroups[filter]) {
                        folderGroups[filter] = [];
                      }
                      folderGroups[filter].push(concept);
                    }
                  });
                } else if (selectedCategory === 'all') {
                  // Uncategorized - only show when "All Categories" is selected
                  if (!folderGroups['Uncategorized']) {
                    folderGroups['Uncategorized'] = [];
                  }
                  folderGroups['Uncategorized'].push(concept);
                }
              });

              return Object.entries(folderGroups).sort(([a], [b]) => a.localeCompare(b)).map(([filterName, concepts]) => {
                const isExpanded = expandedFolders.has(filterName);
                const unseenCount = concepts.filter(c => c.mastery_data?.mastery_level === 0).length;
                const incorrectCount = concepts.filter(c => c.mastery_data?.mastery_level === 1).length;
                const correctCount = concepts.filter(c => c.mastery_data?.mastery_level === 2).length;

                const correctPct = (correctCount / concepts.length) * 100;
                const incorrectPct = (incorrectCount / concepts.length) * 100;
                const unseenPct = (unseenCount / concepts.length) * 100;
                
                // Create gradient background
                const gradientBg = `linear-gradient(to right, 
                  rgb(34 197 94) 0%, 
                  rgb(34 197 94) ${correctPct}%, 
                  rgb(239 68 68) ${correctPct}%, 
                  rgb(239 68 68) ${correctPct + incorrectPct}%, 
                  rgb(209 213 219) ${correctPct + incorrectPct}%, 
                  rgb(209 213 219) 100%)`;

                return (
                  <div key={filterName} className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden shadow-md">
                    {/* Folder Header with Progress Background */}
                    <button
                      className="w-full p-5 flex items-center justify-between transition-all relative group"
                      style={{ background: gradientBg }}
                      onClick={() => {
                        const newExpanded = new Set(expandedFolders);
                        if (isExpanded) {
                          newExpanded.delete(filterName);
                        } else {
                          newExpanded.add(filterName);
                        }
                        setExpandedFolders(newExpanded);
                      }}
                    >
                      {/* Semi-transparent overlay for better text readability */}
                      <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm group-hover:bg-white/70 dark:group-hover:bg-gray-800/70 transition-colors" />
                      
                      <div className="relative flex items-center gap-3 z-10">
                        <ChevronRight className={`h-5 w-5 text-gray-600 dark:text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                          {filterName.replace(/-/g, ' ')}
                        </h3>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          ({concepts.length})
                        </span>
                      </div>
                      
                      {/* Progress Stats */}
                      <div className="relative flex items-center gap-2 z-10">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          {correctCount}/{concepts.length} complete
                        </span>
                      </div>
                    </button>

                    {/* Folder Contents */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 dark:border-gray-700">
                        {concepts.map((concept, index) => (
                          <ConceptListItem
                            key={concept.concept_id}
                            concept={concept}
                            onPractice={handlePractice}
                            isSelectMode={isSelectMode}
                            isSelected={selectedConcepts.has(concept.concept_id)}
                            onToggleSelect={toggleConceptSelection}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {/* Add Concepts Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBulkUploadClick && onBulkUploadClick();
              }}
              className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 hover:border-blue-500 dark:hover:border-blue-400 transition-colors group cursor-pointer flex flex-col items-center justify-center min-h-[200px]"
            >
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                <Plus className="h-8 w-8 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-1">
                Add Concepts
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
                Bulk import or create new concepts
              </p>
            </button>
            
            {/* Existing Concept Cards */}
            {displayedConcepts.map((concept, index) => (
              <div key={`${concept.concept_id}-${index}`} onClick={(e) => e.stopPropagation()}>
                <ConceptCard
                  concept={concept}
                  onEdit={handleEdit}
                  isSelectMode={isSelectMode}
                  isSelected={selectedConcepts.has(concept.concept_id)}
                  onToggleSelect={toggleConceptSelection}
                />
              </div>
            ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {displayedConcepts.map((concept, index) => (
              <div key={`${concept.concept_id}-${index}`} onClick={(e) => e.stopPropagation()}>
                <ConceptListItem
                  concept={concept}
                  onPractice={handlePractice}
                  isSelectMode={isSelectMode}
                  isSelected={selectedConcepts.has(concept.concept_id)}
                  onToggleSelect={toggleConceptSelection}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Empty state */}
      {displayedConcepts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No concepts found matching your criteria.</p>
        </div>
      )}

      {/* Edit/Create Modal */}
      <ConceptEditorModal
        key={editingConcept ? editingConcept.concept_id : 'create-modal'}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          // Don't immediately reset the editing concept to avoid UI flicker
          // The useEffect will handle this after a delay
        }}
        onSave={handleSaveConcept}
        onDelete={handleDelete}
        concept={editingConcept}
        mode={modalMode}
      />
    </div>
  );
};
