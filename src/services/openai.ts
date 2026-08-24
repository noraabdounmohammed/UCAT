import OpenAI from 'openai';

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

function buildCacheKey(userQuery: string, context: QuestionContext): string {
  const fingerprint = JSON.stringify({
    query: userQuery.trim(),
    question: context.question,
    options: context.options,
    correctAnswer: context.correctAnswer,
    selectedAnswer: context.selectedAnswer,
    explanation: context.explanation,
  });
  return `ai_${stableHash(fingerprint)}`;
}

function buildUserPrompt(userQuery: string, context: QuestionContext): string {
  return `CURRENT QUESTION CONTEXT\n\nQUESTION / VIGNETTE:\n${context.question}\n\nOPTIONS:\n${context.options.join('\n') || 'Not supplied'}\n\nSTUDENT SELECTED:\n${context.selectedAnswer || 'Not supplied'}\n\nCORRECT ANSWER:\n${context.correctAnswer}\n\nGROUNDING EXPLANATION:\n${context.explanation || 'Not supplied'}\n\nUSER REQUEST:\n${userQuery}\n\nImportant: answer ONLY from this current question context. Never reuse facts, selected answers, diagnoses, or explanations from another question.`;
}

const systemPrompt = `You are StudyEdit, an expert medical education assistant for UKMLA AKT students.
- Be concise, clear and clinically careful.
- Use the supplied current-question context as the source of truth.
- The student's selected answer is explicitly provided when known; never claim it was not provided if it appears in the context.
- Do not contradict the supplied correct answer or grounding explanation.
- Do not invent prior learner history, references, links, guidelines or medical facts that are not supported by the supplied context.
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

    if (fullResponse) {
      responseCache[cacheKey] = { response: fullResponse, timestamp: Date.now() };
    }
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

  if (grounding) {
    return `${selected}${correct}\n\n${grounding}`.trim();
  }

  return `${selected}${correct}\n\nI couldn't generate the personalised explanation just now. Use the answer feedback shown on this question and try the tutor again in a moment.`.trim();
}
