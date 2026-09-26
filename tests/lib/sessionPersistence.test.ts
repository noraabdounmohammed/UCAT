import { beforeEach, describe, expect, it } from 'vitest';
import { markLaunchSessionDraftSynced, readLaunchSessionDraft, writeLaunchSessionDraft } from '@/lib/launchSessionDraft';
import { readRecentSession, saveSessionLearning } from '@/lib/sessionLearning';

const questions = [{ id: 'q1', concept_title: 'Reperfusion', options: [] }];
const answer = { questionIndex: 0, isCorrect: false, selectedOption: 'B', confidence: 'unsure' as const };

describe('session persistence across navigation and tabs', () => {
  beforeEach(() => localStorage.clear());

  it('retains a completed result and tutor evidence when an older tab saves', () => {
    const startedAt = Date.now();
    const draft = { questions, answers: [{ ...answer, passedChecks: 1 }], currentIndex: 0, showReview: true, reviewingQuestionIndex: null, startedAt, learnerScope: 'guest' };
    writeLaunchSessionDraft(draft);
    saveSessionLearning('guest', questions, draft.answers, startedAt, true);
    writeLaunchSessionDraft({ ...draft, answers: [answer], showReview: false });
    saveSessionLearning('guest', questions, [answer], startedAt, false);
    expect(readLaunchSessionDraft('guest')).toMatchObject({ showReview: true, answers: [{ passedChecks: 1 }] });
    expect(readRecentSession('guest')).toMatchObject({ completed: true, correct: 0, answered: 1, items: [{ passedChecks: 1 }] });

    saveSessionLearning('guest', questions, [{ ...answer, isCorrect: true }], startedAt - 1, true);
    expect(readRecentSession('guest')?.correct).toBe(0);
  });

  it('claims a guest draft for one account and prevents stale tabs from making it public again', () => {
    const draft = { questions, answers: [answer], currentIndex: 0, showReview: true, reviewingQuestionIndex: null, startedAt: Date.now(), learnerScope: 'guest' };
    writeLaunchSessionDraft(draft);
    expect(readLaunchSessionDraft('alice')).not.toBeNull();
    markLaunchSessionDraftSynced('alice');
    writeLaunchSessionDraft(draft);
    expect(readLaunchSessionDraft('alice')?.learnerScope).toBe('alice');
    expect(readLaunchSessionDraft('bob')).toBeNull();
    expect(readLaunchSessionDraft('guest')).toBeNull();
  });

  it('repairs the original starter ID so its answer updates the loaded concept', () => {
    writeLaunchSessionDraft({ questions: [{ ...questions[0], id: 'instant_starter_ukmla_1168_v2', concept_id: 'ukmla-1168' }], answers: [answer], currentIndex: 0, showReview: false, reviewingQuestionIndex: null, startedAt: Date.now() });
    expect(readLaunchSessionDraft()?.questions[0].concept_id).toBe('cardiovascular_concepts_clean.json_886');
  });
});
