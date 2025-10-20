import React from 'react';

interface MasteryDonutProps {
  counts: { correct: number; incorrect: number; unseen: number };
  masteryPercent: number;
}

export const MasteryDonut: React.FC<MasteryDonutProps> = ({ counts, masteryPercent }) => {
  const total = counts.correct + counts.incorrect + counts.unseen;
  const correctPercent = total > 0 ? (counts.correct / total) * 100 : 0;
  const incorrectPercent = total > 0 ? (counts.incorrect / total) * 100 : 0;
  const unseenPercent = total > 0 ? (counts.unseen / total) * 100 : 0;

  // SVG donut chart
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const correctOffset = 0;
  const incorrectOffset = (correctPercent / 100) * circumference;
  const unseenOffset = ((correctPercent + incorrectPercent) / 100) * circumference;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Overall Mastery
      </h3>
      
      <div className="flex flex-col items-center">
        {/* Donut Chart */}
        <div className="relative w-48 h-48 mb-6">
          <svg className="transform -rotate-90" width="192" height="192" viewBox="0 0 192 192">
            {/* Background circle */}
            <circle
              cx="96"
              cy="96"
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="20"
              className="dark:stroke-gray-700"
            />
            
            {/* Correct segment (green) */}
            <circle
              cx="96"
              cy="96"
              r={radius}
              fill="none"
              stroke="#10b981"
              strokeWidth="20"
              strokeDasharray={`${(correctPercent / 100) * circumference} ${circumference}`}
              strokeDashoffset={-correctOffset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
            
            {/* Incorrect segment (red) */}
            <circle
              cx="96"
              cy="96"
              r={radius}
              fill="none"
              stroke="#ef4444"
              strokeWidth="20"
              strokeDasharray={`${(incorrectPercent / 100) * circumference} ${circumference}`}
              strokeDashoffset={-incorrectOffset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
            
            {/* Unseen segment (gray) */}
            <circle
              cx="96"
              cy="96"
              r={radius}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="20"
              strokeDasharray={`${(unseenPercent / 100) * circumference} ${circumference}`}
              strokeDashoffset={-unseenOffset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {masteryPercent}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Mastered
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-700 dark:text-gray-300">
              Correct <span className="font-semibold">{counts.correct}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-700 dark:text-gray-300">
              Incorrect <span className="font-semibold">{counts.incorrect}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span className="text-gray-700 dark:text-gray-300">
              Unseen <span className="font-semibold">{counts.unseen}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
