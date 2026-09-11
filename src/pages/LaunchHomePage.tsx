import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDaypartGreeting, getLearnerFirstName } from '@/lib/learnerIdentity';
import { buildSessionPlanFromRequest, rememberPlannedSession } from '@/lib/sessionPlan';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';

const P = {
  cream: '#FAF5EC',
  paper: '#FFFDF8',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#E8DCC4',
  sage: '#E8EDD9',
  sageDeep: '#667555',
};

function CountedScope({ items }: { items: Array<{ label: string; count: number }> }) {
  if (!items.length) return <span>Mixed UKMLA</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <span key={item.label} className="rounded-full border px-3 py-1.5 text-[12px] font-bold" style={{ borderColor: '#D8DDC9', backgroundColor: P.sage, color: P.espresso }}>
          {item.label}{item.count > 1 ? ` ×${item.count}` : ''}
        </span>
      ))}
    </div>
  );
}

function sessionMix(cases: Array<{ system: string; skill: string }>) {
  const counts = new Map<string, number>();
  cases.forEach(item => {
    const label = `${item.system} · ${item.skill}`;
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
}

function SessionPlanCard({
  plan,
  onStart,
  onReset,
  personalised,
}: {
  plan: ReturnType<typeof buildSessionPlanFromRequest>;
  onStart: () => void;
  onReset: () => void;
  personalised: boolean;
}) {
  const unmatched = Boolean(plan.request && plan.requestMatched === false);
  const mix = sessionMix(plan.cases || []);

  return (
    <section className="mt-7 overflow-hidden rounded-[22px] border" style={{ borderColor: P.line, backgroundColor: P.paper }}>
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: P.muted }}>
            {unmatched ? 'I couldn’t map that exactly' : plan.request ? 'Session I understood' : personalised ? 'What I’d do next' : 'If I choose for you'}
          </div>
          <div className="text-[12px] font-semibold" style={{ color: P.muted }}>
            {plan.count || 1} case{plan.count === 1 ? '' : 's'} · about {plan.minutes || 3} min
          </div>
        </div>

        {plan.request && (
          <div className="mt-3 text-[14px] font-semibold leading-6" style={{ color: P.espresso }}>
            “{plan.request}”
          </div>
        )}

        {unmatched && (
          <p className="mt-3 text-[12px] font-medium leading-5" style={{ color: P.muted }}>
            I couldn’t find a clean curriculum match, so I’ve shown my recommended mix instead. Try an area such as cardiology, a skill such as management, or a time such as 10 minutes.
          </p>
        )}

        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[11px] font-semibold" style={{ color: P.muted }}>Whole session</div>
            <div className="text-[10px] font-semibold" style={{ color: P.muted }}>order hidden</div>
          </div>
          <div className="mt-2"><CountedScope items={mix} /></div>
        </div>

        <p className="mt-5 border-t pt-4 text-[11px] leading-5" style={{ borderColor: P.line, color: P.muted }}>
          That is the complete mix for this session. I hide the case order, exact conditions, decisive clues and answers so knowing the plan can’t give a case away.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onStart}
            disabled={plan.count === 0}
            className="inline-flex items-center gap-2 rounded-[14px] px-5 py-3.5 text-[14px] font-bold disabled:opacity-40"
            style={{ backgroundColor: P.espresso, color: P.cream }}
          >
            Start session <ArrowRight className="h-4 w-4" />
          </button>
          {plan.request && (
            <button type="button" onClick={onReset} className="text-[13px] font-semibold underline decoration-[#BBA995] underline-offset-4" style={{ color: P.muted }}>
              Let StudyEdit choose instead
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function HomeContent() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { concepts } = useConceptStore() as any;
  const [draft, setDraft] = useState('');
  const [request, setRequest] = useState('');

  const hasEvidence = useMemo(
    () => (concepts || []).some((concept: any) => Number(concept.mastery_data?.attempts || 0) > 0),
    [concepts],
  );
  const defaultCount = hasEvidence ? 5 : 3;
  const plan = useMemo(
    () => buildSessionPlanFromRequest(concepts || [], request, defaultCount),
    [concepts, defaultCount, request],
  );
  const learnerName = useMemo(() => getLearnerFirstName(user), [user]);
  const greeting = useMemo(() => getDaypartGreeting(), []);

  const applyRequest = (value: string) => {
    const next = value.trim();
    setDraft(next);
    setRequest(next);
  };

  const startSession = () => {
    rememberPlannedSession(plan);
    try {
      sessionStorage.setItem('studyedit_current_journey_v1', hasEvidence ? 'returning' : 'cold');
    } catch {
      // Starting a session must not depend on storage access.
    }
    navigate(`/recommended-practice?count=${Math.max(1, plan.count || defaultCount)}`);
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: P.cream, color: P.ink }}>
      <div className="mx-auto w-full max-w-[760px] px-5 pb-10 pt-5 sm:px-8 sm:pt-8">
        <header className="flex items-center justify-between gap-4">
          <div className="text-[19px] font-extrabold tracking-[-0.03em]" style={{ color: P.espresso }}>studyedit.</div>
          {!user ? (
            <button onClick={() => navigate('/signin?next=/')} className="text-[12px] font-semibold" style={{ color: P.muted }}>Sign in</button>
          ) : (
            <button onClick={() => void signOut()} className="text-[12px] font-semibold" style={{ color: P.muted }}>Sign out</button>
          )}
        </header>

        <section className="pt-14 sm:pt-20">
          <div className="text-[13px] font-semibold" style={{ color: P.muted }}>
            {learnerName ? `${greeting}, ${learnerName}.` : hasEvidence ? greeting : 'UKMLA tutor'}
          </div>
          <h1 className="mt-3 max-w-[650px] text-[38px] font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-[50px]" style={{ color: P.espresso }}>
            {hasEvidence ? 'What do you need today?' : 'What do you want to work on?'}
          </h1>
          <p className="mt-5 max-w-[610px] text-[16px] font-medium leading-7" style={{ color: '#4A392C' }}>
            {hasEvidence
              ? 'I’ve already picked what I think is most useful from your learning history. Override me in plain English whenever you want.'
              : 'Tell me the time, area or kind of thinking you want to practise — or leave it to me.'}
          </p>

          <form
            className="mt-7 flex items-center gap-2 rounded-[18px] border p-2 pl-4 shadow-[0_8px_24px_rgba(31,20,12,0.04)]"
            style={{ borderColor: '#DCCDB8', backgroundColor: P.paper }}
            onSubmit={event => {
              event.preventDefault();
              applyRequest(draft);
            }}
          >
            <input
              value={draft}
              onChange={event => setDraft(event.target.value)}
              placeholder="e.g. 10 minutes of cardio, management, or just start me"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] font-medium outline-none placeholder:text-[#A89582]"
              style={{ color: P.espresso }}
            />
            <button
              type="submit"
              aria-label="Plan my session"
              className="flex h-11 shrink-0 items-center justify-center rounded-[13px] px-4 text-[13px] font-bold"
              style={{ backgroundColor: P.espresso, color: P.cream }}
            >
              Plan
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-semibold" style={{ color: P.muted }}>
            <button type="button" onClick={() => applyRequest('')} className="underline decoration-[#C7B7A2] underline-offset-4">Just start me</button>
            <button type="button" onClick={() => applyRequest('10 minutes')} className="underline decoration-[#C7B7A2] underline-offset-4">10 minutes</button>
            <button type="button" onClick={() => applyRequest('Cardiology')} className="underline decoration-[#C7B7A2] underline-offset-4">Cardiology</button>
            <button type="button" onClick={() => applyRequest('Management')} className="underline decoration-[#C7B7A2] underline-offset-4">Management</button>
          </div>

          <SessionPlanCard
            plan={plan}
            onStart={startSession}
            onReset={() => applyRequest('')}
            personalised={hasEvidence}
          />

          {!user && <div className="mt-4 text-[12px] font-medium" style={{ color: P.muted }}>No account needed to start.</div>}
        </section>

        <footer className="mt-14 flex items-center justify-between border-t pt-5 text-[11px]" style={{ borderColor: P.line, color: P.muted }}>
          <button onClick={() => navigate('/privacy')}>Privacy</button>
          <span>UKMLA AKT</span>
        </footer>
      </div>
    </main>
  );
}

export function LaunchHomePage() {
  const { user } = useAuth();
  const curriculumId = useMemo(() => {
    if (user?.id) migrateLegacyCurriculumState(user.id);
    return getUserCurriculumId(user?.id);
  }, [user?.id]);

  return <ConceptStoreProvider curriculumId={curriculumId}><HomeContent /></ConceptStoreProvider>;
}
