/**
 * Predicted Score Badge Component
 * Displays the user's predicted exam readiness percentage.
 */

import React from 'react';
import { TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PredictedScoreBadgeProps {
  score: number; // 0-100 percentage
  atomCount?: number; // Number of atoms/concepts studied
  loading?: boolean;
  className?: string;
}

export const PredictedScoreBadge: React.FC<PredictedScoreBadgeProps> = ({
  score,
  atomCount = 0,
  loading = false,
  className
}) => {
  if (loading) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
        'text-sm font-medium animate-pulse',
        className
      )}>
        <Target className="h-4 w-4" />
        <span>Calculating...</span>
      </div>
    );
  }

  // Color based on score
  const getScoreColor = () => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    if (score >= 40) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
    return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
  };

  // Message based on score
  const getMessage = () => {
    if (atomCount < 10) return 'Keep studying';
    if (score >= 80) return 'Exam ready';
    if (score >= 60) return 'Almost there';
    if (score >= 40) return 'Making progress';
    return 'Keep practicing';
  };

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-full',
      getScoreColor(),
      'text-sm font-medium',
      className
    )}>
      <TrendingUp className="h-4 w-4" />
      <span>{Math.round(score)}% {getMessage()}</span>
    </div>
  );
};

export default PredictedScoreBadge;
