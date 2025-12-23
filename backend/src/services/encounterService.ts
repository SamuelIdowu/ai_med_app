import { supabase, createAuthenticatedClient } from '../config/supabase';

export const createEncounter = async (userId: string, encounterData: any, token: string) => {
    const supabaseClient = createAuthenticatedClient(token);

    const { data, error } = await supabaseClient
        .from('encounters')
        .insert({
            user_id: userId,
            ...encounterData
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getEncounter = async (encounterId: string, userId: string, token: string) => {
    const supabaseClient = createAuthenticatedClient(token);

    const { data, error } = await supabaseClient
        .from('encounters')
        .select('*')
        .eq('id', encounterId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;
    return data;
};

export const getEncounters = async (userId: string, token: string) => {
    const supabaseClient = createAuthenticatedClient(token);

    const { data, error } = await supabaseClient
        .from('encounters')
        .select('*')
        .eq('user_id', userId) // Redundant with RLS but good for safety
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};
