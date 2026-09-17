import { hydrateLearnerMemoryFromCloud, persistLearnerMemoryEvent, readCloudLearnerEvents } from '@/services/learnerMemory';
import { supabase } from '@/lib/supabase';
import { getLearnerFirstName } from '@/lib/learnerIdentity';
import { getUserCurriculumId } from '@/utils/curriculumScope';

export interface QuestionContext {
  question: string;
  options: string[];
  correctAnswer: string;
  selectedAnswer: string | null;
  explanation: string;
}

interface CacheEntry {
  response: string;
  timestamp: number;
}

interface LearnerEvent {
  id: string;
  kind: 'confidence' | 'question_result' | 'answer_context';
  at: string;
  concept?: string;
  confidence?: string;
  correct?: boolean;
  evidenceClass?: string;
  topic?: string;
  skill?: string;
  status?: string;
  selectedAnswer?: string | null;
  correctAnswer?: string;
  questionFingerprint?: string;
}

interface LearnerSnapshot {
  conceptEvidence: Array<{
    title: string;
    attempts: number;
    correct: number;
    incorrect: number;
    masteryLevel: number;
    lastPracticed?: string | null;
  }>;
  recentConfidenceSignals: Array<{
    concept?: string;
    confidence?: string;
    correct?: boolean;
    evidenceClass?: string;
    at?: string;
  }>;
  recentQuestionResults: Array<{
    topic?: string;
    skill?: string;
    status?: string;
    timestamp?: string;
  }>;
  recentAnswerContexts: Array<{
    selectedAnswer?: string | null;
    correctAnswer?: string;
    questionFingerprint?: string;
    at?: string;
  }>;
}

const CACHE_EXPIRY_MS = 60 * 60 * 1000;
const LEARNER_EVENTS_KEY_PREFIX = 'studyedit_learner_events_v2:';
const MAX_PERSISTED_EVENTS = 500;
const responseCache: Record<string, CacheEntry> = {};
const cloudSyncedEventIds = new Set<string>();
const TUTOR_ASSESSMENT_PATTERN = /Return exactly ONE label[\s\S]*PASS, PARTIAL, FAIL, or CLARIFY/i;

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function safelyParse(value: string | null): any {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

async function currentLearnerIdentity(): Promise<{ firstName: string | null; scope: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      firstName: getLearnerFirstName(session?.user || null),
      scope: session?.user?.id || 'guest',
    };
  } catch {
    return { firstName: null, scope: 'guest' };
  }
}

function learnerEventsKey(scope: string) {
  return `${LEARNER_EVENTS_KEY_PREFIX}${scope}`;
}

function readLearnerEvents(scope: string): LearnerEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = safelyParse(localStorage.getItem(learnerEventsKey(scope)));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLearnerEvents(scope: string, events: LearnerEvent[]) {
  if (typeof window === 'undefined') return;
  try {
    const deduped = new Map<string, LearnerEvent>();
    events.forEach(event => {
      if (event?.id) deduped.set(event.id, event);
    });
    const compact = Array.from(deduped.values())
      .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
      .slice(0, MAX_PERSISTED_EVENTS);
    localStorage.setItem(learnerEventsKey(scope), JSON.stringify(compact));
  } catch {
    // Memory persistence must never interrupt practice.
  }
}

function mirrorEventToCloud(event: LearnerEvent) {
  if (cloudSyncedEventIds.has(event.id)) return;
  cloudSyncedEventIds.add(event.id);

  const common = {
    created_at: event.at,
    concept_title: event.concept || null,
    payload: {} as Record<string, unknown>,
  };

  if (event.kind === 'confidence') {
    void persistLearnerMemoryEvent({
      ...common,
      event_type: 'confidence',
      payload: {
        confidence: event.confidence,
        correct: event.correct,
        evidence_class: event.evidenceClass,
        local_event_id: event.id,
      },
    });
    return;
  }

  if (event.kind === 'question_result') {
    void persistLearnerMemoryEvent({
      ...common,
      event_type: 'question_result',
      payload: {
        topic: event.topic,
        skill: event.skill,
        status: event.status,
        local_event_id: event.id,
      },
    });
    return;
  }

  void persistLearnerMemoryEvent({
    ...common,
    event_type: 'answer_context',
    question_id: event.questionFingerprint || null,
    payload: {
      selected_answer: event.selectedAnswer,
      correct_answer: event.correctAnswer,
      question_fingerprint: event.questionFingerprint,
      local_event_id: event.id,
    },
  });
}

function persistSessionLearningSignals(scope: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = readLearnerEvents(scope);
    const additions: LearnerEvent[] = [];

    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith('learning_frontier_')) continue;
      const signal = safelyParse(sessionStorage.getItem(key));
      if (!signal?.at) continue;

      if (key.includes('_answer_confidence_')) {
        const event: LearnerEvent = {
          id: `confidence_${stableHash(`${key}_${signal.at}`)}`,
          kind: 'confidence',
          at: signal.at,
          concept: signal.concept,
          confidence: signal.value,
          correct: signal.correct,
          evidenceClass: signal.evidence_class,
        };
        additions.push(event);
        mirrorEventToCloud(event);
      }
    }

    if (additions.length) writeLearnerEvents(scope, [...additions, ...existing]);
  } catch {
    // Personalisation memory is opportunistic and must never block learning.
  }
}

function persistQuestionProgress(scope: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = readLearnerEvents(scope);
    const additions: LearnerEvent[] = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(`question_progress_${scope}_`)) continue;
      const result = safelyParse(localStorage.getItem(key));
      if (!result?.timestamp) continue;
      const event: LearnerEvent = {
        id: `question_${stableHash(`${key}_${result.timestamp}`)}`,
        kind: 'question_result',
        at: result.timestamp,
        topic: result.topic,
        skill: result.skill,
        status: result.status,
      };
      additions.push(event);
      mirrorEventToCloud(event);
    }

    if (additions.length) writeLearnerEvents(scope, [...additions, ...existing]);
  } catch {
    // Personalisation memory is opportunistic and must never block learning.
  }
}

function persistAnswerContext(scope: string, context: QuestionContext) {
  if (typeof window === 'undefined' || !context.selectedAnswer) return;
  try {
    const questionFingerprint = stableHash(`${context.question}|${context.options.join('|')}`);
    const selected = context.selectedAnswer || null;
    const correct = context.correctAnswer || '';
    const event: LearnerEvent = {
      id: `answer_${stableHash(`${questionFingerprint}_${selected}_${correct}`)}`,
      kind: 'answer_context',
      at: new Date().toISOString(),
      selectedAnswer: selected,
      correctAnswer: correct,
      questionFingerprint,
    };
    writeLearnerEvents(scope, [event, ...readLearnerEvents(scope)]);
    mirrorEventToCloud(event);
  } catch {
    // Answer memory must never interrupt feedback.
  }
}

function syncPersistentLearnerMemory(scope: string, context?: QuestionContext) {
  persistSessionLearningSignals(scope);
  persistQuestionProgress(scope);
  if (context) persistAnswerContext(scope, context);
}

function cloudEventsToLocal(scope: string): LearnerEvent[] {
  return readCloudLearnerEvents(scope).map((event: any): LearnerEvent | null => {
    const payload = event?.payload || {};
    const at = event?.created_at || new Date().toISOString();
    const id = String(event?.id || payload.local_event_id || stableHash(JSON.stringify(event)));

    if (event?.event_type === 'confidence') {
      return {
        id: `cloud_${id}`,
        kind: 'confidence',
        at,
        concept: event.concept_title || undefined,
        confidence: payload.confidence,
        correct: payload.correct,
        evidenceClass: payload.evidence_class,
      };
    }
    if (event?.event_type === 'question_result') {
      return {
        id: `cloud_${id}`,
        kind: 'question_result',
        at,
        topic: payload.topic,
        skill: payload.skill,
        status: payload.status,
      };
    }
    if (event?.event_type === 'answer_context') {
      return {
        id: `cloud_${id}`,
        kind: 'answer_context',
        at,
        selectedAnswer: payload.selected_answer,
        correctAnswer: payload.correct_answer,
        questionFingerprint: payload.question_fingerprint || event.question_id,
      };
    }
    return null;
  }).filter(Boolean) as LearnerEvent[];
}

function buildLearnerSnapshot(scope: string): LearnerSnapshot {
  if (typeof window === 'undefined') {
    return { conceptEvidence: [], recentConfidenceSignals: [], recentQuestionResults: [], recentAnswerContexts: [] };
  }

  syncPersistentLearnerMemory(scope);

  const conceptEvidence: LearnerSnapshot['conceptEvidence'] = [];
  const recentConfidenceSignals: LearnerSnapshot['recentConfidenceSignals'] = [];
  const recentQuestionResults: LearnerSnapshot['recentQuestionResults'] = [];
  const recentAnswerContexts: LearnerSnapshot['recentAnswerContexts'] = [];

  try {
    const curriculumId = getUserCurriculumId(scope === 'guest' ? null : scope);
    const concepts = safelyParse(localStorage.getItem(`${curriculumId}_user_concepts`));
    if (Array.isArray(concepts)) {
      concepts.forEach((concept: any) => {
        const md = concept?.mastery_data || {};
        const attempts = Number(md.attempts || 0);
        if (!attempts) return;
        conceptEvidence.push({
          title: String(concept.title || concept.concept_title || concept.concept_id || 'Concept'),
          attempts,
          correct: Number(md.correct || 0),
          incorrect: Number(md.incorrect || 0),
          masteryLevel: Number(md.mastery_level || 0),
          lastPracticed: md.last_practiced || md.fsrs_last_review || null,
        });
      });
    }

    const combinedEvents = [...(scope === 'guest' ? [] : cloudEventsToLocal(scope)), ...readLearnerEvents(scope)];
    const seen = new Set<string>();
    combinedEvents.forEach(event => {
      const signature = `${event.kind}|${event.at}|${event.concept || ''}|${event.selectedAnswer || ''}|${event.topic || ''}`;
      if (seen.has(signature)) return;
      seen.add(signature);

      if (event.kind === 'confidence') {
        recentConfidenceSignals.push({
          concept: event.concept,
          confidence: event.confidence,
          correct: event.correct,
          evidenceClass: event.evidenceClass,
          at: event.at,
        });
      }
      if (event.kind === 'question_result') {
        recentQuestionResults.push({
          topic: event.topic,
          skill: event.skill,
          status: event.status,
          timestamp: event.at,
        });
      }
      if (event.kind === 'answer_context') {
        recentAnswerContexts.push({
          selectedAnswer: event.selectedAnswer,
          correctAnswer: event.correctAnswer,
          questionFingerprint: event.questionFingerprint,
          at: event.at,
        });
      }
    });
  } catch {
    // Personalisation must never block the learning flow.
  }

  conceptEvidence.sort((a, b) => {
    const at = a.lastPracticed ? new Date(a.lastPracticed).getTime() : 0;
    const bt = b.lastPracticed ? new Date(b.lastPracticed).getTime() : 0;
    return bt - at || b.attempts - a.attempts;
  });
  recentConfidenceSignals.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
  recentQuestionResults.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  recentAnswerContexts.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());

  return {
    conceptEvidence: conceptEvidence.slice(0, 40),
    recentConfidenceSignals: recentConfidenceSignals.slice(0, 30),
    recentQuestionResults: recentQuestionResults.slice(0, 40),
    recentAnswerContexts: recentAnswerContexts.slice(0, 30),
  };
}

export function getLearnerContextSnapshot(): LearnerSnapshot {
  return buildLearnerSnapshot('guest');
}

function compactLearnerContext(snapshot: LearnerSnapshot): string {
  const conceptLines = snapshot.conceptEvidence.slice(0, 18).map(item => {
    const accuracy = item.attempts ? Math.round((item.correct / item.attempts) * 100) : 0;
    return `- ${item.title}: ${item.correct}/${item.attempts} correct (${accuracy}%), mastery level ${item.masteryLevel}${item.lastPracticed ? `, last ${item.lastPracticed}` : ''}`;
  });

  const confidenceLines = snapshot.recentConfidenceSignals.slice(0, 12).map(item =>
    `- ${item.concept || 'Concept'}: ${item.correct ? 'correct' : 'incorrect'}, confidence=${item.confidence || 'unknown'}, evidence=${item.evidenceClass || 'unknown'}`
  );

  const recentLines = snapshot.recentQuestionResults.slice(0, 12).map(item =>
    `- ${item.topic || 'Unknown topic'}${item.skill ? ` / ${item.skill}` : ''}: ${item.status || 'unknown'}`
  );

  const answerLines = snapshot.recentAnswerContexts.slice(0, 8).map(item =>
    `- prior answer: selected=${item.selectedAnswer || 'unknown'}; correct=${item.correctAnswer || 'unknown'}; item=${item.questionFingerprint || 'unknown'}`
  );

  if (!conceptLines.length && !confidenceLines.length && !recentLines.length && !answerLines.length) {
    return 'No reliable prior learner history is available yet.';
  }

  return [
    conceptLines.length ? `CONCEPT RETRIEVAL HISTORY:\n${conceptLines.join('\n')}` : '',
    confidenceLines.length ? `CONFIDENCE / METACOGNITIVE HISTORY:\n${confidenceLines.join('\n')}` : '',
    recentLines.length ? `RECENT QUESTION RESULTS:\n${recentLines.join('\n')}` : '',
    answerLines.length ? `RECENT ANSWER-CHOICE HISTORY:\n${answerLines.join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
}

function buildCacheKey(userQuery: string, context: QuestionContext, learnerName: string | null, scope: string): string {
  const learnerSnapshot = buildLearnerSnapshot(scope);
  const fingerprint = JSON.stringify({
    query: userQuery.trim(),
    question: context.question,
    options: context.options,
    correctAnswer: context.correctAnswer,
    selectedAnswer: context.selectedAnswer,
    explanation: context.explanation,
    learnerName,
    learnerSnapshot,
  });
  return `ai_${stableHash(fingerprint)}`;
}

function buildUserPrompt(userQuery: string, context: QuestionContext, learnerName: string | null, scope: string): string {
  syncPersistentLearnerMemory(scope, context);
  const learnerContext = compactLearnerContext(buildLearnerSnapshot(scope));
  return `LEARNER IDENTITY\nFirst name: ${learnerName || 'Not supplied'}\n\nCURRENT QUESTION CONTEXT\n\nQUESTION / VIGNETTE:\n${context.question}\n\nOPTIONS:\n${context.options.join('\n') || 'Not supplied'}\n\nSTUDENT SELECTED:\n${context.selectedAnswer || 'Not supplied'}\n\nCORRECT ANSWER:\n${context.correctAnswer}\n\nGROUNDING EXPLANATION:\n${context.explanation || 'Not supplied'}\n\nLONGITUDINAL LEARNER MEMORY\n${learnerContext}\n\nUSER REQUEST:\n${userQuery}\n\nTEACHING POLICY\n- The current question and grounding explanation are the clinical source of truth. Learner memory is for personalisation, not for inventing medical facts.\n- If a first name is supplied, use it sparingly and naturally. Good moments are a session opening, a meaningful redirect, after resolving a misconception, or at closure. Do not address the learner by name in every reply.\n- Make personalisation visible through teaching choices, not flattery: adapt depth, questioning and examples to the supplied history and current confidence.\n- Treat history as longitudinal evidence, not as a licence to overclaim. Only mention a repeated pattern when multiple supplied observations support it.\n- If the learner repeatedly misses a related concept or discriminator, make that pattern explicit and focus on it.\n- If the learner has repeatedly retrieved prerequisite material successfully, skip basic reteaching and teach the missing layer.\n- A correct low-confidence response is weaker evidence than confident retrieval. A confident incorrect response can indicate a misconception.\n- The selected wrong option is diagnostic information. Explain why it was tempting and the clue or principle that should have shifted the decision when the supplied context supports that.\n- Prefer the shortest explanation that changes this learner's future decision-making.\n- Never expose internal scores, mastery levels, storage fields, event IDs, fingerprints or system terminology to the learner.\n- For visible tutor replies, make exactly ONE teaching move. Usually use 1-3 short sentences. Never give an unsolicited option-by-option review.\n- If you ask a Quick check, it must be ONE free-text question. Do not create A/B/C/D/E options or partial answer lists inside a tutor reply.\n- Never say the learner has made this mistake before, has a recurring pattern, or has a history of an error unless multiple explicit memory observations in LONGITUDINAL LEARNER MEMORY support that exact claim. Prefer not to mention history at all unless it materially improves the teaching move.\n- Finish every visible reply cleanly. Never end on a heading, colon, conjunction, option label, or unfinished sentence.\n- Keep the answer concise and action-oriented.`;
}

const systemPrompt = `You are StudyEdit, an expert medical education assistant for UKMLA AKT students.
- Be concise, clear and clinically careful.
- Use the supplied current-question context as the clinical source of truth.
- Personalise teaching using the supplied longitudinal learner memory when relevant.
- When a learner first name is supplied, use it like an excellent human tutor would: occasionally and purposefully, never mechanically.
- Make the learner feel known by remembering demonstrated strengths, uncertainty and recurring gaps, but never invent a pattern that is not in the supplied evidence.
- The student's selected answer is explicitly provided when known; never claim it was not provided if it appears in the context.
- Do not contradict the supplied correct answer or grounding explanation.
- Do not invent prior learner history, references, links, guidelines or unsupported medical facts.
- Prefer teaching the learner's exact misconception, discriminator or uncertainty over repeating a generic textbook explanation.
- If prior evidence suggests the learner already knows prerequisite material, skip it and teach the missing layer.
- Use light markdown only when it improves skimming.
- Visible tutor replies are conversational turns, not mini-essays: make one teaching move, normally 1-3 short sentences.
- Never produce an unsolicited option-by-option explanation.
- A Quick check must be one free-text question only; never invent A/B/C/D/E choices in tutor conversation.
- Never claim the learner has made an error before or has a recurring pattern unless multiple explicit memory observations supplied in this request prove that exact claim.
- Always finish the reply cleanly; never end mid-heading, mid-list or mid-sentence.
- Do not use motivational filler, emojis, dramatic language or generic AI preambles.
- If the supplied information is insufficient, say so briefly.`;

type AiPurpose = 'tutor' | 'assessment' | 'repair';

type ProxyMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  externalSignal?: AbortSignal,
  timeoutMs = 18_000,
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(new DOMException('Tutor timed out', 'TimeoutError')), timeoutMs);
  const abortFromExternal = () => controller.abort(externalSignal?.reason);
  externalSignal?.addEventListener('abort', abortFromExternal, { once: true });

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abortFromExternal);
  }
}

async function requestAi(
  purpose: AiPurpose,
  messages: ProxyMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetchWithTimeout('/.netlify/functions/ai-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose, messages }),
  }, signal);

  if (!response.ok) throw new Error(`StudyEdit tutor unavailable (${response.status})`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('StudyEdit tutor returned no content');
  return content.trim();
}

async function requestTutorStream(
  messages: ProxyMessage[],
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetchWithTimeout('/.netlify/functions/ai-tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose: 'tutor', messages }),
  }, signal, 24_000);

  if (!response.ok || !response.body) throw new Error(`StudyEdit tutor unavailable (${response.status})`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullResponse = '';

  const consumeEvent = (event: string) => {
    event.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) return;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') return;
      try {
        const parsed = JSON.parse(payload);
        const token = parsed?.choices?.[0]?.delta?.content;
        if (typeof token !== 'string' || !token) return;
        fullResponse += token;
        onToken(token);
      } catch {
        // A partial SSE frame remains in `buffer`; malformed complete frames are ignored.
      }
    });
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || '';
    events.forEach(consumeEvent);
    if (done) break;
  }
  if (buffer.trim()) consumeEvent(buffer);
  if (!fullResponse.trim()) throw new Error('StudyEdit tutor returned no content');
  return fullResponse.trim();
}

function isInvalidTutorOutput(text: string): boolean {
  const clean = String(text || '').trim();
  if (!clean) return true;
  if (clean.length > 750) return true;
  if (/your history|same .*error.*before|you(?:'ve| have) (?:made|chosen|missed|confused).*before/i.test(clean)) return true;
  if (/(?:^|\n)\s*(?:[-*•]\s*)?[A-E][.)]\s*$/m.test(clean)) return true;
  if (/Quick check[\s\S]*(?:\n|^)\s*(?:[-*•]\s*)?[A-E][.)]\s+/i.test(clean)) return true;
  if (/\b(?:Why|Because|And|But|So|Then|Which|What|How)\s*$/i.test(clean)) return true;
  if (!/[.!?][\s\"'”’)*_]*$/.test(clean)) return true;
  return false;
}

function conciseTutorFallback(context: QuestionContext): string {
  const grounding = String(context.explanation || '').replace(/\s+/g, ' ').trim();
  const firstTwo = grounding.match(/[^.!?]+[.!?]+/g)?.slice(0, 2).join(' ').trim() || grounding;
  const correct = context.correctAnswer ? `The correct answer is **${context.correctAnswer}**. ` : '';
  const teaching = firstTwo || 'Use the decisive clinical clue in the case to choose the management step.';
  return `${correct}${teaching}`.trim();
}

async function repairTutorOutput(
  userQuery: string,
  context: QuestionContext,
  learnerName: string | null,
  scope: string,
  draft: string,
): Promise<string> {
  try {
    const repaired = await requestAi('repair', [
      {
        role: 'system',
        content: 'You are repairing a StudyEdit tutor turn before it is shown to a medical student. Return ONLY the repaired learner-facing turn. Use the supplied clinical context as ground truth. Make exactly one pedagogical move in 1-3 short sentences. If a check is useful, ask exactly one free-text question prefixed "Quick check:". Never create multiple-choice options. Never claim prior mistakes or recurring history. Never review every option unless the learner explicitly asked. End with a complete sentence or question.',
      },
      {
        role: 'user',
        content: `${buildUserPrompt(userQuery, context, learnerName, scope)}\n\nDRAFT TO REPAIR:\n${draft}`,
      },
    ]);
    return repaired && !isInvalidTutorOutput(repaired) ? repaired : conciseTutorFallback(context);
  } catch (error) {
    console.error('Tutor repair failed:', error);
    return conciseTutorFallback(context);
  }
}

function buildFastAssessmentPrompt(userQuery: string, context: QuestionContext): string {
  return `CURRENT QUESTION:\n${context.question}\n\nOPTIONS:\n${context.options.join('\n') || 'Not supplied'}\n\nSTUDENT SELECTED:\n${context.selectedAnswer || 'Not supplied'}\n\nCORRECT ANSWER:\n${context.correctAnswer}\n\nGROUNDING EXPLANATION:\n${context.explanation || 'Not supplied'}\n\nASSESSMENT TASK:\n${userQuery}`;
}

async function generateFastTutorAssessment(userQuery: string, context: QuestionContext): Promise<string> {
  try {
    const raw = (await requestAi('assessment', [
      {
        role: 'system',
        content: 'You are a fast hidden medical tutoring classifier. Return exactly one label: PASS, PARTIAL, FAIL, or CLARIFY. Use only the supplied current-question context. Do not explain your answer.',
      },
      { role: 'user', content: buildFastAssessmentPrompt(userQuery, context) },
    ])).toUpperCase();
    if (raw.includes('CLARIFY')) return 'CLARIFY';
    if (raw.includes('PASS')) return 'PASS';
    if (raw.includes('FAIL')) return 'FAIL';
    if (raw.includes('PARTIAL')) return 'PARTIAL';
    return 'PARTIAL';
  } catch (error) {
    console.error('Fast tutor assessment failed:', error);
    return 'PARTIAL';
  }
}

export async function generateAIResponseStream(
  userQuery: string,
  context: QuestionContext,
  onToken: (token: string) => void,
  onStart?: () => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  await hydrateLearnerMemoryFromCloud();
  const { firstName: learnerName, scope } = await currentLearnerIdentity();

  const cacheKey = buildCacheKey(userQuery, context, learnerName, scope);
  const cached = responseCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS && !isInvalidTutorOutput(cached.response)) {
    onStart?.();
    onToken(cached.response);
    return cached.response;
  }

  try {
    onStart?.();
    const fullResponse = await requestTutorStream(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUserPrompt(userQuery, context, learnerName, scope) },
      ],
      onToken,
      abortSignal,
    );

    const safeResponse = isInvalidTutorOutput(fullResponse)
      ? await repairTutorOutput(userQuery, context, learnerName, scope, fullResponse)
      : fullResponse.trim();

    if (safeResponse) responseCache[cacheKey] = { response: safeResponse, timestamp: Date.now() };
    return safeResponse;
  } catch (error) {
    if (abortSignal?.aborted) throw error;
    console.error('Error generating AI response stream:', error);
    throw error;
  }
}

export async function generateAIResponse(userQuery: string, context: QuestionContext): Promise<string> {
  // Learner free-response checks previously paid for the full personalisation path
  // before the visible tutor could answer. These controller requests only need one
  // label, so classify them with a tiny current-question prompt and no memory/auth
  // round trip. This removes a serial latency step from every Quick Check reply.
  if (TUTOR_ASSESSMENT_PATTERN.test(userQuery)) {
    return generateFastTutorAssessment(userQuery, context);
  }

  await hydrateLearnerMemoryFromCloud();
  const { firstName: learnerName, scope } = await currentLearnerIdentity();

  const cacheKey = buildCacheKey(userQuery, context, learnerName, scope);
  const cached = responseCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) return cached.response;

  try {
    const result = await requestAi('tutor', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUserPrompt(userQuery, context, learnerName, scope) },
    ]);
    if (!result) return generateFallbackResponse(userQuery, context);
    responseCache[cacheKey] = { response: result, timestamp: Date.now() };
    return result;
  } catch (error) {
    console.error('DeepSeek API error:', error);
    return generateFallbackResponse(userQuery, context);
  }
}

export function generateFallbackResponse(_userQuery: string, context: QuestionContext): string {
  const selected = context.selectedAnswer ? `You selected **${context.selectedAnswer}**. ` : '';
  const correct = context.correctAnswer ? `The correct answer is **${context.correctAnswer}**.` : '';
  const grounding = context.explanation?.trim();

  if (grounding) return `${selected}${correct}\n\n${grounding}`.trim();

  return `${selected}${correct}\n\nI couldn't generate the personalised explanation just now. Use the answer feedback shown on this question and try the tutor again in a moment.`.trim();
}
