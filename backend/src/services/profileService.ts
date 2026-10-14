import { getSupabaseAdmin } from '../db/client';

export const getProfile = async (userId: string, _accessToken?: string) => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('medical_profiles')
        .select('*, users (name, email)')
        .eq('user_id', userId)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    return data;
};

export const upsertProfile = async (userId: string, profileData: any, _accessToken?: string) => {
    const supabase = getSupabaseAdmin();
    const { fullName, email, ...medProfile } = profileData;

    // Update public.users name if provided
    if (fullName) {
        await supabase
            .from('users')
            .update({ name: fullName })
            .eq('id', userId);
    }

    // Check if an existing profile exists for this user_id
    const { data: existing } = await supabase
        .from('medical_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    // Prepare strictly typed payload matching table schema
    const payload: any = {
        user_id: userId,
        updated_at: new Date().toISOString(),
    };

    if (medProfile.blood_type !== undefined) payload.blood_type = medProfile.blood_type;
    if (medProfile.dob !== undefined) payload.dob = medProfile.dob;
    if (medProfile.allergies !== undefined) payload.allergies = medProfile.allergies;
    if (medProfile.medications !== undefined) payload.medications = medProfile.medications;
    if (medProfile.conditions !== undefined) payload.conditions = medProfile.conditions;
    if (medProfile.gender !== undefined) payload.gender = medProfile.gender;
    if (medProfile.weight !== undefined) payload.weight = medProfile.weight;
    if (medProfile.height !== undefined) payload.height = medProfile.height;
    if (medProfile.genotype !== undefined) payload.genotype = medProfile.genotype;
    if (medProfile.photo_url !== undefined) payload.photo_url = medProfile.photo_url;
    if (medProfile.encrypted_meta !== undefined) payload.encrypted_meta = medProfile.encrypted_meta;

    if (medProfile.emergency_contacts !== undefined) {
        payload.emergency_contacts = medProfile.emergency_contacts;
    } else if (medProfile.emergency_contact !== undefined) {
        payload.emergency_contacts = Array.isArray(medProfile.emergency_contact)
            ? medProfile.emergency_contact
            : [medProfile.emergency_contact];
    }

    let query;
    if (existing?.id) {
        query = supabase
            .from('medical_profiles')
            .update(payload)
            .eq('id', existing.id);
    } else {
        query = supabase
            .from('medical_profiles')
            .insert(payload);
    }

    const { data, error } = await query
        .select('*, users (name, email)')
        .single();

    if (error) throw error;
    return data;
};
