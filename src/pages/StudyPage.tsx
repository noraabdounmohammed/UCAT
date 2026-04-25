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

export function StudyPage() {
  const { user } = useAuth();
  const atomRepo = useMemo(() => createAtomRepository(supabase), []);
  const userStateRepo = useMemo(() => createUserStateRepository(supabase), []);

  const session = useFsrsSession({
    userId: user?.id ?? '',
    atomRepo,
    userStateRepo,
    maxAtoms: 5,
  });

  const score = usePredictedScore({
    userId: user?.id ?? '',
    exam: 'UKMLA',
    atomRepo,
    userStateRepo,
  });

  if (!user) {
    return (
      <MainLayout currentPage="study">
        <div className="text-center py-12 text-stone-600">
          Sign in to study.
        </div>
      </MainLayout>
    );
  }

  // Streak placeholder until Plan 7 wires it from a server-side count.
  const streakDays = 1;

  return (
    <MainLayout currentPage="study">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        <PredictedScoreBadge {...score} />
        <FsrsSessionView session={session} streakDays={streakDays} />
      </div>
    </MainLayout>
  );
}
