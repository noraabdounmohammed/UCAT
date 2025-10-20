import React from 'react';

interface CoverageBucket {
  key: string;
  label: string;
  total: number;
  mastered: number;
  weak: number;
}

interface CoverageGridProps {
  coverage: CoverageBucket[];
}

export const CoverageGrid: React.FC<CoverageGridProps> = ({ coverage }) => {
  if (coverage.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System/Topic Coverage
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            No topics yet. Add concepts to see coverage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        System/Topic Coverage
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {coverage.map((bucket) => {
          const masteredPercent = bucket.total > 0 ? (bucket.mastered / bucket.total) * 100 : 0;
          const weakPercent = bucket.total > 0 ? (bucket.weak / bucket.total) * 100 : 0;
          
          return (
            <button
              key={bucket.key}
              className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-left border border-transparent hover:border-blue-500 dark:hover:border-blue-600"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {bucket.label}
                </h4>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {bucket.total}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                <div className="h-full flex">
                  <div 
                    className="bg-green-500"
                    style={{ width: `${masteredPercent}%` }}
                  />
                  <div 
                    className="bg-red-500"
                    style={{ width: `${weakPercent}%` }}
                  />
                </div>
              </div>
              
              {/* Counts */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-600 dark:text-green-400">
                  ✓ {bucket.mastered}
                </span>
                <span className="text-red-600 dark:text-red-400">
                  ✗ {bucket.weak}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
