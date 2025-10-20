import React from 'react';
import type { LearningPlan, Unit, Lesson } from '@/utils/learningPlan';
import { Lock, Play, CheckCircle2 } from 'lucide-react';

interface LearningPlanListProps {
  plan: LearningPlan;
  onStartLesson: (lesson: Lesson) => void;
}

function LessonRow({ lesson, onStart }: { lesson: Lesson; onStart: (l: Lesson) => void }) {
  const pct = Math.round((lesson.progress.completed / Math.max(1, lesson.progress.total)) * 100);
  const locked = lesson.status === 'locked';
  const completed = lesson.status === 'completed';

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-white/60 dark:bg-zinc-900/60">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
          {lesson.title}
        </div>
        <div className="mt-1 flex items-center gap-3">
          <div className="h-1.5 w-32 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-zinc-500">{lesson.progress.completed}/{lesson.progress.total}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {completed ? (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" /> Completed
          </div>
        ) : locked ? (
          <div className="flex items-center gap-1 text-zinc-500 text-sm">
            <Lock className="h-4 w-4" /> Locked
          </div>
        ) : (
          <button
            onClick={() => onStart(lesson)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
          >
            <Play className="h-4 w-4" /> {lesson.status === 'in_progress' ? 'Resume' : 'Start'}
          </button>
        )}
      </div>
    </div>
  );
}

export const LearningPlanList: React.FC<LearningPlanListProps> = ({ plan, onStartLesson }) => {
  return (
    <div className="space-y-4">
      {plan.units.map((unit) => (
        <div key={unit.id} className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white/60 dark:bg-zinc-900/60">
          <div className="p-4 flex items-center justify-between">
            <div className="font-semibold text-zinc-900 dark:text-white">
              {unit.title}
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-32 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600" style={{ width: `${Math.round((unit.progress.completed / Math.max(1, unit.progress.total)) * 100)}%` }} />
              </div>
              <div className="text-xs text-zinc-500">{unit.progress.completed}/{unit.progress.total}</div>
            </div>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {unit.lessons.map((lesson) => (
              <LessonRow key={lesson.id} lesson={lesson} onStart={onStartLesson} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LearningPlanList;
