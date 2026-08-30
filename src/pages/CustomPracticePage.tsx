import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';
import { PracticeModeFilterFlow, type PracticeModeFilterState, type PracticeStudyMode } from '@/components/practice/PracticeModeFilterFlow';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';

function PreparingSessionCard({ title = 'Getting your questions ready' }: { title?: string }) {
  return (
    <main className="min-h-screen bg-[#FAF5EC] px-5 py-10 text-[#2A1E16]">
      <div className="mx-auto max-w-2xl pt-10">
        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#8A7560]">StudyEdit</div>
        <h1 className="mt-3 text-4xl font-light tracking-[-0.03em]" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h1>
        <div className="mt-8 rounded-[28px] border border-[#E8DCC4] bg-[#FFFDF8] p-7">
          <div className="h-3 w-24 rounded-full bg-[#F1E7D8]" />
          <div className="mt-6 h-6 w-5/6 rounded-full bg-[#EDE1CF]" />
          <div className="mt-3 h-6 w-3/5 rounded-full bg-[#EDE1CF]" />
          <div className="mt-8 grid gap-3">
            <div className="h-12 rounded-2xl border border-[#E8DCC4] bg-[#FFFDF8]" />
            <div className="h-12 rounded-2xl border border-[#E8DCC4] bg-[#FFFDF8]" />
            <div className="h-12 rounded-2xl border border-[#E8DCC4] bg-[#FFFDF8]" />
          </div>
        </div>
        <p className="mt-4 text-sm text-[#8A7560]">We’ll put the first question here as soon as it’s ready.</p>
      </div>
    </main>
  );
}

function CustomPracticeContent() {
  const navigate = useNavigate();
  const {
    isLoading,
    isPracticing,
    practiceQuestions,
    startPractice,
    endPractice,
    updateMastery,
    practiceError,
    filterOptions,
  } = useConceptStore() as any;

  const [showFilters, setShowFilters] = useState(true);
  const [activeStudyMode, setActiveStudyMode] = useState<PracticeStudyMode>('questions');
  const beginningSessionRef = useRef(false);

  const goHome = () => {
    if (isPracticing) endPractice();
    navigate('/');
  };

  const handleFilterClose = () => {
    if (beginningSessionRef.current) {
      beginningSessionRef.current = false;
      return;
    }
    goHome();
  };

  const startCustomSession = (filters: PracticeModeFilterState) => {
    beginningSessionRef.current = true;
    setActiveStudyMode('questions');
    setShowFilters(false);
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
          <button onClick={() => { endPractice(); setShowFilters(true); }} className="mt-6 rounded-full bg-[#1F140C] px-5 py-3 text-sm text-white">Choose another session</button>
        </div>
      </main>
    );
  }

  if (showFilters && !isPracticing) {
    return <PracticeModeFilterFlow isOpen={true} onClose={handleFilterClose} onApplyFilters={startCustomSession} />;
  }

  if (isPracticing && practiceQuestions?.length > 0) {
    return (
      <ApplePracticeSession
        questions={practiceQuestions}
        onComplete={goHome}
        onAnswerSubmit={handleAnswerSubmit}
        availableFilters={(filterOptions?.custom_filters as string[] | undefined) ?? []}
        section="UKMLA AKT"
        defaultFormat="ukmla_sba"
        currentFormat="ukmla_sba"
        onAnotherFive={() => startPractice({ study_mode: 'custom', target_formats: ['ukmla_sba'], question_count: 5 })}
        onRestartWithFilters={() => {
          endPractice();
          beginningSessionRef.current = false;
          setShowFilters(true);
        }}
      />
    );
  }

  if (isLoading || isPracticing) return <PreparingSessionCard />;
  return <PreparingSessionCard />;
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
            <h1 className="mt-3 text-4xl font-light tracking-[-0.03em]" style={{ fontFamily: "'Fraunces', serif" }}>Sign in so your answers can shape what comes next.</h1>
            <p className="mt-3 text-sm leading-6 text-[#8A7560]">Your practice updates the same learner map StudyEdit uses to recommend future questions.</p>
          </div>
          <AuthForm />
        </div>
      </main>
    );
  }

  return <ConceptStoreProvider curriculumId={curriculumId}><CustomPracticeContent /></ConceptStoreProvider>;
}
