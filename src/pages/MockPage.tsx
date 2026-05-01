import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthGate } from '@/components/auth/AuthGate';
import { MockQuestion } from '@/components/mock/MockQuestion';
import { MockTimer } from '@/components/mock/MockTimer';
import { MockResult } from '@/components/mock/MockResult';
import { MockGrid } from '@/components/mock/MockGrid';
import { MockReview } from '@/components/mock/MockReview';
import { UnreviewedToggle } from '@/components/study/UnreviewedToggle';
import { useMockSession } from '@/hooks/useMockSession';
import { useUnreviewedToggle } from '@/hooks/useUnreviewedToggle';
import { createAtomRepository } from '@/atom/repository';
import { createMockAttemptsRepository } from '@/atom/mockAttemptsRepository';

interface MockLengthOption {
  count: number;
  durationSec: number;
  label: string;
  blurb: string;
}

const LENGTH_OPTIONS: MockLengthOption[] = [
  { count: 20,  durationSec: 30 * 60,        label: 'Quick',      blurb: '20 questions · 30 min · for a quick taste' },
  { count: 50,  durationSec: 60 * 60,        label: 'Half paper', blurb: '50 questions · 60 min · short focus session' },
  { count: 100, durationSec: 120 * 60,       label: 'Full paper', blurb: '100 questions · 2 h · single AKT paper' },
  { count: 200, durationSec: 240 * 60,       label: 'Full mock',  blurb: '200 questions · 4 h · simulates the whole AKT' },
];

const DEFAULT_LENGTH = LENGTH_OPTIONS[0];

export function MockPage() {
  const { user } = useAuth();
  const atomRepo = useMemo(() => createAtomRepository(supabase), []);
  const mockAttemptsRepo = useMemo(() => createMockAttemptsRepository(supabase), []);
  const unreviewed = useUnreviewedToggle();

  const [chosen, setChosen] = useState<MockLengthOption | null>(null);
  const config = chosen ?? DEFAULT_LENGTH;

  if (!user) {
    return (
      <MainLayout currentPage="mock">
        <AuthGate
          title="Sign in to take a mock"
          subtitle="Timed UKMLA-style paper. Free navigation, flag-for-review, no spoilers until the end."
        />
      </MainLayout>
    );
  }

  if (!chosen) {
    return (
      <MainLayout currentPage="mock">
        <div className="max-w-md mx-auto py-6 px-4 space-y-4">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Mock exam</h1>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Pick a length. Real AKT is 200 questions over 4 hours — pick a smaller mock to warm up, or go full distance.
            </p>
          </header>
          <UnreviewedToggle value={unreviewed.value} onChange={unreviewed.setValue} />
          <div className="space-y-2">
            {LENGTH_OPTIONS.map((opt) => (
              <button
                key={opt.count}
                type="button"
                onClick={() => setChosen(opt)}
                className="flex items-center gap-3 w-full text-left p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 hover:shadow-sm transition-all"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {opt.label}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    {opt.blurb}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MockSession
      key={`${config.count}-${config.durationSec}-${unreviewed.value}`}
      atomRepo={atomRepo}
      mockAttemptsRepo={mockAttemptsRepo}
      userId={user.id}
      atomCount={config.count}
      durationSec={config.durationSec}
      includeUnreviewed={unreviewed.value}
      unreviewedToggle={unreviewed}
    />
  );
}

interface MockSessionProps {
  atomRepo: ReturnType<typeof createAtomRepository>;
  mockAttemptsRepo: ReturnType<typeof createMockAttemptsRepository>;
  userId: string;
  atomCount: number;
  durationSec: number;
  includeUnreviewed: boolean;
  unreviewedToggle: ReturnType<typeof useUnreviewedToggle>;
}

function MockSession({
  atomRepo,
  mockAttemptsRepo,
  userId,
  atomCount,
  durationSec,
  includeUnreviewed,
  unreviewedToggle,
}: MockSessionProps) {
  const session = useMockSession({
    atomRepo,
    exam: 'UKMLA',
    atomCount,
    durationSec,
    includeUnreviewed,
  });

  // Persist on first transition to review.
  const savedRef = useRef(false);
  useEffect(() => {
    if (session.status !== 'review' || !session.score || savedRef.current) return;
    savedRef.current = true;
    const timeUsedSec = durationSec - session.secondsLeft;
    const finishedAt = new Date();
    const startedAt = new Date(finishedAt.getTime() - timeUsedSec * 1000);
    mockAttemptsRepo
      .saveAttempt({
        userId,
        exam: 'UKMLA',
        atomCount,
        correct: session.score.correct,
        total: session.score.total,
        percentage: session.score.percentage,
        durationSec,
        timeUsedSec,
        finished: true,
        startedAt,
        finishedAt,
      })
      .catch((err) => console.error('Failed to save mock attempt:', err));
  }, [session.status, session.score, session.secondsLeft, userId, mockAttemptsRepo, atomCount, durationSec]);

  // Confirm before submitting if there are unanswered questions.
  const handleSubmit = () => {
    const total = session.atoms.length;
    const answered = Object.keys(session.picks).length;
    if (answered < total) {
      const ok = window.confirm(
        `${total - answered} question${total - answered === 1 ? '' : 's'} unanswered. Submit anyway?`
      );
      if (!ok) return;
    }
    session.submit();
  };

  if (session.status === 'loading') {
    return (
      <MainLayout currentPage="mock">
        <div className="max-w-md mx-auto py-6 px-4">
          <div className="text-stone-500 text-center py-12">Loading…</div>
        </div>
      </MainLayout>
    );
  }
  if (session.status === 'empty') {
    return (
      <MainLayout currentPage="mock">
        <div className="max-w-md mx-auto py-6 px-4">
          <div className="text-stone-700 dark:text-stone-300 text-center py-12">
            Not enough SBA questions in the bank for this length.
          </div>
          <UnreviewedToggle value={unreviewedToggle.value} onChange={unreviewedToggle.setValue} />
        </div>
      </MainLayout>
    );
  }
  if (session.status === 'error') {
    return (
      <MainLayout currentPage="mock">
        <div className="max-w-md mx-auto py-6 px-4">
          <div className="text-red-700 text-center py-12">{session.errorMessage}</div>
        </div>
      </MainLayout>
    );
  }

  const isReview = session.status === 'review';

  return (
    <MainLayout currentPage="mock">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {isReview ? 'Mock review' : 'Mock exam'}
          </h1>
          {!isReview && <MockTimer secondsLeft={session.secondsLeft} />}
        </div>

        {/* Final result block at the top of review mode */}
        {isReview && session.score && (
          <MockResult
            correct={session.score.correct}
            total={session.score.total}
            percentage={session.score.percentage}
            timeUsedSec={durationSec - session.secondsLeft}
          />
        )}

        {/* Question grid — visible always except during loading */}
        <MockGrid
          total={session.atoms.length}
          currentIndex={session.atomIndex}
          picks={session.picks}
          flagged={session.flagged}
          reviewMode={isReview}
          onJump={(i) => session.goTo(i)}
        />

        {/* Body — current question or review of current question */}
        {!isReview && session.currentAtom && (
          <>
            <MockQuestion
              key={`${session.currentAtom.id}-${session.atomIndex}`}
              atom={session.currentAtom}
              onSubmit={(a) => {
                session.pick(a);
                // Auto-advance to next unanswered if any, else stay.
                const next = session.atoms.findIndex(
                  (_, i) => i > session.atomIndex && session.picks[i] === undefined,
                );
                if (next !== -1) session.goTo(next);
                else if (session.atomIndex < session.atoms.length - 1) session.goNext();
              }}
              flagged={session.flagged.has(session.atomIndex)}
              onFlagToggle={() => session.flag()}
              showPick={session.picks[session.atomIndex]}
            />
            {/* Prev / Next / Submit row */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => session.goPrev()}
                disabled={session.atomIndex === 0}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <button
                type="button"
                onClick={() => session.flag()}
                className={`inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium ${
                  session.flagged.has(session.atomIndex)
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {session.flagged.has(session.atomIndex) ? (
                  <BookmarkCheck className="w-3.5 h-3.5" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5" />
                )}
                {session.flagged.has(session.atomIndex) ? 'Flagged' : 'Flag'}
              </button>
              <button
                type="button"
                onClick={() => session.goNext()}
                disabled={session.atomIndex === session.atoms.length - 1}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* End paper */}
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full mt-2 px-4 py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-800 dark:hover:bg-stone-200"
            >
              End paper · submit
            </button>
          </>
        )}

        {isReview && session.currentAtom && (
          <MockReview
            atom={session.currentAtom}
            pick={session.picks[session.atomIndex]}
            questionNumber={session.atomIndex + 1}
            totalQuestions={session.atoms.length}
            onPrev={session.atomIndex > 0 ? () => session.goPrev() : undefined}
            onNext={session.atomIndex < session.atoms.length - 1 ? () => session.goNext() : undefined}
          />
        )}
      </div>
    </MainLayout>
  );
}
