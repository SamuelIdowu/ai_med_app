import { supabase } from '../config/supabase';

export const getProfile = async (userId: string) => {
    const { data, error } = await supabase
        .from('medical_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116: JSON object requested, multiple (or no) rows returned
        throw error;
    }
    
    return data;
};

export const upsertProfile = async (userId: string, profileData: any) => {
    const { data, error } = await supabase
        .from('medical_profiles')
        .upsert({
            user_id: userId,
            ...profileData,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
    if (error) throw error;
    return data;
};
