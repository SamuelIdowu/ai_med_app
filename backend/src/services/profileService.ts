import { createAuthenticatedClient } from '../config/supabase';

export const getProfile = async (userId: string, accessToken: string) => {
    const supabase = createAuthenticatedClient(accessToken);
    const { data, error } = await supabase
        .from('medical_profiles')
        .select('*, users (name, email)')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: JSON object requested, multiple (or no) rows returned
        throw error;
    }

    return data;
};

export const upsertProfile = async (userId: string, profileData: any, accessToken: string) => {
    const supabase = createAuthenticatedClient(accessToken);
    // Separate profile data from user data
    const { fullName, ...medProfile } = profileData;

    // Update public.users name if provided
    if (fullName) {
        await supabase
            .from('users')
            .update({ name: fullName })
            .eq('id', userId);
    }

    const { data, error } = await supabase
        .from('medical_profiles')
        .upsert({
            user_id: userId,
            ...medProfile,
            updated_at: new Date().toISOString()
        })
        .select('*, users (name, email)')
        .single();

    if (error) throw error;
    return data;
};
