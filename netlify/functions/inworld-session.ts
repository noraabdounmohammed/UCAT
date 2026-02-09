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
    const apiKey = process.env.VITE_INWORLD_API_KEY;
    const apiSecret = process.env.VITE_INWORLD_API_SECRET;

    if (!apiKey || !apiSecret) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Inworld credentials not configured' }),
      };
    }

    // Create Basic auth credentials (base64 encoded key:secret)
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    // Return the credentials for the client to use
    // Inworld Realtime API uses WebSocket with Basic auth
    // The client will connect to wss://api.inworld.ai/api/v1/realtime/session
    // and pass auth via the Sec-WebSocket-Protocol header (subprotocol)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        credentials: credentials,
        wsUrl: 'wss://api.inworld.ai/api/v1/realtime/session',
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
