import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';
import { PracticeModeFilterFlow, type PracticeModeFilterState } from '@/components/practice/PracticeModeFilterFlow';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';

const P = {
  parchment: '#F4ECDF',
  cream: '#FAF5EC',
  paper: '#FFFDF8',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#E8DCC4',
  blush: '#E5A89D',
  blushSoft: '#F9E4DF',
};

function deterministicJitter(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 1000) / 1000;
}

function conceptPriority(concept: any, now = Date.now()) {
  const md = concept?.mastery_data || {};
  const attempts = Number(md.attempts || 0);
  const incorrect = Number(md.incorrect || 0);
  const lapses = Number(md.fsrs_lapses || 0);
  const masteryLevel = Number(md.mastery_level || 0);
  const dueAt = md.fsrs_due_at ? new Date(md.fsrs_due_at).getTime() : null;
  const isDue = dueAt !== null && Number.isFinite(dueAt) && dueAt <= now;
  const overdueDays = isDue && dueAt !== null ? Math.max(0, (now - dueAt) / 86_400_000) : 0;
  const importance = concept?.importance || {};
  const examWeight = Number(importance.exam_weight ?? concept?.exam_weight ?? 0);

  return (
    (attempts === 0 ? 0.46 : 0) +
    (attempts > 0 ? ((incorrect + 1) / (attempts + 2)) * 0.42 : 0) +
    (masteryLevel === 1 ? 0.16 : 0) +
    (isDue ? 0.22 + Math.min(overdueDays / 60, 0.12) : 0) +
    Math.min(lapses * 0.025, 0.1) +
    (attempts === 0 ? 0.08 : 0.08 / Math.sqrt(attempts + 1)) +
    (Number.isFinite(examWeight) && examWeight > 0 ? Math.min(examWeight, 5) * 0.025 : 0) +
    (importance.safety_critical === true || concept?.safety_critical === true ? 0.14 : 0) +
    (importance.core === true || concept?.core === true ? 0.07 : 0) +
    deterministicJitter(String(concept?.concept_id || concept?.title || '')) * 0.015
  );
}

function chooseRecommendedConcepts(concepts: any[], count: number) {
  return [...concepts]
    .map(concept => ({ concept, score: conceptPriority(concept) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(count, concepts.length))
    .map(item => item.concept);
}

function TutorLoading() {
  return (
    <main className="min-h-screen px-6" style={{ backgroundColor: P.parchment, color: P.ink }}>
      <div className="mx-auto flex min-h-screen max-w-[660px] flex-col justify-center py-16">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: P.muted }}>StudyEdit Tutor</div>
        <h1 className="mt-4 text-[38px] font-light leading-[1.08] tracking-[-0.035em] sm:text-[46px]" style={{ fontFamily: "'Fraunces', serif", color: P.espresso }}>
          I’m choosing a useful first question.
        </h1>
        <div className="mt-6 flex items-center gap-2 text-sm" style={{ color: P.muted }}>
          <span>One moment</span>
          <span className="inline-flex gap-1" aria-hidden="true"><span className="animate-pulse">•</span><span className="animate-pulse [animation-delay:180ms]">•</span><span className="animate-pulse [animation-delay:360ms]">•</span></span>
        </div>
      </div>
    </main>
  );
}

function TutorHomeContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const {
    concepts,
    isLoading,
    isPracticing,
    practiceQuestions,
    startPractice,
    endPractice,
    updateMastery,
    practiceError,
    filterOptions,
    setPracticeSelection,
  } = useConceptStore() as any;

  const [showFilters, setShowFilters] = useState(searchParams.get('choose') === '1');
  const beginningSessionRef = useRef(false);

  const preparation = useMemo(() => {
    const all = concepts || [];
    const now = Date.now();
    const attempted = all.filter((c: any) => (c.mastery_data?.attempts || 0) > 0);
    const due = all.filter((c: any) => c.mastery_data?.fsrs_due_at && new Date(c.mastery_data.fsrs_due_at).getTime() <= now);
    const weak = all.filter((c: any) => c.mastery_data?.mastery_level === 1);
    const unseen = all.filter((c: any) => (c.mastery_data?.attempts || 0) === 0);
    return { hasEvidence: attempted.length > 0, dueCount: due.length, weakCount: weak.length, unseenCount: unseen.length };
  }, [concepts]);

  const clearChooseParam = () => setSearchParams({}, { replace: true });

  const startRecommended = useCallback((count = 5) => {
    if (!concepts?.length) return;
    const selected = chooseRecommendedConcepts(concepts, count);
    setPracticeSelection(selected.map((concept: any) => concept.concept_id));
    setShowFilters(false);
    clearChooseParam();
    startPractice({ study_mode: 'smart', target_formats: ['ukmla_sba'], question_count: count });
  }, [concepts, setPracticeSelection, startPractice]);

  const openFilters = () => {
    beginningSessionRef.current = false;
    setShowFilters(true);
    setSearchParams({ choose: '1' }, { replace: true });
  };

  const closeFilters = () => {
    if (beginningSessionRef.current) {
      beginningSessionRef.current = false;
      return;
    }
    setShowFilters(false);
    clearChooseParam();
  };

  const startCustomSession = (_filters: PracticeModeFilterState) => {
    beginningSessionRef.current = true;
    setShowFilters(false);
    clearChooseParam();
    startPractice({ study_mode: 'custom', target_formats: ['ukmla_sba'], question_count: 5 });
  };

  const returnToTutor = () => {
    if (isPracticing) endPractice();
    setShowFilters(false);
    clearChooseParam();
  };

  const handleAnswerSubmit = (questionId: string, isCorrect: boolean) => {
    const question = practiceQuestions.find((q: any) => q.id === questionId);
    if (question?.concept_id) updateMastery(question.concept_id, isCorrect);
  };

  if (!user) {
    return (
      <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12" style={{ backgroundColor: P.parchment, color: P.ink }}>
        <div className="mx-auto max-w-[620px]">
          <header className="flex items-center justify-between">
            <div className="text-[24px] tracking-[-0.04em]" style={{ fontFamily: "'Fraunces', serif", color: P.espresso }}>studyedit<span style={{ color: P.blush }}>.</span></div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: P.muted }}>UKMLA · early access</span>
          </header>

          <section className="pb-10 pt-16 sm:pt-24">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: '#9C655D' }}>Your UKMLA tutor</div>
            <h1 className="mt-4 text-[43px] font-light leading-[1.04] tracking-[-0.045em] sm:text-[56px]" style={{ fontFamily: "'Fraunces', serif", color: P.espresso }}>
              Learn by answering. Ask whenever you’re curious.
            </h1>
            <p className="mt-5 max-w-[540px] text-[16px] leading-7" style={{ color: P.muted }}>
              StudyEdit watches how you answer, teaches the exact gap when you need it, and chooses what to check next. No dashboard to learn first.
            </p>
          </section>

          <section className="rounded-[26px] border p-5 sm:p-7" style={{ borderColor: P.line, backgroundColor: 'rgba(255,253,248,.72)' }}>
            <div className="mb-5 text-[13px] font-semibold" style={{ color: P.espresso }}>Sign in to start your tutor session</div>
            <AuthForm />
          </section>

          <footer className="mt-8 pb-6 text-xs" style={{ color: P.muted }}><button onClick={() => navigate('/privacy')}>Privacy</button></footer>
        </div>
      </main>
    );
  }

  if (practiceError) {
    return (
      <main className="min-h-screen px-5 py-10" style={{ backgroundColor: P.parchment, color: P.ink }}>
        <div className="mx-auto max-w-[620px] pt-16">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: P.muted }}>StudyEdit Tutor</div>
          <h1 className="mt-3 text-4xl font-light tracking-[-0.035em]" style={{ fontFamily: "'Fraunces', serif", color: P.espresso }}>That session didn’t start properly.</h1>
          <p className="mt-4 text-sm leading-6" style={{ color: P.muted }}>{practiceError}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => { endPractice(); startRecommended(5); }} className="rounded-full px-5 py-3 text-sm font-semibold" style={{ backgroundColor: P.espresso, color: P.cream }}>Try again</button>
            <button onClick={() => { endPractice(); openFilters(); }} className="rounded-full border px-5 py-3 text-sm font-semibold" style={{ borderColor: P.line, color: P.espresso }}>Choose a focus</button>
          </div>
        </div>
      </main>
    );
  }

  if (showFilters && !isPracticing) {
    return <PracticeModeFilterFlow isOpen={true} onClose={closeFilters} onApplyFilters={startCustomSession} />;
  }

  if (isPracticing && practiceQuestions?.length > 0) {
    return (
      <ApplePracticeSession
        questions={practiceQuestions}
        onComplete={returnToTutor}
        onAnswerSubmit={handleAnswerSubmit}
        availableFilters={(filterOptions?.custom_filters as string[] | undefined) ?? []}
        section="UKMLA AKT"
        defaultFormat="ukmla_sba"
        currentFormat="ukmla_sba"
        onAnotherFive={() => startRecommended(5)}
        onRestartWithFilters={() => {
          endPractice();
          openFilters();
        }}
      />
    );
  }

  if (isLoading || isPracticing) return <TutorLoading />;

  const tutorLine = !preparation.hasEvidence
    ? 'Let’s find your starting point.'
    : preparation.weakCount > 0
      ? 'I’d start with what has been giving you trouble.'
      : preparation.dueCount > 0
        ? 'I’d start with what is due for another look.'
        : 'Ready? I’ll choose the next useful five.';

  const tutorDetail = !preparation.hasEvidence
    ? 'I’ll begin with five mixed UKMLA questions. I’ll stay quiet when you know it, teach when you need me, and you can interrupt with a question at any point.'
    : 'I’ll use what I’ve already seen from you to choose the next questions, then adapt inside the session rather than making you manage a study dashboard.';

  return (
    <main className="min-h-screen px-5 sm:px-8" style={{ backgroundColor: P.parchment, color: P.ink }}>
      <div className="mx-auto flex min-h-screen max-w-[660px] flex-col">
        <header className="flex items-center justify-between py-7">
          <div className="text-[24px] tracking-[-0.04em]" style={{ fontFamily: "'Fraunces', serif", color: P.espresso }}>studyedit<span style={{ color: P.blush }}>.</span></div>
          <button onClick={() => void signOut()} className="text-[11px] font-medium" style={{ color: P.muted }}>Sign out</button>
        </header>

        <section className="flex flex-1 flex-col justify-center pb-20 pt-8 sm:pb-28">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: '#9C655D' }}>StudyEdit Tutor · UKMLA</div>
          <h1 className="mt-4 text-[43px] font-light leading-[1.04] tracking-[-0.045em] sm:text-[56px]" style={{ fontFamily: "'Fraunces', serif", color: P.espresso }}>
            {tutorLine}
          </h1>
          <p className="mt-5 max-w-[580px] text-[16px] leading-7 sm:text-[17px]" style={{ color: P.muted }}>{tutorDetail}</p>

          {preparation.hasEvidence && (preparation.weakCount > 0 || preparation.dueCount > 0 || preparation.unseenCount > 0) && (
            <div className="mt-7 flex flex-wrap gap-2 text-[11px]" style={{ color: '#6F5847' }}>
              {preparation.weakCount > 0 && <span className="rounded-full border px-3 py-1.5" style={{ borderColor: '#D8C7AE', backgroundColor: 'rgba(255,253,248,.55)' }}>{preparation.weakCount} need another pass</span>}
              {preparation.dueCount > 0 && <span className="rounded-full border px-3 py-1.5" style={{ borderColor: '#D8C7AE', backgroundColor: 'rgba(255,253,248,.55)' }}>{preparation.dueCount} due</span>}
              {preparation.unseenCount > 0 && <span className="rounded-full border px-3 py-1.5" style={{ borderColor: '#D8C7AE', backgroundColor: 'rgba(255,253,248,.55)' }}>{preparation.unseenCount} not yet tested</span>}
            </div>
          )}

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => startRecommended(5)}
              disabled={!concepts?.length}
              className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-[17px] text-[15px] font-semibold transition active:scale-[0.99] disabled:opacity-40"
              style={{ backgroundColor: P.espresso, color: P.cream }}
            >
              Start with me <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={openFilters}
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold"
              style={{ color: '#76564B' }}
            >
              <SlidersHorizontal className="h-4 w-4" /> I want to choose
            </button>
          </div>

          <div className="mt-8 border-t pt-5 text-[12px] leading-5" style={{ borderColor: 'rgba(210,192,166,.72)', color: P.muted }}>
            Five questions at a time · teaching only when useful · ask questions before we move on
          </div>
        </section>

        <footer className="flex items-center justify-between border-t py-5 text-[11px]" style={{ borderColor: 'rgba(210,192,166,.62)', color: P.muted }}>
          <span>Early access</span>
          <button onClick={() => navigate('/privacy')}>Privacy</button>
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

  return <ConceptStoreProvider curriculumId={curriculumId}><TutorHomeContent /></ConceptStoreProvider>;
}
