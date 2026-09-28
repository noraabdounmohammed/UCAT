import { isPlaceholderQuestion } from '@/lib/practiceQuestionSafety';

export const RECENT_PRACTICE_MS = 30 * 60 * 1000;
const historyKey = (curriculumId: string) => `${curriculumId}_prepared_questions_v1`;
const normalise = (value: unknown) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

export function conceptIdentity(concept: any): string {
  const title = normalise(concept?.title || concept?.concept_title);
  const content = normalise(concept?.content || concept?.concept_content);
  return title && content ? `${title}\n${content}` : String(concept?.concept_id || title);
}

export function questionFingerprint(question: any): string {
  const stem = normalise(question?.question_stem || question?.clinical_vignette || question?.question);
  let hash = 2166136261;
  for (let i = 0; i < stem.length; i += 1) hash = Math.imul(hash ^ stem.charCodeAt(i), 16777619);
  return stem ? `${stem.length}:${hash >>> 0}` : '';
}

type PreparedQuestion = { conceptId: string; conceptKey: string; fingerprint: string; stem: string; preparedAt: number };

export function readPracticeHistory(curriculumId: string): PreparedQuestion[] {
  try {
    const stored = JSON.parse(localStorage.getItem(historyKey(curriculumId)) || '[]');
    return Array.isArray(stored) ? stored.filter(item => typeof item?.conceptId === 'string'
      && typeof item?.conceptKey === 'string' && typeof item?.fingerprint === 'string'
      && typeof item?.stem === 'string' && Number.isFinite(item?.preparedAt)).slice(-200) : [];
  } catch {
    return [];
  }
}

export function recentPracticeExclusions(curriculumId: string, now = Date.now()) {
  const recent = readPracticeHistory(curriculumId).filter(item => now - item.preparedAt < RECENT_PRACTICE_MS);
  return { recentConceptIds: recent.map(item => item.conceptId), recentConceptKeys: recent.map(item => item.conceptKey) };
}

export function rememberPreparedQuestions(curriculumId: string, questions: any[], concepts: any[]) {
  const byId = new Map(concepts.map(concept => [concept.concept_id, concept]));
  const preparedAt = Date.now();
  const additions = questions.filter(question => question?.concept_id && !isPlaceholderQuestion(question))
    .map(question => ({
      conceptId: question.concept_id,
      conceptKey: conceptIdentity(byId.get(question.concept_id) || question),
      fingerprint: questionFingerprint(question),
      stem: String(question.question_stem || question.clinical_vignette || question.question || '').slice(0, 2000),
      preparedAt,
    }));
  if (!additions.length) return;
  try {
    // Read at commit time so foreground/background generators cannot erase each other's history.
    localStorage.setItem(historyKey(curriculumId), JSON.stringify([...readPracticeHistory(curriculumId), ...additions].slice(-200)));
  } catch {
    // A storage limit must not block practice.
  }
}
