import { supabase } from '../config/supabase';

export const createEncounter = async (userId: string, encounterData: any) => {
    const { data, error } = await supabase
        .from('encounters')
        .insert({
            user_id: userId,
            ...encounterData,
            status: 'in_progress',
            started_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getEncounter = async (encounterId: string, userId: string) => {
    const { data, error } = await supabase
        .from('encounters')
        .select('*')
        .eq('id', encounterId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;
    return data;
};
