import { getSupabaseAdmin } from '../db/client';

export const createEncounter = async (userId: string, encounterData: any, _token?: string) => {
    const supabaseClient = getSupabaseAdmin();

    const payload = {
        user_id: userId,
        type: encounterData.type || 'emergency',
        category: encounterData.severity || encounterData.category || 'medium',
        notes: encounterData.title || encounterData.notes || 'Emergency Encounter',
        status: encounterData.status || 'active',
        started_at: encounterData.started_at || new Date().toISOString(),
    };

    const { data, error } = await supabaseClient
        .from('encounters')
        .insert(payload)
        .select()
        .single();

    if (error) throw error;
    return {
        ...data,
        title: data.notes,
        severity: data.category || 'medium',
        symptoms: encounterData.symptoms || [],
    };
};

export const getEncounter = async (encounterId: string, userId: string, _token?: string) => {
    const supabaseClient = getSupabaseAdmin();

    const { data, error } = await supabaseClient
        .from('encounters')
        .select('*')
        .eq('id', encounterId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
        ...data,
        title: data.notes || 'Emergency Encounter',
        severity: data.category || 'medium',
        symptoms: [],
    };
};

export const getEncounters = async (userId: string, _token?: string) => {
    const supabaseClient = getSupabaseAdmin();

    const { data, error } = await supabaseClient
        .from('encounters')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((e: any) => ({
        ...e,
        title: e.notes || 'Emergency Encounter',
        severity: 'medium',
        symptoms: [],
    }));
};

export const updateEncounter = async (encounterId: string, userId: string, updates: any, _token?: string) => {
    const supabaseClient = getSupabaseAdmin();

    const dbUpdates: any = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    else if (updates.title !== undefined) dbUpdates.notes = updates.title;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.severity !== undefined) dbUpdates.category = updates.severity;
    if (updates.type !== undefined) dbUpdates.type = updates.type;

    const { data, error } = await supabaseClient
        .from('encounters')
        .update(dbUpdates)
        .eq('id', encounterId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) throw error;
    return {
        ...data,
        title: updates.title || data.notes,
        severity: updates.severity || 'low',
        symptoms: updates.symptoms || [],
    };
};

export const deleteEncounter = async (encounterId: string, userId: string, _token?: string) => {
    const supabaseClient = getSupabaseAdmin();

    const { error } = await supabaseClient
        .from('encounters')
        .delete()
        .eq('id', encounterId)
        .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
};
