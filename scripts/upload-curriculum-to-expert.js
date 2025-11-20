/**
 * Upload curriculum JSON directly to Supabase Expert tables
 * 
 * Usage:
 *   node scripts/upload-curriculum-to-expert.js path/to/curriculum.json "Author Name" "Country"
 * 
 * Example:
 *   node scripts/upload-curriculum-to-expert.js ./my-curriculum.json "Dr. Smith" "UK"
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase credentials (replace with your actual values)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function uploadCurriculum(jsonFilePath, author, country = 'International') {
  try {
    console.log('📖 Reading curriculum JSON...');
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const data = JSON.parse(jsonContent);

    // Generate unique published ID
    const pubId = `pub-${data.curriculum.id}-${Date.now()}`;
    
    console.log(`📦 Uploading curriculum: ${data.curriculum.name}`);
    console.log(`   Concepts: ${data.concepts.length}`);
    console.log(`   Author: ${author}`);
    console.log(`   Country: ${country}`);

    // Step 1: Insert curriculum metadata
    console.log('\n1️⃣ Inserting curriculum metadata...');
    const { error: metaError } = await supabase
      .from('published_curriculums')
      .insert([{
        id: pubId,
        name: data.curriculum.name,
        description: data.curriculum.description,
        category: data.curriculum.category,
        country: country,
        color: data.curriculum.color,
        image_url: data.curriculum.imageUrl || null,
        author: author,
        version: data.version || '1.0.0',
        published_at: new Date().toISOString(),
        download_count: 0,
        rating: 5.0,
        tags: data.tags || [],
        custom_filters: data.customFilters || [],
        filter_categories: data.filterCategories || [],
        filter_assignments: data.filterAssignments || {},
        practice_templates: data.practiceTemplates || {},
        concept_count: data.concepts.length,
        difficulty: data.difficulty || 'Intermediate',
        estimated_hours: data.estimatedHours || 10,
        is_locked: false
      }]);

    if (metaError) {
      console.error('❌ Failed to insert metadata:', metaError);
      return false;
    }
    console.log('✅ Metadata inserted');

    // Step 2: Insert concepts in batches
    if (data.concepts.length > 0) {
      const BATCH_SIZE = 200;
      const batches = [];
      
      for (let i = 0; i < data.concepts.length; i += BATCH_SIZE) {
        batches.push(data.concepts.slice(i, i + BATCH_SIZE));
      }

      console.log(`\n2️⃣ Uploading ${data.concepts.length} concepts in ${batches.length} batches...`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const conceptRows = batch.map(c => ({
          curriculum_id: pubId,
          concept_id: c.concept_id,
          title: c.title,
          content: c.content || c.description || c.knowledge || 'No content',
          prerequisites: c.prerequisites || [],
          custom_filters: c.custom_filters || [],
          mastery_data: c.mastery_data || {
            attempts: 0,
            correct: 0,
            incorrect: 0,
            mastery_level: 0,
            last_practiced: null
          }
        }));

        console.log(`   Batch ${i + 1}/${batches.length} (${batch.length} concepts)...`);
        
        const { error: conceptError } = await supabase
          .from('curriculum_concepts')
          .insert(conceptRows);

        if (conceptError) {
          console.error(`❌ Failed to insert batch ${i + 1}:`, conceptError);
          // Cleanup: delete metadata
          await supabase.from('published_curriculums').delete().eq('id', pubId);
          return false;
        }
        
        console.log(`   ✅ Batch ${i + 1}/${batches.length} uploaded`);
      }
    }

    console.log('\n🎉 Curriculum uploaded successfully!');
    console.log(`   Published ID: ${pubId}`);
    console.log(`   View at: https://studyedit.com (Expert tab)`);
    return true;

  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node upload-curriculum-to-expert.js <json-file> <author> [country]');
  console.log('Example: node upload-curriculum-to-expert.js ./curriculum.json "Dr. Smith" "UK"');
  process.exit(1);
}

const [jsonFile, author, country] = args;

if (!fs.existsSync(jsonFile)) {
  console.error(`❌ File not found: ${jsonFile}`);
  process.exit(1);
}

uploadCurriculum(jsonFile, author, country || 'International')
  .then(success => process.exit(success ? 0 : 1));
