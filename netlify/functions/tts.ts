import type { Handler } from '@netlify/functions';

/**
 * Server-side TTS proxy. Returns audio/mpeg bytes when an OpenAI-compatible
 * `OPENAI_TTS_KEY` is set in Netlify env; otherwise returns 503 so the
 * frontend can transparently fall back to system Web Speech API voices.
 *
 * Why a separate env var (not the existing `VITE_OPENAI_API_KEY`)?
 * That key is a DeepSeek key per `.env.example`; DeepSeek doesn't offer
 * the `/v1/audio/speech` endpoint. Keeping them distinct means the
 * operator can wire a real OpenAI key without disturbing the seed
 * pipeline.
 *
 * Cost estimate: OpenAI `tts-1` is $15 per 1M characters. A typical UKMLA
 * stem is 100-300 chars → roughly $0.0015 - $0.005 per question.
 *
 * Voice options (pick via `?voice=` query param, default `nova`):
 *   - alloy, echo, fable, onyx, nova, shimmer
 *   `nova` and `shimmer` sound the warmest for medical content.
 *
 * Usage from the client:
 *   const r = await fetch('/.netlify/functions/tts', {
 *     method: 'POST',
 *     body: JSON.stringify({ text }),
 *   });
 *   if (!r.ok) return fallbackToSystemVoice();
 *   const buf = await r.arrayBuffer();
 *   new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }))).play();
 */

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.OPENAI_TTS_KEY;
  if (!apiKey) {
    // Soft-fail so the client can transparently use system voice.
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'tts_not_configured',
        message: 'Set OPENAI_TTS_KEY in Netlify env to enable studio-quality TTS.',
      }),
    };
  }

  let text: string;
  let voice: string;
  try {
    const parsed = JSON.parse(event.body || '{}');
    text = String(parsed.text ?? '').trim();
    voice = String(parsed.voice ?? 'nova');
    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: 'text required' }) };
    }
    if (text.length > 4096) {
      return { statusCode: 400, body: JSON.stringify({ error: 'text too long (max 4096 chars)' }) };
    }
    const allowed = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']);
    if (!allowed.has(voice)) voice = 'nova';
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid json' }) };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice,
        input: text,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error('OpenAI TTS error:', response.status, errBody.slice(0, 200));
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'upstream_failed', upstreamStatus: response.status }),
      };
    }

    const audioBuf = Buffer.from(await response.arrayBuffer());
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        // Cache aggressively — same text + voice always yields the same audio.
        // 1 day is plenty since stems are immutable once approved.
        'Cache-Control': 'public, max-age=86400, immutable',
      },
      body: audioBuf.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('tts function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'tts_function_failed', message: String(err) }),
    };
  }
};

export { handler };
