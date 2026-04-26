import type { CurriculumGoals } from '@/stores/goalsStore';
import type { ConceptNode } from '@/types/conceptTypes';

export type LessonType = 'lesson' | 'recap';
export type LessonStatus = 'locked' | 'next' | 'in_progress' | 'completed';

export interface Lesson {
  id: string;
  title: string;
  conceptIds: string[];
  type: LessonType;
  status: LessonStatus;
  progress: { completed: number; total: number };
}

export interface Unit {
  id: string;
  title: string;
  lessons: Lesson[];
  progress: { completed: number; total: number };
}

export interface LearningPlan {
  units: Unit[];
  version: 1;
  createdAtISO: string;
  updatedAtISO: string;
}

export interface TodayPlan {
  quickReviewIds: string[];
  weakWorkoutIds: string[];
  newLesson?: { lessonId: string; title: string; conceptIds: string[] };
  estimates: { quick: number; weak: number; newLesson?: number };
}

const STORAGE_PREFIX = 'learning_plan_v1_';

function isMastered(c: ConceptNode): boolean {
  const a = c.mastery_data.attempts;
  if (!a) return false;
  const acc = c.mastery_data.correct / a;
  return acc >= 0.7 || c.mastery_data.mastery_level >= 2;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

function estimateMinutes(count: number): number {
  return Math.max(1, Math.ceil((count * 45) / 60));
}

function buildUnitsFromFilters(concepts: ConceptNode[]): Unit[] {
  // Group by first custom filter; fallback to "Unit"
  const groups = new Map<string, ConceptNode[]>();
  concepts.forEach((c) => {
    const key = c.custom_filters?.[0] || 'Unit';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  });

  const units: Unit[] = [];
  let unitIndex = 1;
  for (const [key, list] of groups.entries()) {
    // Sort by prerequisite count (rough dependency order), then title
    const sorted = [...list].sort((a, b) => (a.prerequisites.length - b.prerequisites.length) || a.title.localeCompare(b.title));
    const chunks = chunk(sorted.map((c) => c.concept_id), 8);

    const lessons: Lesson[] = [];
    chunks.forEach((conceptIds, i) => {
      lessons.push({
        id: `${key.replace(/\s+/g, '-').toLowerCase()}-lesson-${i + 1}`,
        title: `Lesson ${i + 1}`,
        conceptIds,
        type: 'lesson',
        status: 'locked',
        progress: { completed: 0, total: conceptIds.length },
      });

      // Every 3 lessons add a recap of last 3 lessons
      if ((i + 1) % 3 === 0) {
        const start = Math.max(0, i - 2);
        const recapConceptIds = chunks.slice(start, i + 1).flat();
        lessons.push({
          id: `${key.replace(/\s+/g, '-').toLowerCase()}-recap-${(i + 1) / 3}`,
          title: 'Recap',
          conceptIds: recapConceptIds,
          type: 'recap',
          status: 'locked',
          progress: { completed: 0, total: recapConceptIds.length },
        });
      }
    });

    const unit: Unit = {
      id: `unit-${unitIndex++}`,
      title: key === 'Unit' ? `Unit ${units.length + 1}` : key,
      lessons,
      progress: { completed: 0, total: lessons.length },
    };
    units.push(unit);
  }

  return units;
}

function computeLessonStatus(lesson: Lesson, conceptMap: Map<string, ConceptNode>): LessonStatus {
  // Locked if any concept has unmet prerequisite (that exists in map and not mastered)
  for (const cid of lesson.conceptIds) {
    const c = conceptMap.get(cid);
    if (!c) continue;
    for (const pre of c.prerequisites) {
      const pc = conceptMap.get(pre);
      if (pc && !isMastered(pc)) return 'locked';
    }
  }
  // Progress
  const completed = lesson.conceptIds.filter((id) => {
    const c = conceptMap.get(id);
    return c ? isMastered(c) : false;
  }).length;
  const inProgress = completed > 0 && completed < lesson.conceptIds.length;
  if (completed === lesson.conceptIds.length) return 'completed';
  if (inProgress) return 'in_progress';
  return 'next';
}

export function buildLearningPlan(concepts: ConceptNode[], goals?: CurriculumGoals | null): LearningPlan {
  const conceptMap = new Map(concepts.map((c) => [c.concept_id, c] as const));
  const units = buildUnitsFromFilters(concepts);

  // Compute statuses and progress
  units.forEach((u) => {
    u.lessons.forEach((lsn) => {
      const completed = lsn.conceptIds.filter((id) => {
        const c = conceptMap.get(id);
        return c ? isMastered(c) : false;
      }).length;
      lsn.progress = { completed, total: lsn.conceptIds.length };
      lsn.status = computeLessonStatus(lsn, conceptMap);
    });
    const completedLessons = u.lessons.filter((l) => l.status === 'completed').length;
    u.progress = { completed: completedLessons, total: u.lessons.length };

    // Mark the first non-completed, non-locked as next
    const nextIdx = u.lessons.findIndex((l) => l.status === 'next' || l.status === 'in_progress');
    if (nextIdx > -1) {
      // Leave as computed
    }
  });

  const nowISO = new Date().toISOString();
  return { units, version: 1, createdAtISO: nowISO, updatedAtISO: nowISO };
}

export function getOrCreateLearningPlan(curriculumId: string, concepts: ConceptNode[], goals?: CurriculumGoals | null): LearningPlan {
  const key = STORAGE_PREFIX + curriculumId;
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      const plan = JSON.parse(cached) as LearningPlan;
      return plan;
    } catch {}
  }
  const plan = buildLearningPlan(concepts, goals);
  localStorage.setItem(key, JSON.stringify(plan));
  return plan;
}

export function saveLearningPlan(curriculumId: string, plan: LearningPlan) {
  const key = STORAGE_PREFIX + curriculumId;
  const updated = { ...plan, updatedAtISO: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(updated));
}

export function generateTodaysPlan(concepts: ConceptNode[], plan: LearningPlan, goals?: CurriculumGoals | null): TodayPlan {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Compute due, weak, unseen
  const due: ConceptNode[] = [];
  const weak: ConceptNode[] = [];
  const unseen: ConceptNode[] = [];

  for (const c of concepts) {
    const a = c.mastery_data.attempts;
    const score = a > 0 ? c.mastery_data.correct / a : 0;
    if (a === 0) {
      unseen.push(c);
      continue;
    }
    const last = c.mastery_data.last_practiced;
    if (last) {
      const days = (now - new Date(last).getTime()) / oneDayMs;
      if (score < 0.5 ? days > 1 : score < 0.7 ? days > 3 : days > 7) {
        due.push(c);
      }
    }
    if (a > 0 && score < 0.6) weak.push(c);
  }

  weak.sort((a, b) => (a.mastery_data.correct / Math.max(1, a.mastery_data.attempts)) - (b.mastery_data.correct / Math.max(1, b.mastery_data.attempts)));

  const quickReviewIds = due.slice(0, 12).map((c) => c.concept_id);
  const weakWorkoutIds = weak.slice(0, 10).map((c) => c.concept_id);

  // Pick next lesson: first lesson in plan with status next or in_progress
  let nextLesson: Lesson | undefined;
  outer: for (const u of plan.units) {
    for (const l of u.lessons) {
      if (l.status === 'next' || l.status === 'in_progress') { nextLesson = l; break outer; }
    }
  }

  const today: TodayPlan = {
    quickReviewIds,
    weakWorkoutIds,
    newLesson: nextLesson ? { lessonId: nextLesson.id, title: nextLesson.title, conceptIds: nextLesson.conceptIds } : undefined,
    estimates: {
      quick: estimateMinutes(quickReviewIds.length),
      weak: estimateMinutes(weakWorkoutIds.length),
      newLesson: nextLesson ? estimateMinutes(nextLesson.conceptIds.length) : undefined,
    }
  };

  return today;
}
