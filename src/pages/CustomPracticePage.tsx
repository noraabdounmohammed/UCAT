import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';
import type { FilterState } from '@/components/practice/PracticeFilterModalParchment';

const PracticeFilterModalParchment = lazy(() => import('@/components/practice/PracticeFilterModalParchment').then(m => ({ default: m.PracticeFilterModalParchment })));
const ApplePracticeSession = lazy(() => import('@/components/practice/ApplePracticeSession').then(m => ({ default: m.ApplePracticeSession })));
const StoryPracticeSession = lazy(() => import('@/components/learn/StoryPracticeSession').then(m => ({ default: m.StoryPracticeSession })));

type SessionFormat = 'questions' | 'story';

function QuietPreparingState({ label = 'Preparing your questions…' }: { label?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF5EC] px-6 text-[#2A1E16]">
      <div className="text-center">
        <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-[#D9CCB6] border-t-[#1F140C]" />
        <p className="mt-4 text-sm text-[#8A7560]">{label}</p>
      </div>
    </main>
  );
}

function FormatChoice({ onChoose, onBack }: { onChoose: (format: SessionFormat) => void; onBack: () => void }) {
  return (
    <main className="min-h-screen bg-[#FAF5EC] px-5 pb-10 pt-[calc(env(safe-area-inset-top)+22px)] text-[#2A1E16]">
      <div className="mx-auto max-w-lg">
        <button onClick={onBack} className="text-sm text-[#8A7560]">← Back home</button>
        <div className="mt-10 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7560]">Practise your way</div>
        <h1 className="mt-3 text-[38px] font-light leading-[1.03] tracking-[-0.035em]" style={{ fontFamily: "'Fraunces', serif" }}>
          How do you want to <em className="text-[#E5A89D]">learn?</em>
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#8A7560]">Choose the experience first. The same curriculum filters and learner model shape what comes next.</p>

        <div className="mt-8 space-y-3">
          <button onClick={() => onChoose('questions')} className="w-full rounded-[24px] border border-[#D9CCB6] bg-[#FFFDF8] p-5 text-left transition active:scale-[0.995]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Questions</div>
                <p className="mt-1 text-xs leading-5 text-[#8A7560]">Apply what you know in clinical SBAs. Independent answers contribute to mastery.</p>
              </div>
              <span className="mt-1 text-[#E5A89D]">→</span>
            </div>
          </button>

          <button onClick={() => onChoose('story')} className="w-full rounded-[24px] border border-[#1F140C] bg-[#1F140C] p-5 text-left text-[#FAF5EC] shadow-[0_12px_28px_rgba(31,20,12,.12)] transition active:scale-[0.995]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2"><span className="text-lg font-semibold">Story</span><span className="rounded-full bg-[#F2C9C1] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#1F140C]">Pilot</span></div>
                <p className="mt-1 text-xs leading-5 text-[#DCCFC0]">Learn through a patient journey: predict, decide, get taught, then see the consequence.</p>
              </div>
              <span className="mt-1 text-[#F2C9C1]">→</span>
            </div>
          </button>
        </div>

        <div className="mt-6 rounded-[18px] bg-[#F4ECDF] p-4 text-xs leading-5 text-[#8A7560]">
          Story sessions teach and retrieve concepts without marking them mastered. Questions remain the proof that you can apply them independently.
        </div>
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

  const [sessionFormat, setSessionFormat] = useState<SessionFormat | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [storyFilters, setStoryFilters] = useState<FilterState | null>(null);
  const beginningSessionRef = useRef(false);

  const goHome = () => {
    if (isPracticing) endPractice();
    navigate('/');
  };

  const chooseFormat = (format: SessionFormat) => {
    setSessionFormat(format);
    setStoryFilters(null);
    setShowFilters(true);
  };

  const handleFilterClose = () => {
    if (beginningSessionRef.current) {
      beginningSessionRef.current = false;
      return;
    }
    setShowFilters(false);
    setSessionFormat(null);
  };

  const startCustomSession = (filters: FilterState) => {
    beginningSessionRef.current = true;
    setShowFilters(false);

    if (sessionFormat === 'story') {
      setStoryFilters(filters);
      return;
    }

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

  if (!sessionFormat && !isPracticing && !storyFilters) {
    return <FormatChoice onChoose={chooseFormat} onBack={goHome} />;
  }

  // Do not render a half-populated filter sheet. Wait until the concept store has
  // finished hydrating, then reveal the complete specialty / condition /
  // presentation hierarchy in one paint.
  if (showFilters && !isPracticing) {
    if (isLoading) return <QuietPreparingState label="Preparing your curriculum…" />;
    return (
      <Suspense fallback={<QuietPreparingState label="Preparing your curriculum…" />}>
        <PracticeFilterModalParchment
          isOpen={true}
          onClose={handleFilterClose}
          onApplyFilters={startCustomSession}
        />
      </Suspense>
    );
  }

  if (sessionFormat === 'story' && storyFilters) {
    return (
      <Suspense fallback={<QuietPreparingState label="Preparing your story…" />}>
        <StoryPracticeSession
          filters={storyFilters}
          onComplete={goHome}
          onRestartWithFilters={() => {
            setStoryFilters(null);
            beginningSessionRef.current = false;
            setShowFilters(true);
          }}
        />
      </Suspense>
    );
  }

  if (isPracticing && practiceQuestions?.length > 0) {
    return (
      <Suspense fallback={<QuietPreparingState />}>
        <ApplePracticeSession
          questions={practiceQuestions}
          onComplete={goHome}
          onAnswerSubmit={handleAnswerSubmit}
          availableFilters={(filterOptions?.custom_filters as string[] | undefined) ?? []}
          section="UKMLA AKT"
          currentFormat="ukmla_sba"
          onAnotherFive={() => {
            startPractice({ study_mode: 'custom', target_formats: ['ukmla_sba'], question_count: 5 });
          }}
          onRestartWithFilters={() => {
            endPractice();
            beginningSessionRef.current = false;
            setShowFilters(true);
          }}
        />
      </Suspense>
    );
  }

  if (isLoading || isPracticing) return <QuietPreparingState />;

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
