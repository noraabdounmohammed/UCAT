// Minimal test - just try to insert one simple record
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

console.log('🔗 Connecting to:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimpleInsert() {
  const testId = 'test-' + Date.now();
  
  console.log('\n⏱️ Starting insert at:', new Date().toISOString());
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase
      .from('published_curriculums')
      .insert([{
        id: testId,
        name: 'Test',
        description: 'Test',
        category: 'Medical Exam',
        country: 'United Kingdom',
        author: 'Test',
        version: '1.0.0',
        published_at: new Date().toISOString(),
        download_count: 0,
        rating: 5.0,
        tags: ['test'],
        custom_filters: [],
        filter_categories: [],
        filter_assignments: {},
        practice_templates: [],
        concept_count: 0,
        difficulty: 'Intermediate',
        estimated_hours: 1,
        is_locked: false
      }])
      .select();
    
    const duration = Date.now() - startTime;
    console.log(`⏱️ Insert completed in ${duration}ms`);
    
    if (error) {
      console.error('❌ Insert failed:', error);
      return false;
    }
    
    console.log('✅ Insert successful!');
    console.log('📊 Inserted data:', data);
    
    // Clean up
    console.log('\n🧹 Cleaning up...');
    await supabase
      .from('published_curriculums')
      .delete()
      .eq('id', testId);
    
    console.log('✅ Cleanup complete');
    return true;
    
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error after ${duration}ms:`, err);
    return false;
  }
}

testSimpleInsert()
  .then(success => {
    console.log('\n' + (success ? '✅ Test passed' : '❌ Test failed'));
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('\n❌ Unexpected error:', err);
    process.exit(1);
  });
