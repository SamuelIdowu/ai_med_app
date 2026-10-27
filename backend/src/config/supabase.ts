// Single source of truth for Supabase clients. Kept as a thin re-export so
// existing imports of `../config/supabase` continue to work.
export { getSupabaseAdmin, createAuthenticatedClient, supabase } from '../db/client';
