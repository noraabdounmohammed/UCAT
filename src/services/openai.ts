import OpenAI from 'openai';

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
}

const CACHE_EXPIRY_MS = 60 * 60 * 1000;
const responseCache: Record<string, CacheEntry> = {};

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

function buildLearnerSnapshot(): LearnerSnapshot {
  if (typeof window === 'undefined') {
    return { conceptEvidence: [], recentConfidenceSignals: [], recentQuestionResults: [] };
  }

  const conceptEvidence: LearnerSnapshot['conceptEvidence'] = [];
  const recentConfidenceSignals: LearnerSnapshot['recentConfidenceSignals'] = [];
  const recentQuestionResults: LearnerSnapshot['recentQuestionResults'] = [];

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.endsWith('_user_concepts')) {
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

      if (key.startsWith('question_progress_')) {
        const result = safelyParse(localStorage.getItem(key));
        if (!result) continue;
        recentQuestionResults.push({
          topic: result.topic,
          skill: result.skill,
          status: result.status,
          timestamp: result.timestamp,
        });
      }
    }

    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith('learning_frontier_') || !key.includes('_answer_confidence_')) continue;
      const signal = safelyParse(sessionStorage.getItem(key));
      if (!signal) continue;
      recentConfidenceSignals.push({
        concept: signal.concept,
        confidence: signal.value,
        correct: signal.correct,
        evidenceClass: signal.evidence_class,
        at: signal.at,
      });
    }
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

  return {
    conceptEvidence: conceptEvidence.slice(0, 40),
    recentConfidenceSignals: recentConfidenceSignals.slice(0, 20),
    recentQuestionResults: recentQuestionResults.slice(0, 30),
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

  const confidenceLines = snapshot.recentConfidenceSignals.slice(0, 10).map(item =>
    `- ${item.concept || 'Concept'}: ${item.correct ? 'correct' : 'incorrect'}, confidence=${item.confidence || 'unknown'}, evidence=${item.evidenceClass || 'unknown'}`
  );

  const recentLines = snapshot.recentQuestionResults.slice(0, 12).map(item =>
    `- ${item.topic || 'Unknown topic'}${item.skill ? ` / ${item.skill}` : ''}: ${item.status || 'unknown'}`
  );

  if (!conceptLines.length && !confidenceLines.length && !recentLines.length) return 'No reliable prior learner history is available yet.';

  return [
    conceptLines.length ? `CONCEPT RETRIEVAL HISTORY:\n${conceptLines.join('\n')}` : '',
    confidenceLines.length ? `RECENT CONFIDENCE EVIDENCE:\n${confidenceLines.join('\n')}` : '',
    recentLines.length ? `RECENT QUESTION RESULTS:\n${recentLines.join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
}

function buildCacheKey(userQuery: string, context: QuestionContext): string {
  const learnerSnapshot = buildLearnerSnapshot();
  const fingerprint = JSON.stringify({
    query: userQuery.trim(),
    question: context.question,
    options: context.options,
    correctAnswer: context.correctAnswer,
    selectedAnswer: context.selectedAnswer,
    explanation: context.explanation,
    learnerSnapshot,
  });
  return `ai_${stableHash(fingerprint)}`;
}

function buildUserPrompt(userQuery: string, context: QuestionContext): string {
  const learnerContext = compactLearnerContext(buildLearnerSnapshot());
  return `CURRENT QUESTION CONTEXT\n\nQUESTION / VIGNETTE:\n${context.question}\n\nOPTIONS:\n${context.options.join('\n') || 'Not supplied'}\n\nSTUDENT SELECTED:\n${context.selectedAnswer || 'Not supplied'}\n\nCORRECT ANSWER:\n${context.correctAnswer}\n\nGROUNDING EXPLANATION:\n${context.explanation || 'Not supplied'}\n\nLEARNER HISTORY\n${learnerContext}\n\nUSER REQUEST:\n${userQuery}\n\nTEACHING POLICY\n- The current question and grounding explanation are the clinical source of truth. Learner history is for personalisation, not for inventing medical facts.\n- Use prior history only when it genuinely changes what is useful to teach now.\n- If the learner repeatedly misses a related concept or discriminator, make that pattern explicit and focus on it.\n- If the learner has repeatedly retrieved the basics successfully, do not reteach them unless needed for the current error.\n- A correct low-confidence response is weaker evidence than confident retrieval. A confident incorrect response can indicate a misconception.\n- The selected wrong option is diagnostic information: explain why it was tempting and the clue or principle that should have shifted the decision when the supplied context supports that.\n- Never claim a recurring pattern unless the learner history above actually supports it.\n- Do not expose internal scores, mastery levels, storage fields or system terminology to the learner.\n- Keep the answer concise and action-oriented.`;
}

const systemPrompt = `You are StudyEdit, an expert medical education assistant for UKMLA AKT students.
- Be concise, clear and clinically careful.
- Use the supplied current-question context as the clinical source of truth.
- Personalise teaching using the supplied learner history when relevant.
- The student's selected answer is explicitly provided when known; never claim it was not provided if it appears in the context.
- Do not contradict the supplied correct answer or grounding explanation.
- Do not invent prior learner history, references, links, guidelines or unsupported medical facts.
- Prefer teaching the learner's exact misconception, discriminator or uncertainty over repeating a generic textbook explanation.
- If prior evidence suggests the learner already knows prerequisite material, skip it and teach the missing layer.
- Use light markdown only when it improves skimming.
- Do not use motivational filler, emojis or generic AI preambles.
- If the supplied information is insufficient, say so briefly.`;

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
  if (!openai) {
    const fallback = generateFallbackResponse(userQuery, context);
    onStart?.();
    onToken(fallback);
    return fallback;
  }

  const cacheKey = buildCacheKey(userQuery, context);
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
        { role: 'user', content: buildUserPrompt(userQuery, context) },
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
  if (!openai) return generateFallbackResponse(userQuery, context);

  const cacheKey = buildCacheKey(userQuery, context);
  const cached = responseCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) return cached.response;

  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUserPrompt(userQuery, context) },
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

export function generateFallbackResponse(_userQuery: string, context: QuestionContext): string {
  const selected = context.selectedAnswer ? `You selected **${context.selectedAnswer}**. ` : '';
  const correct = context.correctAnswer ? `The correct answer is **${context.correctAnswer}**.` : '';
  const grounding = context.explanation?.trim();

  if (grounding) return `${selected}${correct}\n\n${grounding}`.trim();

  return `${selected}${correct}\n\nI couldn't generate the personalised explanation just now. Use the answer feedback shown on this question and try the tutor again in a moment.`.trim();
}
