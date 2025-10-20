import React from 'react';

interface BloomLevel {
  level: string;
  accuracy: number;
  attempts: number;
}

interface BloomsBarsProps {
  blooms: BloomLevel[];
}

export const BloomsBars: React.FC<BloomsBarsProps> = ({ blooms }) => {
  const maxAttempts = Math.max(...blooms.map(b => b.attempts));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Bloom's Breakdown
      </h3>

      <div className="space-y-4">
        {blooms.map((bloom, i) => {
          const widthPercent = maxAttempts > 0 ? (bloom.attempts / maxAttempts) * 100 : 0;
          const accuracyPercent = bloom.accuracy * 100;

          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {bloom.level}
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-600 dark:text-gray-400">
                    {bloom.attempts} attempts
                  </span>
                  <span className={`font-semibold ${
                    accuracyPercent >= 70 ? 'text-green-600 dark:text-green-400' :
                    accuracyPercent >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {accuracyPercent.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Stacked bar */}
              <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <div 
                  className="h-full flex"
                  style={{ width: `${widthPercent}%` }}
                >
                  {/* Correct portion */}
                  <div 
                    className="bg-green-500 transition-all duration-500"
                    style={{ width: `${accuracyPercent}%` }}
                  />
                  {/* Incorrect portion */}
                  <div 
                    className="bg-red-500 transition-all duration-500"
                    style={{ width: `${100 - accuracyPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Correct</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Incorrect</span>
        </div>
      </div>
    </div>
  );
};
