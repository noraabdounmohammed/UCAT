import React from 'react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { Award, BookOpen, Tag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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

  return (
    <div className="space-y-8">
      {/* Overall Mastery Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Award className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          Overall Mastery Progress
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mastery Level Distribution - Bar Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Mastery Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={masteryStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Mastery Level Distribution - Clean Legend */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Mastery Breakdown</h4>
            <div className="space-y-3">
              {masteryStats.filter(stat => stat.count > 0).map((stat, index) => (
                <div key={stat.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium text-gray-900 dark:text-gray-100">{stat.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {stat.count} concepts
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {stat.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Filter Coverage */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Tag className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
          Custom Filter Coverage
        </h3>
        
        {filterCoverage.length > 0 ? (
          <div className="space-y-3">
            {filterCoverage.map((filter, index) => (
              <div key={filter.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium text-gray-900 dark:text-gray-100">{filter.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {filter.count} concepts
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {filter.percentage.toFixed(1)}%
                  </div>
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

      {/* Summary Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
          Summary Statistics
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {filteredConcepts.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Concepts</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {masteryStats.find(m => m.level === 4)?.count || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Mastered</div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {masteryStats.filter(m => m.level >= 1 && m.level <= 3).reduce((sum, m) => sum + m.count, 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {Object.keys(stats.by_custom_filter || {}).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Custom Filters</div>
          </div>
        </div>
      </div>
    </div>
  );
};
