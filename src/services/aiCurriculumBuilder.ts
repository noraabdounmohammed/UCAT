import { ConceptNode } from '../types/conceptTypes';
import OpenAI from 'openai';

// Initialize OpenAI client with DeepSeek API (same as your existing setup)
let openai: OpenAI | null = null;

try {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (apiKey && apiKey !== 'your-openai-api-key-goes-here') {
    openai = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/v1',  // DeepSeek API base URL
      dangerouslyAllowBrowser: true
    });
    console.log('DeepSeek API client initialized for curriculum builder');
  } else {
    console.warn('DeepSeek API key not found. Using fallback parsing/generation.');
  }
} catch (error) {
  console.error('Error initializing DeepSeek API client for curriculum builder:', error);
}

export interface SpecRequirement {
  id: string;
  rawText: string;
  normalized?: {
    topic: string;
    verb: string;
    qualifiers?: string[];
  };
}

export interface GeneratedConcept {
  title: string;
  description: string;
  keyPoints: string[];
  suggestedFilters: string[];
}

/**
 * Generate a proper concept from a specification requirement using AI
 */
export async function generateConceptFromSpec(specText: string): Promise<GeneratedConcept> {
  const prompt = `You are an expert biology teacher. Create detailed educational content for this specification:

"${specText}"

Requirements:
1. Title: Concise, specific topic name (under 50 characters)
2. Description: 2-3 sentences of actual biological facts and mechanisms
3. KeyPoints: 4-6 specific biological details, processes, or facts
4. Filters: 2-3 relevant biology topics

CRITICAL: Write actual biology content, not learning objectives. Explain HOW things work, WHAT happens, and WHY.

Examples:

For "sperm cell adaptations":
{
  "title": "Sperm Cell Specialized Structures",
  "description": "Sperm cells have evolved specific structural features for successful fertilization. The acrosome releases digestive enzymes to penetrate the egg, while mitochondria provide ATP for flagellar movement.",
  "keyPoints": [
    "Acrosome contains hyaluronidase and acrosin enzymes for egg penetration",
    "Flagellum uses dynein motors for propulsive swimming motion",
    "Mitochondrial sheath generates ATP for sustained motility",
    "Streamlined head shape reduces drag during movement",
    "Haploid nucleus contains condensed chromatin for genetic delivery"
  ],
  "suggestedFilters": ["reproduction", "cell-structure", "enzymes"]
}

Return only valid JSON:`;

  try {
    if (!openai) {
      console.warn('DeepSeek API not available, using fallback concept generation');
      return generateFallbackConcept(specText);
    }

    console.log('🤖 Sending concept generation request to DeepSeek for:', specText.substring(0, 50) + '...');
    
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "text" }
    });

    const content = response.choices[0].message.content;
    console.log('🤖 DeepSeek response:', content);
    
    if (!content) {
      console.error('❌ Empty response from DeepSeek');
      throw new Error('Empty response from DeepSeek');
    }

    // Clean up the response - remove markdown code blocks if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(cleanContent);
      console.log('✅ Successfully parsed AI concept:', parsed.title);
      return parsed;
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      console.log('Raw response:', content);
      console.log('Cleaned content:', cleanContent);
      return generateFallbackConcept(specText);
    }
  } catch (error) {
    console.error('DeepSeek concept generation failed, using fallback:', error);
    return generateFallbackConcept(specText);
  }
}

/**
 * Fallback concept generation when AI is unavailable
 */
function generateFallbackConcept(specText: string): GeneratedConcept {
  // Extract key terms and create a basic structure
  const mainTopic = extractMainTopic(specText);
  
  // Create more specific content based on common biology topics
  let title = mainTopic;
  let description = '';
  let keyPoints: string[] = [];
  
  if (specText.toLowerCase().includes('sperm cell')) {
    title = 'Sperm Cell Structure and Function';
    description = 'Sperm cells are highly specialized gametes with unique structural adaptations for fertilization. Each component serves a specific role in successful reproduction.';
    keyPoints = [
      'Acrosome contains enzymes for penetrating egg protective layers',
      'Flagellum provides motility through whip-like movements',
      'Mitochondria in midpiece generate energy for swimming',
      'Streamlined head shape reduces resistance during movement',
      'Haploid nucleus carries genetic material for fertilization'
    ];
  } else if (specText.toLowerCase().includes('egg cell')) {
    title = 'Egg Cell Structure and Function';
    description = 'Egg cells are large, nutrient-rich gametes designed to support early embryonic development. Their structure reflects their role in reproduction and early growth.';
    keyPoints = [
      'Large cytoplasm contains nutrients and organelles for development',
      'Protective layers prevent multiple sperm entry',
      'Haploid nucleus ready for genetic fusion',
      'Cortical granules release enzymes after fertilization',
      'Zona pellucida provides selective barrier around cell'
    ];
  } else if (specText.toLowerCase().includes('microscope')) {
    title = 'Microscopy Techniques in Biology';
    description = 'Different microscopy techniques reveal cellular structures at various levels of detail. Each method has specific advantages for biological observation.';
    keyPoints = [
      'Light microscopes use visible light for basic cell observation',
      'Electron microscopes provide much higher magnification and resolution',
      'Transmission electron microscopy shows internal cell structures',
      'Scanning electron microscopy reveals surface details',
      'Fluorescence microscopy highlights specific cellular components'
    ];
  } else {
    // Generic biological concept
    title = `${mainTopic} in Biology`;
    description = `This biological concept involves specific structures, processes, and mechanisms that are fundamental to understanding ${mainTopic.toLowerCase()}. These components work together to maintain cellular and organismal function.`;
    keyPoints = [
      `Key structural components and their organization`,
      `Functional mechanisms and biological processes involved`,
      `Relationship between structure and function`,
      `Significance in broader biological systems`,
      `Evolutionary adaptations and comparative aspects`
    ];
  }
  
  const suggestedFilters = ['biology', 'cell-structure', 'spec-import'];
  
  return {
    title: title.length > 50 ? title.slice(0, 47) + '...' : title,
    description,
    keyPoints,
    suggestedFilters
  };
}

/**
 * Extract the main topic from specification text
 */
function extractMainTopic(text: string): string {
  // Remove common prefixes and extract the main subject
  const cleaned = text
    .replace(/^\d+\.?\s*/, '') // Remove numbers
    .replace(/^[a-z]\)\s*/, '') // Remove letter bullets
    .replace(/^[-*•]\s*/, '') // Remove bullet points
    .replace(/^(explain|describe|understand|know|learn)\s+/i, '') // Remove action verbs
    .trim();
    
  // Take first few words as the topic
  const words = cleaned.split(/\s+/);
  return words.slice(0, 3).join(' ');
}

/**
 * Use AI to parse specification text into individual learning objectives
 */
export async function parseSpecificationWithAI(specText: string): Promise<string[]> {
  const prompt = `You are an educational curriculum expert. Parse this specification text into individual, complete learning objectives. Each objective should be a standalone, complete learning goal.

Rules:
1. Split sub-items (a, b, c) into separate objectives while preserving context
2. Each objective should be complete and self-contained
3. Remove section headers like "Students should:" or "Learning objectives:"
4. Preserve the full context for each sub-item
5. Return only substantial learning objectives (minimum 15 characters)

Specification text:
"${specText}"

Example input:
"1.2 Describe how specialised cells are adapted to their function, including:
a sperm cells – acrosome, haploid nucleus, mitochondria and tail
b egg cells – nutrients in the cytoplasm, haploid nucleus"

Example output:
[
  "Describe how sperm cells are adapted to their function, including acrosome, haploid nucleus, mitochondria and tail",
  "Describe how egg cells are adapted to their function, including nutrients in the cytoplasm and haploid nucleus"
]

Return a JSON array of strings only:`;

  try {
    if (!openai) {
      console.warn('DeepSeek API not available, using fallback parsing');
      return parseSpecificationFallback(specText);
    }

    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "text" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from DeepSeek');
    }

    // Try to parse as JSON array
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [specText];
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, using fallback');
      return parseSpecificationFallback(specText);
    }
  } catch (error) {
    console.error('DeepSeek parsing failed, using fallback:', error);
    return parseSpecificationFallback(specText);
  }
}

/**
 * Fallback parsing when AI is unavailable
 */
function parseSpecificationFallback(text: string): string[] {
  // Simple fallback: split on numbered items and clean up
  const items = text
    .split(/\d+\.?\d*\s+/)
    .map(item => item.trim())
    .filter(item => item.length >= 15)
    .filter(item => !item.match(/^(Students should|Learning objectives?)/i));
    
  return items.length > 0 ? items : [text];
}

/**
 * Convert generated concept to ConceptNode format
 */
export function createConceptNode(
  generated: GeneratedConcept, 
  specText: string, 
  index: number
): ConceptNode {
  // Combine description and key points into content with proper markdown formatting
  const content = `${generated.description}

## Key Learning Points:
${generated.keyPoints.map(point => `- ${point}`).join('\n')}

---
*Source Specification: ${specText}*`;

  return {
    concept_id: `user_${Date.now()}_${index}`,
    title: generated.title,
    content: content,
    custom_filters: generated.suggestedFilters,
    prerequisites: [],
    mastery_data: {
      attempts: 0,
      correct: 0,
      incorrect: 0,
      mastery_level: 0,
      last_practiced: null
    },
    created_at: new Date(),
    updated_at: new Date()
  };
}
