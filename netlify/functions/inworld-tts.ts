import type { Handler } from '@netlify/functions';

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const apiKey = process.env.VITE_INWORLD_API_KEY;
    const apiSecret = process.env.VITE_INWORLD_API_SECRET;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Inworld API key not configured' }),
      };
    }

    // Build auth - try key:secret first, then key alone
    // Inworld TTS uses Basic auth with base64(key:secret) or just the key if already base64
    let authValue: string;
    if (apiSecret) {
      authValue = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    } else {
      authValue = apiKey;
    }

    const body = event.body ? JSON.parse(event.body) : {};

    // Forward TTS request to Inworld
    // See: https://docs.inworld.ai/docs/quickstart-tts
    const ttsResponse = await fetch('https://api.inworld.ai/tts/v1/voice:stream', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authValue}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: body.text || '',
        voiceId: body.voiceId || 'Ashley',
        modelId: body.modelId || 'inworld-tts-1.5-max',
        audio_config: body.audio_config || {
          audio_encoding: 'MP3',
        },
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('Inworld TTS error:', ttsResponse.status, errorText);
      return {
        statusCode: ttsResponse.status,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `TTS failed: ${ttsResponse.status}`, details: errorText }),
      };
    }

    // Return the NDJSON response as-is
    const responseText = await ttsResponse.text();

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/x-ndjson' },
      body: responseText,
    };
  } catch (error) {
    console.error('TTS proxy error:', error);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'TTS proxy failed' }),
    };
  }
};

export { handler };
