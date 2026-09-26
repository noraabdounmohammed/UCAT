import type { QuestionData } from '@/components/practice/questionTypes';
import type { SessionAnswer } from '@/components/practice/SessionProgressDropdown';

export const LEARNING_UPDATED_EVENT = 'studyedit:learning-updated';
export const recentSessionKey = (scope: string) => `studyedit_recent_session_v2:${scope}`;

export type LearningItem = {
  questionIndex: number;
  conceptId?: string;
  title: string;
  isCorrect: boolean;
  confidence?: SessionAnswer['confidence'];
  passedChecks: number;
};

export type RecentSession = {
  startedAt: number;
  updatedAt: number;
  completed: boolean;
  answered: number;
  correct: number;
  total: number;
  items: LearningItem[];
};

export function learningItems(answers: SessionAnswer[], questions: QuestionData[]): LearningItem[] {
  return answers.slice().sort((a, b) => a.questionIndex - b.questionIndex).map(answer => {
    const question = questions[answer.questionIndex];
    return {
      questionIndex: answer.questionIndex,
      conceptId: question?.concept_id,
      title: String(question?.concept_title || question?.title || question?.topic || `Case ${answer.questionIndex + 1}`),
      isCorrect: answer.isCorrect,
      confidence: answer.confidence,
      passedChecks: Math.max(0, answer.passedChecks || 0),
    };
  });
}

export function needsRevisit(item: LearningItem): boolean {
  return item.passedChecks === 0 && (!item.isCorrect || item.confidence === 'guess' || item.confidence === 'unsure');
}

export function evidenceLabel(item: LearningItem): string {
  if (item.passedChecks > 0) return 'Follow-up check answered correctly';
  if (!item.isCorrect) return 'Revisit with your tutor';
  if (item.confidence === 'guess') return 'Correct answer · guessed';
  if (item.confidence === 'unsure') return 'Correct answer · unsure';
  return 'Answered correctly';
}

export function readRecentSession(scope: string): RecentSession | null {
  try {
    const session = JSON.parse(localStorage.getItem(recentSessionKey(scope)) || 'null') as RecentSession | null;
    return session && Array.isArray(session.items) && Number.isFinite(session.startedAt)
      && Number.isFinite(session.answered) && Number.isFinite(session.correct) ? session : null;
  } catch {
    return null;
  }
}

export function rememberRecentSession(scope: string, session: RecentSession) {
  try {
    const previous = readRecentSession(scope);
    // An older tab must not replace a newer session or a more complete result.
    if (previous && (previous.startedAt > session.startedAt
      || (previous.startedAt === session.startedAt && previous.answered > session.answered))) return;
    if (previous?.startedAt === session.startedAt) {
      session = {
        ...session,
        completed: session.completed || previous.completed,
        items: session.items.map(item => ({ ...item, passedChecks: Math.max(item.passedChecks,
          previous.items.find(old => old.questionIndex === item.questionIndex)?.passedChecks || 0) })),
      };
    }
    localStorage.setItem(recentSessionKey(scope), JSON.stringify(session));
    window.dispatchEvent(new CustomEvent(LEARNING_UPDATED_EVENT));
  } catch {
    // Practice must continue if device storage is unavailable.
  }
}

export function saveSessionLearning(scope: string, questions: QuestionData[], answers: SessionAnswer[], startedAt: number, completed: boolean) {
  if (!answers.length) return;
  rememberRecentSession(scope, {
    startedAt, updatedAt: Date.now(), completed,
    answered: answers.length, correct: answers.filter(answer => answer.isCorrect).length,
    total: questions.length, items: learningItems(answers, questions),
  });
}
