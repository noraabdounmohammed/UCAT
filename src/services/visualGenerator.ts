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
    // Extract clinical scenario without diagnosis hints
    const prompt = `Create a medical illustration of a clinical scenario:

"${questionStem.slice(0, 400)}"

Style: Professional medical education illustration. 
- Show the PATIENT and SETTING only (hospital bed, A&E, GP office)
- Show visible SYMPTOMS (breathless, pale, sweating, posture)
- DO NOT show any diagnosis, treatment, or medical equipment that reveals the answer
- DO NOT include any text or labels
- Warm, empathetic, memorable scene
- Clean white/light background`;

    console.log('🎨 Generating vignette visual...');
    
    const response = await openai.images.generate({
      model: "gpt-image-2",
      prompt,
      n: 1,
      size: "1536x1024" // Wide landscape for mobile
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
    const prompt = `Create a clear medical education diagram for: "${conceptTitle}"

Key information:
- Correct answer: ${correctAnswer}
- ${explanation.slice(0, 300)}

Style: Clean concept map or flowchart.
- Use boxes connected by arrows
- Color code: green for correct actions, blue for key facts, amber for warnings
- Maximum 5-6 main nodes for clarity
- Include the key learning point prominently
- Professional medical textbook style
- White background, high contrast`;

    console.log('📊 Generating explanation visual...');

    const response = await openai.images.generate({
      model: "gpt-image-2",
      prompt,
      n: 1,
      size: "1536x1024" // Wide landscape for mobile
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
