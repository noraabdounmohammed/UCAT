import OpenAI from 'openai';
import { hydrateLearnerMemoryFromCloud } from '@/services/learnerMemory';

export interface QuestionContext {
  question: string;
  options: string[];
  correctAnswer: string;
  selectedAnswer: string | null;
  explanation: string;
}

const TUTOR_ASSESSMENT_PATTERN = /Return exactly ONE label[\s\S]*PASS, PARTIAL, FAIL, or CLARIFY/i;

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
  console.error('Error initializing fast tutor client:', error);
}

const systemPrompt = `You are StudyEdit, a concise UKMLA tutor.
Use only the supplied current-question context as clinical ground truth.
Make exactly one useful teaching move per reply, normally 1-3 short sentences.
If a check is useful, ask exactly one free-text question prefixed "Quick check:".
Never create A/B/C/D/E choices in tutor conversation.
Never claim the learner has made a mistake before or has a recurring pattern unless that evidence is explicitly supplied in the current request.
Never give an unsolicited option-by-option review.
Finish every reply cleanly. No headings left unfinished, no dramatic language, no filler.`;

function buildPrompt(userQuery: string, context: QuestionContext) {
  return `CURRENT QUESTION / VIGNETTE:\n${context.question}\n\nOPTIONS:\n${context.options.join('\n') || 'Not supplied'}\n\nSTUDENT SELECTED:\n${context.selectedAnswer || 'Not supplied'}\n\nCORRECT ANSWER:\n${context.correctAnswer}\n\nVERIFIED EXPLANATION:\n${context.explanation || 'Not supplied'}\n\nTUTOR INSTRUCTION:\n${userQuery}`;
}

function fallback(context: QuestionContext) {
  const explanation = String(context.explanation || '').replace(/\s+/g, ' ').trim();
  const short = explanation.match(/[^.!?]+[.!?]+/g)?.slice(0, 2).join(' ').trim() || explanation;
  return short || `The correct answer is ${context.correctAnswer}. Focus on the decisive clue in the vignette.`;
}

export async function generateAIResponseStream(
  userQuery: string,
  context: QuestionContext,
  onToken: (token: string) => void,
  onStart?: () => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  // Personalisation is useful, but it must never delay visible feedback.
  void hydrateLearnerMemoryFromCloud();

  if (!openai) {
    const text = fallback(context);
    onStart?.();
    onToken(text);
    return text;
  }

  let full = '';
  try {
    const stream = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildPrompt(userQuery, context) },
      ],
      temperature: 0.15,
      max_tokens: 120,
      top_p: 0.7,
      frequency_penalty: 0.1,
      stream: true,
    }, abortSignal ? { signal: abortSignal } : {});

    onStart?.();
    for await (const chunk of stream as AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }>) {
      if (abortSignal?.aborted) throw new Error('Request aborted');
      const delta = chunk?.choices?.[0]?.delta?.content || '';
      if (!delta) continue;
      full += delta;
      onToken(delta);
    }
    return full.trim();
  } catch (error) {
    if (abortSignal?.aborted) throw error;
    console.error('Fast tutor stream failed:', error);
    const text = fallback(context);
    if (!full) onToken(text);
    return full || text;
  }
}

async function fastAssessment(userQuery: string, context: QuestionContext): Promise<string> {
  if (!openai) return 'PARTIAL';
  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Return exactly one label: PASS, PARTIAL, FAIL, or CLARIFY. Use only the supplied current-question context. Do not explain.' },
        { role: 'user', content: buildPrompt(userQuery, context) },
      ],
      temperature: 0,
      max_tokens: 8,
      stream: false,
    });
    const raw = response.choices[0]?.message?.content?.toUpperCase() || '';
    if (raw.includes('CLARIFY')) return 'CLARIFY';
    if (raw.includes('PASS')) return 'PASS';
    if (raw.includes('FAIL')) return 'FAIL';
    return 'PARTIAL';
  } catch {
    return 'PARTIAL';
  }
}

export async function generateAIResponse(userQuery: string, context: QuestionContext): Promise<string> {
  if (TUTOR_ASSESSMENT_PATTERN.test(userQuery)) return fastAssessment(userQuery, context);
  if (!openai) return fallback(context);
  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildPrompt(userQuery, context) },
      ],
      temperature: 0.15,
      max_tokens: 120,
      top_p: 0.7,
      stream: false,
    });
    return response.choices[0]?.message?.content?.trim() || fallback(context);
  } catch {
    return fallback(context);
  }
}

export function generateFallbackResponse(_userQuery: string, context: QuestionContext): string {
  return fallback(context);
}

export function getLearnerContextSnapshot() {
  return {
    conceptEvidence: [],
    recentConfidenceSignals: [],
    recentQuestionResults: [],
    recentAnswerContexts: [],
  };
}
