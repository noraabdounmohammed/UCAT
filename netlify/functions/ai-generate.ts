import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const FREE_DAILY_LIMIT = 20;

const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { messages, model = 'deepseek-chat', temperature = 0.7, max_tokens = 4000, supabaseUserId, dailyCount } = JSON.parse(event.body || '{}');

    // ── Subscription gate ──────────────────────────────────────────────────────
    // If a supabaseUserId is provided, check their subscription server-side.
    // dailyCount is sent from the client (localStorage) as a hint, but we
    // verify premium status from the database so it can't be spoofed.
    if (supabaseUserId) {
      try {
        const supabase = createClient(
          process.env.VITE_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', supabaseUserId)
          .single();

        const isPremium = profile?.is_premium === true;

        if (!isPremium && typeof dailyCount === 'number' && dailyCount >= FREE_DAILY_LIMIT) {
          return {
            statusCode: 402,
            body: JSON.stringify({
              error: 'daily_limit_reached',
              message: `Free plan limit of ${FREE_DAILY_LIMIT} questions/day reached. Upgrade to continue.`,
              upgradeUrl: '/pricing',
            }),
          };
        }
      } catch (subErr) {
        // Non-fatal: if subscription check fails, allow the request through
        console.warn('Subscription check failed, allowing request:', subErr);
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request: messages array required' })
      };
    }

    // Get API key from environment variable (set in Netlify dashboard)
    const apiKey = process.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    // Call DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', errorText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'API request failed', details: errorText })
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

export { handler };
