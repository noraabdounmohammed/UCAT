import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';
import { PracticeFilterModalParchment, type FilterState } from '@/components/practice/PracticeFilterModalParchment';
import { buildSpoilerSafeSessionPlan, rememberPlannedSession, resolvePlannedConcepts } from '@/lib/sessionPlan';
import { isEssentialConcept } from '@/utils/essentialCurriculum';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';

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

function QuestionShell() {
  return (
    <main className="min-h-screen bg-[#FAF5EC] px-5 py-5 text-[#2A1E16] sm:px-8 sm:py-8">
      <div className="mx-auto max-w-[720px]">
        <div className="text-[19px] font-extrabold tracking-[-0.03em] text-[#1F140C]">studyedit.</div>
        <div className="pt-14 sm:pt-20">
          <h1
            className="text-[42px] font-light leading-[1.04] tracking-[-0.04em] text-[#1F140C] sm:text-[52px]"
            style={{ fontFamily: "'Fraunces', Georgia, 'Times New Roman', serif" }}
          >
            Let’s start.
          </h1>
          <p
            className="mt-3 text-[20px] font-medium leading-8 text-[#49382B]"
            style={{ fontFamily: "'Fraunces', Georgia, 'Times New Roman', serif" }}
          >
            I’ll work out what you need as we go.
          </p>
          <div className="mt-8 border-t border-[#E8DCC4] pt-5">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[#8A7560]" aria-live="polite">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#8FA379]" aria-hidden="true" />
              Choosing your first useful case…
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function RecommendedPracticeContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { concepts, isPracticing, practiceQuestions, startPractice, endPractice, updateMastery, practiceError, filterOptions, setPracticeSelection } = useConceptStore() as any;
  const startedRef = useRef(false);
  const [showFilters, setShowFilters] = useState(false);

  const requestedCount = useMemo(() => {
    const raw = Number(searchParams.get('count') || (user ? 5 : 3));
    if (!Number.isFinite(raw)) return user ? 5 : 3;
    return Math.max(1, Math.min(20, Math.round(raw)));
  }, [searchParams, user]);
  const authOnly = searchParams.get('auth') === '1';

  const launchSelection = useCallback((selected: any[], count: number) => {
    if (!selected.length) return;
    setPracticeSelection(selected.map((concept: any) => concept.concept_id));
    startPractice({ study_mode: 'smart', target_formats: ['ukmla_sba'], question_count: count });
  }, [setPracticeSelection, startPractice]);

  const startRecommended = useCallback((count: number) => {
    if (!concepts?.length) return;
    const selected = resolvePlannedConcepts(concepts, count);
    launchSelection(selected, count);
  }, [concepts, launchSelection]);

  const startFreshRecommended = useCallback((count: number) => {
    if (!concepts?.length) return;
    const plan = buildSpoilerSafeSessionPlan(concepts, count);
    rememberPlannedSession(plan);
    launchSelection(plan.selected, Math.max(1, plan.count || count));
  }, [concepts, launchSelection]);

  const startFilteredSession = useCallback((filters: FilterState) => {
    const matchingConcepts = (concepts || []).filter((concept: any) => {
      if (filters.essentialsOnly && !isEssentialConcept(concept)) return false;
      if (!conceptMatchesLearningStatus(concept, filters.statuses)) return false;
      if (!conceptMatchesFilterTags(concept, filters.areas)) return false;
      if (!conceptMatchesFilterTags(concept, filters.conditions)) return false;
      if (!conceptMatchesFilterTags(concept, filters.presentations)) return false;
      if (!conceptMatchesFilterTags(concept, filters.facets)) return false;
      return true;
    });

    const count = Math.max(1, filters.size || requestedCount);
    const plan = buildSpoilerSafeSessionPlan(matchingConcepts, count);
    if (!plan.count) return;

    rememberPlannedSession(plan);
    setShowFilters(false);
    endPractice();
    launchSelection(plan.selected, Math.max(1, plan.count));
  }, [concepts, endPractice, launchSelection, requestedCount]);

  useEffect(() => {
    if (startedRef.current || !concepts?.length) return;
    if (authOnly && !user) return;
    startedRef.current = true;
    startRecommended(requestedCount);
  }, [authOnly, concepts, requestedCount, startRecommended, user]);

  const handleAnswerSubmit = (questionId: string, isCorrect: boolean) => {
    const question = practiceQuestions.find((item: any) => item.id === questionId);
    if (question?.concept_id) updateMastery(question.concept_id, isCorrect);
  };

  const handleComplete = () => {
    endPractice();
    navigate('/');
  };

  if (authOnly && !user) {
    return (
      <main className="min-h-screen bg-[#FAF5EC] px-5 py-10 text-[#2A1E16]">
        <div className="mx-auto max-w-md pt-8 sm:pt-14">
          <button onClick={() => navigate('/')} className="mb-10 text-[13px] font-semibold text-[#8A7560]">← Back</button>
          <div className="text-[18px] font-extrabold tracking-[-0.03em] text-[#1F140C]">studyedit.</div>
          <h1 className="mt-8 text-[34px] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#1F140C]">Pick up where you left off.</h1>
          <p className="mt-4 text-[15px] leading-6 text-[#8A7560]">Sign in so StudyEdit can use the learning history attached to your account.</p>
          <div className="mt-7"><AuthForm /></div>
        </div>
      </main>
    );
  }

  if (practiceError) {
    return (
      <main className="min-h-screen bg-[#FAF5EC] px-5 py-10 text-[#2A1E16]">
        <div className="mx-auto max-w-lg rounded-3xl border border-[#E8DCC4] bg-[#FFFDF8] p-8">
          <div className="text-sm text-[#8A7560]">We couldn't start your session.</div>
          <p className="mt-2 text-lg">{practiceError}</p>
          <button onClick={() => navigate('/')} className="mt-6 rounded-full bg-[#1F140C] px-5 py-3 text-sm text-white">Back home</button>
        </div>
      </main>
    );
  }

  if (isPracticing && practiceQuestions?.length > 0) {
    return (
      <>
        <ApplePracticeSession
          questions={practiceQuestions}
          onComplete={handleComplete}
          onAnswerSubmit={handleAnswerSubmit}
          availableFilters={(filterOptions?.custom_filters as string[] | undefined) ?? []}
          section="UKMLA AKT"
          currentFormat="ukmla_sba"
          onAnotherFive={() => startFreshRecommended(user ? 5 : 3)}
          onRestartWithFilters={() => setShowFilters(true)}
        />

        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="fixed bottom-5 right-5 z-40 rounded-full border border-[#DCCDB8] bg-[#FAF5EC]/95 px-4 py-2.5 text-[11px] font-semibold text-[#8A7560] shadow-[0_8px_28px_rgba(31,20,12,0.08)] backdrop-blur-md transition hover:text-[#1F140C] sm:bottom-7 sm:right-7"
        >
          Change what we’re working on
        </button>

        <PracticeFilterModalParchment
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          onApplyFilters={startFilteredSession}
        />
      </>
    );
  }

  return <QuestionShell />;
}

export function RecommendedPracticePage() {
  const { user } = useAuth();
  const curriculumId = useMemo(() => {
    if (user?.id) migrateLegacyCurriculumState(user.id);
    return getUserCurriculumId(user?.id);
  }, [user?.id]);

  return <ConceptStoreProvider curriculumId={curriculumId}><RecommendedPracticeContent /></ConceptStoreProvider>;
}
