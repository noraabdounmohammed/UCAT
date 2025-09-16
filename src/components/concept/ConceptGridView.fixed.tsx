import React, { useState, useMemo } from 'react';
import { useConceptStore } from '@/store/conceptStore';
import { ConceptNode } from '@/types/conceptTypes';
import { Search, Filter, Award, BookOpen, Brain } from 'lucide-react';

interface ConceptCardProps {
  concept: ConceptNode;
  onPractice: (conceptId: string) => void;
}

const ConceptCard: React.FC<ConceptCardProps> = ({ concept, onPractice }) => {
  // Get mastery level color
  const getMasteryColor = (level: number) => {
    switch(level) {
      case 0: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
      case 1: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
      case 2: return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 3: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
      case 4: return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className={`px-2 py-1 text-xs rounded-full ${getMasteryColor(concept.mastery_data.mastery_level)}`}>
          <span className="flex items-center">
            <Award className="h-3 w-3 mr-1" />
            {getMasteryLevelName(concept.mastery_data.mastery_level)}
          </span>
        </div>
        <div className={`px-2 py-1 text-xs rounded-full ${
          concept.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
          concept.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
          'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
        }`}>
          {concept.difficulty.charAt(0).toUpperCase() + concept.difficulty.slice(1)}
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
      
      <div className="flex justify-end">
        <button
          className="px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          onClick={() => onPractice(concept.concept_id)}
        >
          Practice
        </button>
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
            <span className={`px-1.5 py-0.5 text-xs rounded-full ${
              concept.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
              concept.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
              'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            }`}>
              {concept.difficulty.charAt(0).toUpperCase() + concept.difficulty.slice(1)}
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
  const { filteredConcepts } = useConceptStore();
  
  // Define practice handler
  const handlePractice = (conceptId: string) => {
    console.log('Practice concept:', conceptId);
    // In a real implementation, this would start a practice session
  };
  
  // Local state for grid view
  const [sortBy, setSortBy] = useState<'mastery' | 'difficulty' | 'lastPracticed'>('mastery');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
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
  const [quickFilters, setQuickFilters] = useState({
    masteryLevel: null as number | null,
    difficulty: null as string | null,
    system: null as string | null
  });

  // Handle sorting
  const handleSort = (key: 'mastery' | 'difficulty' | 'lastPracticed') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };
  
  // Sort concepts
  const sortedConcepts = [...filteredConcepts].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'mastery') {
      comparison = a.mastery_data.mastery_level - b.mastery_data.mastery_level;
    } else if (sortBy === 'difficulty') {
      const difficultyMap = { 'easy': 0, 'medium': 1, 'hard': 2 };
      comparison = (difficultyMap[a.difficulty as keyof typeof difficultyMap] || 0) - 
                  (difficultyMap[b.difficulty as keyof typeof difficultyMap] || 0);
    } else if (sortBy === 'lastPracticed') {
      const dateA = a.mastery_data.last_practiced ? new Date(a.mastery_data.last_practiced).getTime() : 0;
      const dateB = b.mastery_data.last_practiced ? new Date(b.mastery_data.last_practiced).getTime() : 0;
      comparison = dateA - dateB;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  // Handle quick filter toggle
  const toggleQuickFilter = (type: 'masteryLevel' | 'difficulty' | 'system', value: any) => {
    setQuickFilters(prev => ({
      ...prev,
      [type]: prev[type] === value ? null : value
    }));
  };
  
  // Clear all quick filters
  const clearQuickFilters = () => {
    setQuickFilters({
      masteryLevel: null,
      difficulty: null,
      system: null
    });
    setSearchQuery('');
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
    if (quickFilters.masteryLevel !== null && 
        concept.mastery_data.mastery_level !== quickFilters.masteryLevel) {
      return false;
    }
    
    if (quickFilters.difficulty !== null && 
        concept.difficulty !== quickFilters.difficulty) {
      return false;
    }
    
    if (quickFilters.system !== null && 
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
  
  // Get difficulty counts
  const difficultyCounts = filteredConcepts.reduce((acc, concept) => {
    const difficulty = concept.difficulty;
    acc[difficulty] = (acc[difficulty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <div className="space-y-4">
      {/* Controls and filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
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
              onClick={() => handleSort('mastery')}
            >
              <Award className="h-3 w-3 mr-1" />
              Mastery
            </button>
            
            <button
              className={`px-2 py-1 text-xs rounded-md flex items-center ${sortBy === 'difficulty' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              onClick={() => handleSort('difficulty')}
            >
              <Filter className="h-3 w-3 mr-1" />
              Difficulty
            </button>
            
            <button
              className={`px-2 py-1 text-xs rounded-md flex items-center ${sortBy === 'lastPracticed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              onClick={() => handleSort('lastPracticed')}
            >
              Last Practiced
            </button>
          </div>
          
          {/* View mode toggle */}
          <div className="flex items-center space-x-2">
            <button
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>
        
        {/* Quick filters */}
        <div>
          <div className="flex items-center mb-2">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Filters</span>
            {(quickFilters.masteryLevel !== null || quickFilters.difficulty !== null || quickFilters.system !== null) && (
              <button 
                className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                onClick={clearQuickFilters}
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
            {/* Mastery level filters */}
            {[0, 1, 2, 3, 4].map(level => (
              <button
                key={`mastery-${level}`}
                onClick={() => toggleQuickFilter('masteryLevel', level)}
                className={`px-2 py-1 text-xs rounded-full flex items-center whitespace-nowrap ${quickFilters.masteryLevel === level ? getMasteryLevelColor(level) : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              >
                <Award className="h-3 w-3 mr-1" />
                {getMasteryLevelName(level)}
                {masteryLevelCounts[level] !== undefined && (
                  <span className="ml-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1 rounded-full text-xs">
                    {masteryLevelCounts[level]}
                  </span>
                )}
              </button>
            ))}
            
            {/* Difficulty filters */}
            {['easy', 'medium', 'hard'].map(difficulty => (
              <button
                key={`difficulty-${difficulty}`}
                onClick={() => toggleQuickFilter('difficulty', difficulty)}
                className={`px-2 py-1 text-xs rounded-full flex items-center whitespace-nowrap ${
                  quickFilters.difficulty === difficulty 
                    ? difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                    : difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Filter className="h-3 w-3 mr-1" />
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                {difficultyCounts[difficulty] !== undefined && (
                  <span className="ml-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1 rounded-full text-xs">
                    {difficultyCounts[difficulty]}
                  </span>
                )}
              </button>
            ))}
            
            {/* System filters - show top 5 */}
            {systemOptions.slice(0, 5).map(system => (
              <button
                key={`system-${system}`}
                className={`px-2 py-1 text-xs rounded-full flex items-center whitespace-nowrap ${quickFilters.system === system ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                onClick={() => toggleQuickFilter('system', system)}
              >
                <BookOpen className="h-3 w-3 mr-1" />
                {system}
              </button>
            ))}
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
          {displayedConcepts.map(concept => (
            <ConceptCard
              key={concept.concept_id}
              concept={concept}
              onPractice={handlePractice}
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
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">No concepts match your filters.</p>
          <button
            onClick={clearQuickFilters}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
