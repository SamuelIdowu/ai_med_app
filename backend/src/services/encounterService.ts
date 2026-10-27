import { getSupabaseAdmin } from '../db/client';

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];
const VALID_STATUSES = ['active', 'in_progress', 'escalated', 'resolved'];

const sanitizeSeverity = (value: unknown): string => {
  if (typeof value === 'string' && VALID_SEVERITIES.includes(value)) {
    return value;
  }
  return 'medium';
};

const sanitizeStatus = (value: unknown): string => {
  if (typeof value === 'string' && VALID_STATUSES.includes(value)) {
    return value;
  }
  return 'active';
};

const sanitizeSymptoms = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
  }
  return [];
};

export const createEncounter = async (userId: string, encounterData: any, _token?: string) => {
  const supabaseClient = getSupabaseAdmin();
  const now = new Date().toISOString();

  const severity = sanitizeSeverity(encounterData.severity);
  const status = sanitizeStatus(encounterData.status);
  const title =
    encounterData.title || encounterData.notes || encounterData.category || 'Emergency Encounter';
  const notes = encounterData.notes || encounterData.title || '';
  const category = encounterData.category || severity;
  const symptoms = sanitizeSymptoms(encounterData.symptoms);

  const payload = {
    user_id: userId,
    type: encounterData.type || 'emergency',
    category,
    notes,
    title,
    severity,
    status,
    symptoms,
    started_at: encounterData.started_at || now,
    updated_at: now,
  };

  const { data, error } = await supabaseClient.from('encounters').insert(payload).select().single();

  if (error) throw error;
  return {
    ...data,
    title: data.title || data.notes || title,
    severity: data.severity || category || severity,
    category: data.category || category,
    notes: data.notes || notes,
    status: data.status || status,
    symptoms: Array.isArray(data.symptoms) ? data.symptoms : symptoms,
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
    title: data.title || data.notes || 'Emergency Encounter',
    severity: data.severity || data.category || 'medium',
    symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
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
    title: e.title || e.notes || 'Emergency Encounter',
    severity: e.severity || e.category || 'medium',
    symptoms: Array.isArray(e.symptoms) ? e.symptoms : [],
  }));
};

export const updateEncounter = async (
  encounterId: string,
  userId: string,
  updates: any,
  _token?: string,
) => {
  const supabaseClient = getSupabaseAdmin();

  const dbUpdates: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status !== undefined) {
    dbUpdates.status = sanitizeStatus(updates.status);
  }
  if (updates.severity !== undefined) {
    const severity = sanitizeSeverity(updates.severity);
    dbUpdates.severity = severity;
    if (updates.category === undefined) {
      dbUpdates.category = severity;
    }
  }
  if (updates.category !== undefined) {
    dbUpdates.category = updates.category;
  }
  if (updates.notes !== undefined) {
    dbUpdates.notes = updates.notes;
  } else if (updates.title !== undefined) {
    dbUpdates.notes = updates.title;
  }
  if (updates.title !== undefined) {
    dbUpdates.title = updates.title;
  }
  if (updates.type !== undefined) {
    dbUpdates.type = updates.type;
  }
  if (updates.symptoms !== undefined) {
    dbUpdates.symptoms = sanitizeSymptoms(updates.symptoms);
  }
  if (updates.started_at !== undefined) {
    dbUpdates.started_at = updates.started_at;
  }

  const { data, error } = await supabaseClient
    .from('encounters')
    .update(dbUpdates)
    .eq('id', encounterId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  const severity = data.severity || data.category || 'medium';
  const title = updates.title || data.title || data.notes;
  return {
    ...data,
    title: title || 'Emergency Encounter',
    severity,
    symptoms: Array.isArray(data.symptoms) ? data.symptoms : sanitizeSymptoms(updates.symptoms),
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
