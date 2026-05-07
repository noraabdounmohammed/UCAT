/**
 * FSRS Rating Bar Component
 * Displays rating buttons after answering a question for spaced repetition scheduling.
 */

import React from 'react';
import { cn } from '@/lib/utils';

export type FsrsRating = 1 | 2 | 3 | 4;

interface FsrsRatingBarProps {
  onRate: (rating: FsrsRating) => void;
  isCorrect: boolean;
  disabled?: boolean;
  className?: string;
}

const RATING_CONFIG: Record<FsrsRating, { label: string; description: string; color: string; hoverColor: string }> = {
  1: {
    label: 'Forgot',
    description: 'Show again soon',
    color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    hoverColor: 'hover:bg-red-200 dark:hover:bg-red-900/50'
  },
  2: {
    label: 'Hard',
    description: 'Show in 2-3 days',
    color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
    hoverColor: 'hover:bg-orange-200 dark:hover:bg-orange-900/50'
  },
  3: {
    label: 'Good',
    description: 'Show in 1-2 weeks',
    color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    hoverColor: 'hover:bg-green-200 dark:hover:bg-green-900/50'
  },
  4: {
    label: 'Easy',
    description: 'Show in 1+ month',
    color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    hoverColor: 'hover:bg-blue-200 dark:hover:bg-blue-900/50'
  }
};

export const FsrsRatingBar: React.FC<FsrsRatingBarProps> = ({
  onRate,
  isCorrect,
  disabled = false,
  className
}) => {
  // If incorrect, only show Forgot and Hard options
  const availableRatings: FsrsRating[] = isCorrect ? [1, 2, 3, 4] : [1, 2];

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        How well did you know this?
      </p>
      <div className="flex gap-2">
        {availableRatings.map((rating) => {
          const config = RATING_CONFIG[rating];
          return (
            <button
              key={rating}
              onClick={() => onRate(rating)}
              disabled={disabled}
              className={cn(
                'flex-1 py-3 px-2 rounded-lg border text-sm font-medium transition-all',
                config.color,
                config.hoverColor,
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              title={config.description}
            >
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FsrsRatingBar;
