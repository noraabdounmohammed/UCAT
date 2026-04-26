import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthGate } from '@/components/auth/AuthGate';
import { FsrsSessionView } from '@/components/study/FsrsSessionView';
import { PredictedScoreBadge } from '@/components/study/PredictedScoreBadge';
import { StatsSummary } from '@/components/study/StatsSummary';
import { PaywallGate } from '@/components/paywall/PaywallGate';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import { usePredictedScore } from '@/hooks/usePredictedScore';
import { useStreak } from '@/hooks/useStreak';
import { useSubscription } from '@/hooks/useSubscription';
import { startStripeCheckout } from '@/services/stripeCheckout';
import { createAtomRepository } from '@/atom/repository';
import { createUserStateRepository } from '@/atom/userStateRepository';

const LOOKBACK_DAYS = 30;
// Was 5 — too low for a "drill all my mistakes" experience. The session
// still rates atoms one-at-a-time, but now the user can chew through up
// to 50 per sitting before having to refresh. /study keeps the 5-cap for
// its 3-min retrieval format.
const MAX_MISTAKES_PER_SESSION = 50;

export function MistakesPage() {
  const { user } = useAuth();
  const atomRepo = useMemo(() => createAtomRepository(supabase), []);
  const userStateRepo = useMemo(() => createUserStateRepository(supabase), []);

  const session = useFsrsSession({
    userId: user?.id ?? '',
    atomRepo,
    userStateRepo,
    maxAtoms: MAX_MISTAKES_PER_SESSION,
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

  const streak = useStreak({ userId: user?.id ?? '', repo: userStateRepo });
  const streakDays = streak.streakDays;

  const subscription = useSubscription();

  if (!user) {
    return (
      <MainLayout currentPage="mistakes">
        <AuthGate
          title="Sign in to drill mistakes"
          subtitle="Questions you got wrong recently — auto-curated for retrieval practice."
        />
      </MainLayout>
    );
  }

  const onRatedSideEffect = () => {
    subscription.incrementDailyCount().catch(() => {});
    score.refresh().catch(() => {});
  };

  // See `StudyPage.tsx` for the priority rationale.
  const paywallKind: 'allowed' | 'daily-limit' | 'crossed-target' = (() => {
    if (subscription.loading) return 'allowed';
    if (subscription.isAtLimit && !subscription.isPremium) return 'daily-limit';
    if (
      !subscription.isPremium &&
      score.status === 'ready' &&
      score.predictedScore >= 0.7 &&
      score.atomCount >= 30
    ) {
      return 'crossed-target';
    }
    return 'allowed';
  })();

  const handleUpgrade = () => {
    if (!user.id || !user.email) return;
    startStripeCheckout(user.id, user.email).catch((err) =>
      console.error('Checkout failed:', err),
    );
  };

  return (
    <MainLayout currentPage="mistakes">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Mistake deck</h1>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Questions you got wrong in the last {LOOKBACK_DAYS} days. Up to {MAX_MISTAKES_PER_SESSION} per session.
        </p>
        {/* Lifetime stats — answered / mastered / mistakes counters across the whole bank,
            so the user sees their position even if today's session only surfaces a few. */}
        {session.status !== 'in_progress' && <StatsSummary userId={user.id} repo={userStateRepo} />}
        {session.status !== 'in_progress' && <PredictedScoreBadge {...score} />}
        <PaywallGate
          kind={paywallKind}
          dailyQuestionsRemaining={subscription.dailyQuestionsRemaining}
          onUpgrade={handleUpgrade}
          predictedScore={score.predictedScore}
        >
          <FsrsSessionView
            session={session}
            streakDays={streakDays}
            onRatedSideEffect={onRatedSideEffect}
          />
        </PaywallGate>
      </div>
    </MainLayout>
  );
}
