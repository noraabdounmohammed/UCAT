import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { FsrsSessionView } from '@/components/study/FsrsSessionView';
import { PredictedScoreBadge } from '@/components/study/PredictedScoreBadge';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import { usePredictedScore } from '@/hooks/usePredictedScore';
import { createAtomRepository } from '@/atom/repository';
import { createUserStateRepository } from '@/atom/userStateRepository';

const LOOKBACK_DAYS = 30;

export function MistakesPage() {
  const { user } = useAuth();
  const atomRepo = useMemo(() => createAtomRepository(supabase), []);
  const userStateRepo = useMemo(() => createUserStateRepository(supabase), []);

  const session = useFsrsSession({
    userId: user?.id ?? '',
    atomRepo,
    userStateRepo,
    maxAtoms: 5,
    loadQueue: async (userId, now, max) => {
      const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);
      return userStateRepo.listMistakeAtomsForUser(userId, since, max);
    },
  });

  const score = usePredictedScore({
    userId: user?.id ?? '',
    exam: 'UKMLA',
    atomRepo,
    userStateRepo,
  });

  if (!user) {
    return (
      <MainLayout currentPage="mistakes">
        <div className="text-center py-12 text-stone-600">Sign in to drill mistakes.</div>
      </MainLayout>
    );
  }

  // Streak placeholder until Plan 7 wires real data.
  const streakDays = 1;

  return (
    <MainLayout currentPage="mistakes">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        <h1 className="text-xl font-semibold text-stone-900">Mistake deck</h1>
        <p className="text-xs text-stone-500">Atoms you got wrong in the last {LOOKBACK_DAYS} days.</p>
        <PredictedScoreBadge {...score} />
        <FsrsSessionView session={session} streakDays={streakDays} />
      </div>
    </MainLayout>
  );
}
