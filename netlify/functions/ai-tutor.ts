import { Readable } from 'node:stream';
import { stream, type Config } from '@netlify/functions';
import { callDeepSeek, originIsAllowed, parseAiRequest, responseHeaders } from '../lib/ai';

export const config: Config = {
  rateLimit: {
    aggregateBy: ['ip'],
    windowLimit: 30,
    windowSize: 60,
  },
};

export const handler = stream(async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: responseHeaders(event, 'text/event-stream'), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: responseHeaders(event), body: JSON.stringify({ error: 'method_not_allowed' }) };
  }
  if (!originIsAllowed(event)) {
    return { statusCode: 403, headers: responseHeaders(event), body: JSON.stringify({ error: 'origin_not_allowed' }) };
  }

  try {
    const { upstreamBody } = parseAiRequest(event, 'tutor');
    const response = await callDeepSeek(upstreamBody, true);
    if (!response.body) throw new Error('provider_failed');
    return {
      statusCode: 200,
      headers: responseHeaders(event, 'text/event-stream; charset=utf-8'),
      body: Readable.fromWeb(response.body as never),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'internal_error';
    const statusCode = reason.startsWith('invalid_') || reason === 'request_too_large' ? 400 : reason === 'provider_unavailable' ? 503 : 502;
    if (statusCode >= 500) console.error('Tutor stream failed:', reason);
    return {
      statusCode,
      headers: responseHeaders(event),
      body: JSON.stringify({ error: statusCode === 400 ? reason : 'tutor_unavailable' }),
    };
  }
});

