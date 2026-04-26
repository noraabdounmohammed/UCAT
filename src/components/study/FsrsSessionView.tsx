import type { UseFsrsSessionResult } from '@/hooks/useFsrsSession';
import { QuestionRouter } from './QuestionRouter';
import { SessionSummary } from './SessionSummary';

export function FsrsSessionView({
  session,
  streakDays,
  onRatedSideEffect,
}: {
  session: UseFsrsSessionResult;
  streakDays: number;
  onRatedSideEffect?: () => void;
}) {
  if (session.status === 'loading') {
    return <div className="text-stone-500 dark:text-stone-400 text-center py-12">Loading…</div>;
  }
  if (session.status === 'empty') {
    return (
      <div className="text-stone-700 dark:text-stone-300 text-center py-12 max-w-md mx-auto">
        <div className="text-2xl font-medium mb-2">All caught up 🎉</div>
        <p className="text-sm text-stone-500 dark:text-stone-400">No questions due right now. Come back tomorrow.</p>
      </div>
    );
  }
  if (session.status === 'error') {
    return (
      <div className="text-red-700 dark:text-red-400 text-center py-12">
        Something went wrong: {session.errorMessage}
      </div>
    );
  }
  if (session.status === 'summary' && session.summary) {
    return (
      <SessionSummary
        totalAtoms={session.summary.totalAtoms}
        ratings={session.summary.ratings}
        rated={session.summary.rated}
        streakDays={streakDays}
      />
    );
  }
  // in_progress
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="text-xs text-stone-500 dark:text-stone-400 text-right">
        Question {session.progress.done + 1} of {session.progress.total}
      </div>
      {session.currentAtom && (
        <QuestionRouter
          key={session.currentAtom.id}
          atom={session.currentAtom}
          onRated={async (r) => {
            await session.rateAtom(r);
            onRatedSideEffect?.();
          }}
        />
      )}
    </div>
  );
}
