import { ConceptNode } from '@/types/conceptTypes';

interface GeneratedQuestion {
  id: string;
  concept_id: string;
  question_stem: string;
  question?: string;
  clinical_vignette?: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  correct_answer: string;
  explanation: string;
  format: 'ukmla_sba' | 'flashcard';
}

// Call OpenAI API to generate UKMLA-style questions
async function callOpenAI(prompt: string): Promise<any> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔑 API Key status:', apiKey ? 'Present' : 'Missing');
  }
  
  if (!apiKey || apiKey === 'PLACEHOLDER_REPLACE_IN_NETLIFY_DASHBOARD') {
    console.error('❌ OpenAI API key not configured properly');
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a medical education expert creating UKMLA-style single best answer questions. Generate clinically accurate, challenging questions that test understanding rather than memorization.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DeepSeek API Error:', response.status, response.statusText, errorText);
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Invalid API response structure:', data);
      throw new Error('Invalid API response structure');
    }
    
    let content = data.choices[0].message.content;
    
    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 AI Generated content:', content);
    }
    
    // DeepSeek often wraps JSON in markdown code blocks
    if (content.includes('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.includes('```')) {
      content = content.replace(/```\n?/g, '');
    }
    
    return JSON.parse(content.trim());
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}

// Generate UKMLA question using AI
export async function generateUKMLAQuestionWithAI(concept: ConceptNode, customPrompt?: string): Promise<GeneratedQuestion> {
  const defaultInstructions = `You are creating a UKMLA exam question. UKMLA questions ALWAYS have exactly 5 options.

Create a question with:
1. A realistic clinical vignette (2-3 sentences) with patient demographics, presentation, and relevant history
2. A clear question stem (e.g., "What is the most appropriate next step?" or "What is the most likely diagnosis?")
3. FIVE options labeled A, B, C, D, E (not 3, not 4, exactly 5)
4. All options must be plausible and clinically relevant
5. The correct answer should test understanding of the key concept
6. Include a detailed explanation

MANDATORY: Generate exactly 5 options. If you generate fewer than 5 options, the question will be rejected.`;

  const instructions = customPrompt || defaultInstructions;
  
  // Determine number of options from instructions
  let optionCount = 5; // default for UKMLA
  
  // Look for explicit option count specifications
  const optionMatches = [
    { pattern: /\b(?:exactly\s+)?two\s+options?|\b2\s+options?/i, count: 2 },
    { pattern: /\b(?:exactly\s+)?three\s+options?|\b3\s+options?/i, count: 3 },
    { pattern: /\b(?:exactly\s+)?four\s+options?|\b4\s+options?/i, count: 4 },
    { pattern: /\b(?:exactly\s+)?five\s+options?|\b5\s+options?/i, count: 5 },
    { pattern: /\b(?:exactly\s+)?six\s+options?|\b6\s+options?/i, count: 6 },
    { pattern: /\b(?:exactly\s+)?seven\s+options?|\b7\s+options?/i, count: 7 },
    { pattern: /\b(?:exactly\s+)?eight\s+options?|\b8\s+options?/i, count: 8 }
  ];
  
  // Find the last (most specific) match in the instructions
  for (const match of optionMatches) {
    if (match.pattern.test(instructions)) {
      optionCount = match.count;
    }
  }
  
  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 Detected option count:', optionCount, 'from instructions');
  }
  
  // Generate option examples for the JSON template
  const optionExamples = Array.from({length: optionCount}, (_, i) => 
    `    {"id": "${String.fromCharCode(65 + i)}", "text": "Option ${String.fromCharCode(65 + i)} text"}`
  ).join(',\n');
  
  const prompt = `
Generate a UKMLA-style single best answer question based on this medical concept:

Title: ${concept.title}
Content: ${concept.content}
Custom Filters: ${concept.custom_filters?.join(', ') || 'N/A'}
Prerequisites: ${concept.prerequisites?.join(', ') || 'None'}

${instructions}

Return the response as a JSON object with EXACTLY ${optionCount} options:
{
  "vignette": "The clinical scenario...",
  "question": "What is the most appropriate...",
  "options": [
${optionExamples}
  ],
  "correct": "A",
  "explanation": "The correct answer is A because... Option B is incorrect because... Option C is incorrect because..."
}

MANDATORY REQUIREMENTS:
- Provide exactly ${optionCount} options labeled A through ${String.fromCharCode(64 + optionCount)}
- Each option must be a complete, clinically plausible answer
- Do not provide fewer than ${optionCount} options under any circumstances
`;

  try {
    const aiResponse = await callOpenAI(prompt);
    
    // Validate that AI generated the correct number of options
    if (!aiResponse.options || aiResponse.options.length !== optionCount) {
      console.warn(`⚠️ AI generated ${aiResponse.options?.length || 0} options, expected ${optionCount}. Falling back to template.`);
      throw new Error(`AI generated wrong number of options: ${aiResponse.options?.length || 0} instead of ${optionCount}`);
    }
    
    // Ensure concept_id is valid
    const conceptId = concept.concept_id || `concept-${Date.now()}`;
    
    // Combine vignette and question for proper UKMLA display
    const fullQuestion = aiResponse.vignette ? 
      `${aiResponse.vignette}\n\n${aiResponse.question}` : 
      aiResponse.question;

    const generatedQuestion = {
      id: `ai-${conceptId}-${Date.now()}`,
      concept_id: conceptId,
      question_stem: fullQuestion,
      clinical_vignette: aiResponse.vignette,
      question: aiResponse.question,
      options: aiResponse.options,
      correct_answer: aiResponse.correct,
      explanation: aiResponse.explanation,
      format: 'ukmla_sba' as const
    };

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Generated question structure:', {
        id: generatedQuestion.id,
        question_stem_length: generatedQuestion.question_stem.length,
        options_count: generatedQuestion.options.length,
        has_vignette: !!generatedQuestion.clinical_vignette
      });
    }

    return generatedQuestion;
  } catch (error) {
    console.error('🚨 AI Question Generation Failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      concept: concept.title,
      hasApiKey: !!import.meta.env.VITE_OPENAI_API_KEY
    });
    // Fallback to template-based generation if AI fails
    return generateTemplateQuestion(concept, optionCount);
  }
}

// Fallback template-based generation
function generateTemplateQuestion(concept: ConceptNode, requestedOptionCount: number = 5): GeneratedQuestion {
  const age = Math.floor(Math.random() * 40) + 35;
  const gender = Math.random() > 0.5 ? 'man' : 'woman';
  
  // Ensure concept_id is valid
  const conceptId = concept.concept_id || `concept-${Date.now()}`;
  
  // Create a clinical vignette based on the concept content
  const contentWords = concept.content?.split(' ') || [];
  const symptom = contentWords.find(word => 
    ['pain', 'breathlessness', 'fatigue', 'swelling', 'cough', 'fever', 'nausea'].includes(word.toLowerCase())
  ) || 'symptoms';
  
  const vignette = `A ${age}-year-old ${gender} presents with ${symptom.toLowerCase()} and relevant clinical findings.`;
  const fullQuestion = `${vignette}\n\nWhat is the most appropriate next step?`;
  
  // Generate the requested number of options
  const baseOptions = [
    'Immediate intervention as per guidelines',
    'Further investigation required',
    'Conservative management',
    'Specialist referral',
    'Observation and reassessment',
    'Arrange follow-up appointment',
    'Obtain additional history',
    'Perform additional examination'
  ];
  
  const options = Array.from({length: requestedOptionCount}, (_, i) => ({
    id: String.fromCharCode(65 + i),
    text: baseOptions[i] || `Management option ${String.fromCharCode(65 + i)}`
  }));
  
  return {
    id: `template-${conceptId}-${Date.now()}`,
    concept_id: conceptId,
    question_stem: fullQuestion,
    clinical_vignette: vignette,
    question: 'What is the most appropriate next step?',
    options,
    correct_answer: 'A',
    explanation: concept.content || 'Based on current guidelines.',
    format: 'ukmla_sba' as const
  };
}

// Generate flashcard using AI
export async function generateFlashcardWithAI(concept: ConceptNode, customFlashcardPrompt?: string): Promise<GeneratedQuestion> {
  const defaultPrompt = `Create a medical flashcard with:
1. A concise, focused question for the front that tests understanding of the key concept
2. A comprehensive answer for the back with 2-3 key points
3. Include clinical relevance where appropriate
4. Make it memorable and easy to review`;
  
  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 Flashcard Generation:', {
      hasCustomPrompt: !!customFlashcardPrompt,
      usingDefault: !customFlashcardPrompt
    });
  }
  
  const userInstructions = customFlashcardPrompt || defaultPrompt;
  
  const prompt = `
${userInstructions}

Concept Information:
Title: ${concept.title}
Content: ${concept.content}
Custom Filters: ${concept.custom_filters?.join(', ') || 'N/A'}

Return as JSON:
{
  "front": "Question text for the front of the flashcard",
  "back": "Answer text for the back of the flashcard"
}
`;

  try {
    const aiResponse = await callOpenAI(prompt);
    
    // Ensure concept_id is valid
    const conceptId = concept.concept_id || `concept-${Date.now()}`;
    
    return {
      id: `flash-${conceptId}-${Date.now()}`,
      concept_id: conceptId,
      question_stem: aiResponse.front,
      options: [],
      correct_answer: '',
      explanation: aiResponse.back,
      format: 'flashcard'
    };
  } catch (error) {
    // Ensure concept_id is valid for fallback
    const conceptId = concept.concept_id || `concept-${Date.now()}`;
    
    // Fallback
    return {
      id: `flash-${conceptId}-${Date.now()}`,
      concept_id: conceptId,
      question_stem: `${concept.title}: What are the key points?`,
      options: [],
      correct_answer: '',
      explanation: concept.content,
      format: 'flashcard'
    };
  }
}

// Configuration interface to prevent missing parameters
interface QuestionGenerationConfig {
  concept: ConceptNode;
  format: 'ukmla_sba' | 'flashcard';
  customPrompt?: string;
  customFlashcardPrompt?: string;
}

// Type-safe wrapper function to prevent parameter issues
export async function generateQuestionWithConfig(config: QuestionGenerationConfig): Promise<GeneratedQuestion> {
  return generateQuestionFromConcept(
    config.concept,
    config.format,
    config.customPrompt,
    config.customFlashcardPrompt
  );
}

// Main export - generates questions with AI
export async function generateQuestionFromConcept(
  concept: ConceptNode,
  format: 'ukmla_sba' | 'flashcard' = 'ukmla_sba',
  customPrompt?: string,
  customFlashcardPrompt?: string
): Promise<GeneratedQuestion> {
  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Question Generation:', {
      format,
      hasUKMLAPrompt: !!customPrompt,
      hasFlashcardPrompt: !!customFlashcardPrompt
    });
  }
  
  if (format === 'flashcard') {
    return generateFlashcardWithAI(concept, customFlashcardPrompt);
  } else {
    return generateUKMLAQuestionWithAI(concept, customPrompt);
  }
}
