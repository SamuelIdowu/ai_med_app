import { supabase } from '../config/supabase';

async function testConnection() {
    console.log('Testing Supabase connection...');
    try {
        const { data, error } = await supabase.from('medical_profiles').select('count').limit(1);
        if (error) {
            console.error('Supabase Error:', error);
        } else {
            console.log('Connection successful. Data:', data);
        }
    } catch (e) {
        console.error('Connection Exception:', e);
    }
}

testConnection();
