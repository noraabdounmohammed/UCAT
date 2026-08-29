import { supabase } from '@/lib/supabase';

export type LearnerMemoryEventType = 'confidence' | 'question_result' | 'answer_context' | 'teaching_interaction';

export interface LearnerMemoryEventInput {
  event_type: LearnerMemoryEventType;
  concept_id?: string | null;
  concept_title?: string | null;
  question_id?: string | null;
  payload?: Record<string, unknown>;
  created_at?: string;
}

const LOCAL_KEY = 'studyedit_cloud_learner_events_v1';
const MAX_LOCAL_EVENTS = 500;
let hydratePromise: Promise<void> | null = null;

function parseArray(value: string | null): any[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeLocalEvents(incoming: any[]) {
  if (typeof window === 'undefined' || !incoming.length) return;
  try {
    const existing = parseArray(localStorage.getItem(LOCAL_KEY));
    const byId = new Map<string, any>();
    [...incoming, ...existing].forEach((event: any) => {
      const id = String(event?.id || `${event?.event_type || 'event'}_${event?.created_at || ''}_${event?.question_id || ''}_${event?.concept_id || ''}`);
      if (id) byId.set(id, event);
    });
    const compact = Array.from(byId.values())
      .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
      .slice(0, MAX_LOCAL_EVENTS);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(compact));
  } catch {
    // Learner memory must never interrupt practice.
  }
}

export function readCloudLearnerEvents(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    return parseArray(localStorage.getItem(LOCAL_KEY));
  } catch {
    return [];
  }
}

export async function hydrateLearnerMemoryFromCloud(force = false): Promise<void> {
  if (!force && hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('learner_events')
        .select('id,event_type,concept_id,concept_title,question_id,payload,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(300);

      if (error || !Array.isArray(data)) return;
      mergeLocalEvents(data);
    } catch {
      // Offline or unavailable cloud memory should gracefully fall back to local memory.
    }
  })();

  try {
    await hydratePromise;
  } finally {
    hydratePromise = null;
  }
}

export async function persistLearnerMemoryEvent(event: LearnerMemoryEventInput): Promise<void> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

    const row = {
      user_id: user.id,
      event_type: event.event_type,
      concept_id: event.concept_id || null,
      concept_title: event.concept_title || null,
      question_id: event.question_id || null,
      payload: event.payload || {},
      created_at: event.created_at || new Date().toISOString(),
    };

    const { data, error } = await (supabase as any)
      .from('learner_events')
      .insert(row)
      .select('id,event_type,concept_id,concept_title,question_id,payload,created_at')
      .single();

    if (!error && data) mergeLocalEvents([data]);
  } catch {
    // Logging is deliberately non-blocking.
  }
}
