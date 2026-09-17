import type { Config, Handler } from '@netlify/functions';
import { callDeepSeek, originIsAllowed, parseAiRequest, responseHeaders } from '../lib/ai';

export const config: Config = {
  rateLimit: {
    aggregateBy: ['ip'],
    windowLimit: 30,
    windowSize: 60,
  },
};

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: responseHeaders(event), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: responseHeaders(event), body: JSON.stringify({ error: 'method_not_allowed' }) };
  }

  if (!originIsAllowed(event)) {
    return { statusCode: 403, headers: responseHeaders(event), body: JSON.stringify({ error: 'origin_not_allowed' }) };
  }

  try {
    const { upstreamBody } = parseAiRequest(event);
    const response = await callDeepSeek(upstreamBody, false);
    const data = await response.json();
    return { statusCode: 200, headers: responseHeaders(event), body: JSON.stringify(data) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'internal_error';
    const statusCode = reason.startsWith('invalid_') || reason === 'request_too_large' ? 400 : reason === 'provider_unavailable' ? 503 : 502;
    if (statusCode >= 500) console.error('AI function failed:', reason);
    return { statusCode, headers: responseHeaders(event), body: JSON.stringify({ error: statusCode === 400 ? reason : 'ai_unavailable' }) };
  }
};

export { handler };
