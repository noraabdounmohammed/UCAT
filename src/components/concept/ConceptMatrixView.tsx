import React from 'react';
import { useConceptStore } from '@/store/conceptStore';

export const ConceptMatrixView: React.FC = () => {
  const { 
    filteredConcepts, 
    filterOptions, 
    updateFilter
  } = useConceptStore();
  
  // Extract unique systems and conditions from filtered concepts
  const systems = [...new Set(filteredConcepts.flatMap(c => c.dimensions.exam_specific?.ukmla?.systems || []))].sort();
  const conditions = [...new Set(filteredConcepts.flatMap(c => c.dimensions.exam_specific?.ukmla?.conditions || []))].sort();
  
  // Calculate counts for each system-condition pair
  const matrixData: Record<string, Record<string, number>> = {};
  
  systems.forEach(system => {
    matrixData[system] = {};
    conditions.forEach(condition => {
      matrixData[system][condition] = filteredConcepts.filter(
        c => c.dimensions.exam_specific?.ukmla?.systems?.includes(system) && 
             c.dimensions.exam_specific?.ukmla?.conditions?.includes(condition)
      ).length;
    });
  });
  
  // Find max count for color scaling
  const maxCount = Math.max(
    ...Object.values(matrixData).flatMap(row => Object.values(row)),
    1 // Ensure we don't divide by zero
  );
  
  // Handle cell click to toggle condition filter
  const handleCellClick = (system: string, condition: string) => {
    const isSystemSelected = filterOptions.systems.includes(system);
    const isConditionSelected = filterOptions.conditions.includes(condition);
    
    // Update filters based on current selection state
    if (isSystemSelected && isConditionSelected) {
      // Both selected: remove condition
      updateFilter({
        conditions: filterOptions.conditions.filter(c => c !== condition)
      });
    } else if (isSystemSelected) {
      // System selected, condition not: add condition
      updateFilter({
        conditions: [...filterOptions.conditions, condition]
      });
    } else if (isConditionSelected) {
      // Condition selected, system not: add system
      updateFilter({
        systems: [...filterOptions.systems, system]
      });
    } else {
      // Neither selected: add both
      updateFilter({
        systems: [...filterOptions.systems, system],
        conditions: [...filterOptions.conditions, condition]
      });
    }
  };
  
  // Get cell color based on count and selection state
  const getCellColor = (system: string, condition: string, count: number) => {
    const isSystemSelected = filterOptions.systems.includes(system);
    const isConditionSelected = filterOptions.conditions.includes(condition);
    const bothSelected = isSystemSelected && isConditionSelected;
    
    if (count === 0) {
      return 'bg-gray-100 dark:bg-gray-800';
    }
    
    const intensity = Math.max(0.2, Math.min(0.9, count / maxCount));
    
    if (bothSelected) {
      return `bg-blue-${Math.round(intensity * 500)} dark:bg-blue-${Math.round(intensity * 800)}`;
    } else if (isSystemSelected || isConditionSelected) {
      return `bg-blue-${Math.round(intensity * 200)} dark:bg-blue-${Math.round(intensity * 900)}/50`;
    } else {
      return `bg-gray-${Math.round(intensity * 300)} dark:bg-gray-${Math.round(intensity * 700)}`;
    }
  };
  
  if (systems.length === 0 || conditions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No data available for matrix view. Try adjusting your filters.
        </p>
      </div>
    );
  }
  
  return (
    <div className="overflow-auto -mx-4 sm:mx-0">
      <div className="min-w-[640px] px-4 sm:px-0">
        <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              System × Condition
            </th>
            {conditions.map(condition => (
              <th 
                key={condition}
                className={`p-2 border border-gray-200 dark:border-gray-700 text-xs font-medium ${
                  filterOptions.conditions.includes(condition) 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' 
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
                style={{ minWidth: '100px', maxWidth: '150px' }}
              >
                <div className="truncate" title={condition}>
                  {condition}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {systems.map(system => (
            <tr key={system}>
              <td 
                className={`p-2 border border-gray-200 dark:border-gray-700 font-medium ${
                  filterOptions.systems.includes(system) 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' 
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                }`}
              >
                {system}
              </td>
              {conditions.map(condition => {
                const count = matrixData[system][condition] || 0;
                return (
                  <td 
                    key={`${system}-${condition}`}
                    className={`p-2 border border-gray-200 dark:border-gray-700 text-center cursor-pointer hover:opacity-80 transition-opacity ${getCellColor(system, condition, count)}`}
                    onClick={() => handleCellClick(system, condition)}
                  >
                    {count > 0 ? count : '·'}
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
