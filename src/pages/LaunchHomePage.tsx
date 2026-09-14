import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';
import { PracticeFilterModalParchment, type FilterState } from '@/components/practice/PracticeFilterModalParchment';
import { getDaypartGreeting, getLearnerFirstName } from '@/lib/learnerIdentity';
import { buildSpoilerSafeSessionPlan, rememberPlannedSession } from '@/lib/sessionPlan';
import { isEssentialConcept } from '@/utils/essentialCurriculum';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';
import './launch-home-embed.css';

const P = { cream: '#F4ECDF', espresso: '#1F140C', ink: '#2A1E16', muted: '#8A7560', line: '#E8DCC4', sage: '#8FA379' };
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

function clearSavedQuestionAnswers() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('sba_answer_')) keys.push(key);
    }
    keys.forEach(key => sessionStorage.removeItem(key));
  } catch {}
}

function HomeContent() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { concepts, isPracticing, practiceQuestions, startPractice, endPractice, updateMastery, practiceError, filterOptions, setPracticeSelection } = useConceptStore() as any;
  const launchedRef = useRef(false);
  const inlineSessionRef = useRef<HTMLDivElement | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [adjustPortalTarget, setAdjustPortalTarget] = useState<HTMLElement | null>(null);
  const [hasAnsweredThisSession, setHasAnsweredThisSession] = useState(false);

  const hasEvidence = useMemo(() => (concepts || []).some((concept: any) => Number(concept.mastery_data?.attempts || 0) > 0), [concepts]);
  const learnerName = useMemo(() => getLearnerFirstName(user), [user]);
  const greeting = useMemo(() => getDaypartGreeting(), []);
  const sessionCount = user ? 5 : 3;

  const launchSelection = useCallback((selected: any[], count: number, replaceCurrent = false) => {
    if (!selected.length) return;
    clearSavedQuestionAnswers();
    setHasAnsweredThisSession(false);
    setPracticeSelection(selected.map((concept: any) => concept.concept_id));
    startPractice({ study_mode: 'smart', target_formats: ['ukmla_sba'], question_count: count, replace_current: replaceCurrent } as any);
  }, [setPracticeSelection, startPractice]);

  const startRecommended = useCallback(() => {
    if (!concepts?.length) return;
    const plan = buildSpoilerSafeSessionPlan(concepts, sessionCount);
    if (!plan.count) return;
    rememberPlannedSession(plan);
    try { sessionStorage.setItem('studyedit_current_journey_v1', hasEvidence ? 'returning' : 'cold'); } catch {}
    launchSelection(plan.selected, Math.max(1, plan.count));
  }, [concepts, hasEvidence, launchSelection, sessionCount]);

  useEffect(() => {
    if (launchedRef.current || !concepts?.length) return;
    launchedRef.current = true;
    startRecommended();
  }, [concepts, startRecommended]);

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
    const count = Math.max(1, filters.size || sessionCount);
    const plan = buildSpoilerSafeSessionPlan(matchingConcepts, count);
    if (!plan.count) return;
    rememberPlannedSession(plan);
    setShowFilters(false);
    launchSelection(plan.selected, Math.max(1, plan.count), true);
  }, [concepts, launchSelection, sessionCount]);

  const handleAnswerSubmit = (questionId: string, isCorrect: boolean) => {
    setHasAnsweredThisSession(true);
    const question = practiceQuestions.find((item: any) => item.id === questionId);
    if (question?.concept_id) updateMastery(question.concept_id, isCorrect);
  };

  const handleComplete = () => {
    endPractice(); launchedRef.current = false; setAdjustPortalTarget(null); setHasAnsweredThisSession(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const personalGreeting = learnerName ? `${greeting}, ${learnerName}.` : hasEvidence ? `${greeting}.` : 'I’m your UKMLA tutor.';
  const tutorOpening = hasEvidence ? 'Let’s pick up where you need it.' : 'I’ll learn what you know as we go and focus your revision where it matters most.';
  const hasQuestion = isPracticing && practiceQuestions?.length > 0;
  const showTutorIntro = !hasAnsweredThisSession;

  useEffect(() => {
    if (!hasQuestion || !inlineSessionRef.current) { setAdjustPortalTarget(null); return; }
    const root = inlineSessionRef.current;
    let slot: HTMLDivElement | null = null;
    const syncInlineState = () => {
      // UkmlaSBAQuestion enters its tutor state immediately when the SBA is submitted,
      // before LearningAwareSBA later commits confidence to the parent. Use that visible
      // state as the source of truth so the first-visit intro disappears at answer time.
      if (root.querySelector('section[aria-label="Answer and tutor"]')) {
        setHasAnsweredThisSession(true);
      }

      const questionSection = root.querySelector('section[aria-label="Question"]');
      const optionList = questionSection?.querySelector(':scope > div.mt-6.flex.flex-col.gap-3');
      if (!optionList) return;
      const existing = root.querySelector('[data-studyedit-adjust-slot]') as HTMLDivElement | null;
      if (existing) { slot = existing; setAdjustPortalTarget(existing); return; }
      slot = document.createElement('div'); slot.setAttribute('data-studyedit-adjust-slot', 'true');
      optionList.insertAdjacentElement('afterend', slot); setAdjustPortalTarget(slot);
    };
    syncInlineState();
    const observer = new MutationObserver(syncInlineState); observer.observe(root, { childList: true, subtree: true });
    return () => { observer.disconnect(); slot?.remove(); setAdjustPortalTarget(null); };
  }, [hasQuestion, practiceQuestions?.[0]?.id]);

  return (
    <main className="min-h-screen" style={{ backgroundColor: P.cream, color: P.ink }}>
      <div className="mx-auto w-full max-w-[760px] px-5 pb-10 pt-5 sm:px-8 sm:pt-8"><section>
        {!hasQuestion && <div className="flex items-center justify-between gap-4"><div className="text-[19px] font-extrabold tracking-[-0.03em]" style={{ color: P.espresso }}>studyedit.</div>{!user ? <button onClick={() => navigate('/signin?next=/')} className="text-[12px] font-semibold" style={{ color: P.muted }}>Sign in</button> : <button onClick={() => void signOut()} className="text-[12px] font-semibold" style={{ color: P.muted }}>Sign out</button>}</div>}
        {showTutorIntro && <div className={hasQuestion ? 'pt-2 sm:pt-3' : 'pt-12 sm:pt-16'}><div className="rounded-[18px] px-5 py-5 sm:px-6" style={{ backgroundColor: '#E9E9DF' }}><p className="text-[20px] font-medium leading-8 tracking-[-0.015em] sm:text-[22px]" style={{ color: P.espresso }}>{personalGreeting}</p><p className="text-[20px] font-normal leading-8 tracking-[-0.015em] sm:text-[22px]" style={{ color: P.ink }}>{tutorOpening}</p>{!hasEvidence && <p className="mt-2 text-[20px] font-medium leading-8 tracking-[-0.015em] sm:text-[22px]" style={{ color: P.espresso }}>Here’s your first case.</p>}</div></div>}
        <div className={showTutorIntro ? 'mt-5' : 'mt-0'}>
          {!hasQuestion && !practiceError && <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: P.muted }} aria-live="polite"><span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: P.sage }} aria-hidden="true" />Choosing your first useful case…</div>}
          {practiceError && <div className="max-w-lg rounded-[20px] border border-[#E8DCC4] bg-[#FFFDF8] p-5"><div className="text-[12px] font-semibold text-[#8A7560]">I couldn’t prepare a reliable case just now.</div><p className="mt-2 text-[14px] leading-6 text-[#49382B]">{practiceError}</p><button onClick={startRecommended} className="mt-4 rounded-full bg-[#1F140C] px-4 py-2.5 text-[12px] font-semibold text-white">Try again</button></div>}
          {hasQuestion && <div ref={inlineSessionRef} className="studyedit-inline-session"><ApplePracticeSession questions={practiceQuestions} onComplete={handleComplete} onAnswerSubmit={handleAnswerSubmit} availableFilters={(filterOptions?.custom_filters as string[] | undefined) ?? []} section="UKMLA AKT" currentFormat="ukmla_sba" onAnotherFive={startRecommended} onRestartWithFilters={() => setShowFilters(true)} /></div>}
        </div>
      </section>
      {!hasQuestion && <footer className="mt-16 flex items-center justify-between border-t pt-5 text-[11px]" style={{ borderColor: P.line, color: P.muted }}><button onClick={() => navigate('/privacy')}>Privacy</button><span>UKMLA AKT</span></footer>}
      </div>
      {adjustPortalTarget && createPortal(<button type="button" className="studyedit-adjust-session" onClick={() => setShowFilters(true)}>Adjust session</button>, adjustPortalTarget)}
      <PracticeFilterModalParchment isOpen={showFilters} onClose={() => setShowFilters(false)} onApplyFilters={startFilteredSession} />
    </main>
  );
}

export function LaunchHomePage() {
  const { user } = useAuth();
  const curriculumId = useMemo(() => { if (user?.id) migrateLegacyCurriculumState(user.id); return getUserCurriculumId(user?.id); }, [user?.id]);
  return <ConceptStoreProvider curriculumId={curriculumId}><HomeContent /></ConceptStoreProvider>;
}