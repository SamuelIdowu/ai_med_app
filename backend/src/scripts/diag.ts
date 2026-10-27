import { getSupabaseAdmin } from '../db/client';
import { upsertProfile } from '../services/profileService';

async function main() {
  const admin = getSupabaseAdmin();
  const testEmail = `prof-brandnew-${Date.now()}@test.local`;
  const u = await admin.auth.admin.createUser({
    email: testEmail,
    password: 'Password123!',
    email_confirm: true,
  });
  const userId = u.data.user!.id;

  console.log('Testing upsertProfile for user:', userId);
  try {
    const res = await upsertProfile(userId, {
      fullName: 'Jane Test Doe',
      blood_type: 'O+',
      allergies: ['Penicillin', 'Peanuts'],
      conditions: ['Asthma'],
      medications: ['Albuterol inhaler'],
      emergency_contact: {
        name: 'John Doe',
        phone: '+1-555-0199',
        relationship: 'Spouse',
      },
    });
    console.log('upsertProfile result:', res.id, res.blood_type);
  } catch (err: any) {
    console.error('upsertProfile failed with:', err);
  }

  // Teardown
  await admin.from('medical_profiles').delete().eq('user_id', userId);
  await admin.auth.admin.deleteUser(userId);
}

main().catch(console.error);
