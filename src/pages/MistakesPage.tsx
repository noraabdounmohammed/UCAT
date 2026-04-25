import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthGate } from '@/components/auth/AuthGate';
import { FsrsSessionView } from '@/components/study/FsrsSessionView';
import { PredictedScoreBadge } from '@/components/study/PredictedScoreBadge';
import { PaywallGate } from '@/components/paywall/PaywallGate';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import { usePredictedScore } from '@/hooks/usePredictedScore';
import { useStreak } from '@/hooks/useStreak';
import { useSubscription } from '@/hooks/useSubscription';
import { startStripeCheckout } from '@/services/stripeCheckout';
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

  const streak = useStreak({ userId: user?.id ?? '', repo: userStateRepo });
  const streakDays = streak.streakDays;

  const subscription = useSubscription();

  if (!user) {
    return (
      <MainLayout currentPage="mistakes">
        <AuthGate
          title="Sign in to drill mistakes"
          subtitle="Atoms you got wrong recently — auto-curated for retrieval practice."
        />
      </MainLayout>
    );
  }

  const onRatedSideEffect = () => {
    subscription.incrementDailyCount();
    score.refresh().catch(() => {});
  };

  const paywallKind: 'allowed' | 'daily-limit' =
    !subscription.loading && subscription.isAtLimit && !subscription.isPremium
      ? 'daily-limit'
      : 'allowed';

  const handleUpgrade = () => {
    if (!user.id || !user.email) return;
    startStripeCheckout(user.id, user.email).catch((err) =>
      console.error('Checkout failed:', err),
    );
  };

  return (
    <MainLayout currentPage="mistakes">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        <h1 className="text-xl font-semibold text-stone-900">Mistake deck</h1>
        <p className="text-xs text-stone-500">Atoms you got wrong in the last {LOOKBACK_DAYS} days.</p>
        <PredictedScoreBadge {...score} />
        <PaywallGate
          kind={paywallKind}
          dailyQuestionsRemaining={subscription.dailyQuestionsRemaining}
          onUpgrade={handleUpgrade}
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
