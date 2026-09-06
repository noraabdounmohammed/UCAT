import OpenAI from 'openai';
import { hydrateLearnerMemoryFromCloud, persistLearnerMemoryEvent, readCloudLearnerEvents } from '@/services/learnerMemory';
import { supabase } from '@/lib/supabase';
import { getLearnerFirstName } from '@/lib/learnerIdentity';

export interface QuestionContext {
  question: string;
  options: string[];
  correctAnswer: string;
  selectedAnswer: string | null;
  explanation: string;
}

export interface ConditionPrimerContext {
  condition: string;
  questionContext?: QuestionContext;
  keyFact?: string;
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
const LEARNER_EVENTS_KEY = 'studyedit_learner_events_v1';
const MAX_PERSISTED_EVENTS = 500;
const responseCache: Record<string, CacheEntry> = {};
const cloudSyncedEventIds = new Set<string>();

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

async function currentLearnerFirstName(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return getLearnerFirstName(session?.user || null);
  } catch {
    return null;
  }
}

function readLearnerEvents(): LearnerEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = safelyParse(localStorage.getItem(LEARNER_EVENTS_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLearnerEvents(events: LearnerEvent[]) {
  if (typeof window === 'undefined') return;
  try {
    const deduped = new Map<string, LearnerEvent>();
    events.forEach(event => {
      if (event?.id) deduped.set(event.id, event);
    });
    const compact = Array.from(deduped.values())
      .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
      .slice(0, MAX_PERSISTED_EVENTS);
    localStorage.setItem(LEARNER_EVENTS_KEY, JSON.stringify(compact));
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

function persistSessionLearningSignals() {
  if (typeof window === 'undefined') return;
  try {
    const existing = readLearnerEvents();
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

    if (additions.length) writeLearnerEvents([...additions, ...existing]);
  } catch {
    // Personalisation memory is opportunistic and must never block learning.
  }
}

function persistQuestionProgress() {
  if (typeof window === 'undefined') return;
  try {
    const existing = readLearnerEvents();
    const additions: LearnerEvent[] = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith('question_progress_')) continue;
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

    if (additions.length) writeLearnerEvents([...additions, ...existing]);
  } catch {
    // Personalisation memory is opportunistic and must never block learning.
  }
}

function persistAnswerContext(context: QuestionContext) {
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
    writeLearnerEvents([event, ...readLearnerEvents()]);
    mirrorEventToCloud(event);
  } catch {
    // Answer memory must never interrupt feedback.
  }
}

function syncPersistentLearnerMemory(context?: QuestionContext) {
  persistSessionLearningSignals();
  persistQuestionProgress();
  if (context) persistAnswerContext(context);
}

function cloudEventsToLocal(): LearnerEvent[] {
  return readCloudLearnerEvents().map((event: any): LearnerEvent | null => {
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

function buildLearnerSnapshot(): LearnerSnapshot {
  if (typeof window === 'undefined') {
    return { conceptEvidence: [], recentConfidenceSignals: [], recentQuestionResults: [], recentAnswerContexts: [] };
  }

  syncPersistentLearnerMemory();

  const conceptEvidence: LearnerSnapshot['conceptEvidence'] = [];
  const recentConfidenceSignals: LearnerSnapshot['recentConfidenceSignals'] = [];
  const recentQuestionResults: LearnerSnapshot['recentQuestionResults'] = [];
  const recentAnswerContexts: LearnerSnapshot['recentAnswerContexts'] = [];

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.endsWith('_user_concepts')) continue;
      const concepts = safelyParse(localStorage.getItem(key));
      if (!Array.isArray(concepts)) continue;
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

    const combinedEvents = [...cloudEventsToLocal(), ...readLearnerEvents()];
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
  return buildLearnerSnapshot();
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

function buildCacheKey(userQuery: string, context: QuestionContext, learnerName: string | null): string {
  const learnerSnapshot = buildLearnerSnapshot();
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

function buildUserPrompt(userQuery: string, context: QuestionContext, learnerName: string | null): string {
  syncPersistentLearnerMemory(context);
  const learnerContext = compactLearnerContext(buildLearnerSnapshot());
  return `LEARNER IDENTITY\nFirst name: ${learnerName || 'Not supplied'}\n\nCURRENT QUESTION CONTEXT\n\nQUESTION / VIGNETTE:\n${context.question}\n\nOPTIONS:\n${context.options.join('\n') || 'Not supplied'}\n\nSTUDENT SELECTED:\n${context.selectedAnswer || 'Not supplied'}\n\nCORRECT ANSWER:\n${context.correctAnswer}\n\nGROUNDING EXPLANATION:\n${context.explanation || 'Not supplied'}\n\nLONGITUDINAL LEARNER MEMORY\n${learnerContext}\n\nUSER REQUEST:\n${userQuery}\n\nTEACHING POLICY\n- The current question and grounding explanation are the clinical source of truth. Learner memory is for personalisation, not for inventing medical facts.\n- If a first name is supplied, use it sparingly and naturally. Good moments are a session opening, a meaningful redirect, after resolving a misconception, or at closure. Do not address the learner by name in every reply.\n- Make personalisation visible through teaching choices, not flattery: adapt depth, questioning and examples to the supplied history and current confidence.\n- Treat history as longitudinal evidence, not as a licence to overclaim. Only mention a repeated pattern when multiple supplied observations support it.\n- If the learner repeatedly misses a related concept or discriminator, make that pattern explicit and focus on it.\n- If the learner has repeatedly retrieved prerequisite material successfully, skip basic reteaching and teach the missing layer.\n- A correct low-confidence response is weaker evidence than confident retrieval. A confident incorrect response can indicate a misconception.\n- The selected wrong option is diagnostic information. Explain why it was tempting and the clue or principle that should have shifted the decision when the supplied context supports that.\n- Prefer the shortest explanation that changes this learner's future decision-making.\n- Never expose internal scores, mastery levels, storage fields, event IDs, fingerprints or system terminology to the learner.\n- Keep the answer concise and action-oriented.`;
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
- Do not use motivational filler, emojis or generic AI preambles.
- If the supplied information is insufficient, say so briefly.`;

const conditionPrimerSystemPrompt = `You are StudyEdit, an expert UK medical education tutor giving a very short orientation to a condition after a student answers a question.
- The goal is to help a learner who may know almost nothing about the condition build a basic mental model in under one minute.
- Be clinically careful and concise.
- Do not contradict the verified question context, correct answer, key fact or explanation supplied.
- You may use standard stable medical background knowledge to explain what the condition is and its typical clinical pattern.
- Do NOT invent exact drug doses, numerical thresholds, timing windows, scoring totals, referral cut-offs, or rapidly changing guideline details unless those are explicitly supported by the supplied grounding context.
- If management is guideline-sensitive, describe the management principle rather than an unsupported exact regimen.
- Use exactly these short headings: **What it is**, **Typical picture**, **How you recognise it**, **What happens next**, **Do not miss**.
- Keep the whole response to roughly 100-160 words.
- No motivational filler, emojis, references, citations, or generic AI preambles.`;

let openai: OpenAI | null = null;

try {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (apiKey && apiKey !== 'your-openai-api-key-goes-here') {
    openai = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/v1',
      dangerouslyAllowBrowser: true,
    });
  }
} catch (error) {
  console.error('Error initializing DeepSeek API client:', error);
}

export async function generateAIResponseStream(
  userQuery: string,
  context: QuestionContext,
  onToken: (token: string) => void,
  onStart?: () => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  await hydrateLearnerMemoryFromCloud();
  const learnerName = await currentLearnerFirstName();

  if (!openai) {
    const fallback = generateFallbackResponse(userQuery, context);
    onStart?.();
    onToken(fallback);
    return fallback;
  }

  const cacheKey = buildCacheKey(userQuery, context, learnerName);
  const cached = responseCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
    onStart?.();
    onToken(cached.response);
    return cached.response;
  }

  let fullResponse = '';
  try {
    onStart?.();
    const stream = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUserPrompt(userQuery, context, learnerName) },
      ],
      temperature: 0.25,
      max_tokens: 500,
      top_p: 0.8,
      presence_penalty: 0,
      frequency_penalty: 0.1,
      response_format: { type: 'text' },
      stream: true,
    }, abortSignal ? { signal: abortSignal } : {});

    for await (const chunk of stream as AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }>) {
      if (abortSignal?.aborted) throw new Error('Request aborted');
      const delta = chunk?.choices?.[0]?.delta?.content ?? '';
      if (!delta) continue;
      fullResponse += delta;
      onToken(delta);
    }

    if (fullResponse) responseCache[cacheKey] = { response: fullResponse, timestamp: Date.now() };
    return fullResponse;
  } catch (error) {
    if (abortSignal?.aborted) throw error;
    console.error('Error generating AI response stream:', error);
    const fallback = generateFallbackResponse(userQuery, context);
    onToken(fallback);
    return fallback;
  }
}

export async function generateAIResponse(userQuery: string, context: QuestionContext): Promise<string> {
  await hydrateLearnerMemoryFromCloud();
  const learnerName = await currentLearnerFirstName();

  if (!openai) return generateFallbackResponse(userQuery, context);

  const cacheKey = buildCacheKey(userQuery, context, learnerName);
  const cached = responseCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) return cached.response;

  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUserPrompt(userQuery, context, learnerName) },
      ],
      temperature: 0.25,
      max_tokens: 500,
      top_p: 0.8,
      stream: false,
    });

    const result = response.choices[0]?.message?.content?.trim() || '';
    if (!result) return generateFallbackResponse(userQuery, context);
    responseCache[cacheKey] = { response: result, timestamp: Date.now() };
    return result;
  } catch (error) {
    console.error('DeepSeek API error:', error);
    return generateFallbackResponse(userQuery, context);
  }
}

export async function generateConditionPrimerStream(
  context: ConditionPrimerContext,
  onToken: (token: string) => void,
  onStart?: () => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  const condition = context.condition.trim() || 'this clinical condition';
  const questionContext = context.questionContext;
  const grounding = [
    context.keyFact ? `VERIFIED KEY FACT:\n${context.keyFact}` : '',
    questionContext?.explanation ? `VERIFIED QUESTION EXPLANATION:\n${questionContext.explanation}` : '',
    questionContext?.question ? `CURRENT VIGNETTE / QUESTION:\n${questionContext.question}` : '',
    questionContext?.correctAnswer ? `CORRECT ANSWER:\n${questionContext.correctAnswer}` : '',
  ].filter(Boolean).join('\n\n');
  const userPrompt = `Teach me ${condition} from scratch as a rapid condition primer. Assume I may have no useful prior knowledge. ${grounding ? `\n\nGround yourself in the verified material below and do not contradict it:\n\n${grounding}` : ''}`;
  const cacheKey = `condition_${stableHash(userPrompt)}`;
  const cached = responseCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
    onStart?.();
    onToken(cached.response);
    return cached.response;
  }

  if (!openai) {
    const fallback = context.keyFact || questionContext?.explanation || `A quick review of ${condition} is temporarily unavailable.`;
    onStart?.();
    onToken(fallback);
    return fallback;
  }

  let fullResponse = '';
  try {
    onStart?.();
    const stream = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: conditionPrimerSystemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 320,
      top_p: 0.75,
      presence_penalty: 0,
      frequency_penalty: 0.1,
      response_format: { type: 'text' },
      stream: true,
    }, abortSignal ? { signal: abortSignal } : {});

    for await (const chunk of stream as AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }>) {
      if (abortSignal?.aborted) throw new Error('Request aborted');
      const delta = chunk?.choices?.[0]?.delta?.content ?? '';
      if (!delta) continue;
      fullResponse += delta;
      onToken(delta);
    }

    if (fullResponse) responseCache[cacheKey] = { response: fullResponse, timestamp: Date.now() };
    return fullResponse;
  } catch (error) {
    if (abortSignal?.aborted) throw error;
    console.error('Condition primer generation failed:', error);
    const fallback = context.keyFact || questionContext?.explanation || `A quick review of ${condition} is temporarily unavailable.`;
    onToken(fallback);
    return fallback;
  }
}

export function generateFallbackResponse(_userQuery: string, context: QuestionContext): string {
  const selected = context.selectedAnswer ? `You selected **${context.selectedAnswer}**. ` : '';
  const correct = context.correctAnswer ? `The correct answer is **${context.correctAnswer}**.` : '';
  const grounding = context.explanation?.trim();

  if (grounding) return `${selected}${correct}\n\n${grounding}`.trim();

  return `${selected}${correct}\n\nI couldn't generate the personalised explanation just now. Use the answer feedback shown on this question and try the tutor again in a moment.`.trim();
}