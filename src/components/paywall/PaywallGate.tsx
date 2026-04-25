import { useEffect, type ReactNode } from 'react';
import { track } from '@/instrumentation/events';

export interface PaywallGateProps {
  kind: 'allowed' | 'daily-limit' | 'free-tier-only';
  dailyQuestionsRemaining: number;
  onUpgrade: () => void;
  children: ReactNode;
}

export function PaywallGate({ kind, dailyQuestionsRemaining, onUpgrade, children }: PaywallGateProps) {
  // Fire `paywall_shown` whenever we transition to a non-allowed kind.
  useEffect(() => {
    if (kind !== 'allowed') {
      track('paywall_shown', { kind });
    }
  }, [kind]);

  if (kind === 'allowed') return <>{children}</>;

  const headline = kind === 'daily-limit'
    ? 'Daily free limit reached'
    : 'Unlock the full atom bank';

  const body = kind === 'daily-limit'
    ? 'Free study is capped at 20 questions per day. Upgrade for unlimited daily practice.'
    : 'Free covers a high-yield starter set. Upgrade for the complete UKMLA library plus mock exams, mistake deck, and voice mode.';

  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-6 max-w-md mx-auto text-center space-y-4">
      <div className="text-2xl font-semibold text-stone-900">{headline}</div>
      <p className="text-sm text-stone-600">{body}</p>
      {dailyQuestionsRemaining > 0 && (
        <div className="text-xs text-stone-500">{dailyQuestionsRemaining} free questions remaining today.</div>
      )}
      <button
        type="button"
        onClick={onUpgrade}
        className="px-4 py-2 rounded-lg bg-stone-900 text-white hover:bg-stone-800 text-sm font-medium"
      >
        Upgrade — £19.99/mo
      </button>
      <p className="text-xs text-stone-400">Cancel anytime. Annual saves 37%.</p>
    </div>
  );
}
