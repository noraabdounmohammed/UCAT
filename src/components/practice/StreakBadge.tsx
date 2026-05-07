/**
 * Streak Badge Component
 * Displays the user's current study streak with a fire emoji.
 */

import React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakBadgeProps {
  days: number;
  className?: string;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ days, className }) => {
  if (days === 0) {
    return (
      <div className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
        'text-sm font-medium',
        className
      )}>
        <Flame className="h-4 w-4" />
        <span>Start streak</span>
      </div>
    );
  }

  // Color based on streak length
  const getStreakColor = () => {
    if (days >= 30) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
    if (days >= 14) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
    if (days >= 7) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
  };

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
      getStreakColor(),
      'text-sm font-medium',
      className
    )}>
      <Flame className="h-4 w-4" />
      <span>{days} day{days !== 1 ? 's' : ''}</span>
    </div>
  );
};

export default StreakBadge;
