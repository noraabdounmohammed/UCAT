import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthGate } from '@/components/auth/AuthGate';
import { FsrsSessionView } from '@/components/study/FsrsSessionView';
import { PredictedScoreBadge } from '@/components/study/PredictedScoreBadge';
import { StatsSummary } from '@/components/study/StatsSummary';
import { TopicPrimer } from '@/components/study/TopicPrimer';
import { StudyDashboard } from '@/components/study/StudyDashboard';
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
import { createAtomRepository, type AtomRepository } from '@/atom/repository';
import { createUserStateRepository, type UserStateRepository } from '@/atom/userStateRepository';
import { createNpsRepository } from '@/atom/npsRepository';
import { buildStudyQueue } from '@/study/queueLoader';
import type { QuestionKind } from '@/atom/types';

type FilterKind = QuestionKind | 'case';
const VALID_KINDS: readonly string[] = ['sba', 'cloze', 'emq', 'calc', 'case'];

export function StudyPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const atomRepo = useMemo(() => createAtomRepository(supabase), []);
  const userStateRepo = useMemo(() => createUserStateRepository(supabase), []);
  const npsRepo = useMemo(() => createNpsRepository(supabase), []);
  const unreviewed = useUnreviewedToggle();

  const filterTopic = searchParams.get('topic') ?? undefined;
  const filterKindRaw = searchParams.get('type') ?? undefined;
  const sessionParam = searchParams.get('session');
  const filterKind = (filterKindRaw && VALID_KINDS.includes(filterKindRaw))
    ? (filterKindRaw as FilterKind)
    : undefined;
  const hasFilter = !!filterTopic || !!filterKind;
  const dashboardActive = !hasFilter && sessionParam !== 'daily';

  // "Start session" on the dashboard flips this; the session-inner mount
  // then drives the FSRS hook with no filter.
  const [dailyStarted, setDailyStarted] = useState(false);
  const showDashboard = dashboardActive && !dailyStarted;

  const score = usePredictedScore({
    userId: user?.id ?? '',
    exam: 'UKMLA',
    atomRepo,
    userStateRepo,
    includeUnreviewed: unreviewed.value,
  });
  const streak = useStreak({ userId: user?.id ?? '', repo: userStateRepo });
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

  if (showDashboard) {
    return (
      <MainLayout currentPage="study">
        <div className="max-w-md mx-auto py-6 px-4 space-y-4">
          <StatsSummary userId={user.id} repo={userStateRepo} />
          <PredictedScoreBadge {...score} />
          <UnreviewedToggle value={unreviewed.value} onChange={unreviewed.setValue} />
          <StudyDashboard
            streakDays={streak.streakDays}
            onStartDailyFive={() => setDailyStarted(true)}
          />
        </div>
      </MainLayout>
    );
  }

  // Filter label for the back-link banner.
  const filterLabel = filterTopic
    ? `Topic: ${filterTopic[0].toUpperCase() + filterTopic.slice(1)}`
    : filterKind === 'case'
      ? 'Format: Chained cases'
      : filterKind === 'calc'
        ? 'Format: Drug calculations'
        : filterKind === 'emq'
          ? 'Format: EMQ'
          : filterKind === 'cloze'
            ? 'Format: Cloze'
            : filterKind === 'sba'
              ? 'Format: SBA'
              : null;

  // Force-remount the inner session whenever filter or daily-start changes
  // — useFsrsSession only re-loads on userId change, so we use the key to
  // re-enter the loading lifecycle for a different filter.
  const sessionKey = `${filterTopic ?? '_'}:${filterKind ?? '_'}:${dailyStarted ? 'd' : 'n'}`;

  return (
    <StudySessionInner
      key={sessionKey}
      userId={user.id}
      atomRepo={atomRepo}
      userStateRepo={userStateRepo}
      filterTopic={filterTopic}
      filterKind={filterKind}
      includeUnreviewed={unreviewed.value}
      streakDays={streak.streakDays}
      score={score}
      subscription={subscription}
      nps={nps}
      filterLabel={filterLabel}
    />
  );
}

interface StudySessionInnerProps {
  userId: string;
  atomRepo: AtomRepository;
  userStateRepo: UserStateRepository;
  filterTopic?: string;
  filterKind?: FilterKind;
  includeUnreviewed: boolean;
  streakDays: number;
  score: ReturnType<typeof usePredictedScore>;
  subscription: ReturnType<typeof useSubscription>;
  nps: ReturnType<typeof useNpsTrigger>;
  filterLabel: string | null;
}

function StudySessionInner({
  userId,
  atomRepo,
  userStateRepo,
  filterTopic,
  filterKind,
  includeUnreviewed,
  streakDays,
  score,
  subscription,
  nps,
  filterLabel,
}: StudySessionInnerProps) {
  const navigate = useNavigate();
  const session = useFsrsSession({
    userId,
    atomRepo,
    userStateRepo,
    maxAtoms: 5,
    loadQueue: (uid, now, max) =>
      buildStudyQueue({
        userId: uid,
        exam: 'UKMLA',
        asOf: now,
        maxAtoms: max,
        includeUnreviewed,
        atomRepo,
        userStateRepo,
        filterTopic,
        filterKind,
      }),
  });

  const onRatedSideEffect = () => {
    subscription.incrementDailyCount().catch(() => {});
    score.refresh().catch(() => {});
  };

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
    if (!userId) return;
    startStripeCheckout(userId, '').catch((err) => console.error('Checkout failed:', err));
  };

  return (
    <MainLayout currentPage="study">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        <button
          type="button"
          onClick={() => navigate('/study')}
          className="text-xs text-stone-600 dark:text-stone-400 hover:underline"
        >
          ← {filterLabel ?? 'Today\'s daily 5'} · back to all modes
        </button>
        <StatsSummary userId={userId} repo={userStateRepo} />
        <TopicPrimer
          supabase={supabase}
          topicKey={session.currentAtom?.topicPath?.[0] ?? null}
        />
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
