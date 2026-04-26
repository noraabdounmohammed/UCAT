import React from 'react';
import { Play, Flame, Sparkles, Dumbbell } from 'lucide-react';
import type { TodayPlan } from '@/utils/learningPlan';

interface TodayStripProps {
  today: TodayPlan;
  onStartQuick: () => void;
  onStartWeak: () => void;
  onStartNewLesson?: () => void;
}

export const TodayStrip: React.FC<TodayStripProps> = ({ today, onStartQuick, onStartWeak, onStartNewLesson }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Quick Review */}
      <div className="p-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="h-5 w-5 text-orange-600" />
            <div className="font-semibold text-zinc-900 dark:text-white">Quick review</div>
          </div>
          <div className="text-sm text-zinc-500">{today.estimates.quick} min</div>
        </div>
        <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{today.quickReviewIds.length}</div>
        <button
          onClick={onStartQuick}
          disabled={today.quickReviewIds.length === 0}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white font-semibold transition-colors"
        >
          <Play className="h-4 w-4" /> Start
        </button>
      </div>

      {/* Weak-spot Workout */}
      <div className="p-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Dumbbell className="h-5 w-5 text-purple-600" />
            <div className="font-semibold text-zinc-900 dark:text-white">Weak-spot workout</div>
          </div>
          <div className="text-sm text-zinc-500">{today.estimates.weak} min</div>
        </div>
        <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{today.weakWorkoutIds.length}</div>
        <button
          onClick={onStartWeak}
          disabled={today.weakWorkoutIds.length === 0}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-400 text-white font-semibold transition-colors"
        >
          <Play className="h-4 w-4" /> Start
        </button>
      </div>

      {/* New Lesson */}
      <div className="p-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <div className="font-semibold text-zinc-900 dark:text-white">New lesson</div>
          </div>
          <div className="text-sm text-zinc-500">{today.estimates.newLesson ?? 0} min</div>
        </div>
        <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{today.newLesson?.conceptIds.length ?? 0}</div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{today.newLesson?.title ?? 'No lesson unlocked yet'}</div>
        <button
          onClick={onStartNewLesson}
          disabled={!today.newLesson}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 text-white font-semibold transition-colors"
        >
          <Play className="h-4 w-4" /> Start
        </button>
      </div>
    </div>
  );
};

export default TodayStrip;
