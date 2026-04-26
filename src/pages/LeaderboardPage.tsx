import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthGate } from '@/components/auth/AuthGate';
import { CohortSelectModal } from '@/components/leaderboard/CohortSelectModal';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { useCohortLeaderboard } from '@/hooks/useCohortLeaderboard';
import { createCohortRepository } from '@/atom/cohortRepository';

export function LeaderboardPage() {
  const { user } = useAuth();
  const repo = useMemo(() => createCohortRepository(supabase), []);
  const lb = useCohortLeaderboard({ repo, userId: user?.id ?? '' });

  if (!user) {
    return (
      <MainLayout currentPage="leaderboard">
        <AuthGate
          title="Sign in to see your cohort"
          subtitle="Top studiers from your med school this week."
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout currentPage="leaderboard">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Leaderboard</h1>

        {lb.status === 'loading' && (
          <div className="text-stone-500 dark:text-stone-400 text-center py-8">Loading…</div>
        )}

        {lb.status === 'no-cohort' && (
          <CohortSelectModal repo={repo} onCohortSet={() => lb.refresh()} />
        )}

        {lb.status === 'ready' && (
          <>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {lb.cohort} · last 7 days
            </p>
            <LeaderboardTable rows={lb.rows} currentUserId={user.id} />
          </>
        )}

        {lb.status === 'error' && (
          <div className="text-red-700 py-8 text-sm">{lb.errorMessage}</div>
        )}
      </div>
    </MainLayout>
  );
}
