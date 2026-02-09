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
    const apiKey = process.env.INWORLD_API_KEY;
    const apiSecret = process.env.INWORLD_API_SECRET;

    if (!apiKey || !apiSecret) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Inworld credentials not configured' }),
      };
    }

    // Create Basic auth credentials
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    // Request a session token from Inworld
    const response = await fetch('https://api.inworld.ai/v1/session/open', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Session configuration
        capabilities: {
          audio: true,
          text: true,
          emotions: true,
          interruptions: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Inworld session error:', errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `Inworld API error: ${response.status}` }),
      };
    }

    const sessionData = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessionId: sessionData.sessionId || sessionData.session_id,
        token: sessionData.token || sessionData.accessToken,
        wsUrl: sessionData.wsUrl || 'wss://api.inworld.ai/v1/session/stream',
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
