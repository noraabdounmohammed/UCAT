import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
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
const recentSessionStorageKey = 'studyedit_recent_session_v1';
const filterLabel = (value: string) => value.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

type LearningPicture = {
  evidenced: number;
  secure: number;
  needsAttention: number;
};

type RecentSession = {
  answered: number;
  correct: number;
  completedAt: number;
  items: Array<{ title: string; isCorrect: boolean }>;
};

function readRecentSession(): RecentSession | null {
  try {
    const stored = localStorage.getItem(recentSessionStorageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as RecentSession;
    if (!Number.isFinite(parsed.answered) || !Number.isFinite(parsed.correct) || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function rememberRecentSession(session: RecentSession) {
  try {
    localStorage.setItem(recentSessionStorageKey, JSON.stringify(session));
  } catch {
    // The Home screen still works when local storage is unavailable.
  }
}

function buildLearningPicture(concepts: ConceptNode[]): LearningPicture {
  const now = Date.now();
  return concepts.reduce<LearningPicture>((picture, concept) => {
    const mastery = concept.mastery_data || {};
    const attempts = Number(mastery.attempts || 0);
    const level = Number(mastery.mastery_level || 0);
    const incorrect = Number(mastery.incorrect || 0);
    const correct = Number(mastery.correct || 0);
    const dueAt = mastery.fsrs_due_at ? new Date(mastery.fsrs_due_at).getTime() : Number.POSITIVE_INFINITY;
    const isDue = Number.isFinite(dueAt) && dueAt <= now;
    const hasEvidence = attempts > 0 || level > 0;

    if (!hasEvidence) return picture;
    picture.evidenced += 1;
    if (level === 2 && !isDue) picture.secure += 1;
    if (level === 1 || isDue || incorrect > correct) picture.needsAttention += 1;
    return picture;
  }, { evidenced: 0, secure: 0, needsAttention: 0 });
}

function recommendationReason(reasonCounts: Array<{ label: string; count: number }>, hasEvidence: boolean) {
  if (!hasEvidence) return 'Chosen to reveal your first useful gaps.';
  const labels: Record<string, (count: number) => string> = {
    'Needs another look': count => `${count} weak ${count === 1 ? 'area' : 'areas'}`,
    'Due to revisit': count => `${count} due for review`,
    'Not tested yet': count => `${count} unseen`,
    Reinforcement: count => `${count} to reinforce`,
  };
  const parts = reasonCounts
    .map(({ label, count }) => labels[label]?.(count))
    .filter((value): value is string => Boolean(value));
  return parts.length ? parts.slice(0, 3).join(' · ') : 'Chosen from your current learning picture.';
}

function buildRecentSession(answers: SessionAnswer[], questions: QuestionData[]): RecentSession | null {
  if (!answers.length) return null;
  const items = answers
    .slice()
    .sort((a, b) => a.questionIndex - b.questionIndex)
    .map(answer => {
      const question = questions[answer.questionIndex];
      return {
        title: String(question?.concept_title || question?.title || question?.topic || `Case ${answer.questionIndex + 1}`),
        isCorrect: answer.isCorrect,
      };
    });
  return {
    answered: answers.length,
    correct: answers.filter(answer => answer.isCorrect).length,
    completedAt: Date.now(),
    items,
  };
}

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
  const [showHome, setShowHome] = useState(() => new URLSearchParams(window.location.search).get('home') === '1');
  const [recentSession, setRecentSession] = useState<RecentSession | null>(readRecentSession);
  const [showSessionOrientation, setShowSessionOrientation] = useState(
    () => !initialDraftRef.current?.showReview && initialDraftRef.current?.reviewingQuestionIndex == null,
  );
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

  const sessionCount = user ? 5 : 3;
  const learningPicture = useMemo(() => buildLearningPicture(concepts || []), [concepts]);
  const hasEvidence = learningPicture.evidenced > 0;
  const recommendedPlan = useMemo(
    () => buildSpoilerSafeSessionPlan(concepts || [], sessionCount),
    [concepts, sessionCount],
  );
  const recommendedReason = useMemo(
    () => recommendationReason(recommendedPlan.reasonCounts, hasEvidence),
    [hasEvidence, recommendedPlan.reasonCounts],
  );
  const recommendedMinutes = recommendedPlan.minutes || Math.max(3, sessionCount * 2);
  const recommendedReady = recommendedPlan.count > 0;

  const launchSelection = useCallback((selected: ConceptNode[], count: number, replaceCurrent = false) => {
    if (!selected.length) return;
    launchedRef.current = true;
    setShowHome(false);
    setShowSessionOrientation(true);
    setExitRequestId(0);
    navigate('/', { replace: true });
    clearSavedQuestionAnswers();
    clearLaunchSessionDraft();
    setRestoredDraft(null);
    setSessionProgress({ currentIndex: 0, answers: [] });
    setPlannedCount(count);
    setSessionInstance(value => value + 1);
    setPracticeSelection(selected.map(concept => concept.concept_id));
    void startPractice({ study_mode: 'smart', target_formats: ['ukmla_sba'], question_count: count, replace_current: replaceCurrent });
  }, [navigate, setPracticeSelection, startPractice]);

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
    if (showHome || restoredDraft || launchedRef.current || !concepts?.length) return;
    launchedRef.current = true;
    startRecommended();
  }, [concepts, restoredDraft, showHome, startRecommended]);

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
    const nextRecentSession = buildRecentSession(sessionProgress.answers, displayQuestions);
    if (nextRecentSession) {
      setRecentSession(nextRecentSession);
      rememberRecentSession(nextRecentSession);
    }
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
    launchedRef.current = true;
    setShowHome(true);
    setShowSessionOrientation(true);
    setExitRequestId(0);
    setSessionProgress({ currentIndex: 0, answers: [] });
    navigate('/?home=1', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [curriculumId, displayQuestions, endPractice, navigate, sessionProgress.answers, user?.id]);

  const hasQuestion = !showHome && (Boolean(restoredDraft?.questions.length) || (isPracticing && displayQuestions.length > 0));
  const scopeLabel = useMemo(() => summarizePracticeScope(activeFilters), [activeFilters]);

  return (
    <main className="min-h-screen" style={{ backgroundColor: P.cream, color: P.ink }}>
      <div className="mx-auto w-full max-w-[760px] px-5 pb-10 pt-5 sm:px-8 sm:pt-8">
        <section>
          {!hasQuestion && (
            <div className="flex items-center justify-between gap-4">
              <div className="text-[19px] font-extrabold tracking-[-0.03em]" style={{ color: P.espresso }}>studyedit.</div>
              {!user
                ? <button onClick={() => navigate('/signin?next=/')} className="text-[14px] font-semibold" style={{ color: P.muted }}>Sign in</button>
                : <button onClick={() => void signOut()} className="text-[14px] font-semibold" style={{ color: P.muted }}>Sign out</button>}
            </div>
          )}

          <div className="mt-0">
            {showHome && (
              <div className="pt-10 sm:pt-16">
                <section aria-labelledby="studyedit-home-heading">
                  <div className="text-[13px] font-bold uppercase tracking-[0.16em]" style={{ color: P.muted }}>UKMLA AKT</div>
                  <h1 id="studyedit-home-heading" className="mt-3 max-w-[650px] text-[36px] font-light leading-[1.05] tracking-[-0.04em] sm:text-[46px]" style={{ color: P.espresso, fontFamily: "'Fraunces', serif" }}>
                    {hasEvidence ? 'Here’s what to work on next.' : 'Let’s find your most useful gaps.'}
                  </h1>
                  <p className="mt-4 max-w-[620px] text-[16px] leading-7" style={{ color: P.muted }}>
                    {hasEvidence
                      ? 'StudyEdit has chosen the shortest useful next step from your learning picture.'
                      : 'A short diagnostic builds your learning picture, then StudyEdit adapts after every answer.'}
                  </p>

                  <button
                    type="button"
                    onClick={() => startRecommended()}
                    disabled={!recommendedReady}
                    aria-busy={!recommendedReady}
                    className="mt-7 w-full rounded-[24px] px-5 py-5 text-left transition-transform active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 sm:px-6 sm:py-6"
                    style={{ backgroundColor: P.espresso, color: P.cream, boxShadow: '0 12px 30px rgba(31,20,12,.12)' }}
                  >
                    <span className="flex items-center justify-between gap-4 text-[14px] font-semibold">
                      <span style={{ color: '#D9CCB6' }}>{hasEvidence ? 'Recommended for you' : 'Recommended start'}</span>
                      <span className="shrink-0" style={{ color: '#F4ECDF' }}>
                        {recommendedReady ? `${recommendedPlan.count} ${recommendedPlan.count === 1 ? 'case' : 'cases'} · about ${recommendedMinutes} min` : 'Preparing…'}
                      </span>
                    </span>
                    <span className="mt-5 flex items-end gap-4">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[21px] font-bold leading-tight">
                          {hasEvidence ? 'Start recommended session' : 'Start diagnostic'}
                        </span>
                        <span className="mt-2 block text-[15px] leading-6" style={{ color: '#D9CCB6' }}>{recommendedReason}</span>
                      </span>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ backgroundColor: P.cream, color: P.espresso }}>
                        <ArrowRight className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={openFilters}
                    className="mt-3 flex min-h-[82px] w-full items-center gap-4 rounded-[22px] border px-5 text-left transition-colors hover:bg-[#FAF5EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#8FA379]"
                    style={{ borderColor: P.line, backgroundColor: '#FFFDF8' }}
                  >
                    <SlidersHorizontal className="h-5 w-5 shrink-0" style={{ color: P.muted }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-bold" style={{ color: P.espresso }}>Tailor your session</span>
                      <span className="mt-1 block text-[15px] leading-5" style={{ color: P.muted }}>Specialty, condition, presentation or skill</span>
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0" style={{ color: P.muted }} aria-hidden="true" />
                  </button>
                </section>

                <section className="mt-10 border-t pt-7" style={{ borderColor: P.line }} aria-labelledby="learning-picture-heading">
                  <h2 id="learning-picture-heading" className="text-[14px] font-bold uppercase tracking-[0.12em]" style={{ color: P.muted }}>Your learning picture</h2>
                  {hasEvidence ? (
                    <div className="mt-3">
                      <p className="text-[27px] font-light leading-tight tracking-[-0.025em]" style={{ color: P.espresso, fontFamily: "'Fraunces', serif" }}>
                        {learningPicture.evidenced} {learningPicture.evidenced === 1 ? 'concept' : 'concepts'} mapped
                      </p>
                      <p className="mt-2 text-[15px] leading-6" style={{ color: P.muted }}>
                        {learningPicture.needsAttention > 0
                          ? `${learningPicture.needsAttention} ${learningPicture.needsAttention === 1 ? 'needs' : 'need'} attention${learningPicture.secure > 0 ? ` · ${learningPicture.secure} currently secure` : ''}`
                          : `${learningPicture.secure} currently secure · your next session will extend the map`}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <p className="text-[27px] font-light leading-tight tracking-[-0.025em]" style={{ color: P.espresso, fontFamily: "'Fraunces', serif" }}>Your map starts here.</p>
                      <p className="mt-2 text-[15px] leading-6" style={{ color: P.muted }}>Complete one short session to reveal your first gaps.</p>
                    </div>
                  )}
                </section>

                {recentSession && (
                  <section className="mt-8 border-t pt-7" style={{ borderColor: P.line }} aria-labelledby="latest-session-heading">
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 id="latest-session-heading" className="text-[15px] font-bold" style={{ color: P.espresso }}>Latest session</h2>
                      <span className="text-[15px] font-semibold" style={{ color: P.muted }}>
                        {recentSession.correct} of {recentSession.answered} correct
                      </span>
                    </div>
                    <details className="mt-4">
                      <summary className="cursor-pointer list-none text-[15px] font-semibold underline underline-offset-4" style={{ color: P.espresso }}>
                        {recentSession.answered - recentSession.correct > 0
                          ? `Review ${recentSession.answered - recentSession.correct} ${recentSession.answered - recentSession.correct === 1 ? 'gap' : 'gaps'}`
                          : 'Review answers'}
                      </summary>
                      <div className="mt-4 overflow-hidden rounded-[18px] border" style={{ borderColor: P.line, backgroundColor: '#FFFDF8' }}>
                        {recentSession.items.map((item, index) => (
                          <div key={`${item.title}-${index}`} className="flex items-center gap-3 px-4 py-4" style={{ borderTop: index ? `1px solid ${P.line}` : 'none' }}>
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold" style={{ backgroundColor: item.isCorrect ? '#E7ECD9' : '#F9E4DF', color: item.isCorrect ? '#667555' : '#9C655D' }} aria-hidden="true">
                              {item.isCorrect ? '✓' : '×'}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold" style={{ color: P.ink }}>{item.title}</span>
                            <span className="shrink-0 text-[13px] font-semibold" style={{ color: P.muted }}>{item.isCorrect ? 'Correct' : 'Review'}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </section>
                )}
              </div>
            )}
            {!showHome && !hasQuestion && !practiceError && (
              <div className="flex items-center gap-2 pt-8 text-[12px] font-semibold" style={{ color: P.muted }} aria-live="polite">
                <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: P.sage }} aria-hidden="true" />
                Choosing your first useful case…
              </div>
            )}
            {!showHome && practiceError && (
              <div className="max-w-lg border-y border-[#E8DCC4] py-5">
                <div className="text-[12px] font-semibold text-[#746354]">I couldn’t prepare a reliable case just now.</div>
                <p className="mt-2 text-[14px] leading-6 text-[#49382B]">{practiceError}</p>
                <button onClick={() => startRecommended()} className="mt-4 bg-[#1F140C] px-4 py-2.5 text-[12px] font-semibold text-white">Try again</button>
              </div>
            )}
            {hasQuestion && (
              <>
                {showSessionOrientation && (
                  <SessionOrientation
                    currentIndex={sessionProgress.currentIndex}
                    plannedCount={plannedCount}
                    answeredCount={sessionProgress.answers.length}
                    scopeLabel={scopeLabel}
                    isTailored={Boolean(activeFilters)}
                    onExit={() => setExitRequestId(value => value + 1)}
                  />
                )}
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
                    onSessionChromeChange={setShowSessionOrientation}
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
          <footer className="mt-14 flex items-center justify-between border-t pt-5 text-[13px]" style={{ borderColor: P.line, color: P.muted }}>
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
