/**
 * Curated learning sessions - pre-designed learning paths
 * These are shown when users have no practice history or as recommended sessions
 */

export interface CuratedSession {
  id: string;
  title: string;
  description: string;
  icon: string;
  estimatedMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  conceptFilters: string[]; // Filters to select concepts
  conceptCount: number; // Target number of concepts
  tags: string[];
}

export const CURATED_SESSIONS: CuratedSession[] = [
  {
    id: 'intro-acs',
    title: 'Introduction to Acute Coronary Syndrome',
    description: 'Master the fundamentals of ACS: pathophysiology, presentation, and initial management',
    icon: '❤️',
    estimatedMinutes: 25,
    difficulty: 'beginner',
    conceptFilters: ['cardiology', 'ACS', 'acute coronary syndrome'],
    conceptCount: 15,
    tags: ['cardiology', 'emergency', 'high-yield'],
  },
  {
    id: 'resp-basics',
    title: 'Respiratory Emergencies Essentials',
    description: 'Key concepts in acute respiratory conditions: asthma, COPD, pneumonia',
    icon: '🫁',
    estimatedMinutes: 30,
    difficulty: 'beginner',
    conceptFilters: ['respiratory', 'emergency'],
    conceptCount: 20,
    tags: ['respiratory', 'emergency', 'common'],
  },
  {
    id: 'neuro-stroke',
    title: 'Stroke Recognition & Management',
    description: 'Comprehensive stroke pathway: recognition, imaging, thrombolysis, and complications',
    icon: '🧠',
    estimatedMinutes: 35,
    difficulty: 'intermediate',
    conceptFilters: ['neurology', 'stroke', 'cerebrovascular'],
    conceptCount: 18,
    tags: ['neurology', 'emergency', 'time-critical'],
  },
  {
    id: 'gi-bleeding',
    title: 'GI Bleeding Workup',
    description: 'Upper and lower GI bleeding: causes, risk stratification, and management',
    icon: '🩸',
    estimatedMinutes: 28,
    difficulty: 'intermediate',
    conceptFilters: ['gastroenterology', 'bleeding', 'GI bleed'],
    conceptCount: 16,
    tags: ['gastroenterology', 'emergency'],
  },
  {
    id: 'sepsis-bundle',
    title: 'Sepsis Six & Management',
    description: 'Early recognition and evidence-based management of sepsis',
    icon: '🦠',
    estimatedMinutes: 30,
    difficulty: 'beginner',
    conceptFilters: ['infectious disease', 'sepsis', 'emergency'],
    conceptCount: 20,
    tags: ['infectious-disease', 'emergency', 'critical'],
  },
  {
    id: 'diabetes-acute',
    title: 'Acute Diabetic Emergencies',
    description: 'DKA, HHS, and hypoglycemia: recognition and management protocols',
    icon: '💉',
    estimatedMinutes: 32,
    difficulty: 'intermediate',
    conceptFilters: ['endocrinology', 'diabetes', 'DKA', 'hypoglycemia'],
    conceptCount: 18,
    tags: ['endocrinology', 'emergency'],
  },
  {
    id: 'ecg-basics',
    title: 'ECG Interpretation Fundamentals',
    description: 'Systematic ECG analysis: rhythm, axis, ischemia, and common abnormalities',
    icon: '📈',
    estimatedMinutes: 40,
    difficulty: 'beginner',
    conceptFilters: ['cardiology', 'ECG', 'interpretation'],
    conceptCount: 25,
    tags: ['cardiology', 'skills', 'essential'],
  },
  {
    id: 'renal-aki',
    title: 'Acute Kidney Injury Essentials',
    description: 'AKI classification, causes, investigation, and management',
    icon: '🫘',
    estimatedMinutes: 28,
    difficulty: 'intermediate',
    conceptFilters: ['nephrology', 'AKI', 'acute kidney injury'],
    conceptCount: 16,
    tags: ['nephrology', 'common'],
  },
];

/**
 * Get recommended curated sessions based on user's current state
 */
export function getRecommendedCuratedSessions(
  attemptedConcepts: number,
  totalConcepts: number,
  weakCategories: string[] = []
): CuratedSession[] {
  // If user is just starting (< 10% attempted), show beginner sessions
  if (attemptedConcepts < totalConcepts * 0.1) {
    return CURATED_SESSIONS.filter(s => s.difficulty === 'beginner').slice(0, 3);
  }

  // If user has weak categories, prioritize those
  if (weakCategories.length > 0) {
    const matchingSessions = CURATED_SESSIONS.filter(s =>
      s.tags.some(tag => weakCategories.includes(tag))
    );
    if (matchingSessions.length > 0) {
      return matchingSessions.slice(0, 3);
    }
  }

  // Otherwise, show a mix of beginner and intermediate
  return [
    ...CURATED_SESSIONS.filter(s => s.difficulty === 'beginner').slice(0, 2),
    ...CURATED_SESSIONS.filter(s => s.difficulty === 'intermediate').slice(0, 1),
  ];
}

/**
 * Select concepts for a curated session
 */
export function selectConceptsForCuratedSession(
  session: CuratedSession,
  allConcepts: Array<{
    id: string;
    title: string;
    custom_filters: string[];
    attempts: number;
  }>
): string[] {
  // Filter concepts that match the session's filters
  const matchingConcepts = allConcepts.filter(concept =>
    session.conceptFilters.some(filter =>
      concept.custom_filters.some(cf =>
        cf.toLowerCase().includes(filter.toLowerCase())
      )
    )
  );

  // Prioritize unseen concepts for curated sessions
  const unseenConcepts = matchingConcepts.filter(c => c.attempts === 0);
  
  // If we have enough unseen concepts, use those
  if (unseenConcepts.length >= session.conceptCount) {
    return unseenConcepts
      .slice(0, session.conceptCount)
      .map(c => c.id);
  }

  // Otherwise, mix unseen with seen
  const seenConcepts = matchingConcepts.filter(c => c.attempts > 0);
  return [
    ...unseenConcepts.map(c => c.id),
    ...seenConcepts.slice(0, session.conceptCount - unseenConcepts.length).map(c => c.id),
  ];
}
