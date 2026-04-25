import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { FsrsSessionView } from '@/components/study/FsrsSessionView';
import { PredictedScoreBadge } from '@/components/study/PredictedScoreBadge';
import { PaywallGate } from '@/components/paywall/PaywallGate';
import { NpsPrompt } from '@/components/nps/NpsPrompt';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import { usePredictedScore } from '@/hooks/usePredictedScore';
import { useStreak } from '@/hooks/useStreak';
import { useSubscription } from '@/hooks/useSubscription';
import { useNpsTrigger } from '@/hooks/useNpsTrigger';
import { startStripeCheckout } from '@/services/stripeCheckout';
import { createAtomRepository } from '@/atom/repository';
import { createUserStateRepository } from '@/atom/userStateRepository';
import { createNpsRepository } from '@/atom/npsRepository';

export function StudyPage() {
  const { user } = useAuth();
  const atomRepo = useMemo(() => createAtomRepository(supabase), []);
  const userStateRepo = useMemo(() => createUserStateRepository(supabase), []);
  const npsRepo = useMemo(() => createNpsRepository(supabase), []);

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

  const streak = useStreak({ userId: user?.id ?? '', repo: userStateRepo });
  const streakDays = streak.streakDays;

  const subscription = useSubscription();
  const nps = useNpsTrigger({ userId: user?.id ?? null, repo: npsRepo });

  if (!user) {
    return (
      <MainLayout currentPage="study">
        <div className="text-center py-12 text-stone-600">
          Sign in to study.
        </div>
      </MainLayout>
    );
  }

  const onRatedSideEffect = () => subscription.incrementDailyCount();

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
    <MainLayout currentPage="study">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
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
        {nps.shouldShow && (
          <NpsPrompt
            onSubmit={(p) => { nps.submit(p).catch(() => nps.dismiss()); }}
            onDismiss={nps.dismiss}
          />
        )}
      </div>
    </MainLayout>
  );
}
