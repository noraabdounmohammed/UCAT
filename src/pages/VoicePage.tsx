import { useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthGate } from '@/components/auth/AuthGate';
import { PaywallGate } from '@/components/paywall/PaywallGate';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import { useSubscription } from '@/hooks/useSubscription';
import { startStripeCheckout } from '@/services/stripeCheckout';
import { createAtomRepository } from '@/atom/repository';
import { createUserStateRepository } from '@/atom/userStateRepository';
import { isVoiceAvailable } from '@/voice/speech';
import { VoiceAtomView } from '@/components/voice/VoiceAtomView';
import { track } from '@/instrumentation/events';
import type { MatchOutcome } from '@/voice/match';
import type { FsrsRatingValue } from '@/atom/types';

function ratingFromOutcome(outcome: MatchOutcome): FsrsRatingValue {
  if (outcome.kind === 'answer') return 3; // Good
  if (outcome.kind === 'distractor') return 1; // Forgot
  return 2; // Hard — student hesitated/garbled, don't punish but don't reward
}

export function VoicePage() {
  const { user } = useAuth();
  const atomRepo = useMemo(() => createAtomRepository(supabase), []);
  const userStateRepo = useMemo(() => createUserStateRepository(supabase), []);
  const voiceOk = isVoiceAvailable();

  const session = useFsrsSession({
    userId: user?.id ?? '',
    atomRepo,
    userStateRepo,
    maxAtoms: 5,
  });

  const subscription = useSubscription();

  // One-shot mount track — separate from session_started since voice has different cost/UX profile.
  useEffect(() => {
    if (user && voiceOk) track('voice_session_started');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, voiceOk]);

  if (!user) {
    return (
      <MainLayout currentPage="voice">
        <AuthGate
          title="Sign in to use voice mode"
          subtitle="Hands-free retrieval — listen, speak the answer, advance."
        />
      </MainLayout>
    );
  }

  if (!voiceOk) {
    return (
      <MainLayout currentPage="voice">
        <div className="max-w-md mx-auto py-12 px-4 text-center text-stone-700">
          <h1 className="text-xl font-semibold mb-2">Voice mode unavailable</h1>
          <p className="text-sm text-stone-600">
            Your browser doesn't support the Web Speech API. Try Chrome on desktop or Android.
          </p>
        </div>
      </MainLayout>
    );
  }

  const handleMatch = async (outcome: MatchOutcome) => {
    await session.rateAtom({
      rating: ratingFromOutcome(outcome),
      confidence: 3,
      responseMs: 0,
    });
    subscription.incrementDailyCount();
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
    <MainLayout currentPage="voice">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        <h1 className="text-xl font-semibold text-stone-900">Voice mode</h1>
        <p className="text-xs text-stone-500">
          Hands-free retrieval. Speak your answer when you hear "Listening".
        </p>

        <PaywallGate
          kind={paywallKind}
          dailyQuestionsRemaining={subscription.dailyQuestionsRemaining}
          onUpgrade={handleUpgrade}
        >
          {session.status === 'loading' && <div className="text-stone-500 text-center py-12">Loading...</div>}
          {session.status === 'empty' && (
            <div className="text-stone-700 text-center py-12">
              <div className="text-2xl font-medium mb-2">All caught up.</div>
              <p className="text-sm text-stone-500">No atoms due right now.</p>
            </div>
          )}
          {session.status === 'error' && (
            <div className="text-red-700 text-center py-12">{session.errorMessage}</div>
          )}
          {session.status === 'summary' && session.summary && (
            <div className="text-center py-12 text-stone-800">
              <div className="text-2xl font-medium">Done.</div>
              <p className="text-sm text-stone-500 mt-2">
                {session.summary.totalAtoms} atom{session.summary.totalAtoms === 1 ? '' : 's'} reviewed by voice.
              </p>
            </div>
          )}
          {session.status === 'in_progress' && session.currentAtom && (
            <>
              <div className="text-xs text-stone-500 text-right">
                {session.progress.done} / {session.progress.total}
              </div>
              <VoiceAtomView
                key={session.currentAtom.id}
                atom={session.currentAtom}
                onMatch={handleMatch}
              />
              <button
                type="button"
                onClick={() => window.speechSynthesis?.cancel?.()}
                className="text-xs text-stone-500 underline"
              >
                Stop speaking
              </button>
            </>
          )}
        </PaywallGate>
      </div>
    </MainLayout>
  );
}
