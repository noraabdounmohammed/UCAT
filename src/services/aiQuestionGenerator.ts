import { ConceptNode } from '@/types/conceptTypes';

interface GeneratedQuestion {
  id: string;
  concept_id: string;
  question_stem: string;
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
  
  console.log('API Key status:', apiKey ? 'Present' : 'Missing');
  
  if (!apiKey || apiKey === 'PLACEHOLDER_REPLACE_IN_NETLIFY_DASHBOARD') {
    console.error('OpenAI API key not configured properly');
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
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
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
  const defaultInstructions = `Create a question with:
1. A realistic clinical vignette (2-3 sentences) with patient demographics, presentation, and relevant history
2. A clear question stem (e.g., "What is the most appropriate next step?" or "What is the most likely diagnosis?")
3. Five options (A-E) that are plausible and similar in length
4. The correct answer should test understanding of the key concept
5. Include a brief explanation of why the correct answer is right`;

  const instructions = customPrompt || defaultInstructions;
  
  // Determine number of options from instructions
  let optionCount = 5; // default
  const threeMatch = instructions.match(/three|3/i);
  const fourMatch = instructions.match(/four|4/i);
  const sixMatch = instructions.match(/six|6/i);
  
  if (threeMatch) optionCount = 3;
  else if (fourMatch) optionCount = 4;
  else if (sixMatch) optionCount = 6;
  
  // Generate option examples for the JSON template
  const optionExamples = Array.from({length: optionCount}, (_, i) => 
    `    {"id": "${String.fromCharCode(65 + i)}", "text": "Option ${String.fromCharCode(65 + i)} text"}`
  ).join(',\n');
  
  const prompt = `
Generate a UKMLA-style single best answer question based on this medical concept:

Title: ${concept.title}
Description: ${concept.description}
Systems: ${concept.dimensions?.exam_specific?.ukmla?.systems?.join(', ') || 'N/A'}
Conditions: ${concept.dimensions?.exam_specific?.ukmla?.conditions?.join(', ') || 'N/A'}
Presentations: ${concept.dimensions?.exam_specific?.ukmla?.presentations?.join(', ') || 'N/A'}
Competencies: ${concept.dimensions?.exam_specific?.ukmla?.competencies?.join(', ') || 'N/A'}
Key Knowledge: ${concept.knowledge?.decision_rule || 'N/A'}
Guideline: ${concept.knowledge?.guideline_ref?.name || 'N/A'} - ${concept.knowledge?.guideline_ref?.key_line || 'N/A'}

${instructions}

Return the response as a JSON object with EXACTLY ${optionCount} options:
{
  "vignette": "The clinical scenario...",
  "question": "What is the most appropriate...",
  "options": [
${optionExamples}
  ],
  "correct": "A",
  "explanation": "The correct answer is A because..."
}
`;

  try {
    const aiResponse = await callOpenAI(prompt);
    
    return {
      id: `ai-${concept.concept_id}-${Date.now()}`,
      concept_id: concept.concept_id,
      question_stem: aiResponse.question,
      clinical_vignette: aiResponse.vignette,
      options: aiResponse.options,
      correct_answer: aiResponse.correct,
      explanation: aiResponse.explanation,
      format: 'ukmla_sba'
    };
  } catch (error) {
    console.error('Failed to generate AI question, falling back to template:', error);
    // Fallback to template-based generation if AI fails
    return generateTemplateQuestion(concept);
  }
}

// Fallback template-based generation
function generateTemplateQuestion(concept: ConceptNode): GeneratedQuestion {
  const presentations = concept.dimensions?.exam_specific?.ukmla?.presentations || [];
  const age = Math.floor(Math.random() * 40) + 35;
  const gender = Math.random() > 0.5 ? 'man' : 'woman';
  
  const vignette = `A ${age}-year-old ${gender} presents with ${presentations[0]?.toLowerCase() || 'symptoms'}.`;
  
  const options = [
    { id: 'A', text: 'Immediate intervention as per guidelines' },
    { id: 'B', text: 'Further investigation required' },
    { id: 'C', text: 'Conservative management' },
    { id: 'D', text: 'Specialist referral' },
    { id: 'E', text: 'Observation and reassessment' }
  ];
  
  return {
    id: `template-${concept.concept_id}-${Date.now()}`,
    concept_id: concept.concept_id,
    question_stem: 'What is the most appropriate next step?',
    clinical_vignette: vignette,
    options,
    correct_answer: 'A',
    explanation: concept.knowledge?.decision_rule || 'Based on current guidelines.',
    format: 'ukmla_sba'
  };
}

// Generate flashcard using AI
export async function generateFlashcardWithAI(concept: ConceptNode, customFlashcardPrompt?: string): Promise<GeneratedQuestion> {
  const defaultPrompt = `Create a medical flashcard with:
1. A concise, focused question for the front that tests understanding of the key concept
2. A comprehensive answer for the back with 2-3 key points
3. Include clinical relevance where appropriate
4. Make it memorable and easy to review`;
  
  const userInstructions = customFlashcardPrompt || defaultPrompt;
  
  const prompt = `
${userInstructions}

Concept Information:
Title: ${concept.title}
Description: ${concept.description}
Key Knowledge: ${concept.knowledge?.decision_rule || 'N/A'}

Return as JSON:
{
  "front": "Question text for the front of the flashcard",
  "back": "Answer text for the back of the flashcard"
}
`;

  try {
    const aiResponse = await callOpenAI(prompt);
    
    return {
      id: `flash-${concept.concept_id}-${Date.now()}`,
      concept_id: concept.concept_id,
      question_stem: aiResponse.front,
      options: [],
      correct_answer: '',
      explanation: aiResponse.back,
      format: 'flashcard'
    };
  } catch (error) {
    // Fallback
    return {
      id: `flash-${concept.concept_id}-${Date.now()}`,
      concept_id: concept.concept_id,
      question_stem: `${concept.title}: What are the key points?`,
      options: [],
      correct_answer: '',
      explanation: concept.knowledge?.decision_rule || concept.description,
      format: 'flashcard'
    };
  }
}

// Main export - generates questions with AI
export async function generateQuestionFromConcept(
  concept: ConceptNode,
  format: 'ukmla_sba' | 'flashcard' = 'ukmla_sba',
  customPrompt?: string,
  customFlashcardPrompt?: string
): Promise<GeneratedQuestion> {
  if (format === 'flashcard') {
    return generateFlashcardWithAI(concept, customFlashcardPrompt);
  }
  return generateUKMLAQuestionWithAI(concept, customPrompt);
}
