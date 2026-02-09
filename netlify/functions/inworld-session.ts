import type { Handler } from '@netlify/functions';

const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Inworld TTS uses a single API key that's already base64-encoded
    // See: https://docs.inworld.ai/docs/quickstart-tts
    const apiKey = process.env.VITE_INWORLD_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Inworld API key not configured' }),
      };
    }

    // Return the API key for TTS usage
    // The key should already be base64-encoded from Inworld portal
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        credentials: apiKey,
      }),
    };
  } catch (error) {
    console.error('Session creation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create session' }),
    };
  }
};

export { handler };
