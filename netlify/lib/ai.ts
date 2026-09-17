import type { HandlerEvent } from '@netlify/functions';

export type AiPurpose = 'question' | 'review' | 'tutor' | 'assessment' | 'repair' | 'curriculum';

type AiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type PurposePolicy = {
  maxMessages: number;
  maxInputCharacters: number;
  maxTokens: number;
  temperature: number;
  topP: number;
};

const PURPOSE_POLICIES: Record<AiPurpose, PurposePolicy> = {
  question: { maxMessages: 2, maxInputCharacters: 40_000, maxTokens: 1_400, temperature: 0.55, topP: 0.85 },
  review: { maxMessages: 2, maxInputCharacters: 42_000, maxTokens: 900, temperature: 0.1, topP: 0.75 },
  tutor: { maxMessages: 2, maxInputCharacters: 34_000, maxTokens: 220, temperature: 0.2, topP: 0.75 },
  assessment: { maxMessages: 2, maxInputCharacters: 24_000, maxTokens: 12, temperature: 0, topP: 1 },
  repair: { maxMessages: 2, maxInputCharacters: 38_000, maxTokens: 180, temperature: 0.1, topP: 0.7 },
  curriculum: { maxMessages: 2, maxInputCharacters: 30_000, maxTokens: 1_000, temperature: 0.3, topP: 0.8 },
};

const ALLOWED_ORIGINS = new Set([
  'https://studyedit.com',
  'https://www.studyedit.com',
]);

const isLocalOrigin = (origin: string) => /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);

export function responseHeaders(event: HandlerEvent, contentType = 'application/json') {
  const origin = event.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) || isLocalOrigin(origin) ? origin : 'https://studyedit.com';
  return {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Cache-Control': 'no-store',
    'Content-Type': contentType,
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
  };
}

export function originIsAllowed(event: HandlerEvent) {
  const origin = event.headers.origin;
  // Same-origin server calls and CLI evals may not include Origin.
  return !origin || ALLOWED_ORIGINS.has(origin) || isLocalOrigin(origin);
}

export function parseAiRequest(event: HandlerEvent, requiredPurpose?: AiPurpose) {
  if (!event.body || event.body.length > 60_000) throw new Error('invalid_request');

  let body: unknown;
  try {
    body = JSON.parse(event.body);
  } catch {
    throw new Error('invalid_json');
  }

  if (!body || typeof body !== 'object') throw new Error('invalid_request');
  const candidate = body as { purpose?: unknown; messages?: unknown };
  const purpose = candidate.purpose;
  if (typeof purpose !== 'string' || !(purpose in PURPOSE_POLICIES)) throw new Error('invalid_purpose');
  if (requiredPurpose && purpose !== requiredPurpose) throw new Error('invalid_purpose');

  const policy = PURPOSE_POLICIES[purpose as AiPurpose];
  if (!Array.isArray(candidate.messages) || candidate.messages.length < 1 || candidate.messages.length > policy.maxMessages) {
    throw new Error('invalid_messages');
  }

  let totalCharacters = 0;
  const messages = candidate.messages.map((raw): AiMessage => {
    if (!raw || typeof raw !== 'object') throw new Error('invalid_message');
    const message = raw as { role?: unknown; content?: unknown };
    if (!['system', 'user', 'assistant'].includes(String(message.role))) throw new Error('invalid_role');
    if (typeof message.content !== 'string' || !message.content.trim()) throw new Error('invalid_content');
    totalCharacters += message.content.length;
    return { role: message.role as AiMessage['role'], content: message.content };
  });

  if (totalCharacters > policy.maxInputCharacters) throw new Error('request_too_large');

  return {
    purpose: purpose as AiPurpose,
    messages,
    upstreamBody: {
      model: 'deepseek-chat',
      messages,
      temperature: policy.temperature,
      max_tokens: policy.maxTokens,
      top_p: policy.topP,
      presence_penalty: 0,
      frequency_penalty: purpose === 'tutor' ? 0.1 : 0,
    },
  };
}

export function getDeepSeekKey() {
  const key = process.env.DEEPSEEK_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!key) throw new Error('provider_unavailable');
  return key;
}

export async function callDeepSeek(upstreamBody: Record<string, unknown>, stream: boolean, signal?: AbortSignal) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getDeepSeekKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...upstreamBody, stream }),
    signal,
  });

  if (!response.ok) {
    const diagnostic = await response.text().catch(() => '');
    console.error('AI provider request failed', response.status, diagnostic.slice(0, 240));
    throw new Error('provider_failed');
  }

  return response;
}

