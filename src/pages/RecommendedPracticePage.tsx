import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { GenerationLoadingScreen } from '@/components/practice/GenerationLoadingScreen';

const ApplePracticeSession = lazy(() => import('@/components/practice/ApplePracticeSession').then(m => ({ default: m.ApplePracticeSession })));

function RecommendedPracticeContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const startedRef = useRef(false);
  const [userDismissedLoading, setUserDismissedLoading] = useState(false);

  useEffect(() => {
    if (!user || startedRef.current || !concepts?.length) return;
    startedRef.current = true;
    startPractice({
      study_mode: 'smart',
      target_formats: ['ukmla_sba'],
      question_count: 10,
    });
  }, [user, concepts, startPractice]);

  const handleAnswerSubmit = (questionId: string, isCorrect: boolean) => {
    const question = practiceQuestions.find((q: any) => q.id === questionId);
    if (question?.concept_id) updateMastery(question.concept_id, isCorrect);
  };

  const handleComplete = () => {
    endPractice();
    navigate('/');
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-[#FAF5EC] px-5 py-10 text-[#2A1E16]">
        <div className="mx-auto max-w-md">
          <button onClick={() => navigate('/')} className="mb-8 text-sm text-[#8A7560]">← Back home</button>
          <div className="mb-6">
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#8A7560]">Recommended session</div>
            <h1 className="mt-3 text-4xl font-light tracking-[-0.03em]" style={{ fontFamily: "'Fraunces', serif" }}>
              Sign in so StudyEdit can learn from every answer.
            </h1>
          </div>
          <AuthForm />
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

  if (!concepts?.length && !isPracticing) {
    return <div className="h-screen w-screen bg-[#F4EFE8]" />;
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
          onComplete={handleComplete}
          onAnswerSubmit={handleAnswerSubmit}
          availableFilters={(filterOptions?.custom_filters as string[] | undefined) ?? []}
          section="UKMLA AKT"
          currentFormat="ukmla_sba"
          onAnotherFive={() => {
            setUserDismissedLoading(false);
            startPractice({ study_mode: 'smart', target_formats: ['ukmla_sba'], question_count: 5 });
          }}
        />
      </Suspense>
    );
  }

  return <div className="h-screen w-screen bg-[#F4EFE8]" />;
}

export function RecommendedPracticePage() {
  return (
    <ConceptStoreProvider curriculumId="default">
      <RecommendedPracticeContent />
    </ConceptStoreProvider>
  );
}
