// Test Supabase connection and table structure
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Need: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  // Test 1: Simple select to check connection
  console.log('Test 1: Basic connection test');
  try {
    const { data, error } = await supabase
      .from('published_curriculums')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.error('Error details:', error);
      return false;
    }
    console.log('✅ Connection successful\n');
  } catch (err) {
    console.error('❌ Connection error:', err);
    return false;
  }

  // Test 2: Check table structure
  console.log('Test 2: Checking table columns');
  try {
    const { data, error } = await supabase
      .from('published_curriculums')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Failed to query table:', error.message);
      return false;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Table columns:', Object.keys(data[0]).join(', '));
    } else {
      console.log('⚠️ Table exists but is empty');
      console.log('Attempting insert to check structure...\n');
    }
  } catch (err) {
    console.error('❌ Query error:', err);
    return false;
  }

  // Test 3: Try a minimal insert
  console.log('\nTest 3: Attempting minimal insert');
  const testData = {
    id: 'test-connection-' + Date.now(),
    name: 'Connection Test',
    author_name: 'Test',
    description: 'Testing connection',
    country: 'United Kingdom',
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
  };

  try {
    console.log('Inserting test record...');
    const { data, error } = await supabase
      .from('published_curriculums')
      .insert([testData])
      .select();
    
    if (error) {
      console.error('❌ Insert failed:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return false;
    }
    
    console.log('✅ Insert successful!');
    console.log('Inserted record:', data);
    
    // Clean up test record
    console.log('\nCleaning up test record...');
    const { error: deleteError } = await supabase
      .from('published_curriculums')
      .delete()
      .eq('id', testData.id);
    
    if (deleteError) {
      console.warn('⚠️ Failed to delete test record:', deleteError.message);
    } else {
      console.log('✅ Test record deleted');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Insert error:', err);
    return false;
  }
}

testConnection()
  .then(success => {
    if (success) {
      console.log('\n✅ All tests passed! Supabase is working correctly.');
    } else {
      console.log('\n❌ Tests failed. Check the errors above.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('\n❌ Unexpected error:', err);
    process.exit(1);
  });
