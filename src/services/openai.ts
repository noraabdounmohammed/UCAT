import OpenAI from 'openai';

// Simple in-memory cache for responses
interface CacheEntry {
  response: string;
  timestamp: number;
}

/**
 * Stream an AI response token-by-token for lower perceived latency
 * @param userQuery The user's question
 * @param context The question context
 * @param onToken Callback invoked for each streamed token chunk
 * @returns The full concatenated response once the stream completes
 */
export async function generateAIResponseStream(
  userQuery: string,
  context: QuestionContext,
  onToken: (token: string) => void
): Promise<string> {
  console.log('Generating AI response (streaming) for:', { userQuery, context });

  try {
    if (!openai) {
      console.error('OpenAI client not initialized (stream). Using fallback.');
      const fallback = generateFallbackResponse(userQuery, context);
      // Emit as a single chunk
      onToken(fallback);
      return fallback;
    }

    // Build cache key similar to non-streaming path
    const normalizedQuery = userQuery.toLowerCase().trim();
    const keyTerms = normalizedQuery.split(/\s+/).filter(word => word.length > 3).slice(0, 3).join('_');
    const cacheKey = `${context.correctAnswer}_${keyTerms}`;

    // If cached, emit quickly and return
    const cached = responseCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
      console.log('Using cached (stream) response for:', cacheKey);
      onToken(cached.response);
      return cached.response;
    }

    const systemPrompt = `You are an expert medical education AI assistant helping a UKMLA AKT student.
- Keep responses concise (150–200 words), UK-guideline focused, light markdown, ≤2 emojis.
- Do NOT invent links. Only include hyperlinks if they are explicitly provided in the input context; otherwise cite the source name without a URL.
- If unsure, state that briefly.`;

    const compressedUserPrompt = `
QUESTION: ${context.question.substring(0, 150)}${context.question.length > 150 ? '...' : ''}

CORRECT ANSWER: ${context.correctAnswer}

EXPLANATION: ${context.explanation.substring(0, 150)}${context.explanation.length > 150 ? '...' : ''}

USER QUERY: ${userQuery}`;

    // Small jitters can improve perceived responsiveness with many concurrent requests
    await new Promise(r => setTimeout(r, 100));

    // Request a streaming completion
    const stream = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: compressedUserPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
      top_p: 0.8,
      stream: true
    });

    let full = '';
    try {
      // Iterate streamed chunks
      for await (const chunk of stream as AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }>) {
        const delta = chunk?.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          full += delta;
          onToken(delta);
        }
      }
    } catch (streamErr) {
      console.warn('Stream iteration error:', streamErr);
    }

    // Cache the final response
    responseCache[cacheKey] = { response: full, timestamp: Date.now() };
    return full || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error('Error in generateAIResponseStream:', error);
    const fallback = generateFallbackResponse(userQuery, context);
    onToken(fallback);
    return fallback;
  }
}

// Cache with a 60-minute expiration to maximize cache hits
const responseCache: Record<string, CacheEntry> = {};
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes

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
    
    // Create a very aggressive cache key that will match similar questions
    // This helps us reuse responses for similar questions for near-instant responses
    const normalizedQuery = userQuery.toLowerCase().trim();
    // Extract key terms from the query to increase cache hit rate
    const keyTerms = normalizedQuery.split(/\s+/).filter(word => word.length > 3).slice(0, 3).join('_');
    const cacheKey = `${context.correctAnswer}_${keyTerms}`;
    
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
    const systemPrompt = `You are an expert medical education AI assistant helping a UKMLA AKT student.

Important instructions:
- Be concise but thorough (aim for 150–200 words)
- Focus on UK standards (NICE, NHS, GMC)
- Use light markdown (bold for key terms, short bullet lists, up to 2 emojis)
- Do NOT fabricate references or links. Only include a hyperlink if it is explicitly provided in the input context. Otherwise, name the source (e.g., "NICE CKS: Hypothyroidism") without a URL.
- If unsure or information is not provided, say so briefly.
- Never cut off your response.`;

    // Create a compressed version of the prompt to balance speed and context
    const compressedUserPrompt = `
QUESTION: ${context.question.substring(0, 150)}${context.question.length > 150 ? '...' : ''}

CORRECT ANSWER: ${context.correctAnswer}

EXPLANATION: ${context.explanation.substring(0, 150)}${context.explanation.length > 150 ? '...' : ''}

USER QUERY: ${userQuery}`;


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
        
        // Call the DeepSeek API with optimized parameters for speed and quality
        const response = await openai.chat.completions.create({
          model: "deepseek-chat", // Using DeepSeek's chat model
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: compressedUserPrompt }
          ],
          temperature: 0.3,  // Balanced temperature for speed and creativity
          max_tokens: 500,   // Sufficient tokens for quality responses
          top_p: 0.8,        // Balanced top_p for focused but varied responses
          presence_penalty: 0.0,  // No penalty for faster processing
          frequency_penalty: 0.0,  // No penalty for faster processing
          stream: false      // No streaming for faster complete response
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
  
  // Generate a context-aware fallback response based on the query with UK references
  if (hasKeyword(['why', 'reason', 'explain', 'how come'])) {
    return `## 🔍 **Explanation Analysis**

Based on the medical concepts in this question about "${questionPreview}...", **${context.correctAnswer}** is correct because it best aligns with the clinical presentation according to UK standards.

**Key factors to consider:**
* Specific symptoms described in the case
* Test results and interpretation per NHS diagnostic pathways
* Underlying pathophysiology as described in UK medical curricula

**UK Reference:**
[NICE Clinical Knowledge Summary](https://cks.nice.org.uk/topics/) provides the framework for this approach. See also [NHS Clinical Guidelines](https://www.nhs.uk/conditions/) for UK-specific management.`;
  } else if (hasKeyword(['difference', 'versus', 'vs', 'compare'])) {
    return `## ⚖️ **Comparative Analysis**

For this question about "${questionPreview}...", the key difference between the options relates to their specificity and relevance according to UK clinical guidelines.

**${context.correctAnswer}** addresses the exact condition described in line with GMC standards, while other options may be:
* Too broad in scope compared to NHS clinical pathways
* Address different pathophysiological processes than those emphasized in UK practice
* Focus on aspects less relevant to NICE-guided clinical decision making

**UK Reference:**
This aligns with [GMC Good Medical Practice](https://www.gmc-uk.org/ethical-guidance/ethical-guidance-for-doctors/good-medical-practice) framework and [NICE Clinical Knowledge Summaries](https://cks.nice.org.uk/topics/).`;
  } else if (hasKeyword(['treatment', 'manage', 'therapy', 'intervention'])) {
    return `## 💊 **Treatment Approach**

For this condition about "${questionPreview}...", the UK standard treatment approach typically follows NICE guidelines and involves addressing the underlying cause identified in **${context.correctAnswer}**.

**NHS management focuses on:**
1. Resolving the acute presentation according to UK clinical pathways
2. Preventing short-term complications as outlined in NHS protocols
3. Long-term monitoring and follow-up per UK best practice guidelines

**UK Reference:**
Refer to [NICE Clinical Guidelines](https://www.nice.org.uk/guidance/published?type=cg) for specific treatment algorithms and [NHS England care pathways](https://www.england.nhs.uk/publication/nhs-standard-contract-service-specifications/) for this condition.`;
  } else if (hasKeyword(['pathophysiology', 'mechanism', 'process'])) {
    return `## 🧬 **Pathophysiological Mechanism**

The pathophysiology for "${questionPreview}..." involves specific mechanisms as understood in UK medical education that explain why **${context.correctAnswer}** is correct.

**Understanding the process according to UK curricula requires knowledge of:**
* Cellular and molecular changes as emphasized in UK medical schools
* Progression of the disease according to UK clinical understanding
* How these changes manifest clinically in the NHS setting

**UK Reference:**
This aligns with the [Royal College curriculum frameworks](https://www.rcplondon.ac.uk/education-practice/advice/specialty-curriculum) and [GMC outcomes for graduates](https://www.gmc-uk.org/education/standards-guidance-and-curricula/standards-and-outcomes/outcomes-for-graduates).`;
  } else if (hasKeyword(['symptom', 'sign', 'presentation', 'clinical'])) {
    return `## 🐺 **Clinical Presentation**

The clinical presentation in this question about "${questionPreview}..." shows specific signs that point to **${context.correctAnswer}** according to UK diagnostic criteria.

**Key clinical features in UK practice:**
* Characteristic symptoms as described in NHS clinical assessment frameworks
* Pattern of presentation as recognized in UK primary and secondary care
* Timing and progression of symptoms according to NICE diagnostic guidelines

**UK Reference:**
Consult the relevant [NICE Clinical Knowledge Summary](https://cks.nice.org.uk/topics/) and [NHS clinical assessment tools](https://www.nhs.uk/conditions/) for this presentation.`;
  } else if (hasKeyword(['test', 'diagnostic', 'lab', 'imaging'])) {
    return `## 🔬 **Diagnostic Approach**

For diagnosing the condition in "${questionPreview}...", the findings mentioned support **${context.correctAnswer}** as the correct approach according to UK diagnostic pathways.

**Important diagnostic considerations in UK practice:**
* Specificity and sensitivity of tests as evaluated by NICE
* Interpretation of results in clinical context following NHS guidelines
* Appropriate sequence of diagnostic steps per UK testing protocols

**UK Reference:**
This follows [NICE diagnostic guidance](https://www.nice.org.uk/guidance/published?type=dg) and [NHS England test ordering recommendations](https://www.england.nhs.uk/publication/diagnostic-imaging-dataset-guidance/).`;
  } else {
    return `## 📚 **Key Concept Review**

To understand this question about "${questionPreview}...", focus on why **${context.correctAnswer}** is correct according to UK medical practice.

**For better understanding in the UKMLA context:**
* Review the specific medical reasoning aligned with GMC outcomes
* Consider the distinctions between answer choices in UK clinical practice
* Connect the clinical scenario to underlying principles emphasized in UK medical education

**UK Reference:**
Refer to the [GMC's Good Medical Practice framework](https://www.gmc-uk.org/ethical-guidance/ethical-guidance-for-doctors/good-medical-practice) and [UK medical school curricula](https://www.gmc-uk.org/education/standards-guidance-and-curricula/standards-and-outcomes/outcomes-for-graduates) for these concepts.`;
  }
}
