/**
 * Batch script to generate images for all featured questions
 * Run with: npx tsx scripts/generateFeaturedImages.ts
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load from .env.local (Vite convention)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const OPENAI_KEY = process.env.VITE_OPENAI_API_KEY || process.env.VITE_OPENAI_IMAGE_KEY || process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!OPENAI_KEY) {
  console.error('❌ Missing VITE_OPENAI_IMAGE_KEY or OPENAI_API_KEY in .env.local');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_KEY,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface FeaturedQuestion {
  id: string;
  concept_title: string;
  condition_name: string;
  question_stem: string;
  correct_answer: string;
  explanation: string;
  vignette_image_url: string | null;
  explanation_image_url: string | null;
}

async function generateVignetteImage(question: FeaturedQuestion): Promise<string> {
  const prompt = `Create a PREMIUM MOBILE CLINICAL VIGNETTE IMAGE - an emotional illness-script memory anchor.

CLINICAL CASE: "${question.question_stem.slice(0, 350)}"

CRITICAL: Must be readable at phone width WITHOUT zooming.

EXACT STYLE TO MATCH:
- Clean editorial medical illustration (like medical textbook art, but modern)
- Semi-realistic patient figure with emotionally expressive face
- Floating anatomical icons around the patient (hearts, joints, organs, cells)
- Soft pastel color accents
- Clean, professional, educational aesthetic

COMPOSITION:
- Portrait 9:16 for mobile
- ONE SINGLE PATIENT as the dominant central figure
- Patient occupies 60-70% of the frame
- Patient showing visible clinical signs (rash, swelling, posture of pain)
- 3-5 floating medical icons around patient showing affected systems
- Soft pastel background (#FAFAFA light gray)

PATIENT FIGURE:
- Semi-realistic style (not cartoon, not photorealistic)
- Emotionally expressive face showing distress/discomfort
- Visible clinical signs hypercharacterized for memory
- Warm natural skin tones
- Simple clothing (hospital gown or casual)

FLOATING ICONS:
- Simple, clean anatomical illustrations
- Hearts, lungs, joints, skin cross-sections, cells
- Connected to patient with subtle lines or proximity
- Small labels (1-3 words each)

CONTENT RULES:
- ONLY show POSITIVE findings (symptoms that ARE present)
- NO negative findings, NO diagnosis, NO treatment
- 2-4 floating labels MAX
- LARGE readable typography

COLOR PALETTE:
- Light gray background (#FAFAFA)
- Warm skin tones for patient
- Soft pastels for icons (light blue, light pink, light red)
- Red accents for inflammation/danger areas

NOT: Comic book, cartoon, superhero, dense infographic, tiny text.

GOAL: Emotional memory anchor that encodes the disease presentation visually.`;

  const response = await openai.images.generate({
    model: "gpt-image-2",
    prompt,
    n: 1,
    size: "1024x1792",
  });

  const imageData = response.data?.[0];
  if (imageData?.b64_json) {
    return `data:image/png;base64,${imageData.b64_json}`;
  } else if (imageData?.url) {
    return imageData.url;
  }
  throw new Error('No image data returned');
}

async function generateExplanationImage(question: FeaturedQuestion): Promise<{ imageUrl: string; memoryHook: string }> {
  const prompt = `Create a PREMIUM MOBILE MEDICAL EXPLANATION INFOGRAPHIC.

TOPIC: "${question.condition_name || question.concept_title}"
KEY LEARNING POINT: ${question.correct_answer}
CONTEXT: ${question.explanation.slice(0, 150)}

CRITICAL: Must be readable at phone width WITHOUT zooming.

EXACT STYLE TO MATCH:
- Clean editorial medical illustration style
- Semi-realistic patient figure with expressive emotion
- Numbered sequential sections (1, 2, 3, 4, 5) showing disease progression/mechanism
- Each section has a soft pastel color-coded background strip
- Floating anatomical icons (hearts, joints, organs, cells) around patient
- Bold section headers in dark text
- Short explanatory text (1-2 lines per section)
- Vertical narrative flow from top to bottom

STRUCTURE (5 SECTIONS):
1. THE TRIGGER - What starts it (icon + 1-line explanation)
2. THE MECHANISM - What happens in the body (patient + floating icons)
3. THE SIGNS - What you see clinically (patient showing symptoms)
4. THE KEY FINDING - Most important diagnostic clue
5. THE TAKEAWAY - One-line summary + treatment hint

VISUAL ELEMENTS:
- ONE central patient figure (semi-realistic, emotionally expressive)
- Floating medical icons (anatomical, simple, clean)
- Numbered circles for each section (1, 2, 3, 4, 5)
- Soft pastel section backgrounds (light blue, light pink, light yellow, light green)
- Bold sans-serif headers
- Clean arrows showing flow/progression

BACKGROUND: Light gray (#FAFAFA) base with colored section strips.

TYPOGRAPHY:
- LARGE bold headers (readable without zoom)
- Short explanatory text (max 8 words per line)
- High contrast dark text on light backgrounds

COLOR PALETTE:
- Soft pastels for section backgrounds
- Rich but not oversaturated accent colors
- Warm skin tones for patient
- Red for danger/inflammation, blue for info, green for recovery

NOT: Comic book style, cartoon, childish, dense poster, tiny text.

GOAL: Educational medical infographic that tells a visual story of the disease mechanism.`;

  const response = await openai.images.generate({
    model: "gpt-image-2",
    prompt,
    n: 1,
    size: "1024x1792",
  });

  const imageData = response.data?.[0];
  let imageUrl: string;
  
  if (imageData?.b64_json) {
    imageUrl = `data:image/png;base64,${imageData.b64_json}`;
  } else if (imageData?.url) {
    imageUrl = imageData.url;
  } else {
    throw new Error('No image data returned');
  }

  // Generate memory hook
  const memoryHook = await generateMemoryHook(question);

  return { imageUrl, memoryHook };
}

async function generateMemoryHook(question: FeaturedQuestion): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You create short, memorable mnemonics for medical concepts. Keep it under 10 words. Make it catchy and easy to remember."
      },
      {
        role: "user",
        content: `Create a memory hook for: ${question.condition_name || question.concept_title}. Key point: ${question.correct_answer}`
      }
    ],
    max_tokens: 50,
  });

  return completion.choices[0]?.message?.content || '';
}

async function main() {
  console.log('🚀 Starting featured image generation...\n');

  // Fetch all featured questions without images
  const { data: questions, error } = await supabase
    .from('cached_questions')
    .select('*')
    .eq('is_featured', true)
    .or('vignette_image_url.is.null,explanation_image_url.is.null');

  if (error) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  if (!questions || questions.length === 0) {
    console.log('✅ All featured questions already have images!');
    return;
  }

  console.log(`📋 Found ${questions.length} questions needing images\n`);

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i] as FeaturedQuestion;
    console.log(`\n[${i + 1}/${questions.length}] Processing: ${question.condition_name || question.concept_title}`);

    try {
      let vignetteUrl = question.vignette_image_url;
      let explanationUrl = question.explanation_image_url;
      let memoryHook = '';

      // Generate vignette if missing
      if (!vignetteUrl) {
        console.log('  🎨 Generating vignette image...');
        vignetteUrl = await generateVignetteImage(question);
        console.log('  ✅ Vignette generated');
      }

      // Generate explanation if missing
      if (!explanationUrl) {
        console.log('  📊 Generating explanation image...');
        const result = await generateExplanationImage(question);
        explanationUrl = result.imageUrl;
        memoryHook = result.memoryHook;
        console.log('  ✅ Explanation generated');
        console.log(`  💡 Memory hook: ${memoryHook}`);
      }

      // Update database
      const { error: updateError } = await supabase
        .from('cached_questions')
        .update({
          vignette_image_url: vignetteUrl,
          explanation_image_url: explanationUrl,
          memory_hook: memoryHook || null,
        })
        .eq('id', question.id);

      if (updateError) {
        console.error(`  ❌ Error updating database:`, updateError);
      } else {
        console.log('  💾 Saved to database');
      }

      // Rate limiting - wait between requests
      if (i < questions.length - 1) {
        console.log('  ⏳ Waiting 2s before next...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (err) {
      console.error(`  ❌ Error processing question:`, err);
    }
  }

  console.log('\n\n🎉 Done! All featured questions now have images.');
}

main().catch(console.error);
