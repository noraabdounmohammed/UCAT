// Script to upload UKMLA curriculum to Supabase
// Run with: node scripts/uploadUKMLA.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function uploadCurriculum() {
  console.log('📖 Reading UKMLA curriculum...');
  const curriculumPath = path.join(__dirname, '..', 'public', 'curriculums', 'UKMLA.json');
  const curriculum = JSON.parse(fs.readFileSync(curriculumPath, 'utf8'));
  
  console.log(`Found ${curriculum.concepts.length} concepts`);
  
  // Extract unique filter categories from concepts
  const allFilterCategories = [];
  const seenCategories = new Set();
  curriculum.concepts.forEach(c => {
    if (c.filter_categories) {
      c.filter_categories.forEach(fc => {
        if (!seenCategories.has(fc.name)) {
          seenCategories.add(fc.name);
          allFilterCategories.push(fc);
        }
      });
    }
  });
  
  // Extract unique custom filters
  const allCustomFilters = [...new Set(curriculum.concepts.flatMap(c => c.custom_filters || []))];
  
  // Use existing curriculum ID or create new one
  const publishId = 'pub-ukmla-1776079556946'; // Existing ID in Supabase
  
  // Check if curriculum already exists
  const { data: existing } = await supabase
    .from('published_curriculums')
    .select('id')
    .eq('id', publishId)
    .single();
  
  if (existing) {
    console.log('✅ Curriculum metadata already exists, skipping insert...');
  } else {
    // Insert curriculum metadata
    console.log('📤 Uploading curriculum metadata to Supabase...');
    const { error: metaError } = await supabase
      .from('published_curriculums')
      .insert([{
      id: publishId,
      name: curriculum.name,
      description: curriculum.description,
      category: curriculum.category,
      country: 'United Kingdom',
      color: 'blue',
      image_url: curriculum.coverImage,
      author: 'StudyEdit Team',
      version: '1.0.0',
      published_at: new Date().toISOString(),
      download_count: 0,
      rating: 5.0,
      tags: ['UKMLA', 'Medical', 'UK', 'Licensing', 'Assessment'],
      custom_filters: allCustomFilters,
      filter_categories: allFilterCategories,
      filter_assignments: {},
      practice_templates: { ukmla_templates: [], flashcard_templates: [] },
      concept_count: curriculum.concepts.length,
      difficulty: 'Intermediate',
      estimated_hours: Math.round(curriculum.concepts.length * 0.1),
      is_locked: false
    }]);
    
    if (metaError) {
      console.error('❌ Error inserting metadata:', metaError);
      return;
    }
    console.log('✅ Metadata inserted');
  }
  
  // Upload concepts in batches
  console.log('📤 Uploading concepts in batches...');
  const BATCH_SIZE = 500;
  const conceptsToUpload = curriculum.concepts.map(c => ({
    curriculum_id: publishId,
    concept_id: c.concept_id,
    title: c.title,
    content: c.content,
    custom_filters: c.custom_filters || [],
    prerequisites: c.prerequisites || []
  }));
  
  for (let i = 0; i < conceptsToUpload.length; i += BATCH_SIZE) {
    const batch = conceptsToUpload.slice(i, i + BATCH_SIZE);
    console.log(`  Uploading batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(conceptsToUpload.length/BATCH_SIZE)} (${batch.length} concepts)...`);
    
    const { error: batchError } = await supabase
      .from('curriculum_concepts')
      .insert(batch);
      
    if (batchError) {
      console.error(`❌ Error in batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError);
      // Continue with next batch
    }
  }
  
  console.log('✅ UKMLA curriculum uploaded successfully!');
  console.log(`   ID: ${publishId}`);
  console.log(`   Concepts: ${curriculum.concepts.length}`);
}

uploadCurriculum().catch(console.error);
