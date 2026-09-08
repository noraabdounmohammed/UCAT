import React, { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDaypartGreeting, getLearnerFirstName } from '@/lib/learnerIdentity';
import { buildSpoilerSafeSessionPlan, rememberPlannedSession } from '@/lib/sessionPlan';
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

function SessionPlanCard({
  plan,
  onStart,
  onChange,
  firstSession,
}: {
  plan: ReturnType<typeof buildSpoilerSafeSessionPlan>;
  onStart: () => void;
  onChange: () => void;
  firstSession: boolean;
}) {
  return (
    <section className="mt-7 overflow-hidden rounded-[22px] border" style={{ borderColor: P.line, backgroundColor: P.paper }}>
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: P.muted }}>
            {firstSession ? 'If I choose for you' : 'Your next session'}
          </div>
          <div className="text-[12px] font-semibold" style={{ color: P.muted }}>
            {plan.count || (firstSession ? 3 : 5)} cases · about {plan.minutes || (firstSession ? 6 : 10)} min
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-semibold" style={{ color: P.muted }}>Areas</div>
            <div className="mt-2 text-[16px] font-bold leading-6" style={{ color: P.espresso }}>
              {plan.systems.length ? plan.systems.join(' · ') : 'Mixed UKMLA'}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold" style={{ color: P.muted }}>What you’ll practise</div>
            <div className="mt-2 text-[16px] font-bold leading-6" style={{ color: P.espresso }}>
              {plan.skills.length ? plan.skills.join(' · ') : 'Clinical reasoning'}
            </div>
          </div>
        </div>

        {plan.cases.length > 0 && (
          <div className="mt-6 border-t pt-4" style={{ borderColor: P.line }}>
            <div className="mb-2 text-[11px] font-semibold" style={{ color: P.muted }}>Whole session</div>
            <div className="divide-y" style={{ borderColor: P.line }}>
              {plan.cases.map((item, index) => (
                <div key={`${item.system}-${item.skill}-${index}`} className="grid grid-cols-[28px_1fr] gap-3 py-3 text-[13px] leading-5">
                  <span className="font-bold" style={{ color: P.sageDeep }}>{index + 1}</span>
                  <span style={{ color: P.ink }}><strong>{item.system}</strong> · {item.skill}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-5" style={{ color: P.muted }}>
              This shows the scope of every case without revealing the condition, decisive clue or correct answer.
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-2 rounded-[14px] px-5 py-3.5 text-[14px] font-bold"
            style={{ backgroundColor: P.espresso, color: P.cream }}
          >
            Start this session <ArrowRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={onChange} className="text-[13px] font-semibold underline decoration-[#BBA995] underline-offset-4" style={{ color: P.muted }}>
            Change what we study
          </button>
        </div>
      </div>
    </section>
  );
}

function HomeContent() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { concepts } = useConceptStore() as any;

  const preparation = useMemo(() => {
    const all = concepts || [];
    const attempted = all.filter((concept: any) => Number(concept.mastery_data?.attempts || 0) > 0);
    return { hasEvidence: attempted.length > 0 };
  }, [concepts]);

  const returning = preparation.hasEvidence;
  const sessionCount = returning ? 5 : 3;
  const plan = useMemo(() => buildSpoilerSafeSessionPlan(concepts || [], sessionCount), [concepts, sessionCount]);
  const learnerName = useMemo(() => getLearnerFirstName(user), [user]);
  const greeting = useMemo(() => getDaypartGreeting(), []);

  const startSession = () => {
    rememberPlannedSession(plan);
    try {
      sessionStorage.setItem('studyedit_current_journey_v1', returning ? 'returning' : 'cold');
    } catch {
      // Starting a session must not depend on storage access.
    }
    navigate(`/recommended-practice?count=${sessionCount}`);
  };

  const chooseScope = () => navigate('/concept-practice');

  return (
    <main className="min-h-screen" style={{ backgroundColor: P.cream, color: P.ink }}>
      <div className="mx-auto w-full max-w-[760px] px-5 pb-10 pt-5 sm:px-8 sm:pt-8">
        <header className="flex items-center justify-between gap-4">
          <div className="text-[19px] font-extrabold tracking-[-0.03em]" style={{ color: P.espresso }}>studyedit.</div>
          <div className="flex items-center gap-4">
            {!user ? (
              <button onClick={() => navigate('/recommended-practice?auth=1')} className="text-[12px] font-semibold" style={{ color: P.muted }}>Sign in</button>
            ) : (
              <button onClick={() => void signOut()} className="text-[12px] font-semibold" style={{ color: P.muted }}>Sign out</button>
            )}
          </div>
        </header>

        {!returning ? (
          <section className="pt-16 sm:pt-24">
            <div className="text-[12px] font-semibold" style={{ color: P.muted }}>{learnerName ? `${greeting}, ${learnerName}.` : 'UKMLA tutor'}</div>
            <h1 className="mt-3 max-w-[620px] text-[38px] font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-[50px]" style={{ color: P.espresso }}>
              What do you want to work on?
            </h1>
            <p className="mt-5 max-w-[570px] text-[17px] font-medium leading-7" style={{ color: '#4A392C' }}>
              You can choose the scope, or let me pick a short session and adjust as I learn how you think.
            </p>
            <SessionPlanCard plan={plan} onStart={startSession} onChange={chooseScope} firstSession />
            {!user && <div className="mt-4 text-[12px] font-medium" style={{ color: P.muted }}>No account needed to start.</div>}
          </section>
        ) : (
          <section className="pt-16 sm:pt-24">
            <div className="text-[13px] font-semibold" style={{ color: P.muted }}>{learnerName ? `${greeting}, ${learnerName}.` : greeting}</div>
            <h1 className="mt-3 max-w-[620px] text-[38px] font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-[50px]" style={{ color: P.espresso }}>
              I’ve got a session ready.
            </h1>
            <p className="mt-5 max-w-[590px] text-[17px] font-medium leading-7" style={{ color: '#4A392C' }}>
              I’ve used what you’ve already shown me to choose the next useful mix. You can see the whole scope before you start without seeing any answer-level hints.
            </p>
            <SessionPlanCard plan={plan} onStart={startSession} onChange={chooseScope} firstSession={false} />
          </section>
        )}

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
