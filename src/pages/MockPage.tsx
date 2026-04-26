import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthGate } from '@/components/auth/AuthGate';
import { MockQuestion } from '@/components/mock/MockQuestion';
import { MockTimer } from '@/components/mock/MockTimer';
import { MockResult } from '@/components/mock/MockResult';
import { useMockSession } from '@/hooks/useMockSession';
import { createAtomRepository } from '@/atom/repository';
import { createMockAttemptsRepository } from '@/atom/mockAttemptsRepository';

const MOCK_ATOM_COUNT = 20;
const MOCK_DURATION_SEC = 30 * 60;

export function MockPage() {
  const { user } = useAuth();
  const atomRepo = useMemo(() => createAtomRepository(supabase), []);
  const mockAttemptsRepo = useMemo(() => createMockAttemptsRepository(supabase), []);
  const session = useMockSession({
    atomRepo,
    exam: 'UKMLA',
    atomCount: MOCK_ATOM_COUNT,
    durationSec: MOCK_DURATION_SEC,
  });

  // Fire-and-forget persist on finished. Guarded with a ref so we save once
  // per session even if the effect re-runs (e.g. on score reference changes).
  const savedRef = useRef(false);
  useEffect(() => {
    if (session.status !== 'finished' || !session.score || !user) return;
    if (savedRef.current) return;
    savedRef.current = true;

    const timeUsedSec = MOCK_DURATION_SEC - session.secondsLeft;
    const finishedAt = new Date();
    const startedAt = new Date(finishedAt.getTime() - timeUsedSec * 1000);

    mockAttemptsRepo
      .saveAttempt({
        userId: user.id,
        exam: 'UKMLA',
        atomCount: MOCK_ATOM_COUNT,
        correct: session.score.correct,
        total: session.score.total,
        percentage: session.score.percentage,
        durationSec: MOCK_DURATION_SEC,
        timeUsedSec,
        finished: true,
        startedAt,
        finishedAt,
      })
      .catch((err) => console.error('Failed to save mock attempt:', err));
  }, [session.status, session.score, session.secondsLeft, user, mockAttemptsRepo]);

  if (!user) {
    return (
      <MainLayout currentPage="mock">
        <AuthGate
          title="Sign in to take a mock"
          subtitle="A 30-minute, 20-question timed UKMLA-style mock exam."
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout currentPage="mock">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-stone-900">Mock exam</h1>
          {session.status === 'in_progress' && <MockTimer secondsLeft={session.secondsLeft} />}
        </div>
        {session.status === 'loading' && (
          <div className="text-stone-500 text-center py-12">Loading…</div>
        )}
        {session.status === 'empty' && (
          <div className="text-stone-700 text-center py-12">No questions available.</div>
        )}
        {session.status === 'error' && (
          <div className="text-red-700 text-center py-12">{session.errorMessage}</div>
        )}
        {session.status === 'in_progress' && session.currentAtom && (
          <>
            <div className="text-xs text-stone-500 text-right">
              {session.progress.done} / {session.progress.total}
            </div>
            <MockQuestion
              key={session.currentAtom.id}
              atom={session.currentAtom}
              onSubmit={(a) => session.submit(a)}
            />
          </>
        )}
        {session.status === 'finished' && session.score && (
          <MockResult
            correct={session.score.correct}
            total={session.score.total}
            percentage={session.score.percentage}
            timeUsedSec={MOCK_DURATION_SEC - session.secondsLeft}
          />
        )}
      </div>
    </MainLayout>
  );
}
