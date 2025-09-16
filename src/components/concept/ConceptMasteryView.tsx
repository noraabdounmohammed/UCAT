import React from 'react';
import { useConceptStore } from '@/store/conceptStore';
import { Award, BookOpen, Brain, Activity } from 'lucide-react';

export const ConceptMasteryView: React.FC = () => {
  const { filteredConcepts, stats } = useConceptStore();
  
  // Calculate mastery statistics
  const masteryLevels = [
    { level: 0, name: 'Unseen', color: 'bg-gray-200 dark:bg-gray-700' },
    { level: 1, name: 'Introduced', color: 'bg-red-200 dark:bg-red-900/50' },
    { level: 2, name: 'Developing', color: 'bg-yellow-200 dark:bg-yellow-900/50' },
    { level: 3, name: 'Competent', color: 'bg-green-200 dark:bg-green-900/50' },
    { level: 4, name: 'Mastered', color: 'bg-blue-200 dark:bg-blue-900/50' }
  ];
  
  // Count concepts by mastery level
  const masteryStats = masteryLevels.map(level => {
    const count = filteredConcepts.filter(c => c.mastery_data.mastery_level === level.level).length;
    return {
      ...level,
      count,
      percentage: filteredConcepts.length > 0 ? (count / filteredConcepts.length) * 100 : 0
    };
  });
  
  // Calculate system coverage
  const systemCoverage = Object.entries(stats.by_system).map(([system, count]) => ({
    name: system,
    count,
    percentage: filteredConcepts.length > 0 ? (count / filteredConcepts.length) * 100 : 0,
    masteryBreakdown: masteryLevels.map(level => {
      const levelCount = filteredConcepts.filter(
        c => c.dimensions.exam_specific?.ukmla?.systems?.includes(system) && c.mastery_data.mastery_level === level.level
      ).length;
      return {
        ...level,
        count: levelCount,
        percentage: count > 0 ? (levelCount / count) * 100 : 0
      };
    })
  }));
  
  // Get top conditions by count
  const topConditions = Object.entries(stats.by_condition)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([condition, count]) => ({
      name: condition,
      count,
      percentage: filteredConcepts.length > 0 ? (count / filteredConcepts.length) * 100 : 0,
      masteryBreakdown: masteryLevels.map(level => {
        const levelCount = filteredConcepts.filter(
          c => c.dimensions.exam_specific?.ukmla?.conditions?.includes(condition) && c.mastery_data.mastery_level === level.level
        ).length;
        return {
          ...level,
          count: levelCount,
          percentage: count > 0 ? (levelCount / count) * 100 : 0
        };
      })
    }));
  
  // Get top presentations by count
  const topPresentations = Object.entries(stats.by_presentation)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([presentation, count]) => ({
      name: presentation,
      count,
      percentage: filteredConcepts.length > 0 ? (count / filteredConcepts.length) * 100 : 0,
      masteryBreakdown: masteryLevels.map(level => {
        const levelCount = filteredConcepts.filter(
          c => c.dimensions.exam_specific?.ukmla?.presentations?.includes(presentation) && c.mastery_data.mastery_level === level.level
        ).length;
        return {
          ...level,
          count: levelCount,
          percentage: count > 0 ? (levelCount / count) * 100 : 0
        };
      })
    }));
  
  if (filteredConcepts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No concepts available for mastery analysis. Try adjusting your filters.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Overall Mastery Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Award className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          Overall Mastery Progress
        </h3>
        
        <div className="flex mb-4">
          {masteryStats.map(level => (
            <div 
              key={level.level} 
              className="flex-1 h-8"
              style={{ 
                width: `${level.percentage}%`, 
                minWidth: level.count > 0 ? '20px' : '0'
              }}
            >
              <div className={`h-full ${level.color} ${level.level > 0 ? 'border-l border-white dark:border-gray-900' : ''}`}></div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {masteryStats.map(level => (
            <div key={level.level} className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full ${level.color} mb-1`}></div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{level.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {level.count} ({Math.round(level.percentage)}%)
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* System Coverage */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          System Coverage
        </h3>
        
        <div className="space-y-4">
          {systemCoverage.map(system => (
            <div key={system.name} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{system.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {system.count} concepts ({Math.round(system.percentage)}%)
                </span>
              </div>
              
              <div className="flex h-6 rounded-md overflow-hidden">
                {system.masteryBreakdown.map(level => (
                  <div 
                    key={level.level} 
                    className={`${level.color}`}
                    style={{ 
                      width: `${level.percentage}%`, 
                      minWidth: level.count > 0 ? '8px' : '0'
                    }}
                    title={`${level.name}: ${level.count} (${Math.round(level.percentage)}%)`}
                  ></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Top Conditions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Brain className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          Top Conditions
        </h3>
        
        <div className="space-y-4">
          {topConditions.map(condition => (
            <div key={condition.name} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[300px]" title={condition.name}>
                  {condition.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {condition.count} concepts
                </span>
              </div>
              
              <div className="flex h-6 rounded-md overflow-hidden">
                {condition.masteryBreakdown.map(level => (
                  <div 
                    key={level.level} 
                    className={`${level.color}`}
                    style={{ 
                      width: `${level.percentage}%`, 
                      minWidth: level.count > 0 ? '8px' : '0'
                    }}
                    title={`${level.name}: ${level.count} (${Math.round(level.percentage)}%)`}
                  ></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Top Presentations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          Top Presentations
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topPresentations.map(presentation => (
            <div 
              key={presentation.name} 
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]" title={presentation.name}>
                {presentation.name}
              </span>
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                {presentation.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
