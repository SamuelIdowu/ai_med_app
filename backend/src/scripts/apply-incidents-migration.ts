import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyIncidentsMigration() {
    console.log('Creating incidents table...');

    // Create table
    const { error: createError } = await supabase.rpc('query', {
        query: `
            CREATE TABLE IF NOT EXISTS public.incidents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                incident_type TEXT NOT NULL,
                severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe', 'critical')),
                treatment_given TEXT NOT NULL,
                symptoms TEXT,
                ai_conversation_id TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `
    });

    if (createError) {
        console.log('Note: Table may already exist or using alternative approach');
        console.log('Please run this SQL manually in Supabase dashboard:');
        console.log(`
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe', 'critical')),
    treatment_given TEXT NOT NULL,
    symptoms TEXT,
    ai_conversation_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own incidents" ON public.incidents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own incidents" ON public.incidents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON public.incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON public.incidents(created_at DESC);

GRANT SELECT, INSERT ON public.incidents TO authenticated;
        `);
    } else {
        console.log('✅ Incidents table created successfully!');
    }
}

applyIncidentsMigration()
    .then(() => {
        console.log('Migration script complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration error:', error);
        process.exit(1);
    });
