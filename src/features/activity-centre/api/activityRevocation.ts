import { supabase } from '@/integrations/supabase/client';

export interface ActivityRevocationReceipt {
  assignment_id: string;
  student_id: string;
  revoked_at: string;
  revoked_by: string;
  performed_by: string;
  already_revoked: boolean;
  mirrors_hidden: number;
}

// The draft RPC is absent from generated database types until deployment.
interface RevocationTransport {
  auth: { getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  rpc(name: string, args?: Record<string, string>): PromiseLike<{ data: unknown; error: unknown }>;
}
const transport = supabase as unknown as RevocationTransport;

/** Probe only. Any failure keeps source unassignment unavailable. */
export async function activityRevocationAvailable(client: RevocationTransport = transport): Promise<boolean> {
  try {
    const { data, error } = await client.rpc('activity_revocation_capability');
    if (error || !data || typeof data !== 'object') return false;
    const capability = data as Record<string, unknown>;
    return capability.version === 1 && capability.source_preserving === true;
  } catch { return false; }
}

/** Revoke the issued source and all mirrors atomically; preserve historical work. */
export async function revokeActivityAssignment(
  assignmentId: string,
  studentId: string,
  client: RevocationTransport = transport,
): Promise<ActivityRevocationReceipt> {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error('Sign in before unassigning an Activity.');
  if (!await activityRevocationAvailable(client)) throw new Error('Activity unassignment is unavailable. The assignment has been kept.');
  const { data, error } = await client.rpc('revoke_activity_assignment', {
    p_assignment_id: assignmentId,
    p_student_id: studentId,
  });
  if (error) throw error;
  const row = data as Partial<ActivityRevocationReceipt> | null;
  if (!row || row.assignment_id !== assignmentId || row.student_id !== studentId ||
      row.performed_by !== auth.user.id || typeof row.revoked_by !== 'string' || !row.revoked_by ||
      typeof row.revoked_at !== 'string' || !Number.isFinite(Date.parse(row.revoked_at)) ||
      typeof row.already_revoked !== 'boolean' || (!row.already_revoked && row.revoked_by !== auth.user.id) ||
      !Number.isInteger(row.mirrors_hidden) || row.mirrors_hidden! < 0) {
    throw new Error('Your account did not confirm Activity revocation. Refresh before retrying.');
  }
  return row as ActivityRevocationReceipt;
}
