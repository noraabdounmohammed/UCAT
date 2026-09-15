export type EvidenceAssistance = 'independent' | 'prompted' | 'hinted' | 'taught';
export type EvidenceKind = 'answer' | 'confidence' | 'learner_reasoning' | 'tutor_assessment' | 'self_correction' | 'transfer' | 'session_end';
export type TutorAssessment = 'pass' | 'partial' | 'fail' | 'clarify';

export interface LearningEvidenceEvent {
  id: string;
  at: string;
  kind: EvidenceKind;
  questionId?: string;
  conceptId?: string;
  conceptTitle?: string;
  capability?: string;
  correct?: boolean;
  confidence?: 'know' | 'unsure' | 'guess' | null;
  assistance: EvidenceAssistance;
  assessment?: TutorAssessment;
  learnerText?: string;
  tutorPrompt?: string;
  source: 'sba' | 'tutor';
}

export interface ConceptEvidenceState {
  conceptKey: string;
  conceptTitle: string;
  attempts: number;
  independentCorrect: number;
  independentIncorrect: number;
  assistedPasses: number;
  delayedPasses: number;
  lastSeenAt?: string;
  state: 'unseen' | 'developing' | 'demonstrated' | 'due_for_retrieval';
}

const LEDGER_KEY = 'studyedit_learning_evidence_v1';
const MAX_EVENTS = 4000;

function storage(): Storage | null {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}

export function readEvidenceLedger(): LearningEvidenceEvent[] {
  const s = storage(); if (!s) return [];
  try { const parsed = JSON.parse(s.getItem(LEDGER_KEY) || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

export function recordEvidence(event: Omit<LearningEvidenceEvent, 'id' | 'at'> & { at?: string }): LearningEvidenceEvent {
  const full: LearningEvidenceEvent = {
    ...event,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    at: event.at || new Date().toISOString(),
  };
  const s = storage();
  if (s) {
    try { const next = [...readEvidenceLedger(), full].slice(-MAX_EVENTS); s.setItem(LEDGER_KEY, JSON.stringify(next)); } catch {}
  }
  return full;
}

export function conceptEvidenceStates(events = readEvidenceLedger()): ConceptEvidenceState[] {
  const grouped = new Map<string, LearningEvidenceEvent[]>();
  events.forEach(event => {
    const key = String(event.conceptId || event.conceptTitle || '').trim();
    if (!key) return;
    grouped.set(key, [...(grouped.get(key) || []), event]);
  });
  return Array.from(grouped.entries()).map(([conceptKey, rows]) => {
    const answers = rows.filter(row => row.kind === 'answer');
    const independentCorrect = answers.filter(row => row.assistance === 'independent' && row.correct).length;
    const independentIncorrect = answers.filter(row => row.assistance === 'independent' && row.correct === false).length;
    const assistedPasses = rows.filter(row => row.kind === 'tutor_assessment' && row.assessment === 'pass').length;
    const delayedPasses = rows.filter(row => row.kind === 'transfer' && row.assistance === 'independent' && row.assessment === 'pass').length;
    const lastSeenAt = rows.map(row => row.at).sort().at(-1);
    const ageDays = lastSeenAt ? (Date.now() - new Date(lastSeenAt).getTime()) / 86400000 : 0;
    let state: ConceptEvidenceState['state'] = 'developing';
    if (independentCorrect >= 2 || delayedPasses >= 1) state = ageDays >= 14 ? 'due_for_retrieval' : 'demonstrated';
    return { conceptKey, conceptTitle: rows.find(row => row.conceptTitle)?.conceptTitle || conceptKey, attempts: answers.length, independentCorrect, independentIncorrect, assistedPasses, delayedPasses, lastSeenAt, state };
  });
}

export function learnerEvidenceSummary(events = readEvidenceLedger()) {
  const states = conceptEvidenceStates(events);
  return {
    evidencedConcepts: states.length,
    demonstrated: states.filter(item => item.state === 'demonstrated').length,
    developing: states.filter(item => item.state === 'developing').length,
    dueForRetrieval: states.filter(item => item.state === 'due_for_retrieval').length,
    states,
  };
}
