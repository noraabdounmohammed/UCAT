import { createConceptStore as createBaseConceptStore } from '@/store/conceptStore';
import type { PracticeConfig } from '@/types/conceptTypes';

const PREFETCH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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

const currentPath = () => (typeof window === 'undefined' ? '' : window.location.pathname);
const isTutorLaunchPath = () => currentPath() === '/' || currentPath() === '/recommended-practice';
const isHomepage = () => currentPath() === '/';

const cacheKey = (curriculumId: string) => `studyedit_prefetched_case_v1:${curriculumId}`;

const makeInstantStarter = () => ({
  id: `instant_starter_${Date.now()}`,
  format: 'ukmla_sba',
  title: 'ST-elevation myocardial infarction',
  topic: 'Cardiology',
  concept_title: 'ST-elevation myocardial infarction',
  clinical_vignette:
    'A 62-year-old man presents with 50 minutes of severe central chest pain radiating to his left arm. He is sweaty and nauseated. ECG shows ST elevation in leads II, III and aVF. A PCI-capable centre can perform coronary intervention within 90 minutes.',
  question_stem:
    'A 62-year-old man presents with 50 minutes of severe central chest pain radiating to his left arm. He is sweaty and nauseated. ECG shows ST elevation in leads II, III and aVF. A PCI-capable centre can perform coronary intervention within 90 minutes. What is the most appropriate reperfusion strategy?',
  question_text: 'What is the most appropriate reperfusion strategy?',
  question: 'What is the most appropriate reperfusion strategy?',
  options: [
    'Immediate primary PCI',
    'Fibrinolysis followed by routine discharge',
    'CT coronary angiography before treatment',
    'Medical therapy alone and outpatient angiography',
  ],
  correct_answer: 0,
  explanation:
    'This is an acute STEMI presenting early, with primary PCI available promptly. Primary PCI is the preferred reperfusion strategy when it can be delivered within the recommended time window. Fibrinolysis is reserved for situations where timely primary PCI is not available.',
  key_fact:
    'In STEMI, use primary PCI when it can be delivered promptly; use fibrinolysis when timely PCI is not available and there are no contraindications.',
  __studyeditInstantStarter: true,
});

const takePrefetchedCase = (curriculumId: string) => {
  if (typeof window === 'undefined') return null;
  try {
    const key = cacheKey(curriculumId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    window.localStorage.removeItem(key);
    const parsed = JSON.parse(raw);
    if (!parsed?.question || isUnsafeFallback(parsed.question)) return null;
    if (!parsed.cachedAt || Date.now() - Number(parsed.cachedAt) > PREFETCH_MAX_AGE_MS) return null;
    return parsed.question;
  } catch {
    return null;
  }
};

const savePrefetchedCase = (curriculumId: string, question: any) => {
  if (typeof window === 'undefined' || !question || isUnsafeFallback(question)) return;
  try {
    window.localStorage.setItem(
      cacheKey(curriculumId),
      JSON.stringify({ question, cachedAt: Date.now() }),
    );
  } catch {
    // Prefetching is an optimization only; never block practice on storage access.
  }
};

/**
 * Thin launch wrapper around the existing concept store.
 *
 * On the homepage, Q1 is available synchronously before curriculum loading or
 * AI generation finishes. We consume a previously generated case when one is
 * available; otherwise we use a vetted bundled starter case. While the learner
 * works, the store generates the rest of the session and reserves one unseen
 * generated case for the next visit.
 *
 * The legacy recommended-practice route keeps the progressive-Q1 behaviour.
 * Every other practice surface delegates straight to the original store.
 */
export const createConceptStore = (curriculumId: string = 'default') => {
  const store = createBaseConceptStore(curriculumId);
  const baseStartPractice = store.getState().startPractice;
  const baseEndPractice = store.getState().endPractice;
  let runId = 0;

  // Make the homepage useful on first paint. There is deliberately no loading
  // state here: the learner should arrive already looking at a real case.
  if (isHomepage()) {
    const readyCase = takePrefetchedCase(curriculumId) || makeInstantStarter();
    store.setState({
      isLoading: false,
      isPracticing: true,
      practiceQuestions: [readyCase],
      currentSessionAnswers: [],
      sessionStartTime: Date.now(),
      generatingQuestionCount: 0,
      practiceError: null,
    } as any);
  }

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

    if (!isTutorLaunchPath()) {
      return baseStartPractice(practiceConfig);
    }

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

    // The homepage already has a real case on screen. Preserve it while the
    // personalized questions are prepared invisibly in the background.
    const existingHomepageCase = isHomepage() && initial.practiceQuestions?.[0]
      ? initial.practiceQuestions[0]
      : null;

    if (existingHomepageCase) {
      store.setState({
        isLoading: false,
        isPracticing: true,
        practiceQuestions: [existingHomepageCase],
        currentSessionAnswers: [],
        sessionStartTime: initial.sessionStartTime || Date.now(),
        generatingQuestionCount: requestedCount,
        practiceConfig: practiceConfig || initial.practiceConfig,
        practiceError: null,
      } as any);

      const remainingIds = candidates.filter((id: string) => id !== existingHomepageCase.concept_id);
      if (!remainingIds.length || requestedCount <= 0) {
        store.setState({ generatingQuestionCount: 0 } as any);
        return;
      }

      const backgroundStore = createGenerationStore(initial, remainingIds);
      try {
        // Generate one extra unseen question when possible: it becomes the
        // instant personalized first case on the learner's next visit.
        const generationCount = Math.min(requestedCount, remainingIds.length);
        await backgroundStore.getState().startPractice({
          ...practiceConfig,
          question_count: generationCount,
        });

        if (thisRun !== runId || !(store.getState() as any).isPracticing) return;

        const generated = ((backgroundStore.getState() as any).practiceQuestions || [])
          .filter((question: any) => !isUnsafeFallback(question));

        const sessionSlots = Math.max(0, requestedCount - 1);
        const sessionQuestions = generated.slice(0, sessionSlots);
        const reservedForNextVisit = generated[sessionSlots];
        if (reservedForNextVisit) savePrefetchedCase(curriculumId, reservedForNextVisit);

        const currentQuestions = (store.getState() as any).practiceQuestions || [];
        store.setState({
          practiceQuestions: uniqueById([...currentQuestions, ...sessionQuestions]),
          generatingQuestionCount: 0,
        } as any);
      } catch (error) {
        console.error('Background question prefetch failed:', error);
        if (thisRun === runId) store.setState({ generatingQuestionCount: 0 } as any);
      }
      return;
    }

    // Legacy progressive first-question path for /recommended-practice.
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
