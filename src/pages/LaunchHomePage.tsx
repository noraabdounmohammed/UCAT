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

function TutorLoading({ first = false }: { first?: boolean }) {
  return (
    <main className="min-h-screen px-6" style={{ backgroundColor: P.parchment, color: P.ink }}>
      <div className="mx-auto flex min-h-screen max-w-[660px] flex-col justify-center py-16">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: P.muted }}>StudyEdit</div>
        <h1 className="mt-4 text-[38px] font-light leading-[1.08] tracking-[-0.035em] sm:text-[46px]" style={{ fontFamily: "'Fraunces', serif", color: P.espresso }}>
          {first ? 'I’m choosing a good place to start.' : 'I’m choosing the next useful question.'}
        </h1>
        <div className="mt-6 flex items-center gap-2 text-sm" style={{ color: P.muted }}>
          <span>One moment</span>
          <span className="inline-flex gap-1" aria-hidden="true"><span className="animate-pulse">•</span><span className="animate-pulse [animation-delay:180ms]">•</span><span className="animate-pulse [animation-delay:360ms]">•</span></span>
        </div>
      </div>
    </main>
  );
}

function Wordmark() {
  return <div className="text-[25px] tracking-[-0.045em]" style={{ fontFamily: "'Fraunces', serif", color: P.espresso }}>studyedit<span style={{ color: P.blush }}>.</span></div>;
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
  const [showAuth, setShowAuth] = useState(false);
  const [guestTrialComplete, setGuestTrialComplete] = useState(false);
  const beginningSessionRef = useRef(false);

  const preparation = useMemo(() => {
    const all = concepts || [];
    const now = Date.now();
    const attempted = all.filter((c: any) => Number(c.mastery_data?.attempts || 0) > 0);
    const due = all.filter((c: any) => c.mastery_data?.fsrs_due_at && new Date(c.mastery_data.fsrs_due_at).getTime() <= now);
    const weak = all.filter((c: any) => c.mastery_data?.mastery_level === 1);
    const unseen = all.filter((c: any) => Number(c.mastery_data?.attempts || 0) === 0);
    const recent = [...attempted]
      .sort((a: any, b: any) => new Date(b.mastery_data?.last_practiced || 0).getTime() - new Date(a.mastery_data?.last_practiced || 0).getTime())
      .slice(0, 3)
      .map((c: any) => String(c.title || c.concept_title || '').trim())
      .filter(Boolean);
    return {
      hasEvidence: attempted.length > 0,
      attemptedCount: attempted.length,
      dueCount: due.length,
      weakCount: weak.length,
      unseenCount: unseen.length,
      recent,
    };
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

  const startGuestTrial = () => {
    setShowAuth(false);
    setGuestTrialComplete(false);
    startRecommended(3);
  };

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
    if (!user) {
      setGuestTrialComplete(true);
      setShowAuth(false);
    }
  };

  const handleAnswerSubmit = (questionId: string, isCorrect: boolean) => {
    const question = practiceQuestions.find((q: any) => q.id === questionId);
    if (question?.concept_id) updateMastery(question.concept_id, isCorrect);
  };

  if (practiceError) {
    return (
      <main className="min-h-screen px-5 py-10" style={{ backgroundColor: P.parchment, color: P.ink }}>
        <div className="mx-auto max-w-[620px] pt-16">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: P.muted }}>StudyEdit</div>
          <h1 className="mt-3 text-4xl font-light tracking-[-0.035em]" style={{ fontFamily: "'Fraunces', serif", color: P.espresso }}>That lesson didn’t start properly.</h1>
          <p className="mt-4 text-sm leading-6" style={{ color: P.muted }}>{practiceError}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => { endPractice(); user ? startRecommended(5) : startGuestTrial(); }} className="rounded-full px-5 py-3 text-sm font-semibold" style={{ backgroundColor: P.espresso, color: P.cream }}>Try again</button>
            {user && <button onClick={() => { endPractice(); openFilters(); }} className="rounded-full border px-5 py-3 text-sm font-semibold" style={{ borderColor: P.line, color: P.espresso }}>Choose a focus</button>}
          </div>
        </div>
      </main>
    );
  }

  if (showFilters && !isPracticing && user) {
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
        onAnotherFive={() => user ? startRecommended(5) : startRecommended(3)}
        onRestartWithFilters={() => {
          endPractice();
          if (user) openFilters();
          else setGuestTrialComplete(true);
        }}
      />
    );
  }

  if (isLoading || isPracticing) return <TutorLoading first={!preparation.hasEvidence} />;

  if (!user && showAuth) {
    return (
      <main className="min-h-screen px-5 sm:px-8" style={{ backgroundColor: P.parchment, color: P.ink }}>
        <div className="mx-auto flex min-h-screen max-w-[620px] flex-col">
          <header className="flex items-center justify-between py-7">
            <Wordmark />
            <button onClick={() => setShowAuth(false)} className="text-[12px] font-medium" style={{ color: P.muted }}>Back</button>
          </header>
          <section className="flex flex-1 flex-col justify-center pb-20">
            <h1 className="text-[43px] font-light leading-[1.04] tracking-[-0.045em] sm:text-[54px]" style={{ fontFamily: "'Fraunces', serif", color: P.espresso }}>Welcome back.</h1>
            <p className="mt-4 max-w-[500px] text-[15px] leading-6" style={{ color: P.muted }}>Sign in and I’ll pick up from what StudyEdit already knows about your learning.</p>
            <div className="mt-8 rounded-[26px] border p-5 sm:p-7" style={{ borderColor: P.line, backgroundColor: 'rgba(255,253,248,.72)' }}><AuthForm /></div>
          </section>
          <footer className="border-t py-5 text-[11px]" style={{ borderColor: P.line, color: P.muted }}><button onClick={() => navigate('/privacy')}>Privacy</button></footer>
        </div>
      </main>
    );
  }

  if (!user && guestTrialComplete) {
    const firstRecent = preparation.recent[0];
    return (
      <main className="min-h-screen px-5 sm:px-8" style={{ backgroundColor: P.parchment, color: P.ink }}>
        <div className="mx-auto flex min-h-screen max-w-[640px] flex-col">
          <header className="py-7"><Wordmark /></header>
          <section className="flex flex-1 flex-col justify-center pb-16 pt-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: '#9C655D' }}>That was enough to start</div>
            <h1 className="mt-4 text-[43px] font-light leading-[1.04] tracking-[-0.045em] sm:text-[56px]" style={{ fontFamily: "'Fraunces', serif", color: P.espresso }}>I can keep track of this for you.</h1>
            <p className="mt-5 max-w-[560px] text-[16px] leading-7" style={{ color: P.muted }}>
              You don’t need an account to understand StudyEdit. You only need one if you want it to remember what it learns about you and choose better next sessions.
            </p>

            <div className="mt-7 border-y py-5" style={{ borderColor: P.line }}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.17em]" style={{ color: P.muted }}>From that short lesson</div>
              <p className="mt-2 text-[16px] font-medium leading-7" style={{ color: P.espresso }}>
                {preparation.attemptedCount > 0
                  ? `StudyEdit now has ${preparation.attemptedCount} real learning signal${preparation.attemptedCount === 1 ? '' : 's'}${firstRecent ? `, including ${firstRecent}` : ''}. That is not enough to judge readiness — but it is enough to stop treating you like a blank slate.`
                  : 'StudyEdit has seen how you interact with a real case. Save your progress and it can start building on that instead of beginning from zero next time.'}
              </p>
            </div>

            <div className="mt-8 rounded-[26px] border p-5 sm:p-7" style={{ borderColor: P.line, backgroundColor: 'rgba(255,253,248,.72)' }}>
              <AuthForm />
            </div>
            <button type="button" onClick={startGuestTrial} className="mt-5 w-fit text-[12px] font-semibold underline decoration-[#BBA995] underline-offset-4" style={{ color: P.muted }}>Keep learning without saving for now</button>
          </section>
          <footer className="border-t py-5 text-[11px]" style={{ borderColor: P.line, color: P.muted }}><button onClick={() => navigate('/privacy')}>Privacy</button></footer>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen px-5 sm:px-8" style={{ backgroundColor: P.parchment, color: P.ink }}>
        <div className="mx-auto flex min-h-screen max-w-[720px] flex-col">
          <header className="flex items-center justify-between py-7">
            <Wordmark />
            <button onClick={() => setShowAuth(true)} className="text-[12px] font-medium" style={{ color: P.muted }}>Sign in</button>
          </header>

          <section className="flex flex-1 flex-col justify-center pb-20 pt-6 sm:pb-28">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: '#9C655D' }}>UKMLA & medical finals</div>
            <h1 className="mt-4 max-w-[690px] text-[46px] font-light leading-[1.01] tracking-[-0.048em] sm:text-[66px]" style={{ fontFamily: "'Fraunces', serif", color: P.espresso }}>
              Study medicine with someone paying attention.
            </h1>
            <p className="mt-6 max-w-[570px] text-[17px] leading-7 sm:text-[18px]" style={{ color: '#5F4D3E' }}>
              Answer a few real questions. StudyEdit notices what you know, what you only recognise, and where one good teaching move would help — then takes it from there.
            </p>

            <div className="mt-9">
              <button
                type="button"
                onClick={startGuestTrial}
                disabled={!concepts?.length}
                className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-[17px] text-[15px] font-semibold transition active:scale-[0.99] disabled:opacity-40"
                style={{ backgroundColor: P.espresso, color: P.cream }}
              >
                Try a 3-minute lesson <ArrowRight className="h-4 w-4" />
              </button>
              <div className="mt-3 text-[11px]" style={{ color: P.muted }}>No account needed.</div>
            </div>

            <div className="mt-12 max-w-[570px] border-t pt-5 text-[13px] leading-6" style={{ borderColor: 'rgba(210,192,166,.72)', color: P.muted }}>
              It stays quiet when you know something, slows down when you don’t, and leaves room for questions before moving on.
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

  const tutorLine = !preparation.hasEvidence
    ? 'Let’s find your starting point.'
    : preparation.weakCount > 0
      ? 'I’d start with what has been giving you trouble.'
      : preparation.dueCount > 0
        ? 'I’d start with what is due for another look.'
        : 'Ready? I’ll choose the next useful five.';

  const tutorDetail = !preparation.hasEvidence
    ? 'I’ll begin with five mixed UKMLA questions. I’ll stay quiet when you know it, teach when you need me, and you can interrupt with a question at any point.'
    : 'I’ll use what I’ve already seen from you to choose the next questions, then adapt inside the lesson rather than making you manage a study dashboard.';

  return (
    <main className="min-h-screen px-5 sm:px-8" style={{ backgroundColor: P.parchment, color: P.ink }}>
      <div className="mx-auto flex min-h-screen max-w-[660px] flex-col">
        <header className="flex items-center justify-between py-7">
          <Wordmark />
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
