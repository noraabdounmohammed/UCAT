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
}

export function readLaunchSessionDraft(): LaunchSessionDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LAUNCH_SESSION_DRAFT_KEY) || 'null') as LaunchSessionDraft | null;
    if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.questions) || !parsed.questions.length || !Array.isArray(parsed.answers)) return null;
    if (!parsed.updatedAt || Date.now() - parsed.updatedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(LAUNCH_SESSION_DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeLaunchSessionDraft(draft: Omit<LaunchSessionDraft, 'version' | 'updatedAt'>) {
  if (typeof window === 'undefined') return;
  try {
    const existing = readLaunchSessionDraft();
    window.localStorage.setItem(LAUNCH_SESSION_DRAFT_KEY, JSON.stringify({
      ...draft,
      version: 2,
      updatedAt: Date.now(),
      syncedUserIds: draft.syncedUserIds || existing?.syncedUserIds || [],
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
    syncedUserIds: Array.from(new Set([...(draft.syncedUserIds || []), userId])),
  });
}

export function clearLaunchSessionDraft() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LAUNCH_SESSION_DRAFT_KEY);
}

