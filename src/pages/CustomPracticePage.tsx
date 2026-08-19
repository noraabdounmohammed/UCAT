import { lazy, Suspense, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { GenerationLoadingScreen } from '@/components/practice/GenerationLoadingScreen';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';
import type { FilterState } from '@/components/practice/PracticeFilterModalParchment';

const PracticeFilterModalParchment = lazy(() => import('@/components/practice/PracticeFilterModalParchment').then(m => ({ default: m.PracticeFilterModalParchment })));
const ApplePracticeSession = lazy(() => import('@/components/practice/ApplePracticeSession').then(m => ({ default: m.ApplePracticeSession })));

function CustomPracticeContent() {
  const navigate = useNavigate();
  const {
    concepts,
    isLoading,
    isPracticing,
    practiceQuestions,
    startPractice,
    endPractice,
    updateMastery,
    generatingQuestionCount,
    practiceError,
    filterOptions,
  } = useConceptStore() as any;

  const [showFilters, setShowFilters] = useState(true);
  const [userDismissedLoading, setUserDismissedLoading] = useState(false);

  const goHome = () => {
    if (isPracticing) endPractice();
    navigate('/');
  };

  const startCustomSession = (filters: FilterState) => {
    setShowFilters(false);
    setUserDismissedLoading(false);
    startPractice({
      study_mode: 'custom',
      target_formats: ['ukmla_sba'],
      question_count: filters.size,
    });
  };

  const handleAnswerSubmit = (questionId: string, isCorrect: boolean) => {
    const question = practiceQuestions.find((q: any) => q.id === questionId);
    if (question?.concept_id) updateMastery(question.concept_id, isCorrect);
  };

  if (practiceError) {
    return (
      <main className="min-h-screen bg-[#FAF5EC] px-5 py-10 text-[#2A1E16]">
        <div className="mx-auto max-w-lg rounded-3xl border border-[#E8DCC4] bg-[#FFFDF8] p-8">
          <div className="text-sm text-[#8A7560]">We couldn't start your session.</div>
          <p className="mt-2 text-lg">{practiceError}</p>
          <button onClick={goHome} className="mt-6 rounded-full bg-[#1F140C] px-5 py-3 text-sm text-white">Back home</button>
        </div>
      </main>
    );
  }

  if (showFilters && !isPracticing) {
    return (
      <Suspense fallback={<div className="h-screen w-screen bg-[#F4EFE8]" />}>
        <PracticeFilterModalParchment
          isOpen={true}
          onClose={goHome}
          onApplyFilters={startCustomSession}
        />
      </Suspense>
    );
  }

  if (isLoading || (isPracticing && !userDismissedLoading)) {
    return (
      <GenerationLoadingScreen
        conceptCount={Math.max(5, generatingQuestionCount || 10)}
        isReady={!isLoading && Array.isArray(practiceQuestions) && practiceQuestions.length > 0}
        concepts={concepts || []}
        allConcepts={concepts || []}
        practiceQuestions={practiceQuestions || []}
        onComplete={() => setUserDismissedLoading(true)}
      />
    );
  }

  if (isPracticing && practiceQuestions?.length > 0) {
    return (
      <Suspense fallback={<GenerationLoadingScreen conceptCount={practiceQuestions.length} />}>
        <ApplePracticeSession
          questions={practiceQuestions}
          onComplete={goHome}
          onAnswerSubmit={handleAnswerSubmit}
          availableFilters={(filterOptions?.custom_filters as string[] | undefined) ?? []}
          section="UKMLA AKT"
          currentFormat="ukmla_sba"
          onAnotherFive={() => {
            setUserDismissedLoading(false);
            startPractice({ study_mode: 'custom', target_formats: ['ukmla_sba'], question_count: 5 });
          }}
          onRestartWithFilters={() => {
            endPractice();
            setShowFilters(true);
            setUserDismissedLoading(false);
          }}
        />
      </Suspense>
    );
  }

  return <div className="h-screen w-screen bg-[#F4EFE8]" />;
}

export function CustomPracticePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const curriculumId = useMemo(() => {
    if (user?.id) migrateLegacyCurriculumState(user.id);
    return getUserCurriculumId(user?.id);
  }, [user?.id]);

  if (!user) {
    return (
      <main className="min-h-screen bg-[#FAF5EC] px-5 py-10 text-[#2A1E16]">
        <div className="mx-auto max-w-md">
          <button onClick={() => navigate('/')} className="mb-8 text-sm text-[#8A7560]">← Back home</button>
          <div className="mb-6">
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#8A7560]">Practise your way</div>
            <h1 className="mt-3 text-4xl font-light tracking-[-0.03em]" style={{ fontFamily: "'Fraunces', serif" }}>
              Sign in so your practice can shape what StudyEdit recommends next.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#8A7560]">
              Your answers update the same learner model used by Recommended Sessions on this device.
            </p>
          </div>
          <AuthForm />
        </div>
      </main>
    );
  }

  return (
    <ConceptStoreProvider curriculumId={curriculumId}>
      <CustomPracticeContent />
    </ConceptStoreProvider>
  );
}
