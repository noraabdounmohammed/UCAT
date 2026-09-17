import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';
import { PracticeFilterModalParchment, type FilterState } from '@/components/practice/PracticeFilterModalParchment';
import { SessionOrientation } from '@/components/practice/SessionOrientation';
import type { SessionAnswer } from '@/components/practice/SessionProgressDropdown';
import type { QuestionData } from '@/components/practice/questionTypes';
import { buildSpoilerSafeSessionPlan, rememberPlannedSession } from '@/lib/sessionPlan';
import {
  clearLaunchSessionDraft,
  markLaunchSessionDraftSynced,
  readLaunchSessionDraft,
  type LaunchSessionDraft,
} from '@/lib/launchSessionDraft';
import { ProgressSyncService } from '@/services/progressSync';
import { isEssentialConcept } from '@/utils/essentialCurriculum';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';
import type { ConceptNode } from '@/types/conceptTypes';
import './launch-home-embed.css';

const P = { cream: '#F4ECDF', espresso: '#1F140C', ink: '#2A1E16', muted: '#746354', line: '#E8DCC4', sage: '#8FA379' };
const selectedFilterValues = (values: string[] | undefined) => (values || []).filter(value => value && value !== 'any');
const scopeStorageKey = (curriculumId: string) => `${curriculumId}_active_practice_scope_v1`;
const filterLabel = (value: string) => value.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

function readActivePracticeScope(curriculumId: string): FilterState | null {
  try {
    const stored = localStorage.getItem(scopeStorageKey(curriculumId));
    return stored ? JSON.parse(stored) as FilterState : null;
  } catch {
    return null;
  }
}

function rememberActivePracticeScope(curriculumId: string, filters: FilterState | null) {
  try {
    if (filters) localStorage.setItem(scopeStorageKey(curriculumId), JSON.stringify(filters));
    else localStorage.removeItem(scopeStorageKey(curriculumId));
  } catch {
    // Scope persistence is helpful, but never required to start practising.
  }
}

function summarizePracticeScope(filters: FilterState | null): string {
  if (!filters) return 'Recommended mix';
  const parts: string[] = [];
  const statuses = selectedFilterValues(filters.statuses);
  const statusLabels: Record<string, string> = { weak: 'Weak areas', cold: 'Unseen', drifting: 'Needs review', mastered: 'Mastered' };
  if (statuses.length === 1) parts.push(statusLabels[statuses[0]] || filterLabel(statuses[0]));
  else if (statuses.length > 1) parts.push(`${statuses.length} learning states`);
  if (filters.essentialsOnly) parts.push('Essentials');
  const addAxis = (values: string[] | undefined, plural: string) => {
    const selected = selectedFilterValues(values);
    if (selected.length === 1) parts.push(filterLabel(selected[0]));
    else if (selected.length > 1) parts.push(`${selected.length} ${plural}`);
  };
  addAxis(filters.areas, 'specialties');
  addAxis(filters.conditions, 'conditions');
  addAxis(filters.presentations, 'presentations');
  addAxis(filters.facets, 'focuses');
  if (!parts.length) return 'Recommended mix';
  const visible = parts.slice(0, 2);
  return `${visible.join(' · ')}${parts.length > visible.length ? ` +${parts.length - visible.length}` : ''}`;
}

function conceptMatchesFilterTags(concept: ConceptNode, values: string[] | undefined) {
  const selected = selectedFilterValues(values);
  if (!selected.length) return true;
  const tags = concept?.custom_filters || [];
  return selected.some(value => tags.includes(value));
}

function conceptMatchesLearningStatus(concept: ConceptNode, statuses: string[] | undefined) {
  const selected = selectedFilterValues(statuses);
  if (!selected.length) return true;
  const md = concept?.mastery_data || {};
  const dueAt = md.fsrs_due_at ? new Date(md.fsrs_due_at).getTime() : Number.POSITIVE_INFINITY;
  const isDue = Number.isFinite(dueAt) && dueAt <= Date.now();
  return selected.some(status =>
    (status === 'mastered' && Number(md.mastery_level || 0) === 2)
    || (status === 'weak' && Number(md.mastery_level || 0) === 1)
    || (status === 'cold' && !Number(md.attempts || 0) && !Number(md.mastery_level || 0))
    || (status === 'drifting' && (isDue || (Number(md.attempts || 0) > 0 && !Number(md.mastery_level || 0))))
  );
}

function clearSavedQuestionAnswers() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('sba_answer_') || key?.startsWith('learning_frontier_')) keys.push(key);
    }
    keys.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // Session storage is an enhancement, not a prerequisite for practice.
  }
}

function draftSessionPayload(draft: LaunchSessionDraft) {
  const correct = draft.answers.filter(answer => answer.isCorrect).length;
  return {
    session_date: new Date(draft.updatedAt).toISOString(),
    total_questions: draft.answers.length,
    correct_answers: correct,
    incorrect_answers: draft.answers.length - correct,
    duration_seconds: Math.max(1, Math.round((draft.updatedAt - draft.startedAt) / 1000)),
    concepts_practiced: draft.answers
      .map(answer => draft.questions[answer.questionIndex]?.concept_id)
      .filter((value): value is string => Boolean(value)),
  };
}

function HomeContent({ curriculumId }: { curriculumId: string }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    concepts,
    isPracticing,
    practiceQuestions,
    startPractice,
    endPractice,
    updateMastery,
    practiceError,
    filterOptions,
    setPracticeSelection,
  } = useConceptStore();

  const initialDraftRef = useRef(readLaunchSessionDraft());
  const [restoredDraft, setRestoredDraft] = useState<LaunchSessionDraft | null>(initialDraftRef.current);
  const [activeFilters, setActiveFilters] = useState<FilterState | null>(() => initialDraftRef.current ? readActivePracticeScope(curriculumId) : null);
  const launchedRef = useRef(Boolean(initialDraftRef.current));
  const syncingDraftRef = useRef(false);
  const previousConceptStateRef = useRef<Map<string, string>>(new Map());
  const [showFilters, setShowFilters] = useState(false);
  const openFilters = useCallback(() => setShowFilters(true), []);
  const closeFilters = useCallback(() => setShowFilters(false), []);
  const [exitRequestId, setExitRequestId] = useState(0);
  const [sessionInstance, setSessionInstance] = useState(0);
  const [plannedCount, setPlannedCount] = useState(initialDraftRef.current?.questions.length || (user ? 5 : 3));
  const [sessionProgress, setSessionProgress] = useState<{ currentIndex: number; answers: SessionAnswer[] }>({
    currentIndex: initialDraftRef.current?.currentIndex || 0,
    answers: initialDraftRef.current?.answers || [],
  });

  const hasEvidence = useMemo(
    () => (concepts || []).some(concept => Number(concept.mastery_data?.attempts || 0) > 0),
    [concepts],
  );
  const sessionCount = user ? 5 : 3;

  const launchSelection = useCallback((selected: ConceptNode[], count: number, replaceCurrent = false) => {
    if (!selected.length) return;
    clearSavedQuestionAnswers();
    clearLaunchSessionDraft();
    setRestoredDraft(null);
    setSessionProgress({ currentIndex: 0, answers: [] });
    setPlannedCount(count);
    setSessionInstance(value => value + 1);
    setPracticeSelection(selected.map(concept => concept.concept_id));
    void startPractice({ study_mode: 'smart', target_formats: ['ukmla_sba'], question_count: count, replace_current: replaceCurrent });
  }, [setPracticeSelection, startPractice]);

  const startRecommended = useCallback((replaceCurrent = false) => {
    if (!concepts?.length) return;
    setActiveFilters(null);
    rememberActivePracticeScope(curriculumId, null);
    const plan = buildSpoilerSafeSessionPlan(concepts, sessionCount);
    if (!plan.count) return;
    rememberPlannedSession(plan);
    try {
      sessionStorage.setItem('studyedit_current_journey_v1', hasEvidence ? 'returning' : 'cold');
    } catch {
      // Non-essential journey annotation.
    }
    launchSelection(plan.selected, Math.max(1, plan.count), replaceCurrent);
  }, [concepts, curriculumId, hasEvidence, launchSelection, sessionCount]);

  useEffect(() => {
    if (restoredDraft || launchedRef.current || !concepts?.length) return;
    launchedRef.current = true;
    startRecommended();
  }, [concepts, restoredDraft, startRecommended]);

  useEffect(() => {
    if (!user?.id || !restoredDraft || restoredDraft.syncedUserIds?.includes(user.id) || syncingDraftRef.current || !concepts?.length) return;
    syncingDraftRef.current = true;
    Promise.all([
      ProgressSyncService.syncConcepts(user.id, curriculumId, concepts),
      ProgressSyncService.savePracticeSession(user.id, curriculumId, draftSessionPayload(restoredDraft)),
    ])
      .then(() => {
        markLaunchSessionDraftSynced(user.id);
        setRestoredDraft(previous => previous
          ? { ...previous, syncedUserIds: [...new Set([...(previous.syncedUserIds || []), user.id])] }
          : previous);
      })
      .catch(error => console.error('Could not attach the saved session to the account:', error))
      .finally(() => { syncingDraftRef.current = false; });
  }, [concepts, curriculumId, restoredDraft, user?.id]);

  useEffect(() => {
    const nextState = new Map<string, string>();
    const changed: ConceptNode[] = [];
    (concepts || []).forEach(concept => {
      const signature = JSON.stringify({
        attempts: concept.mastery_data?.attempts || 0,
        correct: concept.mastery_data?.correct || 0,
        incorrect: concept.mastery_data?.incorrect || 0,
        lastPracticed: concept.mastery_data?.last_practiced || null,
      });
      nextState.set(concept.concept_id, signature);
      const previous = previousConceptStateRef.current.get(concept.concept_id);
      if (previous !== undefined && previous !== signature) changed.push(concept);
    });
    const hadPreviousState = previousConceptStateRef.current.size > 0;
    previousConceptStateRef.current = nextState;
    if (!user?.id || !hadPreviousState || !changed.length) return;
    const timer = window.setTimeout(() => {
      void ProgressSyncService.syncConcepts(user.id, curriculumId, changed)
        .catch(error => console.error('Could not sync updated learning progress:', error));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [concepts, curriculumId, user?.id]);

  const startFilteredSession = useCallback((filters: FilterState) => {
    const matchingConcepts = (concepts || []).filter(concept => {
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
    setActiveFilters(filters);
    rememberActivePracticeScope(curriculumId, filters);
    setShowFilters(false);
    launchSelection(plan.selected, Math.max(1, plan.count), true);
  }, [concepts, curriculumId, launchSelection, sessionCount]);

  const displayQuestions = useMemo<QuestionData[]>(
    () => restoredDraft?.questions || (practiceQuestions as QuestionData[]) || [],
    [practiceQuestions, restoredDraft?.questions],
  );

  const handleAnswerSubmit = useCallback((questionId: string, isCorrect: boolean) => {
    const question = displayQuestions.find(item => item.id === questionId);
    if (question?.concept_id) updateMastery(question.concept_id, isCorrect);
  }, [displayQuestions, updateMastery]);

  const handleProgressChange = useCallback((currentIndex: number, answers: SessionAnswer[]) => {
    setSessionProgress(previous => previous.currentIndex === currentIndex && previous.answers === answers ? previous : { currentIndex, answers });
  }, []);

  const handleComplete = useCallback(() => {
    const completedDraft = readLaunchSessionDraft();
    if (user?.id && completedDraft && !completedDraft.syncedUserIds?.includes(user.id)) {
      void ProgressSyncService.savePracticeSession(user.id, curriculumId, draftSessionPayload(completedDraft))
        .catch(error => console.error('Could not save completed practice session:', error));
    }
    clearLaunchSessionDraft();
    rememberActivePracticeScope(curriculumId, null);
    setActiveFilters(null);
    setRestoredDraft(null);
    endPractice();
    launchedRef.current = false;
    setSessionProgress({ currentIndex: 0, answers: [] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [curriculumId, endPractice, user?.id]);

  const hasQuestion = Boolean(restoredDraft?.questions.length) || (isPracticing && displayQuestions.length > 0);
  const scopeLabel = useMemo(() => summarizePracticeScope(activeFilters), [activeFilters]);

  return (
    <main className="min-h-screen" style={{ backgroundColor: P.cream, color: P.ink }}>
      <div className="mx-auto w-full max-w-[760px] px-5 pb-10 pt-5 sm:px-8 sm:pt-8">
        <section>
          {!hasQuestion && (
            <div className="flex items-center justify-between gap-4">
              <div className="text-[19px] font-extrabold tracking-[-0.03em]" style={{ color: P.espresso }}>studyedit.</div>
              {!user
                ? <button onClick={() => navigate('/signin?next=/')} className="text-[12px] font-semibold" style={{ color: P.muted }}>Sign in</button>
                : <button onClick={() => void signOut()} className="text-[12px] font-semibold" style={{ color: P.muted }}>Sign out</button>}
            </div>
          )}

          <div className="mt-0">
            {!hasQuestion && !practiceError && (
              <div className="flex items-center gap-2 pt-8 text-[12px] font-semibold" style={{ color: P.muted }} aria-live="polite">
                <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: P.sage }} aria-hidden="true" />
                Choosing your first useful case…
              </div>
            )}
            {practiceError && (
              <div className="max-w-lg border-y border-[#E8DCC4] py-5">
                <div className="text-[12px] font-semibold text-[#746354]">I couldn’t prepare a reliable case just now.</div>
                <p className="mt-2 text-[14px] leading-6 text-[#49382B]">{practiceError}</p>
                <button onClick={() => startRecommended()} className="mt-4 bg-[#1F140C] px-4 py-2.5 text-[12px] font-semibold text-white">Try again</button>
              </div>
            )}
            {hasQuestion && (
              <>
                <SessionOrientation
                  currentIndex={sessionProgress.currentIndex}
                  plannedCount={plannedCount}
                  answeredCount={sessionProgress.answers.length}
                  scopeLabel={scopeLabel}
                  isTailored={Boolean(activeFilters)}
                  onAdjust={openFilters}
                  onExit={() => setExitRequestId(value => value + 1)}
                />
                <div className="studyedit-inline-session">
                  <ApplePracticeSession
                    key={sessionInstance}
                    questions={displayQuestions}
                    onComplete={handleComplete}
                    onAnswerSubmit={handleAnswerSubmit}
                    onProgressChange={handleProgressChange}
                    availableFilters={(filterOptions?.custom_filters as string[] | undefined) ?? []}
                    section="UKMLA AKT"
                    currentFormat="ukmla_sba"
                    onAnotherFive={() => startRecommended(true)}
                    onRestartWithFilters={openFilters}
                    exitRequestId={exitRequestId}
                    persistLaunchState
                    learnerScope={user?.id || 'guest'}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {!hasQuestion && (
          <footer className="mt-16 flex items-center justify-between border-t pt-5 text-[11px]" style={{ borderColor: P.line, color: P.muted }}>
            <div className="flex gap-4"><button onClick={() => navigate('/privacy')}>Privacy</button><button onClick={() => navigate('/terms')}>Terms</button></div>
            <span>UKMLA AKT</span>
          </footer>
        )}
      </div>

      <PracticeFilterModalParchment
        isOpen={showFilters}
        onClose={closeFilters}
        onApplyFilters={startFilteredSession}
        initialFilters={activeFilters}
      />
    </main>
  );
}

export function LaunchHomePage() {
  const { user, loading } = useAuth();
  const curriculumId = useMemo(() => getUserCurriculumId(user?.id), [user?.id]);

  useEffect(() => {
    if (user?.id) migrateLegacyCurriculumState(user.id);
  }, [user?.id]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4ECDF] px-5 text-[#2A1E16]" aria-live="polite">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#746354]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#8FA379]" />Opening StudyEdit…</div>
      </main>
    );
  }

  return <ConceptStoreProvider curriculumId={curriculumId}><HomeContent curriculumId={curriculumId} /></ConceptStoreProvider>;
}
