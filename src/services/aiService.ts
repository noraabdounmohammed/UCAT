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
 * The provider credential is never available to browser code.
 */
export async function generateWithAI(options: AIGenerateOptions): Promise<AIResponse> {
  const {
    messages,
    model: _model = 'deepseek-chat',
    temperature: _temperature = 0.7,
    max_tokens: _maxTokens = 4000
  } = options;

  try {
    // Try serverless function first (production)
    const response = await fetch('/.netlify/functions/ai-generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        purpose: 'question',
        messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`AI generation failed: ${errorData.error || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
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
