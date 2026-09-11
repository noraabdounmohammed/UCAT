import { beforeEach, describe, expect, it } from 'vitest';
import {
  PLANNED_SESSION_BLUEPRINT_KEY,
  PLANNED_SESSION_IDS_KEY,
  buildSessionPlanFromRequest,
  buildSpoilerSafeSessionPlan,
  rememberPlannedSession,
  resolvePlannedConcepts,
} from '@/lib/sessionPlan';

function concept(
  id: string,
  title: string,
  filters: string[],
  attempts = 0,
  correct = 0,
  incorrect = 0,
) {
  return {
    concept_id: id,
    title,
    content: `Private teaching content for ${title}`,
    custom_filters: filters,
    mastery_data: {
      attempts,
      correct,
      incorrect,
      mastery_level: incorrect > correct ? 1 : 0,
      last_practiced: null,
    },
  };
}

const curriculum = [
  concept('cardio-1', 'Aortic stenosis escalation', ['cardiology', 'management'], 2, 1, 1),
  concept('cardio-2', 'Heart failure medicines', ['cardiology', 'treatment'], 0),
  concept('cardio-3', 'NSTEMI treatment', ['cardiology', 'pharmacology'], 0),
  concept('cardio-4', 'Atrial fibrillation management', ['cardiology', 'management'], 0),
  concept('cardio-5', 'Hypertension treatment', ['cardiology', 'treatment'], 0),
  concept('cardio-6', 'Pericarditis management', ['cardiology', 'management'], 0),
  concept('resp-1', 'Asthma diagnosis', ['respiratory', 'diagnosis'], 0),
  concept('resp-2', 'COPD diagnosis', ['respiratory', 'diagnosis'], 0),
  concept('resp-3', 'Pulmonary embolism diagnosis', ['respiratory', 'diagnosis'], 0),
  concept('neuro-1', 'Guillain-Barre syndrome', ['neurology', 'diagnosis'], 0),
];

describe('agent session planning', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('understands time, clinical area and skill together', () => {
    const plan = buildSessionPlanFromRequest(curriculum, '10 minutes of cardiology management', 3);

    expect(plan.minutes).toBe(10);
    expect(plan.count).toBe(5);
    expect(plan.requestMatched).toBe(true);
    expect(plan.systemCounts).toEqual([{ label: 'Cardiology', count: 5 }]);
    expect(plan.skillCounts).toEqual([{ label: 'Management', count: 5 }]);
    expect(plan.selected.every(item => item.custom_filters.includes('cardiology'))).toBe(true);
  });

  it('respects an explicit case count without revealing future diagnoses', () => {
    const plan = buildSessionPlanFromRequest(curriculum, '3 respiratory questions', 5);

    expect(plan.count).toBe(3);
    expect(plan.systemCounts).toEqual([{ label: 'Respiratory', count: 3 }]);
    expect(plan.cases).toEqual([
      { system: 'Respiratory', skill: 'Diagnosis' },
      { system: 'Respiratory', skill: 'Diagnosis' },
      { system: 'Respiratory', skill: 'Diagnosis' },
    ]);
  });

  it('stores only spoiler-safe scope for the progress sheet', () => {
    const plan = buildSpoilerSafeSessionPlan(curriculum, 3);
    const exactTitles = plan.selected.map(item => item.title);

    rememberPlannedSession(plan);

    const storedBlueprint = sessionStorage.getItem(PLANNED_SESSION_BLUEPRINT_KEY) || '';
    const storedIds = JSON.parse(sessionStorage.getItem(PLANNED_SESSION_IDS_KEY) || '[]');

    expect(storedIds).toHaveLength(3);
    expect(storedBlueprint).toContain('systemCounts');
    expect(storedBlueprint).toContain('skillCounts');
    exactTitles.forEach(title => expect(storedBlueprint).not.toContain(title));
    expect(storedBlueprint).not.toContain('Private teaching content');
  });

  it('uses the exact planned concepts when the learner starts the session', () => {
    const plan = buildSessionPlanFromRequest(curriculum, '3 respiratory questions', 5);
    rememberPlannedSession(plan);

    const resolved = resolvePlannedConcepts(curriculum, 3);

    expect(resolved.map(item => item.concept_id)).toEqual(plan.selected.map(item => item.concept_id));
  });
});
