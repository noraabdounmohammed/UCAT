/**
 * Bulk Question Generator
 * 
 * Generates and caches questions for all concepts in a curriculum.
 * Run this once to pre-populate the cache, then auto-cache handles new concepts.
 * 
 * Usage: 
 *   1. Open browser console on the curriculum page
 *   2. Run: await window.generateForCurrentCurriculum()
 *   
 * Or with options:
 *   await window.bulkGenerateQuestions({ 
 *     curriculumId: 'your-curriculum-id',
 *     conceptsPerBatch: 3,
 *     delayBetweenBatches: 3000
 *   })
 */

import { generateQuestionWithConfig } from '@/services/aiQuestionGenerator';
import { questionCacheService } from '@/services/questionCacheService';

interface BulkGenerateOptions {
  curriculumId: string;
  conceptsPerBatch?: number;
  delayBetweenBatches?: number; // ms
  questionFormat?: 'ukmla_sba' | 'flashcard';
  onProgress?: (progress: { current: number; total: number; concept: string }) => void;
}

interface ConceptForGeneration {
  concept_id: string;
  title: string;
  content: string;
  custom_filters: string[];
  specialty?: string;
}

export async function bulkGenerateQuestions(options: BulkGenerateOptions): Promise<{
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  const {
    curriculumId,
    conceptsPerBatch = 5,
    delayBetweenBatches = 2000,
    questionFormat = 'ukmla_sba',
    onProgress
  } = options;

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[]
  };

  // Load concepts from localStorage (curriculum-specific)
  const conceptsKey = `${curriculumId}_user_concepts`;
  const conceptsRaw = localStorage.getItem(conceptsKey);
  
  if (!conceptsRaw) {
    results.errors.push(`No concepts found for curriculum: ${curriculumId}`);
    return results;
  }

  const concepts: ConceptForGeneration[] = JSON.parse(conceptsRaw);
  console.log(`📚 Found ${concepts.length} concepts to process`);

  // Check which concepts already have cached questions
  const conceptIds = concepts.map(c => c.concept_id);
  const existingQuestions = await questionCacheService.getQuestionsForConcepts(conceptIds);
  const existingConceptIds = new Set(existingQuestions.map(q => q.concept_id));

  console.log(`✅ ${existingConceptIds.size} concepts already have cached questions`);

  // Filter to concepts that need questions
  const conceptsToGenerate = concepts.filter(c => !existingConceptIds.has(c.concept_id));
  console.log(`🔄 ${conceptsToGenerate.length} concepts need questions generated`);

  results.skipped = existingConceptIds.size;

  // Process in batches
  for (let i = 0; i < conceptsToGenerate.length; i += conceptsPerBatch) {
    const batch = conceptsToGenerate.slice(i, i + conceptsPerBatch);
    
    console.log(`\n📦 Processing batch ${Math.floor(i / conceptsPerBatch) + 1}/${Math.ceil(conceptsToGenerate.length / conceptsPerBatch)}`);

    // Generate questions for batch in parallel
    const batchPromises = batch.map(async (concept) => {
      try {
        onProgress?.({
          current: i + batch.indexOf(concept) + 1,
          total: conceptsToGenerate.length,
          concept: concept.title
        });

        console.log(`  🎯 Generating for: ${concept.title}`);

        // Generate question using AI
        const question = await generateQuestionWithConfig(
          {
            concept_id: concept.concept_id,
            title: concept.title,
            content: concept.content,
            custom_filters: concept.custom_filters || [],
            prerequisites: [],
            mastery_data: { attempts: 0, correct: 0, incorrect: 0, mastery_level: 0, last_practiced: null }
          },
          questionFormat
        );

        if (!question || !question.question) {
          throw new Error('No question generated');
        }

        // Determine specialty from filters or title
        const specialty = concept.custom_filters?.[0] || 'General';

        // Save to cache
        await questionCacheService.saveQuestion({
          concept_id: concept.concept_id,
          concept_title: concept.title,
          concept_content: concept.content,
          specialty,
          custom_filters: concept.custom_filters || [],
          question_stem: question.question || '',
          question_text: question.question || '',
          options: question.options?.map((opt: any, idx: number) => ({
            id: String.fromCharCode(65 + idx),
            text: typeof opt === 'string' ? opt : opt.text
          })) || [],
          correct_answer: question.correctAnswer || question.correct_answer || 'A',
          key_fact: question.keyFact || question.key_fact,
          explanation: question.explanation,
          question_format: questionFormat
        });

        console.log(`  ✅ Cached: ${concept.title}`);
        results.success++;
      } catch (error: any) {
        console.error(`  ❌ Failed: ${concept.title}`, error.message);
        results.failed++;
        results.errors.push(`${concept.title}: ${error.message}`);
      }
    });

    await Promise.all(batchPromises);

    // Delay between batches to avoid rate limits
    if (i + conceptsPerBatch < conceptsToGenerate.length) {
      console.log(`  ⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  console.log('\n📊 Bulk Generation Complete:');
  console.log(`  ✅ Success: ${results.success}`);
  console.log(`  ⏭️ Skipped (already cached): ${results.skipped}`);
  console.log(`  ❌ Failed: ${results.failed}`);

  return results;
}

/**
 * Helper to get all curriculum IDs from localStorage
 */
export function getAvailableCurriculums(): string[] {
  const curriculums: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.endsWith('_user_concepts')) {
      curriculums.push(key.replace('_user_concepts', ''));
    }
  }
  
  return curriculums;
}

/**
 * Quick helper to run from console
 */
export async function generateForCurrentCurriculum() {
  const curriculums = getAvailableCurriculums();
  
  if (curriculums.length === 0) {
    console.log('No curriculums found in localStorage');
    return;
  }

  console.log('Available curriculums:', curriculums);
  
  // Use first curriculum or most recently used
  const curriculumId = curriculums[0];
  
  console.log(`\n🚀 Starting bulk generation for: ${curriculumId}`);
  
  const results = await bulkGenerateQuestions({
    curriculumId,
    conceptsPerBatch: 3,
    delayBetweenBatches: 3000,
    questionFormat: 'ukmla_sba',
    onProgress: ({ current, total, concept }) => {
      console.log(`Progress: ${current}/${total} - ${concept}`);
    }
  });

  return results;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).bulkGenerateQuestions = bulkGenerateQuestions;
  (window as any).generateForCurrentCurriculum = generateForCurrentCurriculum;
  (window as any).getAvailableCurriculums = getAvailableCurriculums;
}
