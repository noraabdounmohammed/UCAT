import React, { useState, useMemo, useEffect } from 'react';
import { useConceptStore } from '@/store/conceptStore';
import { ConceptNode } from '@/types/conceptTypes';
import { Search, Award, BookOpen, Brain, Edit2, Grid, List, Trash2, Check, AlertCircle, Download, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConceptEditorModal } from './ConceptEditorModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { WorkingDeleteButton } from './WorkingDeleteButton';

interface ConceptCardProps {
  concept: ConceptNode;
  onEdit: (concept: ConceptNode) => void;
  onDelete: (conceptId: string) => void;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (conceptId: string) => void;
}

const ConceptCard: React.FC<ConceptCardProps> = ({ 
  concept, 
  onEdit, 
  onDelete, 
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
      case 1: return 'Introduced';
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
    <div className={`${getMasteryBackgroundColor(concept.mastery_data.mastery_level)} rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow relative`}>
      <div className="absolute top-2 right-2 flex space-x-2">
        {isSelectMode ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(concept.concept_id)}
            className="h-4 w-4"
          />
        ) : (
          <>
            <WorkingDeleteButton conceptId={concept.concept_id} />
            <button
              onClick={() => onEdit(concept)}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              aria-label="Edit concept"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
      <div className="mb-2">
        <div className={`px-2 py-1 text-xs rounded-full inline-flex ${getMasteryColor(concept.mastery_data.mastery_level)}`}>
          <span className="flex items-center">
            <Award className="h-3 w-3 mr-1" />
            {getMasteryLevelName(concept.mastery_data.mastery_level)}
          </span>
        </div>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        {concept.title}
      </h3>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
        {concept.description}
      </p>
      
      <div className="space-y-2 mb-3">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <BookOpen className="h-3.5 w-3.5 mr-1" />
          <span className="mr-1">Systems:</span>
          <div className="flex flex-wrap gap-1">
            {(concept.dimensions?.exam_specific?.ukmla?.systems || []).map(system => (
              <span key={system} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded">
                {system}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <Brain className="h-3.5 w-3.5 mr-1" />
          <span className="mr-1">Conditions:</span>
          <div className="flex flex-wrap gap-1">
            {(concept.dimensions?.exam_specific?.ukmla?.conditions || []).map(condition => (
              <span key={condition} className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded truncate max-w-[150px]">
                {condition}
              </span>
            ))}
          </div>
        </div>
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
              {concept.bloom_level ? concept.bloom_level.charAt(0).toUpperCase() + concept.bloom_level.slice(1) : 'Unknown'}
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

export const ConceptGridView: React.FC = () => {
  const { filteredConcepts, startPractice, updateConcept, deleteConcept, loadConcepts } = useConceptStore();
  const [selectedConcepts, setSelectedConcepts] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  
  // Local state for grid view
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'mastery' | 'alphabetical' | 'system'>('mastery');
  const [quickFilters, setQuickFilters] = useState<{
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
    
    if (confirm(`Are you sure you want to delete ${selectedConcepts.size} selected concepts?`)) {
      try {
        // Get the concepts to delete
        const conceptsToDelete = Array.from(selectedConcepts);
        
        // Delete each concept
        conceptsToDelete.forEach(conceptId => {
          // Delete from store
          deleteConcept(conceptId);
          
          // Delete from localStorage
          const storedConcepts = localStorage.getItem('user_concepts');
          if (storedConcepts) {
            const concepts = JSON.parse(storedConcepts);
            const updatedConcepts = concepts.filter((c: any) => c.concept_id !== conceptId);
            localStorage.setItem('user_concepts', JSON.stringify(updatedConcepts));
          }
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
      } catch (error) {
        console.error('Error bulk deleting concepts:', error);
        setStatusMessage({
          type: 'error',
          message: 'Failed to delete some concepts. See console for details.'
        });
      }
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
    const allIds = displayedConcepts.map(c => c.concept_id);
    setSelectedConcepts(new Set(allIds));
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
      comparison = a.mastery_data.mastery_level - b.mastery_data.mastery_level;
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
      const matchesTitle = concept.title.toLowerCase().includes(query);
      const matchesDescription = concept.description.toLowerCase().includes(query);
      const matchesSystem = concept.dimensions?.exam_specific?.ukmla?.systems?.some(s => s.toLowerCase().includes(query)) || false;
      const matchesCondition = concept.dimensions?.exam_specific?.ukmla?.conditions?.some(c => c.toLowerCase().includes(query)) || false;
      
      if (!(matchesTitle || matchesDescription || matchesSystem || matchesCondition)) {
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
      
      {/* Controls and filters */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search concepts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          {/* Bulk actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant={isSelectMode ? "destructive" : "outline"}
              size="sm"
              onClick={() => {
                if (isSelectMode) {
                  setIsSelectMode(false);
                  setSelectedConcepts(new Set());
                } else {
                  setIsSelectMode(true);
                }
              }}
            >
              {isSelectMode ? "Cancel Selection" : "Select Multiple"}
            </Button>
            
            {isSelectMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllConcepts}
                >
                  Select All
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllConcepts}
                >
                  Deselect All
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={selectedConcepts.size === 0}
                >
                  Delete Selected ({selectedConcepts.size})
                </Button>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3 mb-4">
          {/* Sort controls */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
            <button
              className={`px-2 py-1 text-xs rounded-md flex items-center ${sortBy === 'mastery' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              onClick={(e) => handleSort(e, 'mastery')}
            >
              <Award className="h-3 w-3 mr-1" />
              Mastery
            </button>
            
            <button
              className={`px-2 py-1 text-xs rounded-md flex items-center ${sortBy === 'alphabetical' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              onClick={(e) => handleSort(e, 'alphabetical')}
            >
              Alphabetical
            </button>
            
            <button
              className={`px-2 py-1 text-xs rounded-md flex items-center ${sortBy === 'system' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              onClick={(e) => handleSort(e, 'system')}
            >
              System
            </button>
            
            {/* View mode toggle */}
            <button
              className="px-2 py-1 text-xs rounded-md flex items-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              title={viewMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View'}
            >
              {viewMode === 'grid' ? <List className="h-3 w-3" /> : <Grid className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Results count and export */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {displayedConcepts.length} of {filteredConcepts.length} concepts
          {selectedConcepts.size > 0 && ` (${selectedConcepts.size} selected)`}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Export all concepts to JSON file for backup
            const dataStr = JSON.stringify({ concepts: filteredConcepts }, null, 2);
            const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
            
            const exportFileDefaultName = `concepts-backup-${new Date().toISOString().slice(0, 10)}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            setStatusMessage({
              type: 'success',
              message: 'Concepts exported successfully!'
            });
          }}
          className="flex items-center gap-1"
        >
          <Download className="h-4 w-4" />
          Export Concepts
        </Button>
      </div>
      
      {/* Grid or list view */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Add New Concepts Tile */}
          <Link
            to="/concept-bulk-upload"
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
          </Link>
          
          {/* Existing Concept Cards */}
          {displayedConcepts.map(concept => (
            <ConceptCard
              key={concept.concept_id}
              concept={concept}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isSelectMode={isSelectMode}
              isSelected={selectedConcepts.has(concept.concept_id)}
              onToggleSelect={toggleConceptSelection}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {displayedConcepts.map(concept => (
            <ConceptListItem
              key={concept.concept_id}
              concept={concept}
              onPractice={handlePractice}
            />
          ))}
        </div>
      )}
      
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
