import type { QuestionData } from '@/components/practice/questionTypes';
import type { SessionAnswer } from '@/components/practice/SessionProgressDropdown';

export const LAUNCH_SESSION_DRAFT_KEY = 'studyedit_launch_session_v2';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface LaunchSessionDraft {
  version: 2;
  questions: QuestionData[];
  answers: SessionAnswer[];
  currentIndex: number;
  showReview: boolean;
  reviewingQuestionIndex: number | null;
  startedAt: number;
  updatedAt: number;
  syncedUserIds?: string[];
  learnerScope?: string;
}

export function readLaunchSessionDraft(learnerScope?: string): LaunchSessionDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LAUNCH_SESSION_DRAFT_KEY) || 'null') as LaunchSessionDraft | null;
    if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.questions) || !parsed.questions.length || !Array.isArray(parsed.answers)) return null;
    const owner = parsed.learnerScope || parsed.syncedUserIds?.[0] || 'guest';
    if (learnerScope && owner !== learnerScope && owner !== 'guest') return null;
    if (!parsed.updatedAt || Date.now() - parsed.updatedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(LAUNCH_SESSION_DRAFT_KEY);
      return null;
    }
    // The original starter used a canonical ID, while progress uses JSON-file IDs.
    return { ...parsed, questions: parsed.questions.map(question => question.id === 'instant_starter_ukmla_1168_v2'
      ? { ...question, concept_id: 'cardiovascular_concepts_clean.json_886' } : question) };
  } catch {
    return null;
  }
}

export function writeLaunchSessionDraft(draft: Omit<LaunchSessionDraft, 'version' | 'updatedAt'>) {
  if (typeof window === 'undefined') return;
  try {
    const existing = readLaunchSessionDraft();
    const sameSession = existing?.startedAt === draft.startedAt;
    if (existing && (existing.startedAt > draft.startedAt || (sameSession && existing.answers.length > draft.answers.length))) return;
    const owner = existing?.learnerScope || existing?.syncedUserIds?.[0] || 'guest';
    if (sameSession && owner !== 'guest' && owner !== draft.learnerScope) return;
    window.localStorage.setItem(LAUNCH_SESSION_DRAFT_KEY, JSON.stringify({
      ...draft,
      showReview: draft.showReview || Boolean(sameSession && existing?.showReview && draft.reviewingQuestionIndex === null),
      answers: draft.answers.map(answer => ({ ...answer, passedChecks: Math.max(answer.passedChecks || 0,
        sameSession ? existing?.answers.find(old => old.questionIndex === answer.questionIndex)?.passedChecks || 0 : 0) })),
      version: 2,
      updatedAt: Date.now(),
      syncedUserIds: draft.syncedUserIds || (sameSession ? existing?.syncedUserIds : []) || [],
    } satisfies LaunchSessionDraft));
  } catch {
    // A draft improves continuity but must never interrupt practice.
  }
}

export function markLaunchSessionDraftSynced(userId: string) {
  const draft = readLaunchSessionDraft();
  if (!draft) return;
  writeLaunchSessionDraft({
    ...draft,
    learnerScope: userId,
    syncedUserIds: Array.from(new Set([...(draft.syncedUserIds || []), userId])),
  });
}

export function clearLaunchSessionDraft() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LAUNCH_SESSION_DRAFT_KEY);
}
