import React, { useState, useEffect } from 'react';
import { useConceptStore } from '@/store/conceptStore';
import { ConceptNode } from '@/types/conceptTypes';
import { Search, Award, BookOpen, Brain, Grid, List, Check, AlertCircle, Plus } from 'lucide-react';
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
  // Get mastery level color (matching the mastery progress chart)
  const getMasteryColor = (level: number) => {
    switch(level) {
      case 0: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
      case 1: return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      case 2: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
      case 3: return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 4: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };
  
  // Get mastery level name
  const getMasteryLevelName = (level: number) => {
    switch(level) {
      case 0: return 'Unseen';
      case 1: return 'Learning';
      case 2: return 'Developing';
      case 3: return 'Competent';
      case 4: return 'Mastered';
      default: return 'Unknown';
    }
  };

  // Get background color based on mastery level (matching the mastery progress chart)
  const getMasteryBackgroundColor = (level: number) => {
    switch(level) {
      case 0: return 'bg-gray-50 dark:bg-gray-800';
      case 1: return 'bg-red-50 dark:bg-red-950/30';
      case 2: return 'bg-yellow-50 dark:bg-yellow-950/30';
      case 3: return 'bg-green-50 dark:bg-green-950/30';
      case 4: return 'bg-blue-50 dark:bg-blue-950/30';
      default: return 'bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <div 
      className={`${getMasteryBackgroundColor(concept.mastery_data?.mastery_level || 0)} rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow relative cursor-pointer flex flex-col h-full`}
      onClick={() => {
        if (isSelectMode) {
          onToggleSelect(concept.concept_id);
        } else {
          onEdit(concept);
        }
      }}
    >
      {isSelectMode && (
        <div className="absolute top-2 right-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(concept.concept_id)}
            className="h-4 w-4"
          />
        </div>
      )}
      
      <div className="mb-2">
        <div className={`px-2 py-1 text-xs rounded-full inline-flex ${getMasteryColor(concept.mastery_data?.mastery_level || 0)}`}>
          <span className="flex items-center">
            <Award className="h-3 w-3 mr-1" />
            {getMasteryLevelName(concept.mastery_data?.mastery_level || 0)}
          </span>
        </div>
      </div>
      
      <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 leading-tight">
        {concept.title}
      </h3>
      
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3 leading-relaxed flex-grow">
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
      </p>
      
      
      <div className="flex flex-wrap gap-1 mt-auto">
        {concept.custom_filters?.slice(0, 2).map((filter, index) => (
          <span key={index} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full truncate max-w-20 sm:max-w-none">
            {filter}
          </span>
        ))}
        {concept.custom_filters && concept.custom_filters.length > 2 && (
          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
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
}

const ConceptListItem: React.FC<ConceptListItemProps> = ({ concept, onPractice }) => {
  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
      <div className="flex-1">
        <div className="flex items-center">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {concept.title}
          </h3>
          <div className="ml-2 flex">
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {concept.bloom_levels && concept.bloom_levels.length > 0 ? concept.bloom_levels[0].charAt(0).toUpperCase() + concept.bloom_levels[0].slice(1) : 'Unknown'}
            </span>
          </div>
        </div>
        <div className="mt-1">
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
            <BookOpen className="h-3.5 w-3.5 mr-1" />
            <span className="mr-2">{concept.dimensions?.exam_specific?.ukmla?.systems?.join(', ') || 'Unknown'}</span>
            <Brain className="h-3.5 w-3.5 mr-1" />
            <span className="truncate max-w-[150px]">{concept.dimensions?.exam_specific?.ukmla?.conditions?.[0] || 'Unknown'}</span>
          </div>
        </div>
      </div>
      <button
        className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors ml-4"
        onClick={() => onPractice(concept.concept_id)}
      >
        Practice
      </button>
    </div>
  );
};

interface ConceptGridViewProps {
  onBulkUploadClick?: () => void;
}

export const ConceptGridView: React.FC<ConceptGridViewProps> = ({ onBulkUploadClick }) => {
  const { filteredConcepts, startPractice, updateConcept, deleteConcept, loadConcepts } = useConceptStore();
  const [selectedConcepts, setSelectedConcepts] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  
  // Local state for grid view
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'mastery' | 'alphabetical' | 'system'>('mastery');
  const [quickFilters] = useState<{
    mastery?: number;
    system?: string;
  }>({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState<ConceptNode | null>(null);
  const [modalMode, setModalMode] = useState<'edit'>('edit');
  
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
      setSortBy('alphabetical');
    } else {
      setSortBy(key);
    }
  };

  // Sort concepts
  const sortedConcepts = [...filteredConcepts].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'mastery') {
      const aMastery = a.mastery_data?.mastery_level || 0;
      const bMastery = b.mastery_data?.mastery_level || 0;
      comparison = aMastery - bMastery;
    } else if (sortBy === 'alphabetical') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === 'system') {
      const aSystem = a.dimensions?.exam_specific?.ukmla?.systems?.join(', ') || '';
      const bSystem = b.dimensions?.exam_specific?.ukmla?.systems?.join(', ') || '';
      comparison = aSystem.localeCompare(bSystem);
    }
    
    return comparison;
  });

  // Apply search and quick filters
  const displayedConcepts = sortedConcepts.filter(concept => {
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
    
    if (quickFilters.system !== undefined && quickFilters.system !== null && 
        !concept.dimensions?.exam_specific?.ukmla?.systems?.includes(quickFilters.system)) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-4">
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
      
      {/* Search Bar */}
      <div className="mb-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search concepts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Sort and View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            <button
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                sortBy === 'mastery' 
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              onClick={(e) => handleSort(e, 'mastery')}
            >
              Mastery
            </button>
            <button
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                sortBy === 'alphabetical' 
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              onClick={(e) => handleSort(e, 'alphabetical')}
            >
              A-Z
            </button>
          </div>
          
          <button
            className="p-1.5 sm:p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            title={viewMode === 'grid' ? 'List View' : 'Grid View'}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4 sm:h-5 sm:w-5" /> : <Grid className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>
        </div>

        {/* Bulk Actions */}
        {!isSelectMode ? (
          <button
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors"
            onClick={() => setIsSelectMode(true)}
          >
            Select Multiple
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2">
              <button
                className="flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg"
                onClick={selectAllConcepts}
              >
                All
              </button>
              <button
                className="flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg"
                onClick={deselectAllConcepts}
              >
                Clear
              </button>
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                onClick={(e) => {
                  console.log('Delete button clicked');
                  e.preventDefault();
                  e.stopPropagation();
                  handleBulkDelete();
                }}
                disabled={selectedConcepts.size === 0}
              >
                Delete ({selectedConcepts.size})
              </button>
              <button
                className="flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedConcepts(new Set());
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Results count */}
      <div className="mb-4" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {displayedConcepts.length} concepts{filteredConcepts.length !== displayedConcepts.length && ` of ${filteredConcepts.length} total`}
          {selectedConcepts.size > 0 && ` (${selectedConcepts.size} selected)`}
        </div>
      </div>
      
      {/* Concept Grid */}
      <div 
        className={isSelectMode ? "cursor-pointer" : ""}
        onClick={isSelectMode ? () => {
          setIsSelectMode(false);
          setSelectedConcepts(new Set());
        } : undefined}
      >
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {displayedConcepts.map((concept, index) => (
              <div key={`${concept.concept_id}-${index}`} onClick={(e) => e.stopPropagation()}>
                <ConceptListItem
                  concept={concept}
                  onPractice={handlePractice}
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
