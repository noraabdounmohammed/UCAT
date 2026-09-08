import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';
import { resolvePlannedConcepts } from '@/lib/sessionPlan';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';

function QuestionShell({ count }: { count: number }) {
  return (
    <main className="min-h-screen bg-[#F4ECDF] px-5 py-10 text-[#2A1E16]">
      <div className="mx-auto max-w-xl pt-16 sm:pt-24">
        <div className="text-[18px] font-extrabold tracking-[-0.03em] text-[#1F140C]">studyedit.</div>
        <div className="mt-8 flex items-center gap-3 text-[14px] font-semibold text-[#8A7560]" aria-live="polite">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#8FA379]" aria-hidden="true" />
          Getting {count} useful case{count === 1 ? '' : 's'} ready…
        </div>
        <p className="mt-3 max-w-md text-[13px] leading-6 text-[#8A7560]">
          The session will follow the spoiler-safe plan you just saw. Exact conditions stay hidden until each case begins.
        </p>
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

  const requestedCount = useMemo(() => {
    const raw = Number(searchParams.get('count') || (user ? 5 : 3));
    if (!Number.isFinite(raw)) return user ? 5 : 3;
    return Math.max(1, Math.min(20, Math.round(raw)));
  }, [searchParams, user]);
  const authOnly = searchParams.get('auth') === '1';

  const startRecommended = useCallback((count: number) => {
    if (!concepts?.length) return;
    const selected = resolvePlannedConcepts(concepts, count);
    setPracticeSelection(selected.map((concept: any) => concept.concept_id));
    startPractice({ study_mode: 'smart', target_formats: ['ukmla_sba'], question_count: count });
  }, [concepts, setPracticeSelection, startPractice]);

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
      <ApplePracticeSession
        questions={practiceQuestions}
        onComplete={handleComplete}
        onAnswerSubmit={handleAnswerSubmit}
        availableFilters={(filterOptions?.custom_filters as string[] | undefined) ?? []}
        section="UKMLA AKT"
        currentFormat="ukmla_sba"
        onAnotherFive={() => startRecommended(user ? 5 : 3)}
      />
    );
  }

  return <QuestionShell count={requestedCount} />;
}

export function RecommendedPracticePage() {
  const { user } = useAuth();
  const curriculumId = useMemo(() => {
    if (user?.id) migrateLegacyCurriculumState(user.id);
    return getUserCurriculumId(user?.id);
  }, [user?.id]);

  return <ConceptStoreProvider curriculumId={curriculumId}><RecommendedPracticeContent /></ConceptStoreProvider>;
}
