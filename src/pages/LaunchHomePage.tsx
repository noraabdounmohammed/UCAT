import React, { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { PracticeFilterModalParchment, type FilterState } from '@/components/practice/PracticeFilterModalParchment';
import { getDaypartGreeting, getLearnerFirstName } from '@/lib/learnerIdentity';
import { buildSpoilerSafeSessionPlan, rememberPlannedSession } from '@/lib/sessionPlan';
import { isEssentialConcept } from '@/utils/essentialCurriculum';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';

const P = {
  cream: '#FAF5EC',
  paper: '#FFFDF8',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#E8DCC4',
};

const selectedFilterValues = (values: string[] | undefined) => (values || []).filter(value => value && value !== 'any');

function conceptMatchesFilterTags(concept: any, values: string[] | undefined) {
  const selected = selectedFilterValues(values);
  if (!selected.length) return true;
  const tags = concept?.custom_filters || [];
  return selected.some(value => tags.includes(value));
}

function conceptMatchesLearningStatus(concept: any, statuses: string[] | undefined) {
  const selected = selectedFilterValues(statuses);
  if (!selected.length) return true;
  const md = concept?.mastery_data || {};
  return selected.some(status =>
    (status === 'mastered' && Number(md.mastery_level || 0) === 2) ||
    (status === 'weak' && Number(md.mastery_level || 0) === 1) ||
    (status === 'cold' && !Number(md.attempts || 0) && !Number(md.mastery_level || 0)) ||
    (status === 'drifting' && Number(md.attempts || 0) > 0 && !Number(md.mastery_level || 0))
  );
}

function HomeContent() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { concepts } = useConceptStore() as any;
  const [showFilters, setShowFilters] = useState(false);

  const hasEvidence = useMemo(
    () => (concepts || []).some((concept: any) => Number(concept.mastery_data?.attempts || 0) > 0),
    [concepts],
  );
  const learnerName = useMemo(() => getLearnerFirstName(user), [user]);
  const greeting = useMemo(() => getDaypartGreeting(), []);

  const startFilteredSession = (filters: FilterState) => {
    const matchingConcepts = (concepts || []).filter((concept: any) => {
      if (filters.essentialsOnly && !isEssentialConcept(concept)) return false;
      if (!conceptMatchesLearningStatus(concept, filters.statuses)) return false;
      if (!conceptMatchesFilterTags(concept, filters.areas)) return false;
      if (!conceptMatchesFilterTags(concept, filters.conditions)) return false;
      if (!conceptMatchesFilterTags(concept, filters.presentations)) return false;
      if (!conceptMatchesFilterTags(concept, filters.facets)) return false;
      return true;
    });

    const count = Math.max(1, filters.size || 10);
    const plan = buildSpoilerSafeSessionPlan(matchingConcepts, count);
    if (plan.count === 0) return;

    rememberPlannedSession(plan);
    try {
      sessionStorage.setItem('studyedit_current_journey_v1', hasEvidence ? 'returning' : 'cold');
    } catch {
      // Starting a session must not depend on storage access.
    }
    navigate(`/recommended-practice?count=${Math.max(1, plan.count)}`);
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
            What do you want to work on?
          </h1>
          <p className="mt-5 max-w-[610px] text-[16px] font-medium leading-7" style={{ color: '#4A392C' }}>
            Choose your clinical area, learning status, focus and session size. StudyEdit will build the session from the UKMLA curriculum.
          </p>

          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="mt-8 flex w-full items-center justify-between rounded-[20px] border px-5 py-5 text-left shadow-[0_10px_28px_rgba(31,20,12,0.05)] transition active:scale-[0.995] sm:max-w-[520px]"
            style={{ borderColor: '#DCCDB8', backgroundColor: P.paper, color: P.espresso }}
          >
            <span>
              <span className="block text-[16px] font-extrabold">Choose what to practise</span>
              <span className="mt-1 block text-[12px] font-medium leading-5" style={{ color: P.muted }}>
                Browse the available filters and start when the scope looks right.
              </span>
            </span>
            <span className="ml-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: P.espresso, color: P.cream }}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            </span>
          </button>

          {!user && <div className="mt-4 text-[12px] font-medium" style={{ color: P.muted }}>No account needed to start.</div>}
        </section>

        <footer className="mt-14 flex items-center justify-between border-t pt-5 text-[11px]" style={{ borderColor: P.line, color: P.muted }}>
          <button onClick={() => navigate('/privacy')}>Privacy</button>
          <span>UKMLA AKT</span>
        </footer>
      </div>

      <PracticeFilterModalParchment
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={startFilteredSession}
      />
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
