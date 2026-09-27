import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// The legacy generated schema predates Relationships. Narrow this client to
// the new table while retaining the existing shared auth/session connection.
type FeedbackDatabase = { public: {
  Tables: { pilot_feedback: Database['public']['Tables']['pilot_feedback'] & { Relationships: [] } };
  Views: Record<string, never>;
  Functions: Record<string, never>;
} };
const feedbackClient = supabase as unknown as SupabaseClient<FeedbackDatabase>;

export const FEEDBACK_REACTIONS = [
  { value: 'useful', label: 'Useful' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'not_useful', label: 'Not useful' },
] as const;

export const FEEDBACK_TOPICS = [
  { value: 'unclear', label: 'Hard to understand' },
  { value: 'bug', label: 'Something broke' },
  { value: 'content', label: 'Question or answer issue' },
  { value: 'progress', label: 'My progress' },
  { value: 'tutor', label: 'The tutor' },
  { value: 'idea', label: 'An idea' },
] as const;

export type FeedbackReaction = typeof FEEDBACK_REACTIONS[number]['value'];
export type FeedbackTopic = typeof FEEDBACK_TOPICS[number]['value'];
export type FeedbackContext = {
  source: 'home' | 'practice' | 'session_complete';
  questionId?: string;
  answeredCount?: number;
  caseCount?: number;
};

export type PilotFeedback = {
  id: string;
  reaction: FeedbackReaction | null;
  topics: FeedbackTopic[];
  message: string;
  usedVoice: boolean;
  context: FeedbackContext;
};

export async function submitPilotFeedback(feedback: PilotFeedback): Promise<void> {
  const message = feedback.message.trim();
  if (!feedback.reaction && !feedback.topics.length && !message) throw new Error('empty_feedback');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    // Do not request a returned row: feedback is write-only for every learner.
    // Keep the same random ID on retry so a lost response cannot create duplicates.
    const { error } = await feedbackClient.from('pilot_feedback').insert({
      id: feedback.id,
      reaction: feedback.reaction,
      topics: feedback.topics,
      message: message.slice(0, 2000),
      used_voice: feedback.usedVoice,
      source: feedback.context.source,
      question_id: feedback.context.questionId?.slice(0, 200) || null,
      answered_count: feedback.context.answeredCount ?? null,
      case_count: feedback.context.caseCount ?? null,
    }).abortSignal(controller.signal);
    if (error && error.code !== '23505') throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
