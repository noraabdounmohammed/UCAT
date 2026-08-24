import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';
import type { FilterState } from '@/components/practice/PracticeFilterModalParchment';

const PracticeFilterModalParchment = lazy(() => import('@/components/practice/PracticeFilterModalParchment').then(m => ({ default: m.PracticeFilterModalParchment })));
const ApplePracticeSession = lazy(() => import('@/components/practice/ApplePracticeSession').then(m => ({ default: m.ApplePracticeSession })));

function QuietPreparingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF5EC] px-6 text-[#2A1E16]">
      <div className="text-center">
        <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-[#D9CCB6] border-t-[#1F140C]" />
        <p className="mt-4 text-sm text-[#8A7560]">Preparing your questions…</p>
      </div>
    </main>
  );
}

function PracticeBuilderLoadingState() {
  const section = (label: string, control: React.ReactNode) => (
    <section className="border-t py-5" style={{ borderColor: '#E8DCC4' }}>
      <div className="mb-3 text-[19px] italic" style={{ fontFamily: "'Fraunces', serif", color: '#8A7560' }}>{label}</div>
      {control}
    </section>
  );

  const chip = (width: string) => (
    <div className={`h-10 ${width} animate-pulse rounded-full border`} style={{ borderColor: '#D9CCB6', backgroundColor: 'rgba(255,253,248,.72)' }} />
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center md:p-5" style={{ backgroundColor: 'rgba(31,20,12,0.24)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
      <div className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-[30px] border-t shadow-[0_-18px_60px_rgba(31,20,12,0.16)] md:h-auto md:max-h-[90vh] md:max-w-[470px] md:rounded-[30px] md:border" style={{ backgroundColor: '#FAF5EC', borderColor: 'rgba(217,204,182,.8)' }}>
        <div className="shrink-0 px-6 pb-4 pt-4 md:pt-6">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D9CCB6] md:hidden" />
          <h1 className="text-[31px] leading-[1.03] tracking-[-0.035em]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, color: '#2A1E16' }}>
            Practise <em style={{ color: '#E5A89D' }}>your way</em>
          </h1>
          <p className="mt-2 text-[13px] leading-5" style={{ color: '#8A7560' }}>Build a focused session in seconds.</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-5">
          {section('A session of', (
            <div className="flex items-center justify-between gap-4">
              <div className="h-12 w-44 rounded-full border" style={{ borderColor: '#D9CCB6', backgroundColor: 'rgba(244,236,223,.72)' }} />
              <div className="h-5 w-16 animate-pulse rounded-full" style={{ backgroundColor: '#E8DCC4' }} />
            </div>
          ))}

          {section('that are', (
            <div className="flex flex-wrap gap-2">
              {chip('w-24')}{chip('w-28')}{chip('w-24')}{chip('w-28')}{chip('w-20')}
            </div>
          ))}

          {section('in specialty', (
            <div className="flex h-14 w-full items-center justify-between rounded-[16px] border px-4" style={{ borderColor: '#D9CCB6', backgroundColor: 'rgba(255,253,248,.52)' }}>
              <span className="text-[15px] italic" style={{ fontFamily: "'Fraunces', serif", color: '#E5A89D' }}>Loading specialties…</span>
              <div className="h-4 w-4 animate-pulse rounded" style={{ backgroundColor: '#E8DCC4' }} />
            </div>
          ))}

          {section('with condition', (
            <>
              <div className="mb-3 h-11 w-full animate-pulse rounded-full border" style={{ borderColor: '#D9CCB6', backgroundColor: 'rgba(244,236,223,.62)' }} />
              <div className="flex flex-wrap gap-2">{chip('w-28')}{chip('w-24')}{chip('w-32')}{chip('w-20')}</div>
            </>
          ))}

          {section('presenting as', (
            <>
              <div className="mb-3 h-11 w-full animate-pulse rounded-full border" style={{ borderColor: '#D9CCB6', backgroundColor: 'rgba(244,236,223,.62)' }} />
              <div className="flex flex-wrap gap-2">{chip('w-24')}{chip('w-32')}{chip('w-28')}{chip('w-20')}</div>
            </>
          ))}

          {section('about', (
            <div className="flex flex-wrap gap-2">{chip('w-24')}{chip('w-28')}{chip('w-20')}{chip('w-24')}</div>
          ))}
        </div>

        <div className="shrink-0 border-t px-6 py-4" style={{ borderColor: '#E8DCC4', backgroundColor: '#FAF5EC' }}>
          <div className="h-12 w-full animate-pulse rounded-full" style={{ backgroundColor: '#1F140C', opacity: 0.18 }} />
          <p className="mt-2 text-center text-[11px]" style={{ color: '#8A7560' }}>Loading your curriculum filters…</p>
        </div>
      </div>
    </div>
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

  const startCustomSession = (filters: FilterState) => {
    beginningSessionRef.current = true;
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
          <button onClick={goHome} className="mt-6 rounded-full bg-[#1F140C] px-5 py-3 text-sm text-white">Back home</button>
        </div>
      </main>
    );
  }

  if (showFilters && !isPracticing) {
    if (isLoading) return <PracticeBuilderLoadingState />;
    return (
      <Suspense fallback={<PracticeBuilderLoadingState />}>
        <PracticeFilterModalParchment
          isOpen={true}
          onClose={handleFilterClose}
          onApplyFilters={startCustomSession}
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
