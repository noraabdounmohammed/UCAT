import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConceptStat {
  id: string;
  title: string;
  tags: string[];
  masteryScore: number;
  attempts: number;
  correct: number;
  incorrect: number;
}

interface WeakListProps {
  concepts: ConceptStat[];
}

export const WeakList: React.FC<WeakListProps> = ({ concepts }) => {
  if (concepts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Weakest Concepts
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            No weak concepts yet. Keep practicing!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Weakest Concepts
      </h3>
      
      <div className="space-y-3">
        {concepts.map((concept) => (
          <div 
            key={concept.id}
            className="flex items-start justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                  {concept.title}
                </h4>
              </div>
              {concept.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {concept.tags.slice(0, 2).map((tag, i) => (
                    <span 
                      key={i}
                      className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0">
              Review
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
