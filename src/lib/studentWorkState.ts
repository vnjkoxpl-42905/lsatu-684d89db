import { supabase } from '@/integrations/supabase/client';
import type { StudentWorkIdentity } from './studentWorkIdentity';
export interface StudentWorkAccess {
    source_table: string;
    source_id: string;
    issuance: number;
    available: boolean;
}
export interface StudentWorkReceipt {
    source_table: string;
    source_id: string;
    issuance: number;
    first_opened_at: string;
    last_opened_at: string;
    read_at: string;
}
// New schema is installed before this client. Never substitute direct table writes.
const rpc = (name: string, args?: Record<string, unknown>) => (supabase.rpc as unknown as (name: string, args?: Record<string, unknown>) => Promise<{
    data: unknown;
    error: unknown;
}>)(name, args);
export async function loadStudentWorkState(expectedUserId: string) {
    const before = await supabase.auth.getUser();
    if (before.error)
        throw before.error;
    if (before.data.user?.id !== expectedUserId)
        throw new Error('The signed-in reader changed.');
    const [access, receipts] = await Promise.all([rpc('get_student_work_access'), rpc('get_student_work_receipts')]);
    if (access.error)
        throw access.error;
    if (receipts.error)
        throw receipts.error;
    const tests = await supabase.from('practice_test_assignments').select('id,pt').eq('student_id', expectedUserId);
    if (tests.error)
        throw tests.error;
    const after = await supabase.auth.getUser();
    if (after.error)
        throw after.error;
    if (after.data.user?.id !== expectedUserId)
        throw new Error('The signed-in reader changed.');
    const validIdentity = (row: unknown): row is StudentWorkAccess => !!row && typeof row === 'object' && typeof (row as StudentWorkAccess).source_table === 'string' && typeof (row as StudentWorkAccess).source_id === 'string' && Number.isSafeInteger((row as StudentWorkAccess).issuance) && (row as StudentWorkAccess).issuance > 0;
    const validReceipt = (row: unknown): row is StudentWorkReceipt => validIdentity(row) && typeof (row as unknown as StudentWorkReceipt).first_opened_at === 'string' && typeof (row as unknown as StudentWorkReceipt).last_opened_at === 'string' && typeof (row as unknown as StudentWorkReceipt).read_at === 'string';
    if (!Array.isArray(access.data) || !access.data.every(row => validIdentity(row) && typeof row.available === 'boolean') || !Array.isArray(receipts.data) || !receipts.data.every(validReceipt))
        throw new Error('Invalid student work state response.');
    return { access: (access.data ?? []) as StudentWorkAccess[], receipts: (receipts.data ?? []) as StudentWorkReceipt[], practiceTests: tests.data ?? [] };
}
export async function acknowledgeStudentWork(identity: StudentWorkIdentity, viewerId: string): Promise<StudentWorkReceipt> {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError)
        throw authError;
    if (!viewerId || auth.user?.id !== viewerId)
        throw new Error('The signed-in reader changed.');
    const { data, error } = await rpc('acknowledge_student_work', { p_source_table: identity.sourceTable, p_source_id: identity.sourceId, p_issuance: identity.issuance });
    if (error)
        throw error;
    const receipt = data as StudentWorkReceipt & {
        acknowledged?: boolean;
    };
    if (!receipt?.acknowledged || receipt.source_table !== identity.sourceTable || receipt.source_id !== identity.sourceId || receipt.issuance !== identity.issuance || !receipt.read_at)
        throw new Error('Could not confirm opened work.');
    return receipt;
}
export async function acknowledgeAssignmentGroup(groupId: string, viewerId: string) {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError)
        throw authError;
    if (!viewerId || auth.user?.id !== viewerId)
        throw new Error('The signed-in reader changed.');
    const { data, error } = await rpc('acknowledge_assignment_notification_group', { p_group_id: groupId });
    if (error)
        throw error;
    if (data !== true)
        throw new Error('Could not confirm opened collection.');
}
