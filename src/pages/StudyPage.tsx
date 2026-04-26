import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthGate } from '@/components/auth/AuthGate';
import { FsrsSessionView } from '@/components/study/FsrsSessionView';
import { PredictedScoreBadge } from '@/components/study/PredictedScoreBadge';
import { StatsSummary } from '@/components/study/StatsSummary';
import { PaywallGate } from '@/components/paywall/PaywallGate';
import { NpsPrompt } from '@/components/nps/NpsPrompt';
import { UnreviewedToggle } from '@/components/study/UnreviewedToggle';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import { usePredictedScore } from '@/hooks/usePredictedScore';
import { useStreak } from '@/hooks/useStreak';
import { useSubscription } from '@/hooks/useSubscription';
import { useNpsTrigger } from '@/hooks/useNpsTrigger';
import { useUnreviewedToggle } from '@/hooks/useUnreviewedToggle';
import { startStripeCheckout } from '@/services/stripeCheckout';
import { createAtomRepository } from '@/atom/repository';
import { createUserStateRepository } from '@/atom/userStateRepository';
import { createNpsRepository } from '@/atom/npsRepository';
import { buildStudyQueue } from '@/study/queueLoader';

export function StudyPage() {
  const { user } = useAuth();
  const atomRepo = useMemo(() => createAtomRepository(supabase), []);
  const userStateRepo = useMemo(() => createUserStateRepository(supabase), []);
  const npsRepo = useMemo(() => createNpsRepository(supabase), []);
  const unreviewed = useUnreviewedToggle();

  const session = useFsrsSession({
    userId: user?.id ?? '',
    atomRepo,
    userStateRepo,
    maxAtoms: 5,
    loadQueue: (uid, now, max) =>
      buildStudyQueue({
        userId: uid,
        exam: 'UKMLA',
        asOf: now,
        maxAtoms: max,
        includeUnreviewed: unreviewed.value,
        atomRepo,
        userStateRepo,
      }),
  });

  const score = usePredictedScore({
    userId: user?.id ?? '',
    exam: 'UKMLA',
    atomRepo,
    userStateRepo,
    includeUnreviewed: unreviewed.value,
  });

  const streak = useStreak({ userId: user?.id ?? '', repo: userStateRepo });
  const streakDays = streak.streakDays;

  const subscription = useSubscription();
  const nps = useNpsTrigger({ userId: user?.id ?? null, repo: npsRepo });

  if (!user) {
    return (
      <MainLayout currentPage="study">
        <AuthGate
          title="Sign in to study"
          subtitle="3-min retrieval sessions powered by FSRS-5 spaced repetition."
        />
      </MainLayout>
    );
  }

  const onRatedSideEffect = () => {
    subscription.incrementDailyCount().catch(() => {});
    score.refresh().catch(() => {});
  };

  // Paywall priority:
  //   1. Hard daily-limit cap (free user out of questions today).
  //   2. Soft conversion nudge once the user has demonstrably earned it
  //      (predicted >= 70% across >= 30 atoms covered).
  //   3. Otherwise allowed.
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
    <MainLayout currentPage="study">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        {/* Lifetime stats stays visible mid-session — it's a small counter,
            not noisy. The PredictedScoreBadge + opt-in toggle hide once a
            session starts (those ARE noisy and entry-screen-only). */}
        <StatsSummary userId={user.id} repo={userStateRepo} />
        {session.status !== 'in_progress' && <PredictedScoreBadge {...score} />}
        {session.status !== 'in_progress' && (
          <UnreviewedToggle value={unreviewed.value} onChange={unreviewed.setValue} />
        )}
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
