/**
 * Script to batch generate questions and populate the cached_questions table
 * 
 * Usage:
 *   npx ts-node scripts/populateCachedQuestions.ts [--count=100] [--specialty=cardiology]
 * 
 * Environment variables required:
 *   VITE_SUPABASE_URL - Supabase project URL
 *   VITE_SUPABASE_ANON_KEY - Supabase anon key
 *   DEEPSEEK_API_KEY or OPENAI_API_KEY - AI API key
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file using dotenv
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
// Use VITE_OPENAI_API_KEY which is your DeepSeek key
const API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;

// Debug: show all VITE_ keys found
const viteKeys = Object.keys(process.env).filter(k => k.startsWith('VITE_'));
console.log('🔑 Environment check:', {
  hasSupabaseUrl: !!SUPABASE_URL,
  hasSupabaseKey: !!SUPABASE_KEY,
  hasApiKey: !!API_KEY,
  apiKeyLength: API_KEY?.length || 0,
  envPath: envPath,
  envExists: fs.existsSync(envPath),
  viteKeysFound: viteKeys
});

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

if (!API_KEY) {
  console.error('❌ Missing API key (VITE_OPENAI_API_KEY). Please add it to your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// UKMLA question generation prompt
const UKMLA_PROMPT = `You are writing a UK Medical Licensing Assessment (MLA) Applied Knowledge Test question. Mirror the exact style of official MLA AKT past papers.

VIGNETTE (the "vignette" field):
- Always start with age + gender (e.g. "A 34-year-old woman")
- Include: presenting complaint + duration, relevant PMH and medications, key positive and negative examination findings
- Every detail must be diagnostically relevant — no filler
- REFERENCE RANGES — mandatory rule: every numerical value in the vignette MUST be followed immediately by its reference range in parentheses. No exceptions.
  Examples: "Hb 78 g/L (115–165 g/L)", "fasting glucose 6.5 mmol/L (3.9–5.5 mmol/L)", "BP 168/96 mmHg", "Na⁺ 128 mmol/L (135–145 mmol/L)", "TSH 0.1 mU/L (0.4–4.0 mU/L)"

LEAD-IN QUESTION (the "question" field):
- One short, direct sentence outside the vignette
- Use ONLY these phrasings:
  "What is the most likely diagnosis?"
  "What is the most appropriate initial management?"
  "What is the most appropriate next investigation?"
  "Which drug should be added?"
  "Which drug should be stopped?"
  "What is the most likely causative organism?"
  "Which structure is most likely damaged?"
  "What is the most likely underlying mechanism?"

OPTIONS — strict rules:
- Exactly 5 options (A–E)
- Each option is a SHORT TERM or BRIEF PHRASE only — NOT a sentence
- All 5 options must be clinically plausible near-misses (no obviously wrong answers)`;

interface Concept {
  concept_id: string;
  title: string;
  content: string;
  custom_filters?: string[];
}

async function callDeepSeekAPI(prompt: string): Promise<any> {
  if (!API_KEY) {
    throw new Error('No API key found (VITE_OPENAI_API_KEY)');
  }

  // Use DeepSeek API (your VITE_OPENAI_API_KEY is a DeepSeek key)
  const baseUrl = 'https://api.deepseek.com';
  const model = 'deepseek-chat';

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: 'You are a medical education expert. Generate clinically accurate, challenging questions that test understanding rather than memorization. ALWAYS respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  let content = data.choices[0].message.content;

  // Extract JSON from response
  if (content.includes('```json')) {
    const jsonMatch = content.match(/```json\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) content = jsonMatch[1];
  } else if (content.includes('```')) {
    const codeMatch = content.match(/```\s*\n?([\s\S]*?)\n?```/);
    if (codeMatch) content = codeMatch[1];
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) content = jsonMatch[0];

  return JSON.parse(content.trim());
}

async function generateQuestion(concept: Concept): Promise<any> {
  const randomCorrectLetter = String.fromCharCode(65 + Math.floor(Math.random() * 5));

  const prompt = `
Generate a single best answer question based on this concept:

Title: ${concept.title}
Content: ${concept.content}
Custom Filters: ${concept.custom_filters?.join(', ') || 'N/A'}

CRITICAL CONSTRAINT:
- The question MUST be directly answerable using ONLY the information provided in the "Content" field above
- DO NOT ask questions that require knowledge beyond what's explicitly stated in the content

${UKMLA_PROMPT}

Return the response as a JSON object with EXACTLY 5 options:
{
  "vignette": "The clinical scenario...",
  "question": "What is the most appropriate...",
  "options": [
    {"id": "A", "text": "Option A"},
    {"id": "B", "text": "Option B"},
    {"id": "C", "text": "Option C"},
    {"id": "D", "text": "Option D"},
    {"id": "E", "text": "Option E"}
  ],
  "correct": "${randomCorrectLetter}",
  "key_fact": "One sentence — the single most important fact.",
  "explanation": "The correct answer is ${randomCorrectLetter} because..."
}

CRITICAL: The "correct" field must be ONE of the option IDs (A, B, C, D, or E).
RANDOMIZE which option is correct - do NOT always make A the correct answer.
`;

  const aiResponse = await callDeepSeekAPI(prompt);

  return {
    concept_id: concept.concept_id,
    concept_title: concept.title,
    concept_content: concept.content,
    specialty: 'ukmla',
    custom_filters: concept.custom_filters || [],
    filter_categories: [],
    question_stem: aiResponse.vignette || '',
    question_text: aiResponse.question || '',
    options: aiResponse.options || [],
    correct_answer: aiResponse.correct || 'A',
    key_fact: aiResponse.key_fact || '',
    explanation: aiResponse.explanation || '',
    question_format: 'ukmla_sba',
    difficulty: 'medium',
    status: 'active',
    generated_at: new Date().toISOString()
  };
}

async function loadConceptsFromJSON(): Promise<Concept[]> {
  const conceptsDir = path.join(__dirname, '..', 'public', 'concepts');
  
  if (!fs.existsSync(conceptsDir)) {
    console.error('❌ Concepts directory not found at:', conceptsDir);
    process.exit(1);
  }

  const allConcepts: Concept[] = [];
  const files = fs.readdirSync(conceptsDir).filter(f => f.endsWith('.json'));
  
  console.log(`📁 Found ${files.length} concept files:`);
  
  for (const file of files) {
    const filePath = path.join(conceptsDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const concepts = data.concepts || data || [];
      
      // Ensure each concept has a concept_id
      const processedConcepts = concepts.map((c: any, idx: number) => ({
        concept_id: c.concept_id || `${file}_${idx}`,
        title: c.title || c.name || 'Unknown',
        content: c.content || c.description || '',
        custom_filters: c.custom_filters || []
      }));
      
      console.log(`   📄 ${file}: ${processedConcepts.length} concepts`);
      allConcepts.push(...processedConcepts);
    } catch (error: any) {
      console.error(`   ❌ Error loading ${file}:`, error.message);
    }
  }
  
  return allConcepts;
}

async function getExistingConceptIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('cached_questions')
    .select('concept_id');

  if (error) {
    console.error('❌ Error fetching existing questions:', error);
    return new Set();
  }

  return new Set(data?.map(q => q.concept_id) || []);
}

async function insertQuestion(question: any): Promise<boolean> {
  const { error } = await supabase
    .from('cached_questions')
    .insert(question);

  if (error) {
    if (error.code === '23505') {
      console.log(`⏭️  Skipping duplicate: ${question.concept_title}`);
      return false;
    }
    console.error(`❌ Error inserting question for ${question.concept_title}:`, error.message);
    return false;
  }

  return true;
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let count = 100;
  let specialty: string | null = null;

  for (const arg of args) {
    if (arg.startsWith('--count=')) {
      count = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--specialty=')) {
      specialty = arg.split('=')[1].toLowerCase();
    }
  }

  console.log('🚀 Starting question generation...');
  console.log(`   Target count: ${count}`);
  if (specialty) console.log(`   Specialty filter: ${specialty}`);

  // Load concepts
  const allConcepts = await loadConceptsFromJSON();
  console.log(`📚 Loaded ${allConcepts.length} concepts from JSON`);

  // Filter by specialty if specified
  let concepts = allConcepts;
  if (specialty) {
    concepts = allConcepts.filter(c => 
      c.title.toLowerCase().includes(specialty) ||
      c.custom_filters?.some(f => f.toLowerCase().includes(specialty))
    );
    console.log(`🔍 Filtered to ${concepts.length} concepts matching "${specialty}"`);
  }

  // Get existing concept IDs to avoid duplicates
  const existingIds = await getExistingConceptIds();
  console.log(`📦 Found ${existingIds.size} existing cached questions`);

  // Filter out concepts that already have questions
  const newConcepts = concepts.filter(c => !existingIds.has(c.concept_id));
  console.log(`🆕 ${newConcepts.length} concepts need questions`);

  // Limit to requested count
  const conceptsToProcess = newConcepts.slice(0, count);
  console.log(`🎯 Processing ${conceptsToProcess.length} concepts...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < conceptsToProcess.length; i++) {
    const concept = conceptsToProcess[i];
    const progress = `[${i + 1}/${conceptsToProcess.length}]`;

    try {
      console.log(`${progress} Generating: ${concept.title}`);
      const question = await generateQuestion(concept);
      
      const inserted = await insertQuestion(question);
      if (inserted) {
        successCount++;
        console.log(`   ✅ Saved to database`);
      }

      // Rate limiting - wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      errorCount++;
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Successfully generated: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📦 Total in database: ${existingIds.size + successCount}`);
}

main().catch(console.error);
