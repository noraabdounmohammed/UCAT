import type { UseFsrsSessionResult } from '@/hooks/useFsrsSession';
import { AtomRenderer } from './AtomRenderer';
import { SessionSummary } from './SessionSummary';

export function FsrsSessionView({
  session,
  streakDays,
}: {
  session: UseFsrsSessionResult;
  streakDays: number;
}) {
  if (session.status === 'loading') {
    return <div className="text-stone-500 text-center py-12">Loading…</div>;
  }
  if (session.status === 'empty') {
    return (
      <div className="text-stone-700 text-center py-12 max-w-md mx-auto">
        <div className="text-2xl font-medium mb-2">All caught up 🎉</div>
        <p className="text-sm text-stone-500">No atoms due right now. Come back tomorrow.</p>
      </div>
    );
  }
  if (session.status === 'error') {
    return (
      <div className="text-red-700 text-center py-12">
        Something went wrong: {session.errorMessage}
      </div>
    );
  }
  if (session.status === 'summary' && session.summary) {
    return (
      <SessionSummary
        totalAtoms={session.summary.totalAtoms}
        ratings={session.summary.ratings}
        streakDays={streakDays}
      />
    );
  }
  // in_progress
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="text-xs text-stone-500 text-right">
        {session.progress.done} / {session.progress.total}
      </div>
      {session.currentAtom && (
        <AtomRenderer
          atom={session.currentAtom}
          onRated={(r) => session.rateAtom(r)}
        />
      )}
    </div>
  );
}
