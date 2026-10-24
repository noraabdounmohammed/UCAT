import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createConceptStore } from '@/store/progressiveConceptStore';
import { buildSpoilerSafeSessionPlan } from '@/lib/sessionPlan';
import { readPracticeHistory, recentPracticeExclusions, rememberPreparedQuestions } from '@/lib/practiceHistory';
import { writeLaunchSessionDraft } from '@/lib/launchSessionDraft';

const mocks = vi.hoisted(() => ({ generate: vi.fn(), cached: vi.fn(), save: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: null } }) } } }));
vi.mock('@/services/aiQuestionGenerator', () => ({ generateQuestionWithConfig: mocks.generate }));
vi.mock('@/services/questionCacheService', () => ({ questionCacheService: {
  getFeaturedQuestions: async () => [], getQuestionsForConcepts: mocks.cached, saveQuestion: mocks.save,
} }));
vi.mock('@/services/jsonConceptLoader', () => ({ jsonConceptLoader: {} }));

const concepts = Array.from({ length: 10 }, (_, index) => ({
  concept_id: `concept-${index}`, title: `Clinical objective ${index}`, content: `Teaching material ${index}`,
  custom_filters: ['cardiology', 'management'], prerequisites: [],
  mastery_data: { attempts: 0, correct: 0, incorrect: 0, mastery_level: 0, last_practiced: null },
}));
const question = (conceptId: string, index: number) => ({
  id: `question-${conceptId}-${index}`, concept_id: conceptId, format: 'ukmla_sba',
  question_stem: `A patient presents with clinical scenario ${index} for ${conceptId}. What is the next step?`,
  question: 'What is the next step?', options: [{ id: 'A', text: 'Investigation' }, { id: 'B', text: 'Observation' }],
  correct_answer: 'A', explanation: 'Use the findings to decide.',
});
const config = { question_count: 3, study_mode: 'smart' as const, target_formats: ['ukmla_sba' as const] };

function storeWithConcepts() {
  const store = createConceptStore('test');
  store.setState({ concepts, filteredConcepts: concepts } as any);
  return store;
}

describe('launch selection and question repetition', () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear(); vi.clearAllMocks();
    window.history.replaceState({}, '', '/?home=1');
    let next = 0;
    mocks.generate.mockImplementation(async ({ concept }) => question(concept.concept_id, ++next));
    mocks.cached.mockResolvedValue([]);
    mocks.save.mockResolvedValue(null);
  });

  it('gives three consecutive sessions different concepts after every answer is wrong, including after reload', async () => {
    let store = storeWithConcepts();
    const seen = new Set<string>();
    for (let session = 0; session < 3; session += 1) {
      const pool = store.getState().concepts;
      const plan = buildSpoilerSafeSessionPlan(pool, 3, recentPracticeExclusions('test'));
      store.getState().setPracticeSelection(plan.selected.map(item => item.concept_id));
      await store.getState().startPractice({ ...config, replace_current: true });
      const questions = store.getState().practiceQuestions;
      expect(questions).toHaveLength(3);
      for (const current of questions) {
        expect(seen.has(current.concept_id)).toBe(false);
        seen.add(current.concept_id);
        store.getState().updateMastery(current.concept_id, false);
      }
      store.getState().endPractice();
      if (session === 1) {
        store = createConceptStore('test');
        await store.getState().loadConcepts();
      }
    }
    expect(seen.size).toBe(9);
  });

  it('does not pin the first case again when another session is requested', async () => {
    window.history.replaceState({}, '', '/');
    const store = storeWithConcepts();
    expect(store.getState().practiceQuestions[0].id).toBe('instant_starter_ukmla_1168_v2');
    store.getState().setPracticeSelection(concepts.slice(0, 3).map(item => item.concept_id));
    await store.getState().startPractice(config);
    expect(store.getState().practiceQuestions).toHaveLength(3);
    store.getState().setPracticeSelection(concepts.slice(3, 6).map(item => item.concept_id));
    await store.getState().startPractice(config);
    expect(store.getState().practiceQuestions.map(item => item.concept_id).sort()).toEqual(['concept-3', 'concept-4', 'concept-5']);
    expect(createConceptStore('test').getState().practiceQuestions).toHaveLength(0);
  });

  it('does not inject a starter into an existing learner or a saved session', () => {
    window.history.replaceState({}, '', '/');
    localStorage.setItem('test_user_concepts', JSON.stringify([{ ...concepts[0], mastery_data: { attempts: 1 } }]));
    expect(createConceptStore('test').getState().practiceQuestions).toHaveLength(0);
    writeLaunchSessionDraft({ questions: [question('concept-1', 1)], answers: [], currentIndex: 0, showReview: false,
      reviewingQuestionIndex: null, startedAt: Date.now(), learnerScope: 'guest' });
    expect(createConceptStore('other').getState().practiceQuestions).toHaveLength(0);
  });

  it('recognises a duplicate question under a new cache ID and asks for a new scenario', async () => {
    const prior = question('concept-0', 99);
    rememberPreparedQuestions('test', [prior], concepts);
    mocks.cached.mockResolvedValue([{ ...prior, id: 'another-cache-id', question_format: 'ukmla_sba' }]);
    mocks.generate.mockResolvedValueOnce({ ...prior, id: 'new-ai-id' }).mockResolvedValueOnce(question('concept-0', 100));
    const store = storeWithConcepts();
    store.getState().setPracticeSelection(['concept-0']);
    await store.getState().startPractice({ ...config, question_count: 1, replace_current: true });
    expect(mocks.generate).toHaveBeenCalledTimes(2);
    expect(mocks.generate.mock.calls[0][0].previousQuestions).toEqual([prior.question_stem]);
    expect(store.getState().practiceQuestions[0].question_stem).toContain('scenario 100');
    expect(readPracticeHistory('other')).toEqual([]);
  });
});
