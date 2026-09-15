import type { Handler } from '@netlify/functions';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const apiKey = process.env.OPENAI_AUDIO_KEY || process.env.OPENAI_TTS_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'audio_not_configured' }),
    };
  }

  try {
    const mime = event.headers['content-type'] || 'audio/webm';
    const bytes = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'binary');
    if (!bytes.length) return { statusCode: 400, body: JSON.stringify({ error: 'audio required' }) };
    if (bytes.length > 8 * 1024 * 1024) return { statusCode: 413, body: JSON.stringify({ error: 'audio too large' }) };

    const extension = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
    const form = new FormData();
    form.append('model', 'gpt-transcribe');
    form.append('language', 'en');
    form.append('prompt', 'UKMLA medical tutoring. Preserve clinical terminology, drug names, doses, ECG leads, abbreviations, anatomy, investigations and British medical English.');
    form.append('file', new Blob([bytes], { type: mime }), `studyedit-voice.${extension}`);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('StudyEdit transcription error:', response.status, detail.slice(0, 300));
      return { statusCode: 502, body: JSON.stringify({ error: 'transcription_failed' }) };
    }

    const data = await response.json() as { text?: string };
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ text: String(data.text || '').trim() }),
    };
  } catch (error) {
    console.error('StudyEdit transcription function error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'transcription_function_failed' }) };
  }
};

export { handler };
