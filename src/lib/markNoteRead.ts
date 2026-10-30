import { supabase } from '@/integrations/supabase/client';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { acknowledgeStudentWork } from '@/lib/studentWorkState';
/** Atomically persist a loaded note receipt and reconcile its exact linked alerts. */
export async function markNoteRead(item: ClassroomItem, viewerId: string): Promise<ClassroomItem> {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError)
        throw authError;
    if (!viewerId || auth.user?.id !== viewerId || item.student_id !== viewerId) {
        throw new Error('This note does not belong to the signed-in reader.');
    }
    const receipt = await acknowledgeStudentWork({ sourceTable: 'classroom_items', sourceId: item.id, issuance: (item as ClassroomItem & {
            issuance?: number;
        }).issuance ?? 1 }, viewerId);
    return { ...item, metadata_json: { ...item.metadata_json, read_at: receipt.read_at } };
}
export function isReadInMetadata(item: Pick<ClassroomItem, 'metadata_json' | 'status'>) {
    // A note the student marked done is read by definition, whatever the metadata says.
    if (item.status === 'completed')
        return true;
    const at = (item.metadata_json ?? {})['read_at'];
    return typeof at === 'string' && at.length > 0;
}
