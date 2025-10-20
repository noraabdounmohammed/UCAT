import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://uivitzexbtsmnspcitgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpdml0emV4YnRzbW5zcGNpdGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MzQ3NjYsImV4cCI6MjA3NjAxMDc2Nn0.2Y6zDndrPwKMPqIq7nprXK9pei0MZGPIyWJDxN9XmgQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Concept {
  title: string;
  content: string;
  custom_filters: string[];
}

async function uploadConcepts() {
  try {
    // Read the JSON file with all your concepts
    const conceptsData: Concept[] = JSON.parse(
      fs.readFileSync('./aqa-biology-concepts-full.json', 'utf-8')
    );

    console.log(`📚 Found ${conceptsData.length} concepts to upload`);

    // First, delete existing concepts for this curriculum
    console.log('🗑️  Deleting existing concepts...');
    const { error: deleteError } = await supabase
      .from('curriculum_concepts')
      .delete()
      .eq('curriculum_id', 'pub-aqa-gcse-biology-v1');

    if (deleteError) {
      console.error('Error deleting existing concepts:', deleteError);
      throw deleteError;
    }

    // Transform and upload concepts in batches
    const batchSize = 50;
    let uploaded = 0;

    for (let i = 0; i < conceptsData.length; i += batchSize) {
      const batch = conceptsData.slice(i, i + batchSize);
      
      const conceptsToInsert = batch.map((concept, index) => {
        // Extract concept ID from title (e.g., "CB-001" from "CB-001: Definition...")
        const conceptId = concept.title.split(':')[0].trim();
        
        return {
          curriculum_id: 'pub-aqa-gcse-biology-v1',
          concept_id: conceptId,
          title: concept.title,
          content: concept.content,
          prerequisites: [],
          custom_filters: concept.custom_filters,
          mastery_data: {
            attempts: 0,
            correct: 0,
            incorrect: 0,
            mastery_level: 0,
            last_practiced: null
          }
        };
      });

      const { error } = await supabase
        .from('curriculum_concepts')
        .insert(conceptsToInsert);

      if (error) {
        console.error(`Error uploading batch ${i / batchSize + 1}:`, error);
        throw error;
      }

      uploaded += batch.length;
      console.log(`✅ Uploaded ${uploaded}/${conceptsData.length} concepts`);
    }

    // Update the concept count in the curriculum
    console.log('📊 Updating curriculum concept count...');
    const { error: updateError } = await supabase
      .from('published_curriculums')
      .update({ concept_count: conceptsData.length })
      .eq('id', 'pub-aqa-gcse-biology-v1');

    if (updateError) {
      console.error('Error updating concept count:', updateError);
      throw updateError;
    }

    console.log(`🎉 Successfully uploaded all ${conceptsData.length} concepts!`);
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

uploadConcepts();
