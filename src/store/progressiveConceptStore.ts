import { createConceptStore as createBaseConceptStore } from '@/store/conceptStore';
import type { PracticeConfig } from '@/types/conceptTypes';

const isUnsafeFallback = (question: any) => {
  if (!question) return true;
  if (String(question.id || '').startsWith('fallback_')) return true;

  const prompt = String(question.question || '').trim().toLowerCase();
  const options = Array.isArray(question.options)
    ? question.options.map((option: unknown) => String(option).trim().toLowerCase())
    : [];

  return (
    prompt.startsWith('what do you know about ') &&
    options.length === 4 &&
    options.join('|') === 'a lot|some|a little|nothing'
  );
};

const uniqueById = (questions: any[]) => {
  const seen = new Set<string>();
  return questions.filter(question => {
    const key = String(question?.id || `${question?.concept_id || 'question'}_${seen.size}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const isRecommendedLaunchPath = () =>
  typeof window !== 'undefined' && window.location.pathname === '/recommended-practice';

/**
 * Thin launch wrapper around the existing concept store.
 *
 * The legacy startPractice implementation waits for every question in a batch
 * before publishing the session. For the learner-facing recommended path we:
 *  1. prepare one question in an isolated store,
 *  2. publish it only after it passes the fallback safety check,
 *  3. prepare the remaining questions in another isolated store, and
 *  4. append only valid questions when they are ready.
 *
 * Every other practice surface delegates straight to the original store.
 */
export const createConceptStore = (curriculumId: string = 'default') => {
  const store = createBaseConceptStore(curriculumId);
  const baseStartPractice = store.getState().startPractice;
  const baseEndPractice = store.getState().endPractice;
  let runId = 0;

  const createGenerationStore = (snapshot: any, selection: string[]) => {
    const generationStore = createBaseConceptStore(curriculumId);
    generationStore.setState({
      concepts: snapshot.concepts,
      filteredConcepts: snapshot.filteredConcepts,
      filterOptions: snapshot.filterOptions,
      filterState: snapshot.filterState,
      practiceSelection: selection,
    } as any);
    return generationStore;
  };

  const progressiveStartPractice = async (practiceConfig?: PracticeConfig) => {
    const thisRun = ++runId;
    const requestedCount = Math.max(1, practiceConfig?.question_count || 10);

    if (!isRecommendedLaunchPath()) {
      return baseStartPractice(practiceConfig);
    }

    // Mind maps are a different interaction and retain their existing behaviour.
    if (practiceConfig?.target_formats?.[0] === 'mindmap') {
      return baseStartPractice(practiceConfig);
    }

    const initial = store.getState() as any;
    const originalSelection = Array.isArray(initial.practiceSelection)
      ? [...initial.practiceSelection]
      : null;
    const candidates = originalSelection?.length
      ? originalSelection
      : initial.concepts.map((concept: any) => concept.concept_id);

    if (!candidates.length) {
      return baseStartPractice(practiceConfig);
    }

    // Keep the live learner store on its loading shell until a checked Q1 exists.
    store.setState({
      isLoading: true,
      isPracticing: true,
      practiceQuestions: [],
      currentSessionAnswers: [],
      sessionStartTime: Date.now(),
      generatingQuestionCount: requestedCount,
      practiceConfig: practiceConfig || initial.practiceConfig,
      practiceError: null,
    } as any);

    const firstAttemptIds = candidates.slice(0, Math.min(3, candidates.length));
    let firstQuestion: any = null;

    for (const conceptId of firstAttemptIds) {
      if (thisRun !== runId) return;

      const foregroundStore = createGenerationStore(initial, [conceptId]);
      await foregroundStore.getState().startPractice({ ...practiceConfig, question_count: 1 });
      const candidate = (foregroundStore.getState() as any).practiceQuestions?.[0];

      if (candidate && !isUnsafeFallback(candidate)) {
        firstQuestion = candidate;
        break;
      }
    }

    if (thisRun !== runId) return;

    if (!firstQuestion) {
      store.setState({
        practiceSelection: originalSelection,
        practiceQuestions: [],
        practiceError: 'I could not prepare a reliable case just now. Please try again.',
        isLoading: false,
        isPracticing: false,
        generatingQuestionCount: 0,
      } as any);
      return;
    }

    // Q1 becomes visible immediately; everything else can now happen off-screen.
    store.setState({
      practiceSelection: originalSelection,
      practiceQuestions: [firstQuestion],
      practiceError: null,
      isLoading: false,
      isPracticing: true,
      generatingQuestionCount: Math.max(0, requestedCount - 1),
    } as any);

    if (requestedCount === 1) {
      store.setState({ generatingQuestionCount: 0 } as any);
      return;
    }

    const remainingIds = candidates.filter((id: string) => id !== firstQuestion.concept_id);
    if (!remainingIds.length) {
      store.setState({ generatingQuestionCount: 0 } as any);
      return;
    }

    const backgroundStore = createGenerationStore(initial, remainingIds);

    try {
      await backgroundStore.getState().startPractice({
        ...practiceConfig,
        question_count: Math.min(requestedCount - 1, remainingIds.length),
      });

      if (thisRun !== runId || !(store.getState() as any).isPracticing) return;

      const backgroundQuestions = ((backgroundStore.getState() as any).practiceQuestions || [])
        .filter((question: any) => !isUnsafeFallback(question));
      const currentQuestions = (store.getState() as any).practiceQuestions || [];

      store.setState({
        practiceQuestions: uniqueById([...currentQuestions, ...backgroundQuestions]),
        generatingQuestionCount: 0,
      } as any);
    } catch (error) {
      // Q1 remains fully usable even if the invisible prefetch fails.
      console.error('Background question prefetch failed:', error);
      if (thisRun === runId) {
        store.setState({ generatingQuestionCount: 0 } as any);
      }
    }
  };

  const progressiveEndPractice = () => {
    runId += 1;
    return baseEndPractice();
  };

  store.setState({
    startPractice: progressiveStartPractice,
    endPractice: progressiveEndPractice,
  } as any);

  return store;
};
