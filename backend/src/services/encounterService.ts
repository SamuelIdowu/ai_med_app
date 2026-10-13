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

export const updateEncounter = async (encounterId: string, userId: string, updates: any, token: string) => {
    const supabaseClient = createAuthenticatedClient(token);

    const { data, error } = await supabaseClient
        .from('encounters')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', encounterId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteEncounter = async (encounterId: string, userId: string, token: string) => {
    const supabaseClient = createAuthenticatedClient(token);

    const { error } = await supabaseClient
        .from('encounters')
        .delete()
        .eq('id', encounterId)
        .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
};
