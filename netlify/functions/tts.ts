import type { Handler } from '@netlify/functions';

/** Server-side high-quality tutor speech proxy. */
const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const apiKey = process.env.OPENAI_AUDIO_KEY || process.env.OPENAI_TTS_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'tts_not_configured' }),
    };
  }

  let text = '';
  let voice = 'marin';
  try {
    const parsed = JSON.parse(event.body || '{}');
    text = String(parsed.text ?? '').trim();
    voice = String(parsed.voice ?? 'marin');
    if (!text) return { statusCode: 400, body: JSON.stringify({ error: 'text required' }) };
    if (text.length > 4096) return { statusCode: 400, body: JSON.stringify({ error: 'text too long' }) };
    const allowed = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse', 'marin', 'cedar']);
    if (!allowed.has(voice)) voice = 'marin';
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid json' }) };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice,
        input: text,
        instructions: 'Warm, intelligent UK medical tutor. Natural conversational pace. Pronounce medical terminology, drug names, abbreviations, ECG leads and numbers clearly. Do not sound like an announcer.',
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('StudyEdit TTS error:', response.status, detail.slice(0, 300));
      return { statusCode: 502, body: JSON.stringify({ error: 'upstream_failed' }) };
    }

    const audio = Buffer.from(await response.arrayBuffer());
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
      body: audio.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('StudyEdit TTS function error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'tts_function_failed' }) };
  }
};

export { handler };
