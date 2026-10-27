import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// If the key is the placeholder, treat it as missing
if (supabaseServiceKey === 'YOUR_SUPABASE_SERVICE_ROLE_KEY') {
  supabaseServiceKey = '';
}

// Fallback to Anon Key if Service Role Key is missing
supabaseServiceKey = supabaseServiceKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Key is missing. Check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkSchema() {
  try {
    console.log('Checking medical_profiles table schema...\n');

    // Try to select all columns including the ones we need
    const { data, error } = await supabase
      .from('medical_profiles')
      .select(
        'id, user_id, dob, blood_type, gender, genotype, weight, height, photo_url, allergies, medications, conditions, emergency_contacts',
      )
      .limit(1);

    if (error) {
      console.error('❌ Error querying medical_profiles:', error);
      console.log('\nThis likely means one or more columns are missing.');
      console.log('\n📋 Please run the following SQL in your Supabase SQL Editor:');
      console.log('\nALTER TABLE public.medical_profiles');
      console.log('ADD COLUMN IF NOT EXISTS photo_url text,');
      console.log('ADD COLUMN IF NOT EXISTS gender text,');
      console.log('ADD COLUMN IF NOT EXISTS genotype text,');
      console.log('ADD COLUMN IF NOT EXISTS weight text,');
      console.log('ADD COLUMN IF NOT EXISTS height text;');
    } else {
      console.log('✅ All required columns exist in medical_profiles table!');
      console.log('\nColumns verified:');
      console.log('  - dob');
      console.log('  - blood_type');
      console.log('  - gender');
      console.log('  - genotype');
      console.log('  - weight');
      console.log('  - height');
      console.log('  - photo_url');
      console.log('  - allergies');
      console.log('  - medications');
      console.log('  - conditions');
      console.log('  - emergency_contacts');

      if (data && data.length > 0) {
        console.log('\nSample data:', data[0]);
      } else {
        console.log('\nNo records found in the table.');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema();
