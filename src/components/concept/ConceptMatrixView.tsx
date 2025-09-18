import React from 'react';
import { useConceptStore } from '@/store/conceptStore';

export const ConceptMatrixView: React.FC = () => {
  const { 
    filteredConcepts, 
    updateFilterState,
    filterState
  } = useConceptStore();
  
  // Extract unique custom filters from filtered concepts
  const allFilters = [...new Set(filteredConcepts.flatMap(c => c.custom_filters || []))].sort();
  
  // Create a matrix showing mastery levels vs custom filters
  const masteryLevels = [
    { level: 0, name: 'Unseen' },
    { level: 1, name: 'Learning' },
    { level: 2, name: 'Developing' },
    { level: 3, name: 'Competent' },
    { level: 4, name: 'Mastered' }
  ];
  
  const matrixData: Record<string, Record<string, number>> = {};
  
  masteryLevels.forEach(({ level, name }) => {
    matrixData[name] = {};
    allFilters.slice(0, 8).forEach(filter => { // Limit to first 8 filters for display
      matrixData[name][filter] = filteredConcepts.filter(
        c => c.mastery_data.mastery_level === level && 
             c.custom_filters?.includes(filter)
      ).length;
    });
  });
  
  // Find max count for color scaling
  const maxCount = Math.max(
    ...Object.values(matrixData).flatMap(row => Object.values(row)),
    1 // Ensure we don't divide by zero
  );
  
  // Handle cell click to toggle custom filter
  const handleCellClick = (_masteryName: string, filter: string) => {
    const isFilterSelected = filterState.custom_filters?.includes(filter);
    
    if (isFilterSelected) {
      // Remove filter
      updateFilterState({
        custom_filters: filterState.custom_filters?.filter(f => f !== filter) || []
      });
    } else {
      // Add filter
      updateFilterState({
        custom_filters: [...(filterState.custom_filters || []), filter]
      });
    }
  };
  
  // Get cell color based on count and selection state
  const getCellColor = (filter: string, count: number) => {
    const isFilterSelected = filterState.custom_filters?.includes(filter);
    
    if (count === 0) {
      return 'bg-gray-100 dark:bg-gray-800 text-gray-400';
    }
    
    const intensity = Math.min(0.9, Math.max(0.3, count / maxCount));
    
    if (isFilterSelected) {
      return `bg-blue-500 dark:bg-blue-600 text-white opacity-${Math.round(intensity * 100)}`;
    } else {
      return `bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 opacity-${Math.round(intensity * 100)}`;
    }
  };
  
  const displayFilters = allFilters.slice(0, 8);
  
  if (displayFilters.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No custom filters available for matrix view. Try adding some concepts with custom filters.
        </p>
      </div>
    );
  }
  
  return (
    <div className="overflow-auto -mx-4 sm:mx-0">
      <div className="min-w-[640px] px-4 sm:px-0">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Mastery Level × Custom Filter Matrix
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Click cells to filter by custom filters. Color intensity shows concept count.
          </p>
        </div>
        
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-left">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Mastery Level
                </span>
              </th>
              {displayFilters.map(filter => (
                <th 
                  key={filter}
                  className={`p-3 border border-gray-200 dark:border-gray-700 text-xs font-medium ${
                    filterState.custom_filters?.includes(filter)
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' 
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                  style={{ minWidth: '100px', maxWidth: '120px' }}
                >
                  <div className="truncate" title={filter}>
                    {filter}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {masteryLevels.map(({ level, name }) => (
              <tr key={level}>
                <td className="p-3 border border-gray-200 dark:border-gray-700 font-medium bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      level === 0 ? 'bg-gray-400' :
                      level === 1 ? 'bg-red-400' :
                      level === 2 ? 'bg-yellow-400' :
                      level === 3 ? 'bg-green-400' :
                      'bg-blue-400'
                    }`}></div>
                    {name}
                  </div>
                </td>
                {displayFilters.map(filter => {
                  const count = matrixData[name][filter] || 0;
                  return (
                    <td 
                      key={`${level}-${filter}`}
                      className={`p-3 border border-gray-200 dark:border-gray-700 text-center cursor-pointer hover:opacity-80 transition-all ${getCellColor(filter, count)}`}
                      onClick={() => handleCellClick(name, filter)}
                      title={`${count} concepts with ${filter} filter at ${name} level`}
                    >
                      <span className="font-medium">
                        {count > 0 ? count : '·'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2 px-4 sm:px-0">
        <span className="mr-2">Color intensity indicates concept count</span>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 mr-1"></div>
          <span className="mr-2">Low</span>
          <div className="w-4 h-4 bg-gray-400 dark:bg-gray-600 mr-1"></div>
          <span className="mr-2">Medium</span>
          <div className="w-4 h-4 bg-gray-600 dark:bg-gray-500 mr-1"></div>
          <span>High</span>
        </div>
      </div>
    </div>
  );
};
