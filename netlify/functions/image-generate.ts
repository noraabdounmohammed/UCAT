import type { Config, Handler } from '@netlify/functions';
import { originIsAllowed, responseHeaders } from '../lib/ai';

export const config: Config = {
  rateLimit: {
    aggregateBy: ['ip'],
    windowLimit: 3,
    windowSize: 60,
  },
};

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: responseHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: responseHeaders(event), body: JSON.stringify({ error: 'method_not_allowed' }) };
  if (!originIsAllowed(event)) return { statusCode: 403, headers: responseHeaders(event), body: JSON.stringify({ error: 'origin_not_allowed' }) };

  try {
    if (!event.body || event.body.length > 12_000) throw new Error('invalid_request');
    const body = JSON.parse(event.body) as { prompt?: unknown };
    if (typeof body.prompt !== 'string' || body.prompt.length < 20 || body.prompt.length > 6_000) throw new Error('invalid_prompt');

    const apiKey = process.env.OPENAI_IMAGE_KEY || process.env.VITE_OPENAI_IMAGE_KEY;
    if (!apiKey) return { statusCode: 503, headers: responseHeaders(event), body: JSON.stringify({ error: 'image_generation_unavailable' }) };

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2', prompt: body.prompt, n: 1, size: '1024x1792' }),
    });
    if (!response.ok) {
      const diagnostic = await response.text().catch(() => '');
      console.error('Image provider request failed', response.status, diagnostic.slice(0, 240));
      return { statusCode: 502, headers: responseHeaders(event), body: JSON.stringify({ error: 'image_generation_failed' }) };
    }

    const data = await response.json();
    return { statusCode: 200, headers: responseHeaders(event), body: JSON.stringify(data) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'internal_error';
    const statusCode = reason.startsWith('invalid_') ? 400 : 500;
    return { statusCode, headers: responseHeaders(event), body: JSON.stringify({ error: statusCode === 400 ? reason : 'image_generation_failed' }) };
  }
};

export { handler };

