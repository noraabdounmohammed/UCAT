import OpenAI from 'openai';

// Simple in-memory cache for responses
interface CacheEntry {
  response: string;
  timestamp: number;
}

// Cache with a 30-minute expiration to further reduce API calls
const responseCache: Record<string, CacheEntry> = {};
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

// Initialize OpenAI client with DeepSeek API key and base URL
let openai: OpenAI | null = null;

try {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (apiKey && apiKey !== 'your-openai-api-key-goes-here') {
    openai = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/v1',  // DeepSeek API base URL
      dangerouslyAllowBrowser: true // Note: This is not secure for production
    });
    console.log('DeepSeek API client initialized successfully');
  } else {
    console.warn('DeepSeek API key not found or invalid. Using fallback responses.');
  }
} catch (error) {
  console.error('Error initializing DeepSeek API client:', error);
}

// Debug the API key
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
console.log('OpenAI API Key Status:', { 
  exists: !!apiKey, 
  length: apiKey ? apiKey.length : 0,
  firstChars: apiKey ? apiKey.substring(0, 5) : 'none'
});

// Interface for the question context
export interface QuestionContext {
  question: string;
  options: string[];
  correctAnswer: string;
  selectedAnswer: string | null;
  explanation: string;
}

/**
 * Generate an AI response to a user query about a medical question
 * @param userQuery - The user's question about the medical topic
 * @param context - The question context including the original question, options, and explanation
 * @returns A promise that resolves to the AI's response
 */
export async function generateAIResponse(userQuery: string, context: QuestionContext): Promise<string> {
  console.log('Generating AI response for:', { userQuery, context });
  
  try {
    // Check if OpenAI client is initialized
    if (!openai) {
      console.error('OpenAI client not initialized');
      return generateFallbackResponse(userQuery, context);
    }
    
    // Create a more aggressive cache key that will match similar questions
    // This helps us reuse responses for similar questions to reduce API calls
    const normalizedQuery = userQuery.toLowerCase().trim();
    const cacheKey = `${context.correctAnswer}_${normalizedQuery.substring(0, 30)}`;
    
    // Check if we have a cached response that hasn't expired
    if (responseCache[cacheKey]) {
      const cachedEntry = responseCache[cacheKey];
      const now = Date.now();
      
      // If the cache entry is still valid (less than 15 minutes old)
      if (now - cachedEntry.timestamp < CACHE_EXPIRY_MS) {
        console.log('Using cached response for:', cacheKey);
        return cachedEntry.response;
      } else {
        // Cache entry expired, remove it
        console.log('Cache expired for:', cacheKey);
        delete responseCache[cacheKey];
      }
    }
    
    // Create optimized prompts for the AI to reduce token usage
    const systemPrompt = `You are an expert medical education AI assistant helping a medical student understand a practice question.

Your goal is to provide concise, accurate explanations that help the student learn medical concepts.

Important instructions:
- Be specific and directly address the student's question
- Reference relevant medical terminology and concepts
- Explain why the correct answer is correct
- Be concise (aim for 100-200 words)
- Format your response with clear paragraphs when helpful

You have access to key information about the question and the student's query.`;

    // Create a compressed version of the prompt to reduce token usage
    const compressedUserPrompt = `
# QUESTION: "${context.question.substring(0, 150)}${context.question.length > 150 ? '...' : ''}"
# CORRECT: ${context.correctAnswer}
# EXPLANATION: "${context.explanation.substring(0, 100)}${context.explanation.length > 100 ? '...' : ''}"
# QUERY: "${userQuery}"

Please provide a specific response addressing this medical question.`;

    console.log('Sending to OpenAI:', { systemPrompt, compressedUserPrompt });
    
    // Define an interface for OpenAI API errors
    interface OpenAIError {
      status?: number;
      message?: string;
      type?: string;
      code?: string;
    }

    // Helper function to check if an error is an OpenAI API error
    function isOpenAIError(error: unknown): error is OpenAIError {
      return (
        typeof error === 'object' && 
        error !== null && 
        ('status' in error || 'message' in error || 'type' in error || 'code' in error)
      );
    }
    
    // Implement retry logic with exponential backoff
    const maxRetries = 3;
    let retries = 0;
    
    // Add a small initial delay before the first API call to avoid rate limits when multiple requests happen in quick succession
    await new Promise(resolve => setTimeout(resolve, 300));
    
    while (retries <= maxRetries) {
      try {
        if (retries > 0) {
          // Exponential backoff: wait longer between each retry
          const backoffTime = Math.pow(2, retries) * 1500; // 3s, 6s, 12s - increased base delay
          console.log(`Retry attempt ${retries}/${maxRetries}, waiting ${backoffTime/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
        
        // Call the OpenAI API with improved parameters
        const response = await openai.chat.completions.create({
          model: "deepseek-chat", // Using DeepSeek's chat model
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: compressedUserPrompt }
          ],
          temperature: 0.3,  // Moderate temperature for balanced responses
          max_tokens: 300,   // DeepSeek may have different rate limits
          top_p: 0.8,        // Focused sampling
          presence_penalty: 0.0,  // Remove penalties to reduce complexity
          frequency_penalty: 0.0   // Remove penalties to reduce complexity
        });
        
        console.log('OpenAI response received:', response);

        // Return the AI's response with basic error handling
        const aiResponse = response.choices[0].message.content || "";
        if (!aiResponse) {
          return "I'm sorry, I couldn't generate a response. Please try rephrasing your question.";
        }
        
        // Store the successful response in cache
        responseCache[cacheKey] = {
          response: aiResponse,
          timestamp: Date.now()
        };
        
        return aiResponse;
      } catch (error: unknown) {
        // Only retry on rate limit errors
        if (isOpenAIError(error) && error.status === 429) {
          retries++;
          console.log(`Rate limit hit, retry ${retries}/${maxRetries}`);
          
          if (retries <= maxRetries) {
            // Implement exponential backoff with jitter
            const baseDelay = 1000; // 1 second base delay
            const maxDelay = 10000; // 10 seconds max delay
            
            // Calculate delay with exponential backoff: 2^retries * baseDelay
            const exponentialDelay = Math.min(Math.pow(2, retries) * baseDelay, maxDelay);
            
            // Add jitter (randomness) to avoid thundering herd problem
            const jitter = Math.random() * 0.3 * exponentialDelay;
            const delay = exponentialDelay + jitter;
            
            console.log(`Waiting for ${Math.round(delay / 1000)} seconds before retry...`);
            
            // Wait for the calculated delay
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // Handle errors after all retries are exhausted or for non-rate-limit errors
        console.error('DeepSeek API Error:', error);
        
        if (isOpenAIError(error)) {
          if (error.status === 401) {
            return "Authentication error: Your DeepSeek API key may be invalid or expired. Please check your API key configuration.";
          } else if (error.status === 429) {
            return "Rate limit exceeded: The DeepSeek API is currently experiencing high demand or your account has reached its rate limit.";
          } else if (error.status === 404) {
            return "Model not found: The specified DeepSeek model may not be available. Please check the model name.";
          } else if (error.status === 400) {
            return "Bad request: The request to DeepSeek API was invalid. This could be due to invalid parameters or malformed request.";
          } else {
            return `DeepSeek API error (${error.status || 'unknown'}): ${error.message || 'Unknown error'}. Please try again later.`;
          }
        } else {
          return "An unexpected error occurred while connecting to the DeepSeek API. Please try again later.";
        }
      }
    }
    
    // This should never be reached due to the return statements above, but TypeScript requires it
    return "Unable to get a response after multiple attempts. Please try again later.";
    
  } catch (error: unknown) {
    console.error("Error generating AI response:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return `Sorry, there was an error connecting to the AI service: ${errorMessage}. Please try again later.`;
  }
}

/**
 * Generates a fallback response when the OpenAI API is unavailable
 * @param userQuery The user's query
 * @param context The question context
 * @returns A fallback response
 */
export function generateFallbackResponse(userQuery: string, context: QuestionContext): string {
  console.log('Using fallback response generator');
  
  // Check if we have any cached responses we can use as fallbacks
  // This provides a better user experience than generic responses
  const cachedKeys = Object.keys(responseCache);
  if (cachedKeys.length > 0) {
    // Find the most recent cached response
    let mostRecentTimestamp = 0;
    let mostRecentResponse = '';
    
    for (const key of cachedKeys) {
      const entry = responseCache[key];
      if (entry.timestamp > mostRecentTimestamp) {
        mostRecentTimestamp = entry.timestamp;
        mostRecentResponse = entry.response;
      }
    }
    
    if (mostRecentResponse) {
      console.log('Using most recent cached response as fallback');
      return `I'm currently experiencing connection issues with my knowledge base. Based on previous similar questions, here's what I can tell you: \n\n${mostRecentResponse}`;
    }
  }
  
  // Extract keywords from the user's query
  const query = userQuery.toLowerCase();
  const hasKeyword = (keywords: string[]) => keywords.some(keyword => query.includes(keyword));
  
  // Get the first 50 chars of the question for context
  const questionPreview = context.question.substring(0, 50);
  
  // Generate a context-aware fallback response based on the query
  if (hasKeyword(['why', 'reason', 'explain', 'how come'])) {
    return `Based on the medical concepts in this question about "${questionPreview}...", ${context.correctAnswer} is correct because it best aligns with the clinical presentation. The key factors to consider are the specific symptoms and test results mentioned in the question.`;
  } else if (hasKeyword(['difference', 'versus', 'vs', 'compare'])) {
    return `For this question about "${questionPreview}...", the key difference between the options relates to their specificity and relevance. ${context.correctAnswer} addresses the exact condition described, while other options may be too broad or address different pathophysiological processes.`;
  } else if (hasKeyword(['treatment', 'manage', 'therapy', 'intervention'])) {
    return `For this condition about "${questionPreview}...", the standard treatment approach typically involves addressing the underlying cause identified in ${context.correctAnswer}. Management would focus on both resolving the acute presentation and preventing complications.`;
  } else if (hasKeyword(['pathophysiology', 'mechanism', 'process'])) {
    return `The pathophysiology for "${questionPreview}..." involves specific mechanisms that explain why ${context.correctAnswer} is correct. Understanding the underlying process is key to differentiating between the answer choices.`;
  } else if (hasKeyword(['symptom', 'sign', 'presentation', 'clinical'])) {
    return `The clinical presentation in this question about "${questionPreview}..." shows specific signs that point to ${context.correctAnswer}. These symptoms are more consistent with this answer than the alternatives.`;
  } else if (hasKeyword(['test', 'diagnostic', 'lab', 'imaging'])) {
    return `For diagnosing the condition in "${questionPreview}...", the findings mentioned support ${context.correctAnswer} as the correct approach. The specific test results are key indicators for this diagnosis.`;
  } else {
    return `To understand this question about "${questionPreview}...", focus on why ${context.correctAnswer} is correct. The explanation provides the specific medical reasoning, and reviewing the key concepts will help clarify the distinction between answer choices.`;
  }
}
