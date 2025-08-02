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
- Use emojis appropriately to highlight key points (1-3 emojis per response)
- Use markdown formatting for clarity:
  * **Bold** for important terms and concepts
  * Bullet points for lists of related items
  * Numbered lists for sequential steps or processes
  * Headings (##) for clear section breaks when needed
- Be concise but thorough (aim for 150-250 words)
- Structure your response with clear sections when appropriate

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
          temperature: 0.4,  // Slightly higher temperature for more creative responses with emojis
          max_tokens: 400,   // Increased token limit for better formatting and explanations
          top_p: 0.9,        // Slightly higher top_p for more diverse responses
          presence_penalty: 0.1,  // Small penalty to encourage diverse content
          frequency_penalty: 0.1   // Small penalty to discourage repetition
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
      return `⚠️ **Connection Issue**

I'm currently experiencing connection issues with my knowledge base. Based on previous similar questions, here's what I can tell you: 

${mostRecentResponse}`;
    }
  }
  
  // Extract keywords from the user's query
  const query = userQuery.toLowerCase();
  const hasKeyword = (keywords: string[]) => keywords.some(keyword => query.includes(keyword));
  
  // Get the first 50 chars of the question for context
  const questionPreview = context.question.substring(0, 50);
  
  // Generate a context-aware fallback response based on the query
  if (hasKeyword(['why', 'reason', 'explain', 'how come'])) {
    return `## 🔍 **Explanation Analysis**

Based on the medical concepts in this question about "${questionPreview}...", **${context.correctAnswer}** is correct because it best aligns with the clinical presentation.

**Key factors to consider:**
* Specific symptoms described in the case
* Test results and their interpretation
* Underlying pathophysiology`;
  } else if (hasKeyword(['difference', 'versus', 'vs', 'compare'])) {
    return `## ⚖️ **Comparative Analysis**

For this question about "${questionPreview}...", the key difference between the options relates to their specificity and relevance.

**${context.correctAnswer}** addresses the exact condition described, while other options may be:
* Too broad in scope
* Address different pathophysiological processes
* Focus on less relevant aspects of the case`;
  } else if (hasKeyword(['treatment', 'manage', 'therapy', 'intervention'])) {
    return `## 💊 **Treatment Approach**

For this condition about "${questionPreview}...", the standard treatment approach typically involves addressing the underlying cause identified in **${context.correctAnswer}**.

**Management focuses on:**
1. Resolving the acute presentation
2. Preventing short-term complications
3. Long-term monitoring and follow-up`;
  } else if (hasKeyword(['pathophysiology', 'mechanism', 'process'])) {
    return `## 🧬 **Pathophysiological Mechanism**

The pathophysiology for "${questionPreview}..." involves specific mechanisms that explain why **${context.correctAnswer}** is correct.

**Understanding the process requires knowledge of:**
* Cellular and molecular changes
* Progression of the disease
* How these changes manifest clinically`;
  } else if (hasKeyword(['symptom', 'sign', 'presentation', 'clinical'])) {
    return `## 🩺 **Clinical Presentation**

The clinical presentation in this question about "${questionPreview}..." shows specific signs that point to **${context.correctAnswer}**.

**Key clinical features:**
* Characteristic symptoms described
* Pattern of presentation
* Timing and progression of symptoms`;
  } else if (hasKeyword(['test', 'diagnostic', 'lab', 'imaging'])) {
    return `## 🔬 **Diagnostic Approach**

For diagnosing the condition in "${questionPreview}...", the findings mentioned support **${context.correctAnswer}** as the correct approach.

**Important diagnostic considerations:**
* Specificity and sensitivity of tests
* Interpretation of results in clinical context
* Appropriate sequence of diagnostic steps`;
  } else {
    return `## 📚 **Key Concept Review**

To understand this question about "${questionPreview}...", focus on why **${context.correctAnswer}** is correct.

**For better understanding:**
* Review the specific medical reasoning
* Consider the distinctions between answer choices
* Connect the clinical scenario to underlying medical principles`;
  }
}
