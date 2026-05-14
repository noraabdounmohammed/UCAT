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
    // Premium editorial infographic - POSITIVE findings only
    const prompt = `Create a mobile-first medical condition overview infographic in clean cinematic comic style.

CLINICAL CASE: "${questionStem.slice(0, 350)}"

STYLE:
- Editorial medical comic, clean Bauhaus-inspired layout
- Bold visual hierarchy, minimal clutter, strong contrast
- Modern educational UI, not childish, not overly detailed
- Color-coded sections for easy scanning
- Apple-level clean aesthetic

BACKGROUND: Pure white background, strong negative space.

COMPOSITION:
- Portrait 1:2 aspect ratio (very tall/narrow for mobile full-width display)
- 4-6 vertically stacked sections
- Large readable typography (2-6 words per phrase)
- Icons and visual metaphors over text
- Each section visually distinct with clear headers
- One central patient figure with floating clinical clues

CONTENT RULES:
- ONLY show POSITIVE findings (symptoms/signs that ARE present)
- DO NOT include negative findings (e.g., "no fever", "denies pain")
- DO NOT include diagnosis, treatment, or management
- Labels for observable findings only: "Fever", "Rash", "Swollen knee"

VISUAL DESIGN:
- Giant arrows showing progression/flow
- Color transitions (red=danger, green=recovery, blue=info, amber=warning)
- Symbols/icons instead of long explanations

TYPOGRAPHY: Clean modern sans-serif, bold, high contrast, large for mobile.

Must be instantly readable at phone width with zero zooming.`;

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
    const prompt = `Create a mobile-first comprehensive medical condition overview infographic in a clean cinematic comic style.

CONDITION: "${conceptTitle}"
THIS QUESTION'S KEY POINT: ${correctAnswer}
CONTEXT: ${explanation.slice(0, 200)}

PURPOSE: Create a COMPLETE visual summary of this condition covering ALL key aspects a medical student needs to know - not just this one question.

MUST INCLUDE SECTIONS FOR:
1. DEFINITION - What is this condition? (1-2 phrases)
2. CAUSES/TRIGGERS - Risk factors, etiology (icons + short labels)
3. KEY SYMPTOMS - Cardinal signs and presentations (visual patient + labels)
4. DIAGNOSIS - Key investigations, criteria (icons for tests)
5. MANAGEMENT - First-line treatment, key interventions (color-coded: red=emergency, green=treatment)
6. COMPLICATIONS - What happens if untreated (warning icons)
7. KEY LEARNING POINT - The main takeaway (highlighted box)

STYLE:
- Editorial medical comic, clean Bauhaus-inspired layout
- Bold visual hierarchy, minimal clutter, strong contrast
- Modern educational UI, not childish, not overly detailed
- Color-coded sections for easy scanning

LAYOUT:
- Vertical smartphone format (2:3 portrait)
- 5-7 vertically stacked sections
- Large readable typography (2-6 words per phrase)
- Icons and visual metaphors over text
- Each section visually distinct with clear headers

VISUAL DESIGN:
- Use giant arrows showing progression/flow
- Use color transitions (red=danger/emergency, green=treatment/recovery, blue=info, amber=warning)
- Use symbols/icons instead of long explanations
- Make relationships between concepts visually obvious

ACCESSIBILITY: Large high-contrast typography, clear shapes, readable without zooming on mobile

GOAL: Feel like a medical comic / TikTok-native learning visual / emotionally memorable mechanism explanation
NOT: classroom poster, textbook page, dense infographic, desktop slide`;

    console.log('📊 Generating explanation visual...');

    const response = await openai.images.generate({
      model: "gpt-image-2",
      prompt,
      n: 1,
      size: "1024x1792" // Very tall portrait 9:16 - displays larger on mobile
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
