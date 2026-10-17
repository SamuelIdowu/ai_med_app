import { getSupabaseAdmin } from '../db/client';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resourceType: 'PROFILE' | 'ENCOUNTER' | 'PHOTO' | 'REPORT' | 'AUTH' | 'TRIAGE';
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export const logAudit = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('audit_logs').insert({
      user_id: entry.userId || null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      metadata: entry.metadata || {},
    });
  } catch (err: any) {
    // Non-blocking: Audit failure should never crash clinical or emergency response
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[AuditLog] Warning: failed to record audit entry (${entry.action}):`, err.message);
    }
  }
};
