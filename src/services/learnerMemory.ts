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

const LOCAL_KEY_PREFIX = 'studyedit_cloud_learner_events_v2:';
const MAX_LOCAL_EVENTS = 500;
const HYDRATE_TTL_MS = 5 * 60 * 1000;
let hydratePromise: Promise<void> | null = null;
let lastHydratedAt = 0;
let lastHydratedScope = '';

const localKey = (scope: string) => `${LOCAL_KEY_PREFIX}${scope}`;

function parseArray(value: string | null): any[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeLocalEvents(scope: string, incoming: any[]) {
  if (typeof window === 'undefined' || !incoming.length) return;
  try {
    const existing = parseArray(localStorage.getItem(localKey(scope)));
    const byId = new Map<string, any>();
    [...incoming, ...existing].forEach((event: any) => {
      const id = String(event?.id || `${event?.event_type || 'event'}_${event?.created_at || ''}_${event?.question_id || ''}_${event?.concept_id || ''}`);
      if (id) byId.set(id, event);
    });
    const compact = Array.from(byId.values())
      .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
      .slice(0, MAX_LOCAL_EVENTS);
    localStorage.setItem(localKey(scope), JSON.stringify(compact));
  } catch {
    // Learner memory must never interrupt practice.
  }
}

export function readCloudLearnerEvents(scope: string): any[] {
  if (typeof window === 'undefined') return [];
  try {
    return parseArray(localStorage.getItem(localKey(scope)));
  } catch {
    return [];
  }
}

export async function hydrateLearnerMemoryFromCloud(force = false): Promise<void> {
  // Personalisation is useful, but it must never sit on the tutor's critical path.
  // If a refresh is already running (normally started while the learner reads the
  // question), later tutor calls use the local snapshot immediately rather than
  // queueing behind the same network request.
  if (!force && hydratePromise) return;

  hydratePromise = (async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;
      if (!force && lastHydratedScope === user.id && lastHydratedAt && Date.now() - lastHydratedAt < HYDRATE_TTL_MS) return;

      const { data, error } = await (supabase as any)
        .from('learner_events')
        .select('id,event_type,concept_id,concept_title,question_id,payload,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(300);

      if (error || !Array.isArray(data)) return;
      mergeLocalEvents(user.id, data);
      lastHydratedScope = user.id;
    } catch {
      // Offline or unavailable cloud memory should gracefully fall back to local memory.
    }
  })();

  try {
    await hydratePromise;
  } finally {
    lastHydratedAt = Date.now();
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

    if (!error && data) mergeLocalEvents(user.id, [data]);
  } catch {
    // Logging is deliberately non-blocking.
  }
}
