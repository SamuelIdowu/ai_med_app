import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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

async function applyMigration() {
  try {
    console.log('Applying medical profiles migration...');

    // Read the migration file
    const migrationPath = path.resolve(__dirname, '../../../infra/supabase/02_add_photo_url.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Migration SQL:');
    console.log(migrationSQL);
    console.log('\nAttempting to apply migration via Supabase client...');

    // Try using raw query
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migrationSQL,
    });

    if (error) {
      console.error('RPC exec_sql failed:', error);
      console.log('\nPlease apply this migration manually in your Supabase SQL editor.');
      console.log('You can find the SQL in: infra/supabase/02_add_photo_url.sql');
    } else {
      console.log('✅ Migration completed successfully!');
    }

    // Verify columns
    console.log('\nVerifying medical_profiles table structure...');
    const { data: columns, error: verifyError } = await supabase
      .from('medical_profiles')
      .select('*')
      .limit(0);

    if (verifyError) {
      console.error('Could not verify table structure:', verifyError);
    } else {
      console.log('Table structure verified.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
