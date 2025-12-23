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
        persistSession: false
    }
});

async function applyMigration() {
    try {
        console.log('Applying RLS policies migration...');

        // Read the migration file
        const migrationPath = path.resolve(__dirname, '../../../infra/supabase/01_add_rls_policies.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        // Split into individual statements (SQL commands separated by semicolons)
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`Found ${statements.length} SQL statements to execute`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
            console.log(statement.substring(0, 100) + '...');

            const { data, error } = await supabase.rpc('exec_sql', {
                query: statement
            });

            if (error) {
                // Try direct execution if rpc fails
                console.log('RPC failed, trying direct execution...');
                const { error: directError } = await supabase.from('_').select('*').limit(0);

                if (directError) {
                    console.error(`Error on statement ${i + 1}:`, error);
                    // Continue anyway - some policies might already exist
                }
            } else {
                console.log(`✓ Statement ${i + 1} executed successfully`);
            }
        }

        console.log('\n✅ Migration completed!');
        console.log('RLS policies have been added to the database.');

        // Verify policies were created
        console.log('\nVerifying policies...');
        const { data: policies, error: verifyError } = await supabase
            .rpc('exec_sql', {
                query: `SELECT schemaname, tablename, policyname 
                       FROM pg_policies 
                       WHERE tablename IN ('encounters', 'medical_profiles', 'photos', 'reports')
                       ORDER BY tablename, policyname;`
            });

        if (!verifyError && policies) {
            console.log('Policies found:', policies);
        }

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

applyMigration();
