import { getSupabaseAdmin } from '../db/client';

async function verifyAllTables() {
  const supabase = getSupabaseAdmin();
  const tables = [
    'profiles',
    'medical_profiles',
    'encounters',
    'triage_messages',
    'wound_assessments',
    'guideline_embeddings',
    'providers',
    'audit_logs'
  ];

  console.log('=== Verifying Live Database Schema ===');
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table '${table}': NOT FOUND or Error ->`, error.message);
    } else {
      console.log(`✅ Table '${table}': EXISTS`);
    }
  }

  // Check storage buckets
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.log('❌ Storage Buckets Error ->', bucketError.message);
  } else {
    const bucketNames = buckets?.map((b: any) => b.name) || [];
    console.log('📦 Available Storage Buckets:', bucketNames);
    if (bucketNames.includes('medical-images')) {
      console.log('✅ Storage bucket "medical-images": EXISTS');
    } else {
      console.log('❌ Storage bucket "medical-images": MISSING');
    }
  }
}

verifyAllTables().catch(console.error);
