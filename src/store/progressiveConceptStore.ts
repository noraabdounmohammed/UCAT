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

/**
 * Thin launch wrapper around the existing concept store.
 *
 * The legacy startPractice implementation waits for every question in a batch
 * before publishing the session. For the learner-facing launch path we instead:
 *  1. ask the existing engine for one valid question,
 *  2. publish it immediately,
 *  3. prepare the remaining questions in an isolated store, and
 *  4. append only valid questions when they are ready.
 *
 * This deliberately leaves the underlying generation/cache logic alone so
 * custom practice and the rest of the app keep their existing behaviour.
 */
export const createConceptStore = (curriculumId: string = 'default') => {
  const store = createBaseConceptStore(curriculumId);
  const baseStartPractice = store.getState().startPractice;
  const baseEndPractice = store.getState().endPractice;
  let runId = 0;

  const progressiveStartPractice = async (practiceConfig?: PracticeConfig) => {
    const thisRun = ++runId;
    const requestedCount = Math.max(1, practiceConfig?.question_count || 10);

    // Non-question formats retain their existing all-at-once behaviour.
    if (practiceConfig?.target_formats?.[0] === 'mindmap' || requestedCount === 1) {
      await baseStartPractice(practiceConfig);
      const current = store.getState() as any;
      if (current.practiceQuestions?.some(isUnsafeFallback)) {
        store.setState({
          practiceQuestions: current.practiceQuestions.filter((question: any) => !isUnsafeFallback(question)),
          practiceError: 'I could not prepare a reliable case just now. Please try again.',
          isLoading: false,
          isPracticing: false,
        } as any);
      }
      return;
    }

    const initial = store.getState() as any;
    const originalSelection = Array.isArray(initial.practiceSelection)
      ? [...initial.practiceSelection]
      : null;

    // Try a small number of planned concepts until the first question is safe.
    // A generation failure therefore stays invisible instead of degrading into
    // the old “A lot / Some / A little / Nothing” placeholder.
    const candidates = originalSelection?.length
      ? originalSelection
      : initial.concepts.map((concept: any) => concept.concept_id);
    const firstAttemptIds = candidates.slice(0, Math.min(3, candidates.length));

    let firstQuestion: any = null;
    for (const conceptId of firstAttemptIds) {
      if (thisRun !== runId) return;
      store.setState({ practiceSelection: [conceptId] } as any);
      await baseStartPractice({ ...practiceConfig, question_count: 1 });
      const candidate = (store.getState() as any).practiceQuestions?.[0];
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
      } as any);
      return;
    }

    // The first good question is now visible. Restore the planned selection and
    // prepare the rest independently so the learner is never blocked by Q2–Q5.
    store.setState({
      practiceSelection: originalSelection,
      practiceQuestions: [firstQuestion],
      practiceConfig: practiceConfig || (store.getState() as any).practiceConfig,
      practiceError: null,
      isLoading: false,
      isPracticing: true,
      generatingQuestionCount: Math.max(0, requestedCount - 1),
    } as any);

    const remainingIds = candidates.filter((id: string) => id !== firstQuestion.concept_id);
    if (remainingIds.length === 0 || requestedCount <= 1) return;

    const backgroundStore = createBaseConceptStore(curriculumId);
    const snapshot = store.getState() as any;
    backgroundStore.setState({
      concepts: snapshot.concepts,
      filteredConcepts: snapshot.filteredConcepts,
      filterOptions: snapshot.filterOptions,
      filterState: snapshot.filterState,
      practiceSelection: remainingIds,
    } as any);

    const backgroundStart = backgroundStore.getState().startPractice;
    try {
      await backgroundStart({ ...practiceConfig, question_count: Math.min(requestedCount - 1, remainingIds.length) });
      if (thisRun !== runId || !(store.getState() as any).isPracticing) return;

      const backgroundQuestions = ((backgroundStore.getState() as any).practiceQuestions || [])
        .filter((question: any) => !isUnsafeFallback(question));
      const currentQuestions = (store.getState() as any).practiceQuestions || [];

      store.setState({
        practiceQuestions: uniqueById([...currentQuestions, ...backgroundQuestions]),
        generatingQuestionCount: 0,
      } as any);
    } catch (error) {
      // The active first question remains usable even if prefetch fails.
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
