import React, { useState, useMemo } from 'react';
import { useConceptStore } from '@/store/conceptStore';
import { ConceptNode } from '@/types/conceptTypes';
import { Search, Award, BookOpen, Brain, Edit2, Grid, List } from 'lucide-react';
import { ConceptEditorModal } from './ConceptEditorModal';

interface ConceptCardProps {
  concept: ConceptNode;
  onEdit: (concept: ConceptNode) => void;
  onDelete: (conceptId: string) => void;
}

const ConceptCard: React.FC<ConceptCardProps> = ({ concept, onEdit, onDelete }) => {
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
      <button
        onClick={() => onEdit(concept)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        aria-label="Edit concept"
      >
        <Edit2 className="h-3.5 w-3.5" />
      </button>
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
      
      {/* Edit button moved to top right corner */}
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
  const { filteredConcepts, startPractice, addConcept, updateConcept, deleteConcept } = useConceptStore();
  
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
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  // Test if component is mounting
  React.useEffect(() => {
    console.log('ConceptGridView mounted, editModalOpen:', editModalOpen);
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
    setEditingConcept(concept);
    setModalMode('edit');
    setEditModalOpen(true);
  };

  const handleDelete = (conceptId: string) => {
    if (confirm('Are you sure you want to delete this concept?')) {
      deleteConcept(conceptId);
    }
  };


  const handleSaveConcept = (concept: Partial<ConceptNode>) => {
    if (modalMode === 'create') {
      addConcept(concept);
    } else if (editingConcept) {
      updateConcept(editingConcept.concept_id, concept);
    }
    setEditModalOpen(false);
  };

  const systemOptions = useMemo(() => {
    const systems = new Set<string>();
    filteredConcepts.forEach(concept => {
      if (concept.dimensions?.exam_specific?.ukmla?.systems) {
        concept.dimensions.exam_specific.ukmla.systems.forEach((s: string) => systems.add(s));
      }
    });
    return Array.from(systems).sort();
  }, [filteredConcepts]);

  // Define quick filters state

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

  // Handle quick filter toggle
  const toggleQuickFilter = (type: 'mastery' | 'system', value: any) => {
    setQuickFilters(prev => ({
      ...prev,
      [type]: prev[type] === value ? null : value
    }));
  };

  // Clear all quick filters
  const clearQuickFilters = () => {
    setQuickFilters({
      mastery: undefined,
      system: undefined
    });
    setSearchQuery('');
  };

  // Removed openAddConceptModal function

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

  // Get mastery level color
  const getMasteryLevelColor = (level: number) => {
    switch(level) {
      case 0: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
      case 1: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
      case 2: return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 3: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
      case 4: return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

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

  // Get mastery level counts
  const masteryLevelCounts = filteredConcepts.reduce((acc, concept) => {
    const level = concept.mastery_data.mastery_level;
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="space-y-4">
      {/* Controls and filters */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <div className="flex items-center space-x-3 mb-4">
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
      
      {/* Results count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {displayedConcepts.length} of {filteredConcepts.length} concepts
      </div>
      
      {/* Grid or list view */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Existing Concept Cards */}
          {displayedConcepts.map(concept => (
            <ConceptCard
              key={concept.concept_id}
              concept={concept}
              onEdit={handleEdit}
              onDelete={handleDelete}
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
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveConcept}
        onDelete={modalMode === 'edit' ? handleDelete : undefined}
        concept={editingConcept}
        mode={modalMode}
      />
    </div>
  );
};
