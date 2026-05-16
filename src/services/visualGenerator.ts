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
    // Patient-focused vignette - editorial cognitive interface
    const prompt = `Create a PREMIUM EDITORIAL CLINICAL VIGNETTE - an emotional illness-script memory anchor.

CLINICAL CASE: "${questionStem.slice(0, 350)}"

DESIGN PHILOSOPHY:
This is a COGNITIVE INTERFACE for MEMORY ENCODING.
The user should recognize the clinical presentation in 2-3 seconds.
Create a strong emotional anchor for this disease pattern.

ABSOLUTE REQUIREMENTS:
- Background color: #F6F3EE (warm ivory/stone) - MUST match app exactly
- The visual must feel EMBEDDED in the app, not an imported poster
- ONE dominant focal point: THE PATIENT
- Maximum 2-3 ambient text labels (1-3 words each)
- Massive negative space (50%+ of image)
- No floating icon clusters
- No arrows or numbered sequences

VISUAL STYLE (Editorial Medical):
- Bauhaus medical poster aesthetic
- NYT/Monocle editorial portrait illustration
- Apple Health elegance
- Semi-flat painterly/vector hybrid
- Soft editorial illustration with emotional depth
- Consistent line weight, subtle warm texture

THE PATIENT (Hero Element):
- ONE person, large, central, dominant
- Occupies 60-70% of the frame
- Semi-realistic editorial illustration style
- Emotionally expressive face and body language
- Clinical signs visible but elegantly rendered
- Warm natural skin tones
- Simple clothing, no distracting details

CLINICAL SIGNS:
- Hypercharacterize the KEY visible findings for memory
- Show through the patient's body/expression, not separate icons
- If systemic: subtle body map overlay with highlighted areas
- Minimal floating elements, maximum 2-3

COLOR PALETTE:
- Background: warm ivory #F6F3EE
- Warm skin tones
- Muted terracotta for inflammation/danger
- Dusty navy for cyanosis/cold
- Sage for recovery areas
- NO saturated colors, NO harsh contrasts

TYPOGRAPHY:
- Maximum 2-3 labels
- Elegant sans-serif, ambient placement
- Labels feel like whispers, not shouts
- NO full sentences

CONTENT RULES:
- ONLY positive findings (symptoms present)
- NO diagnosis, NO treatment, NO management
- Show the illness script, not the answer

AVOID COMPLETELY:
- Floating anatomical icon clusters
- Multiple competing visual elements
- Dense labels or explanatory text
- Clinical clipart aesthetic
- Cartoon or comic book style
- Hard edges, boxed poster look

SUCCESS TEST:
User should feel the patient's distress and instantly pattern-match the presentation.
The image should feel printed directly into the interface.
Calm, elegant, emotionally intelligent, memorable.`;

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
    const prompt = `Create a PREMIUM EDITORIAL MEDICAL LEARNING VISUAL.

CONCEPT: "${conceptTitle}"
KEY POINT: ${correctAnswer}

DESIGN PHILOSOPHY:
This is a COGNITIVE INTERFACE for MEMORY ENCODING.
NOT an information-dense educational graphic.
The user should understand the gist in 2-5 seconds.
The image should create a strong compressed mental model.

ABSOLUTE REQUIREMENTS:
- Background color: #F6F3EE (warm ivory/stone) - MUST match app exactly
- The visual must feel EMBEDDED in the app, not an imported poster
- ONE dominant focal point only
- Maximum 3 text labels (2-4 words each)
- Massive negative space (60%+ of image)
- No colored section boxes or blocks
- No numbered sequences or step arrows
- No competing focal points

VISUAL STYLE (Editorial Medical):
- Bauhaus medical poster aesthetic
- NYT/Monocle editorial science illustration
- Apple Health onboarding elegance
- Museum educational signage calm
- Semi-flat painterly/vector hybrid
- Soft editorial illustration, NOT clipart
- Consistent line weight, subtle texture

COMPOSITION:
- ONE hero visual element (patient, organ, or mechanism)
- Visual hierarchy: PRIMARY focal → SECONDARY support → TERTIARY minimal labels
- Spatial grouping instead of arrows
- Visual gravity and alignment for flow
- Generous breathing room around all elements
- Portrait 9:16 for mobile

COLOR PALETTE:
- Background: warm ivory #F6F3EE
- Card surfaces: #FBF8F4 with 2% tint
- Primary text: #1F1F1F
- Secondary text: #6B6B6B
- Accent red: muted terracotta
- Accent green: sage
- Accent blue: dusty navy
- NO saturated colors, NO harsh gradients, NO rainbow

TYPOGRAPHY:
- Elegant serif for title (ONE only)
- Restrained sans-serif for labels
- NO giant bold screaming headers
- NO full sentences
- Labels should be ambient/minimal

WHAT TO SHOW:
- If mechanism: show trigger → consequence as ONE visual flow
- If comparison: split-screen mirrored layout
- If anatomy: minimal labeled spatial diagram
- If emergency: urgency through composition, not red boxes
- Make the PERSON the hero when relevant

EMOTIONAL ENCODING:
- Leverage emotional salience
- Create memorable visual anchors
- Human-centered imagery
- Elegant restraint, not melodrama

AVOID COMPLETELY:
- Colored section blocks (pink/blue/green strips)
- Numbered circles (1, 2, 3, 4, 5)
- Multiple arrows showing flow
- Dense explanatory text
- Floating icon clusters
- PowerPoint/Canva aesthetic
- Clinical clipart
- Photorealistic 3D renders
- Childish educational poster style
- Hard edges and boxed poster look

SUCCESS TEST:
User should feel "I instantly get this" NOT "I need to study this image."
The image should feel printed directly into the interface.
Calm, elegant, premium, emotionally intelligent.`;



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
