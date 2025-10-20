import React from 'react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { Award, CheckCircle2, XCircle, Circle, Tag } from 'lucide-react';

export const ConceptMasteryView: React.FC = () => {
  const { filteredConcepts, stats, filterOptions } = useConceptStore();
  
  const masteryLevels = filterOptions.mastery_levels || [];

  if (filteredConcepts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No concepts available for mastery analysis
      </div>
    );
  }

  // Count concepts by mastery level
  const masteryStats = masteryLevels.map(level => {
    const count = filteredConcepts.filter(c => c.mastery_data?.mastery_level === level.level).length;
    return {
      name: level.name,
      level: level.level,
      count,
      percentage: filteredConcepts.length > 0 ? (count / filteredConcepts.length) * 100 : 0
    };
  });
  
  // Calculate custom filter coverage
  const filterCoverage = Object.entries(stats.by_custom_filter || {}).map(([filter, count]) => ({
    name: filter,
    count: count as number,
    percentage: filteredConcepts.length > 0 ? ((count as number) / filteredConcepts.length) * 100 : 0
  })).sort((a, b) => b.count - a.count).slice(0, 8);

  // Get mastery icon and color
  const getMasteryIcon = (level: number) => {
    switch(level) {
      case 0: return <Circle className="h-8 w-8" />;
      case 1: return <XCircle className="h-8 w-8" />;
      case 2: return <CheckCircle2 className="h-8 w-8" />;
      default: return <Circle className="h-8 w-8" />;
    }
  };

  const getMasteryColor = (level: number) => {
    switch(level) {
      case 0: return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', ring: 'ring-gray-200 dark:ring-gray-700' };
      case 1: return { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-600 dark:text-red-400', ring: 'ring-red-200 dark:ring-red-800' };
      case 2: return { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-600 dark:text-green-400', ring: 'ring-green-200 dark:ring-green-800' };
      default: return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', ring: 'ring-gray-200 dark:ring-gray-700' };
    }
  };

  // Calculate overall completion percentage
  const totalConcepts = filteredConcepts.length;
  const correctCount = masteryStats.find(m => m.level === 2)?.count || 0;
  const incorrectCount = masteryStats.find(m => m.level === 1)?.count || 0;
  const unseenCount = masteryStats.find(m => m.level === 0)?.count || 0;
  const completionPercentage = totalConcepts > 0 ? (correctCount / totalConcepts) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Overall Progress Ring - Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-12 border border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          {/* Progress Ring */}
          <div className="relative flex items-center justify-center">
            <svg className="transform -rotate-90" width="200" height="200">
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r="85"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="100"
                cy="100"
                r="85"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 85}`}
                strokeDashoffset={`${2 * Math.PI * 85 * (1 - completionPercentage / 100)}`}
                className="text-green-500 dark:text-green-400 transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-bold text-gray-900 dark:text-white">
                {completionPercentage.toFixed(0)}%
              </div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Complete
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="flex-1 space-y-6">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {totalConcepts.toLocaleString()} Concepts
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Track your mastery across all concepts in this curriculum
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {correctCount}
                </div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
                  Correct
                </div>
              </div>
              <div className="text-center p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {incorrectCount}
                </div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
                  Incorrect
                </div>
              </div>
              <div className="text-center p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl">
                <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                  {unseenCount}
                </div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
                  Unseen
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Filter Coverage - Apple Style */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg">
        <h3 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white mb-4 flex items-center">
          <Tag className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
          Custom Filter Coverage
        </h3>
        
        {filterCoverage.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterCoverage.map((filter) => (
              <div key={filter.name} className="p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/30 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900 dark:text-white capitalize">{filter.name.replace(/-/g, ' ')}</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{filter.count}</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 dark:bg-blue-600 transition-all duration-500"
                    style={{ width: `${filter.percentage}%` }}
                  />
                </div>
                <div className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {filter.percentage.toFixed(0)}% of total
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No custom filters applied to concepts yet
          </p>
        )}
      </div>

    </div>
  );
};
