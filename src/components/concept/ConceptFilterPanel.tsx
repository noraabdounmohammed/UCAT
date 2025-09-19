import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Filter, Search } from 'lucide-react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';

interface FilterSectionProps {
  title: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  counts?: Record<string, number>;
  searchable?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  options,
  selected,
  onChange,
  counts,
  searchable = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredOptions = searchable && searchQuery
    ? options.filter(option => option.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;
  
  const handleToggle = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };
  
  const handleSelectAll = () => {
    onChange(selected.length === options.length ? [] : [...options]);
  };
  
  return (
    <div className="mb-4">
      <div 
        className="flex items-center justify-between cursor-pointer py-2 border-b border-gray-200 dark:border-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h3>
        <div className="flex items-center">
          {selected.length > 0 && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full mr-2">
              {selected.length}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-2">
          {searchable && (
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${title.toLowerCase()}...`}
                className="w-full pl-8 pr-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
          
          <div className="flex items-center justify-between mb-2">
            <button
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              onClick={handleSelectAll}
            >
              {selected.length === 0 ? 'Select Filters' : selected.length === options.length ? 'Show All' : 'Select All'}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredOptions.length} options
            </span>
          </div>
          
          <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
            {filteredOptions.map(option => (
              <div
                key={option}
                className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleToggle(option)}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                    {option}
                  </span>
                </div>
                {counts && counts[option] && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {counts[option]}
                  </span>
                )}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center italic">
                No options match your search
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface MasteryFilterSectionProps {
  masteryLevels: Array<{level: number; name: string}>;
  selected: number[];
  onChange: (selected: number[]) => void;
  counts?: Record<number, number>;
}

const MasteryFilterSection: React.FC<MasteryFilterSectionProps> = ({
  masteryLevels,
  selected,
  onChange,
  counts
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const handleToggle = (level: number) => {
    const newSelected = selected.includes(level)
      ? selected.filter(item => item !== level)
      : [...selected, level];
    onChange(newSelected);
  };
  
  const handleSelectAll = () => {
    onChange(selected.length === masteryLevels.length 
      ? [] 
      : masteryLevels.map(ml => ml.level));
  };
  
  // Colors for mastery levels
  const getMasteryColor = (level: number) => {
    switch(level) {
      case 0: return 'bg-gray-200 dark:bg-gray-700';
      case 1: return 'bg-red-200 dark:bg-red-900';
      case 2: return 'bg-yellow-200 dark:bg-yellow-900';
      case 3: return 'bg-green-200 dark:bg-green-900';
      case 4: return 'bg-blue-200 dark:bg-blue-900';
      default: return 'bg-gray-200 dark:bg-gray-700';
    }
  };
  
  return (
    <div className="mb-4">
      <div 
        className="flex items-center justify-between cursor-pointer py-2 border-b border-gray-200 dark:border-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Mastery Level</h3>
        <div className="flex items-center">
          {selected.length > 0 && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full mr-2">
              {selected.length}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <button
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              onClick={handleSelectAll}
            >
              {selected.length === 0 ? 'Select Filters' : selected.length === masteryLevels.length ? 'Show All' : 'Select All'}
            </button>
          </div>
          
          <div className="space-y-1">
            {masteryLevels.map(({ level, name }) => (
              <div
                key={level}
                className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleToggle(level)}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(level)}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className={`ml-2 w-3 h-3 rounded-full ${getMasteryColor(level)}`} />
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                    {name}
                  </span>
                </div>
                {counts && counts[level] !== undefined && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {counts[level]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ConceptFilterPanel: React.FC = () => {
  const { 
    filterState, 
    filterOptions, 
    updateFilterState,
    resetFilters,
    stats 
  } = useConceptStore();
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilterState({ searchQuery: e.target.value });
  };
  
  const handleClearSearch = () => {
    updateFilterState({ searchQuery: '' });
  };

  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Filters
        </h2>
        <button
          onClick={resetFilters}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Reset Filters
        </button>
      </div>
      
      {/* Global search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search concepts..."
          className="w-full pl-10 pr-10 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          value={filterState.searchQuery}
          onChange={handleSearchChange}
        />
        {filterState.searchQuery && (
          <button
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
            onClick={handleClearSearch}
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            <MasteryFilterSection
              masteryLevels={filterOptions.mastery_levels}
              selected={filterState.mastery_levels}
              onChange={(selected) => updateFilterState({ mastery_levels: selected })}
              counts={stats.by_mastery}
            />
          </div>
          
          <div>
            <FilterSection
              title="Custom Filters"
              options={filterOptions.custom_filters || []}
              selected={filterState.custom_filters || []}
              onChange={(selected) => updateFilterState({ custom_filters: selected })}
              counts={stats.by_custom_filter}
              searchable
            />
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {stats.total} concepts
            </span>
            
          </div>
        </div>
      </div>
    </div>
  );
};
