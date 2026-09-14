import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDaypartGreeting, getLearnerFirstName } from '@/lib/learnerIdentity';
import { buildSpoilerSafeSessionPlan, rememberPlannedSession } from '@/lib/sessionPlan';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';

const P = {
  cream: '#FAF5EC',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#E8DCC4',
  blush: '#E5A89D',
  sage: '#8FA379',
};

function HomeContent() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { concepts } = useConceptStore() as any;
  const launchedRef = useRef(false);

  const hasEvidence = useMemo(
    () => (concepts || []).some((concept: any) => Number(concept.mastery_data?.attempts || 0) > 0),
    [concepts],
  );
  const learnerName = useMemo(() => getLearnerFirstName(user), [user]);
  const greeting = useMemo(() => getDaypartGreeting(), []);

  useEffect(() => {
    if (launchedRef.current || !concepts?.length) return;
    launchedRef.current = true;

    const count = user ? 5 : 3;
    const plan = buildSpoilerSafeSessionPlan(concepts, count);
    if (!plan.count) return;

    rememberPlannedSession(plan);
    try {
      sessionStorage.setItem('studyedit_current_journey_v1', hasEvidence ? 'returning' : 'cold');
    } catch {
      // Starting a session must never depend on storage access.
    }

    navigate(`/recommended-practice?count=${Math.max(1, plan.count)}`, { replace: true });
  }, [concepts, hasEvidence, navigate, user]);

  const personalGreeting = learnerName ? `${greeting}, ${learnerName}.` : hasEvidence ? `${greeting}.` : 'Let’s start.';
  const tutorOpening = hasEvidence ? 'Let’s pick up where you need it.' : 'I’ll work out what you need as we go.';

  return (
    <main className="min-h-screen" style={{ backgroundColor: P.cream, color: P.ink }}>
      <div className="mx-auto w-full max-w-[720px] px-5 pb-10 pt-5 sm:px-8 sm:pt-8">
        <header className="flex items-center justify-between gap-4">
          <div className="text-[19px] font-extrabold tracking-[-0.03em]" style={{ color: P.espresso }}>studyedit.</div>
          {!user ? (
            <button onClick={() => navigate('/signin?next=/')} className="text-[12px] font-semibold" style={{ color: P.muted }}>Sign in</button>
          ) : (
            <button onClick={() => void signOut()} className="text-[12px] font-semibold" style={{ color: P.muted }}>Sign out</button>
          )}
        </header>

        <section className="pt-14 sm:pt-20">
          <h1
            className="max-w-[650px] text-[42px] font-light leading-[1.04] tracking-[-0.04em] sm:text-[52px]"
            style={{ color: P.espresso, fontFamily: "'Fraunces', Georgia, 'Times New Roman', serif" }}
          >
            {personalGreeting}
          </h1>
          <p
            className="mt-3 max-w-[610px] text-[20px] font-medium leading-8"
            style={{ color: '#49382B', fontFamily: "'Fraunces', Georgia, 'Times New Roman', serif" }}
          >
            {tutorOpening}
          </p>

          <div className="mt-8 border-t pt-5" style={{ borderColor: P.line }}>
            <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: P.muted }} aria-live="polite">
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: P.sage }} aria-hidden="true" />
              Choosing your first useful case…
            </div>
          </div>
        </section>

        <footer className="mt-16 flex items-center justify-between border-t pt-5 text-[11px]" style={{ borderColor: P.line, color: P.muted }}>
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
