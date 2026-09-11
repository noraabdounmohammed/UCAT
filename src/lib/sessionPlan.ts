export type SessionBlueprintCase = {
  system: string;
  skill: string;
};

export type SpoilerSafeSessionPlan = {
  selected: any[];
  count: number;
  minutes: number;
  systems: string[];
  skills: string[];
  systemCounts: Array<{ label: string; count: number }>;
  skillCounts: Array<{ label: string; count: number }>;
  reasonCounts: Array<{ label: string; count: number }>;
  cases: SessionBlueprintCase[];
  request?: string;
  requestMatched?: boolean;
};

export const PLANNED_SESSION_IDS_KEY = 'studyedit_planned_concept_ids_v1';
export const PLANNED_SESSION_BLUEPRINT_KEY = 'studyedit_session_blueprint_v1';

const systemLabels: Record<string, string> = {
  cardiology: 'Cardiology',
  cardiovascular: 'Cardiology',
  respiratory: 'Respiratory',
  endocrinology: 'Endocrinology',
  gastroenterology: 'Gastroenterology',
  neurology: 'Neurology',
  psychiatry: 'Psychiatry',
  psychology: 'Psychiatry',
  renal: 'Renal',
  nephrology: 'Renal',
  dermatology: 'Dermatology',
  ophthalmology: 'Ophthalmology',
  haematology: 'Haematology',
  hematology: 'Haematology',
  rheumatology: 'Rheumatology',
  oncology: 'Oncology',
  paediatrics: 'Paediatrics',
  pediatrics: 'Paediatrics',
  obstetrics: 'Obstetrics & gynaecology',
  gynaecology: 'Obstetrics & gynaecology',
  gynecology: 'Obstetrics & gynaecology',
  surgery: 'Surgery',
  infectious: 'Infectious disease',
  'infectious-disease': 'Infectious disease',
  'infectious-diseases': 'Infectious disease',
};

const skillLabels: Record<string, string> = {
  diagnosis: 'Diagnosis',
  investigations: 'Investigations',
  investigation: 'Investigations',
  'clinical-assessment': 'Clinical assessment',
  symptoms: 'Clinical assessment',
  management: 'Management',
  treatment: 'Management',
  pharmacology: 'Management',
  'risk-stratification': 'Risk decisions',
  'ecg-interpretation': 'Interpretation',
  interpretation: 'Interpretation',
  pathophysiology: 'Mechanisms',
  mechanism: 'Mechanisms',
  classification: 'Classification',
  prognosis: 'Prognosis',
  etiology: 'Causes & risk',
  aetiology: 'Causes & risk',
  'risk-factors': 'Causes & risk',
};

const systemIntentTerms: Record<string, string[]> = {
  Cardiology: ['cardiology', 'cardio', 'heart', 'cardiac'],
  Respiratory: ['respiratory', 'resp', 'lung', 'lungs'],
  Endocrinology: ['endocrinology', 'endo', 'endocrine', 'diabetes'],
  Gastroenterology: ['gastroenterology', 'gastro', 'gi', 'bowel', 'liver'],
  Neurology: ['neurology', 'neuro', 'neurological'],
  Psychiatry: ['psychiatry', 'psych', 'mental health'],
  Renal: ['renal', 'nephrology', 'kidney', 'kidneys'],
  Dermatology: ['dermatology', 'derm', 'skin'],
  Ophthalmology: ['ophthalmology', 'ophthal', 'eye', 'eyes'],
  Haematology: ['haematology', 'hematology', 'haem', 'blood'],
  Rheumatology: ['rheumatology', 'rheum'],
  Oncology: ['oncology', 'cancer'],
  Paediatrics: ['paediatrics', 'pediatrics', 'paeds', 'peds', 'children'],
  'Obstetrics & gynaecology': ['obstetrics', 'gynaecology', 'gynecology', 'obgyn', 'obs and gynae'],
  Surgery: ['surgery', 'surgical'],
  'Infectious disease': ['infectious disease', 'infection', 'infections'],
};

const skillIntentTerms: Record<string, string[]> = {
  Diagnosis: ['diagnosis', 'diagnose', 'diagnostic'],
  Investigations: ['investigations', 'investigation', 'tests', 'workup'],
  'Clinical assessment': ['clinical assessment', 'signs', 'symptoms', 'presentation'],
  Management: ['management', 'treatment', 'treat', 'therapy', 'medications', 'drugs'],
  'Risk decisions': ['risk', 'risk stratification', 'escalation'],
  Interpretation: ['interpretation', 'interpret', 'ecg', 'x-ray', 'xray', 'imaging'],
  Mechanisms: ['mechanism', 'mechanisms', 'pathophysiology', 'physiology'],
  Classification: ['classification', 'classify', 'staging'],
  Prognosis: ['prognosis', 'outcomes'],
  'Causes & risk': ['causes', 'aetiology', 'etiology', 'risk factors'],
};

function deterministicJitter(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 1000) / 1000;
}

export function conceptPriority(concept: any, now = Date.now()) {
  const md = concept?.mastery_data || {};
  const attempts = Number(md.attempts || 0);
  const incorrect = Number(md.incorrect || 0);
  const lapses = Number(md.fsrs_lapses || 0);
  const masteryLevel = Number(md.mastery_level || 0);
  const coverageNeed = attempts === 0 ? 0.46 : 0;
  const smoothedErrorRate = (incorrect + 1) / (attempts + 2);
  const weakness = attempts > 0 ? smoothedErrorRate * 0.42 : 0;
  const explicitWeakness = masteryLevel === 1 ? 0.16 : 0;
  const dueAt = md.fsrs_due_at ? new Date(md.fsrs_due_at).getTime() : null;
  const isDue = dueAt !== null && Number.isFinite(dueAt) && dueAt <= now;
  const overdueDays = isDue && dueAt !== null ? Math.max(0, (now - dueAt) / 86_400_000) : 0;
  const forgetting = isDue ? 0.22 + Math.min(overdueDays / 60, 0.12) : 0;
  const lapseSignal = Math.min(lapses * 0.025, 0.1);
  const uncertainty = attempts === 0 ? 0.08 : 0.08 / Math.sqrt(attempts + 1);
  const importance = concept?.importance || {};
  const examWeight = Number(importance.exam_weight ?? concept?.exam_weight ?? 0);
  const examBoost = Number.isFinite(examWeight) && examWeight > 0 ? Math.min(examWeight, 5) * 0.025 : 0;
  const safetyBoost = importance.safety_critical === true || concept?.safety_critical === true ? 0.14 : 0;
  const coreBoost = importance.core === true || concept?.core === true ? 0.07 : 0;
  const jitter = deterministicJitter(String(concept?.concept_id || concept?.title || '')) * 0.015;
  return coverageNeed + weakness + explicitWeakness + forgetting + lapseSignal + uncertainty + examBoost + safetyBoost + coreBoost + jitter;
}

export function chooseRecommendedConcepts(concepts: any[], count: number) {
  return [...(concepts || [])]
    .map(concept => ({ concept, score: conceptPriority(concept) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(count, concepts?.length || 0))
    .map(item => item.concept);
}

function tagsFor(concept: any): string[] {
  return (concept?.custom_filters || concept?.tags || [])
    .map((tag: unknown) => String(tag || '').trim().toLowerCase())
    .filter(Boolean);
}

function systemFor(concept: any) {
  const tags = tagsFor(concept);
  for (const tag of tags) if (systemLabels[tag]) return systemLabels[tag];
  return 'General medicine';
}

function skillFor(concept: any) {
  const tags = tagsFor(concept);
  for (const tag of tags) if (skillLabels[tag]) return skillLabels[tag];
  return 'Clinical reasoning';
}

function reasonFor(concept: any, now = Date.now()) {
  const md = concept?.mastery_data || {};
  const attempts = Number(md.attempts || 0);
  const correct = Number(md.correct || 0);
  const incorrect = Number(md.incorrect || 0);
  const masteryLevel = Number(md.mastery_level || 0);
  const dueAt = md.fsrs_due_at ? new Date(md.fsrs_due_at).getTime() : null;
  if (dueAt !== null && Number.isFinite(dueAt) && dueAt <= now) return 'Due to revisit';
  if (attempts === 0) return 'Not tested yet';
  if (masteryLevel === 1 || incorrect > correct) return 'Needs another look';
  return 'Reinforcement';
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function counts(values: string[]) {
  const map = new Map<string, number>();
  values.forEach(value => map.set(value, (map.get(value) || 0) + 1));
  return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
}

function includesTerm(value: string, term: string) {
  const haystack = ` ${value.toLowerCase()} `;
  const needle = term.toLowerCase().trim();
  if (!needle) return false;
  if (needle.length <= 3) return new RegExp(`(?:^|\\s|[/,+-])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s|[/,+-])`, 'i').test(value);
  return haystack.includes(needle);
}

function requestedMinutes(request: string) {
  const match = request.match(/\b(\d{1,2})\s*(?:min|mins|minute|minutes)\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? Math.max(2, Math.min(40, value)) : null;
}

function requestedLabels(request: string, dictionary: Record<string, string[]>) {
  const clean = request.toLowerCase();
  return Object.entries(dictionary)
    .filter(([, terms]) => terms.some(term => includesTerm(clean, term)))
    .map(([label]) => label);
}

function conceptMatchesRequest(concept: any, systems: string[], skills: string[], request: string) {
  const systemMatch = systems.length === 0 || systems.includes(systemFor(concept));
  const skillMatch = skills.length === 0 || skills.includes(skillFor(concept));
  if (systems.length || skills.length) return systemMatch && skillMatch;

  const generic = request
    .toLowerCase()
    .replace(/\b(?:just|start|me|please|study|practice|practise|test|questions?|case|cases|minutes?|mins?|minute|min|for|some|a|an|the|of|on|about|today|now)\b/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (generic.length < 3) return true;

  const searchable = [concept?.title, concept?.content, ...tagsFor(concept)].join(' ').toLowerCase();
  return generic.split(' ').some(word => word.length >= 3 && searchable.includes(word));
}

export function buildSpoilerSafeSessionPlan(concepts: any[], count: number): SpoilerSafeSessionPlan {
  const selected = chooseRecommendedConcepts(concepts, count);
  const cases = selected.map(concept => ({ system: systemFor(concept), skill: skillFor(concept) }));
  const systems = cases.map(item => item.system);
  const skills = cases.map(item => item.skill);
  const reasons = selected.map(concept => reasonFor(concept));
  return {
    selected,
    count: selected.length,
    minutes: Math.max(3, Math.round(selected.length * 2)),
    systems: unique(systems),
    skills: unique(skills),
    systemCounts: counts(systems),
    skillCounts: counts(skills),
    reasonCounts: counts(reasons),
    cases,
  };
}

export function buildSessionPlanFromRequest(concepts: any[], request: string, fallbackCount: number): SpoilerSafeSessionPlan {
  const clean = String(request || '').trim();
  if (!clean) return buildSpoilerSafeSessionPlan(concepts, fallbackCount);

  const minutes = requestedMinutes(clean);
  const desiredCount = minutes ? Math.max(1, Math.min(12, Math.round(minutes / 2))) : fallbackCount;
  const systems = requestedLabels(clean, systemIntentTerms);
  const skills = requestedLabels(clean, skillIntentTerms);
  const matchedPool = (concepts || []).filter(concept => conceptMatchesRequest(concept, systems, skills, clean));
  const useMatched = matchedPool.length > 0;
  const plan = buildSpoilerSafeSessionPlan(useMatched ? matchedPool : concepts, desiredCount);

  return {
    ...plan,
    minutes: minutes || plan.minutes,
    request: clean,
    requestMatched: useMatched,
  };
}

export function rememberPlannedSession(plan: SpoilerSafeSessionPlan) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PLANNED_SESSION_IDS_KEY, JSON.stringify(plan.selected.map(concept => concept.concept_id).filter(Boolean)));
    window.sessionStorage.setItem(PLANNED_SESSION_BLUEPRINT_KEY, JSON.stringify({
      count: plan.count,
      minutes: plan.minutes,
      systems: plan.systems,
      skills: plan.skills,
      systemCounts: plan.systemCounts,
      skillCounts: plan.skillCounts,
      reasonCounts: plan.reasonCounts,
      cases: plan.cases,
      request: plan.request || '',
    }));
  } catch {
    // A blocked sessionStorage should never stop a learner from starting.
  }
}

export function resolvePlannedConcepts(concepts: any[], count: number) {
  if (typeof window !== 'undefined') {
    try {
      const ids = JSON.parse(window.sessionStorage.getItem(PLANNED_SESSION_IDS_KEY) || '[]');
      if (Array.isArray(ids) && ids.length) {
        const byId = new Map((concepts || []).map(concept => [concept.concept_id, concept]));
        const planned = ids.map(id => byId.get(id)).filter(Boolean).slice(0, count);
        if (planned.length === Math.min(count, ids.length)) return planned;
      }
    } catch {
      // Fall through to a fresh deterministic recommendation.
    }
  }
  return chooseRecommendedConcepts(concepts, count);
}
