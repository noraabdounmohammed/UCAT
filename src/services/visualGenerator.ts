/**
 * Visual Generator Service
 * Generates and caches question visuals using GPT Image Gen
 * 
 * Requires: VITE_OPENAI_IMAGE_KEY in .env (separate from DeepSeek key)
 */

import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

// Use dedicated OpenAI key for image generation (separate from DeepSeek text API)
const imageApiKey = import.meta.env.VITE_OPENAI_IMAGE_KEY;

const openai = imageApiKey ? new OpenAI({
  apiKey: imageApiKey,
  dangerouslyAllowBrowser: true
}) : null;

// Check if image generation is available
export function isImageGenAvailable(): boolean {
  return !!imageApiKey;
}

export type VisualType = 'vignette' | 'explanation';

interface CachedVisual {
  id: string;
  question_id: string;
  visual_type: VisualType;
  image_url: string;
  memory_hook: string | null;
}

/**
 * Check if visual exists in cache
 */
export async function getCachedVisual(
  questionId: string, 
  visualType: VisualType
): Promise<CachedVisual | null> {
  try {
    const { data, error } = await supabase
      .from('question_visuals')
      .select('*')
      .eq('question_id', questionId)
      .eq('visual_type', visualType)
      .maybeSingle(); // Use maybeSingle to avoid 406 when no rows
    
    if (error || !data) return null;
    return data as CachedVisual;
  } catch {
    return null;
  }
}

/**
 * Generate vignette visual - clinical scene that doesn't give away answer
 */
export async function generateVignetteVisual(
  questionId: string,
  questionStem: string
): Promise<CachedVisual | null> {
  // Check if OpenAI is configured
  if (!openai) {
    console.warn('OpenAI image API not configured. Add VITE_OPENAI_IMAGE_KEY to .env');
    return null;
  }

  // Check cache first
  const cached = await getCachedVisual(questionId, 'vignette');
  if (cached) return cached;

  try {
    // Patient-focused vignette - editorial medical illustration style
    const prompt = `Create a PREMIUM MOBILE CLINICAL VIGNETTE IMAGE - an emotional illness-script memory anchor.

CLINICAL CASE: "${questionStem.slice(0, 350)}"

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
- Small labels (1-3 words each): "Fever", "Rash", "Joint pain"

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

    console.log('🎨 Generating vignette visual...');
    
    const response = await openai.images.generate({
      model: "gpt-image-2",
      prompt,
      n: 1,
      size: "1024x1792" // Very tall portrait 9:16 for mobile full-width
    });

    console.log('🎨 OpenAI response:', response);
    
    // GPT Image 2 returns b64_json, older models return url
    const imageData = response.data?.[0];
    let imageUrl: string;
    
    if (imageData?.url) {
      imageUrl = imageData.url;
    } else if (imageData?.b64_json) {
      // Convert base64 to data URL
      imageUrl = `data:image/png;base64,${imageData.b64_json}`;
    } else {
      console.error('No image data in response:', response);
      throw new Error('No image URL returned');
    }

    // Save to Supabase
    const { data, error } = await supabase
      .from('question_visuals')
      .insert({
        question_id: questionId,
        visual_type: 'vignette',
        image_url: imageUrl,
        memory_hook: null
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving visual:', error);
      // Return temporary result even if save fails
      return { id: 'temp', question_id: questionId, visual_type: 'vignette', image_url: imageUrl, memory_hook: null };
    }

    return data as CachedVisual;
  } catch (error: any) {
    console.error('Error generating vignette:', error.message);
    return null;
  }
}

/**
 * Generate explanation visual - concept map/flowchart for learning
 */
export async function generateExplanationVisual(
  questionId: string,
  conceptTitle: string,
  explanation: string,
  correctAnswer: string
): Promise<CachedVisual | null> {
  // Check if OpenAI is configured
  if (!openai) {
    console.warn('OpenAI image API not configured. Add VITE_OPENAI_IMAGE_KEY to .env');
    return null;
  }

  // Check cache first
  const cached = await getCachedVisual(questionId, 'explanation');
  if (cached) return cached;

  try {
    const prompt = `Create a PREMIUM MOBILE MEDICAL EXPLANATION INFOGRAPHIC.

TOPIC: "${conceptTitle}"
KEY LEARNING POINT: ${correctAnswer}
CONTEXT: ${explanation.slice(0, 150)}

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


    console.log('📊 Generating explanation visual...');

    const response = await openai.images.generate({
      model: "gpt-image-2",
      prompt,
      n: 1,
      size: "1024x1792" // Tallest portrait (9:16) - maximum vertical space
    });

    console.log('📊 OpenAI response:', response);
    
    // GPT Image 2 returns b64_json, older models return url
    const imageData = response.data?.[0];
    let imageUrl: string;
    
    if (imageData?.url) {
      imageUrl = imageData.url;
    } else if (imageData?.b64_json) {
      // Convert base64 to data URL
      imageUrl = `data:image/png;base64,${imageData.b64_json}`;
    } else {
      console.error('No image data in response:', response);
      throw new Error('No image URL returned');
    }

    // Generate memory hook
    let memoryHook = conceptTitle;
    try {
      const hookResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Create a catchy 4-6 word memory phrase for: "${conceptTitle}" - ${explanation.slice(0, 100)}. Just the phrase, nothing else.`
        }],
        max_tokens: 20
      });
      memoryHook = hookResponse.choices[0]?.message?.content?.trim() || conceptTitle;
    } catch {}

    // Save to Supabase
    const { data, error } = await supabase
      .from('question_visuals')
      .insert({
        question_id: questionId,
        visual_type: 'explanation',
        image_url: imageUrl,
        memory_hook: memoryHook
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving visual:', error);
      return { id: 'temp', question_id: questionId, visual_type: 'explanation', image_url: imageUrl, memory_hook: memoryHook };
    }

    return data as CachedVisual;
  } catch (error: any) {
    console.error('Error generating explanation visual:', error.message);
    return null;
  }
}
