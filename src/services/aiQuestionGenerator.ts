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
  format: 'ukmla_sba' | 'sba' | 'flashcard' | 'emq' | 'true_false' | 'ranking';
}

// Call OpenAI API to generate questions
async function callOpenAI(prompt: string, systemPrompt?: string): Promise<any> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔑 API Key status:', apiKey ? 'Present' : 'Missing');
  }
  
  if (!apiKey || apiKey === 'PLACEHOLDER_REPLACE_IN_NETLIFY_DASHBOARD') {
    console.error('❌ OpenAI API key not configured properly');
    throw new Error('OpenAI API key not configured');
  }

  const defaultSystemPrompt = 'You are a medical education expert. Generate clinically accurate, challenging questions that test understanding rather than memorization. ALWAYS respond with valid JSON only.';

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
            content: systemPrompt || defaultSystemPrompt
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
    
    // Extract JSON from various formats
    // 1. Try to find JSON in code blocks
    if (content.includes('```json')) {
      const jsonMatch = content.match(/```json\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        content = jsonMatch[1];
      }
    } else if (content.includes('```')) {
      const codeMatch = content.match(/```\s*\n?([\s\S]*?)\n?```/);
      if (codeMatch) {
        content = codeMatch[1];
      }
    }
    
    // 2. Try to find JSON object in the text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    // 3. Clean up any remaining markdown
    content = content.trim();
    
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', content);
      throw new Error('AI response was not valid JSON');
    }
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}

// Generate normal SBA question (non-medical, no clinical vignette)
export async function generateSBAQuestionWithAI(concept: ConceptNode, customPrompt?: string): Promise<GeneratedQuestion> {
  const defaultInstructions = `Create a standard Single Best Answer (SBA) question.

CRITICAL RULES:
- DO NOT create a clinical vignette or patient scenario
- DO NOT include patient demographics, age, gender, or medical history
- The question should be DIRECT and SIMPLE, like a flashcard question
- Format: Just ask "What is..." or "Which of the following..." directly

Create a question with:
1. A single, direct question (1 sentence maximum, no scenario or context)
2. FIVE options labeled A, B, C, D, E
3. All options must be plausible
4. The correct answer should test understanding of the key concept
5. Include a brief explanation

Example format:
Question: "What is the primary function of mitochondria?"
NOT: "A 45-year-old patient presents with..."

MANDATORY: Generate exactly 5 options. NO clinical scenarios.`;

  const instructions = customPrompt || defaultInstructions;
  
  // Determine number of options from instructions
  let optionCount = 5; // default for SBA
  
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
  
  // Generate option examples for the JSON template
  const optionExamples = Array.from({length: optionCount}, (_, i) => 
    `    {"id": "${String.fromCharCode(65 + i)}", "text": "Option ${String.fromCharCode(65 + i)} text"}`
  ).join(',\n');
  
  const prompt = `
Generate a single best answer question based on this concept:

Title: ${concept.title}
Content: ${concept.content}
Custom Filters: ${concept.custom_filters?.join(', ') || 'N/A'}

${instructions}

IMPORTANT: The question must be SHORT and DIRECT. Do NOT write a clinical vignette or scenario.
Just ask a simple, direct question about the concept.

Return the response as a JSON object with EXACTLY ${optionCount} options:
{
  "question": "What is the main characteristic of ${concept.title}?",
  "options": [
${optionExamples}
  ],
  "correct": "A",
  "explanation": "The correct answer is A because..."
}

MANDATORY REQUIREMENTS:
- Question must be ONE sentence, direct and simple
- NO patient scenarios, NO clinical vignettes, NO demographics
- Provide exactly ${optionCount} options labeled A through ${String.fromCharCode(64 + optionCount)}
- Each option must be a complete, plausible answer
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

    return {
      id: `ai-${conceptId}-${Date.now()}`,
      concept_id: conceptId,
      question_stem: aiResponse.question,
      question: aiResponse.question,
      options: aiResponse.options,
      correct_answer: aiResponse.correct,
      explanation: aiResponse.explanation,
      format: 'sba' as const
    };
  } catch (error) {
    console.error('🚨 SBA Question Generation Failed:', error);
    // Fallback to simple template
    return generateSimpleSBATemplate(concept, optionCount);
  }
}

// Fallback template for simple SBA
function generateSimpleSBATemplate(concept: ConceptNode, optionCount: number = 5): GeneratedQuestion {
  const conceptId = concept.concept_id || `concept-${Date.now()}`;
  
  const options = Array.from({length: optionCount}, (_, i) => ({
    id: String.fromCharCode(65 + i),
    text: `Option ${String.fromCharCode(65 + i)}`
  }));

  return {
    id: `template-${conceptId}-${Date.now()}`,
    concept_id: conceptId,
    question_stem: `Which of the following best describes ${concept.title}?`,
    question: `Which of the following best describes ${concept.title}?`,
    options,
    correct_answer: 'A',
    explanation: concept.content || 'Based on the concept content.',
    format: 'sba' as const
  };
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
Generate a single best answer question based on this concept:

Title: ${concept.title}
Content: ${concept.content}
Custom Filters: ${concept.custom_filters?.join(', ') || 'N/A'}
Prerequisites: ${concept.prerequisites?.join(', ') || 'None'}

CRITICAL CONSTRAINT:
- The question MUST be directly answerable using ONLY the information provided in the "Content" field above
- DO NOT ask questions that require knowledge beyond what's explicitly stated in the content
- DO NOT infer or add information not present in the concept content
- If the content only states facts, create a question that tests recall or application of those specific facts
- The scenario and options should relate to the content provided, but the correct answer must be determinable from the content alone

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
  const defaultPrompt = `Create a flashcard with:
1. A concise, focused question for the front that tests understanding of the key concept
2. A CONCISE answer for the back with 2-4 key points (keep each point brief - max 1-2 sentences)
3. Make it clear, accurate, and easy to review
4. IMPORTANT: Keep the total answer length SHORT - it should fit on screen without scrolling
5. DO NOT add "Clinical Relevance", "Clinical Application", "Medical Context", or similar sections
6. DO NOT add information about why something is medically important unless explicitly in the content
7. Stick to factual, educational content only - no clinical commentary

CRITICAL FORMATTING REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:

1. **Use Markdown Lists with Line Breaks:**
   - For bullet points, use this format:
     - First point
     - Second point
     - Third point
   
   - For numbered lists, use this format:
     1. First point
     2. Second point
     3. Third point

2. **Each List Item MUST Be on a Separate Line:**
   - ✅ CORRECT:
     **Key Points:**
     - Point one
     - Point two
     - Point three
   
   - ❌ WRONG (DO NOT DO THIS):
     **Key Points:** • Point one • Point two • Point three

3. **Use Bold Text for Section Headers:**
   - Use **Bold Text** for section titles
   - Follow each bold header with a line break before the list

4. **Add Blank Lines Between Sections:**
   - Always add a blank line between different sections
   - This creates proper paragraph spacing

EXAMPLE OF PERFECT FORMATTING:

**Definition:**
- A prokaryotic cell is a simple cell without a nucleus
- Found in bacteria and archaea

**Key Characteristics:**
- No membrane-bound organelles
- DNA is located in the nucleoid region
- Typically smaller than eukaryotic cells

**Comparison:**
Prokaryotic cells (0.1-5.0 μm) are much smaller than eukaryotic cells (10-100 μm).

NEVER WRITE LISTS IN PARAGRAPH FORM. Each bullet or number point MUST be on its own line.`;
  
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

CRITICAL CONSTRAINTS:
1. CONTENT SCOPE: The flashcard question MUST be directly answerable using ONLY the information in the "Content" field below
   - DO NOT ask questions requiring knowledge beyond what's explicitly stated
   - DO NOT infer or add information not present in the concept content
   - DO NOT add explanations about WHY unless the content explains WHY
   - If the content only states facts, test recall of those specific facts

2. FORMATTING REQUIREMENTS (MANDATORY):
   - Use bullet points with proper markdown: "- Point text"
   - Use bold headers: "**Header:**"
   - Add blank lines between sections
   - NEVER write lists in paragraph form
   
   Example format:
   **Size Range:**
   - Prokaryotic cells: 0.1-5.0 micrometers
   - Eukaryotic cells: 10-100 micrometers
   
   **Comparison:**
   Prokaryotic cells are much smaller than eukaryotic cells.

Concept Information:
Title: ${concept.title}
Content: ${concept.content}
Custom Filters: ${concept.custom_filters?.join(', ') || 'N/A'}

Return as JSON:
{
  "front": "Question text for the front of the flashcard",
  "back": "Answer with bullet points on separate lines, bold headers, and blank lines between sections"
}
`;

  try {
    // Use a generic system prompt for flashcards to avoid medical bias
    const systemPrompt = 'You are an educational content expert. Generate accurate, well-structured flashcards using proper markdown formatting (bullet points, bold headers, blank lines). Use ONLY the information provided in the concept content - do not add inferred information. ALWAYS respond with valid JSON only.';
    const aiResponse = await callOpenAI(prompt, systemPrompt);
    
    // Ensure concept_id is valid
    const conceptId = concept.concept_id || `concept-${Date.now()}`;
    
    // Post-process the explanation to fix inline bullet points
    let processedExplanation = aiResponse.back;
    
    // Convert inline bullet points (• or *) to proper markdown lists
    // Pattern: "Text: • point1 • point2 • point3" -> "Text:\n- point1\n- point2\n- point3"
    processedExplanation = processedExplanation.replace(
      /([:\n])\s*[•\*]\s*([^•\*\n]+?)(?=\s*[•\*]|\s*$)/g,
      (_match: string, prefix: string, content: string) => {
        // If this is the first bullet after a colon or newline, start a new line
        if (prefix === ':') {
          return `:\n- ${content.trim()}`;
        }
        return `\n- ${content.trim()}`;
      }
    );
    
    // Clean up any remaining inline bullets that might be in paragraph form
    processedExplanation = processedExplanation.replace(
      /([^:\n])\s+[•\*]\s+/g,
      '$1\n- '
    );
    
    // Convert numbered lists in paragraph form: "1) text 2) text" -> "1. text\n2. text"
    processedExplanation = processedExplanation.replace(
      /(\d+)\)\s+([^0-9]+?)(?=\s*\d+\)|\s*$)/g,
      '$1. $2\n'
    );
    
    return {
      id: `flash-${conceptId}-${Date.now()}`,
      concept_id: conceptId,
      question_stem: aiResponse.front,
      options: [],
      correct_answer: '',
      explanation: processedExplanation,
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

// Generate Extended Matching Question (EMQ)
async function generateEMQWithAI(concept: ConceptNode, customPrompt?: string): Promise<GeneratedQuestion> {
  const prompt = customPrompt || `Create an Extended Matching Question (EMQ) based on this concept:

Title: ${concept.title}
Content: ${concept.content || ''}

IMPORTANT: Base your question ONLY on the concept content provided above.

You MUST respond with ONLY valid JSON in this exact format:
{
  "options": [
    {"id": "A", "text": "Option A about ${concept.title}"},
    {"id": "B", "text": "Option B about ${concept.title}"},
    {"id": "C", "text": "Option C about ${concept.title}"},
    {"id": "D", "text": "Option D about ${concept.title}"},
    {"id": "E", "text": "Option E about ${concept.title}"}
  ],
  "scenario": "A scenario related to ${concept.title}...",
  "correct_option_id": "A",
  "explanation": "This is correct because..."
}

Create 5-8 options and ONE scenario that tests understanding of ${concept.title}.`;

  const systemPrompt = 'You are an education expert creating Extended Matching Questions (EMQs). Base questions on the provided concept content. Respond with ONLY valid JSON in the exact format requested. No markdown, no explanations, just JSON.';

  try {
    const aiResponse = await callOpenAI(prompt, systemPrompt);
    
    return {
      id: crypto.randomUUID(),
      concept_id: concept.concept_id,
      question_stem: aiResponse.scenario || `Match the clinical scenario to the most appropriate option:`,
      options: aiResponse.options || [],
      correct_answer: aiResponse.correct_option_id || 'A',
      explanation: aiResponse.explanation || '',
      format: 'emq' as const
    };
  } catch (error) {
    console.error('Error generating EMQ:', error);
    // Return fallback UKMLA question
    return generateUKMLAQuestionWithAI(concept, customPrompt);
  }
}

// Generate True/False Question
async function generateTrueFalseWithAI(concept: ConceptNode, customPrompt?: string): Promise<GeneratedQuestion> {
  const prompt = customPrompt || `Create a True/False question based on this concept:

Title: ${concept.title}
Content: ${concept.content || ''}

IMPORTANT: Base your question ONLY on the concept content provided above.

You MUST respond with ONLY valid JSON in this exact format:
{
  "question": "Which of the following statements about ${concept.title} is TRUE?",
  "options": [
    {"id": "A", "text": "Statement 1"},
    {"id": "B", "text": "Statement 2"},
    {"id": "C", "text": "Statement 3"},
    {"id": "D", "text": "Statement 4"},
    {"id": "E", "text": "Statement 5"}
  ],
  "correct": "A",
  "explanation": "Explanation of why A is correct"
}

Create 5 statements where ONE is true and the others are false. Base them on the concept content.`;

  const systemPrompt = 'You are an education expert creating True/False questions. Base questions on the provided concept content. Respond with ONLY valid JSON in the exact format requested. No markdown, no explanations, just JSON.';

  try {
    const aiResponse = await callOpenAI(prompt, systemPrompt);
    
    return {
      id: crypto.randomUUID(),
      concept_id: concept.concept_id,
      question_stem: aiResponse.question || `Which of the following statements is TRUE?`,
      options: aiResponse.options || [],
      correct_answer: aiResponse.correct || 'A',
      explanation: aiResponse.explanation || '',
      format: 'true_false' as const
    };
  } catch (error) {
    console.error('Error generating True/False:', error);
    return generateUKMLAQuestionWithAI(concept, customPrompt);
  }
}

// Generate Ranking/Ordering Question
async function generateRankingWithAI(concept: ConceptNode, customPrompt?: string): Promise<GeneratedQuestion> {
  const prompt = customPrompt || `Create a priority/ordering question based on this concept:

Title: ${concept.title}
Content: ${concept.content || ''}

IMPORTANT: Base your question ONLY on the concept content provided above.

You MUST respond with ONLY valid JSON in this exact format:
{
  "question": "What is the most appropriate first step in managing this patient?",
  "clinical_scenario": "A 45-year-old presents with...",
  "options": [
    {"id": "A", "text": "Management option A"},
    {"id": "B", "text": "Management option B"},
    {"id": "C", "text": "Management option C"},
    {"id": "D", "text": "Management option D"},
    {"id": "E", "text": "Management option E"}
  ],
  "correct": "A",
  "explanation": "A is correct because..."
}

Create a scenario and 5 options that test understanding of ${concept.title}. Base them on the concept content.`;

  const systemPrompt = 'You are an education expert creating priority/management questions. Base questions on the provided concept content. Respond with ONLY valid JSON in the exact format requested. No markdown, no explanations, just JSON.';

  try {
    const aiResponse = await callOpenAI(prompt, systemPrompt);
    
    const questionStem = aiResponse.clinical_scenario 
      ? `${aiResponse.clinical_scenario}\n\n${aiResponse.question}`
      : aiResponse.question || 'What is the most appropriate next step?';
    
    return {
      id: crypto.randomUUID(),
      concept_id: concept.concept_id,
      question_stem: questionStem,
      options: aiResponse.options || [],
      correct_answer: aiResponse.correct || 'A',
      explanation: aiResponse.explanation || '',
      format: 'ranking' as const
    };
  } catch (error) {
    console.error('Error generating Ranking:', error);
    return generateUKMLAQuestionWithAI(concept, customPrompt);
  }
}

// Configuration interface to prevent missing parameters
interface QuestionGenerationConfig {
  concept: ConceptNode;
  format: 'ukmla_sba' | 'sba' | 'flashcard' | 'emq' | 'true_false' | 'ranking';
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
  format: 'ukmla_sba' | 'sba' | 'flashcard' | 'emq' | 'true_false' | 'ranking' = 'ukmla_sba',
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
  } else if (format === 'sba') {
    return generateSBAQuestionWithAI(concept, customPrompt);
  } else if (format === 'emq') {
    return generateEMQWithAI(concept, customPrompt);
  } else if (format === 'true_false') {
    return generateTrueFalseWithAI(concept, customPrompt);
  } else if (format === 'ranking') {
    return generateRankingWithAI(concept, customPrompt);
  } else {
    return generateUKMLAQuestionWithAI(concept, customPrompt);
  }
}
