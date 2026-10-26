import { generateReport } from '../services/reportService';
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

async function run() {
  console.log('Starting reproduction script...');
  console.log('CWD:', process.cwd());
  console.log('SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? 'Set' : 'Unset');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log(
    'SUPABASE_SERVICE_ROLE_KEY:',
    key ? `Set (starts with ${key.substring(0, 5)}...)` : 'Unset',
  );

  // 1. Try to find an existing encounter to use
  console.log('Searching for existing encounter...');
  const { data: encounters, error: searchError } = await supabase
    .from('encounters')
    .select('*')
    .limit(1);

  let userId;
  let encounterId;

  if (encounters && encounters.length > 0) {
    console.log('Found existing encounter:', encounters[0].id);
    encounterId = encounters[0].id;
    userId = encounters[0].user_id;
  } else {
    console.log('No encounters found. Attempting to create one...');
    // This might fail if we don't have a valid user in auth.users, but let's try with a random UUID if needed,
    // or just fail.
    // For reproduction, we really need a valid user.
    // Let's assume the DB has at least one user or we can't really test without auth flows.
    // Actually, since we are using the Service Role key in config/supabase.ts, RLS is bypassed, but FK constraints are NOT.

    // Let's try to find a user first.
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (users && users.users.length > 0) {
      userId = users.users[0].id;
      console.log('Found user:', userId);
    } else {
      console.log('No users found. Creating a test user...');
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: `test_user_${Date.now()}@example.com`,
        password: 'password123',
        email_confirm: true,
      });

      if (createUserError) {
        console.error('Failed to create test user:', createUserError);
        return;
      }
      userId = newUser.user.id;
      console.log('Created test user:', userId);
    }

    // Create encounter
    if (userId) {
      const { data: newEncounter, error: createError } = await supabase
        .from('encounters')
        .insert({
          user_id: userId,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          type: 'emergency', // required field based on checklist/service
          category: 'Test',
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create encounter:', createError);
        return;
      }
      encounterId = newEncounter.id;
      console.log('Created test encounter:', encounterId);
    }
  }

  console.log(`Testing generateReport for User: ${userId}, Encounter: ${encounterId}`);

  try {
    const token = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const report = await generateReport(userId, encounterId, token);
    console.log('Report generated successfully! Length:', report.length);
  } catch (error: any) {
    console.error('CAUGHT EXPECTED ERROR:', error.message);
    console.error('Full Error:', error);
  }
}

run().catch(console.error);
