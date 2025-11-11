/**
 * AI Service - Secure wrapper for AI API calls
 * Uses Netlify serverless functions to protect API keys
 */

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIGenerateOptions {
  messages: Message[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

interface AIResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call AI generation via secure serverless function
 * In development, falls back to direct API call if function is not available
 */
export async function generateWithAI(options: AIGenerateOptions): Promise<AIResponse> {
  const {
    messages,
    model = 'deepseek-chat',
    temperature = 0.7,
    max_tokens = 4000
  } = options;

  try {
    // Try serverless function first (production)
    const response = await fetch('/.netlify/functions/ai-generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages,
        model,
        temperature,
        max_tokens
      })
    });

    if (!response.ok) {
      // If function not found (404) and in development, fall back to direct call
      if (response.status === 404 && import.meta.env.DEV) {
        console.warn('Serverless function not available, falling back to direct API call');
        return await directAPICall(options);
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`AI generation failed: ${errorData.error || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    // In development, fall back to direct API call
    if (import.meta.env.DEV) {
      console.warn('Serverless function error, falling back to direct API call:', error);
      return await directAPICall(options);
    }
    throw error;
  }
}

/**
 * Direct API call (only used in development as fallback)
 */
async function directAPICall(options: AIGenerateOptions): Promise<AIResponse> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey || apiKey === 'your-openai-api-key-goes-here') {
    throw new Error('API key not configured');
  }

  const {
    messages,
    model = 'deepseek-chat',
    temperature = 0.7,
    max_tokens = 4000
  } = options;

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
    throw new Error(`API request failed: ${errorText}`);
  }

  return await response.json();
}

/**
 * Helper to create a simple prompt
 */
export function createPrompt(systemPrompt: string, userPrompt: string): Message[] {
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}
