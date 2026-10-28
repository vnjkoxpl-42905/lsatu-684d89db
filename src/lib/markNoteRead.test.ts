import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: mocks.getUser }, rpc: mocks.rpc, from: mocks.from } }));
import { markNoteRead } from './markNoteRead';
const item = () => ({ id: 'note-one', student_id: 'reader', status: 'assigned', issuance: 2, metadata_json: { kind: 'note', source: 'retained' } } as unknown as ClassroomItem);
const receipt = { acknowledged: true, source_table: 'classroom_items', source_id: 'note-one', issuance: 2, first_opened_at: '2026-10-28T12:00:00Z', last_opened_at: '2026-10-28T12:00:00Z', read_at: '2026-10-28T12:00:00Z' };
beforeEach(() => { vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: 'reader' } }, error: null }); mocks.rpc.mockResolvedValue({ data: receipt, error: null }); });
describe('atomic owned note acknowledgement', () => {
    it('uses the canonical RPC and preserves local metadata and completion', async () => { const loaded = await markNoteRead(item(), 'reader'); expect(mocks.rpc).toHaveBeenCalledWith('acknowledge_student_work', { p_source_table: 'classroom_items', p_source_id: 'note-one', p_issuance: 2 }); expect(loaded).toMatchObject({ status: 'assigned', metadata_json: { kind: 'note', source: 'retained', read_at: receipt.read_at } }); expect(mocks.from).not.toHaveBeenCalled(); });
    it('fails closed when denied without direct metadata or alert fallback writes', async () => { mocks.rpc.mockResolvedValue({ data: null, error: new Error('denied') }); await expect(markNoteRead(item(), 'reader')).rejects.toThrow('denied'); expect(mocks.from).not.toHaveBeenCalled(); });
    it('rejects an account change before any RPC', async () => { mocks.getUser.mockResolvedValue({ data: { user: { id: 'second-reader' } }, error: null }); await expect(markNoteRead(item(), 'reader')).rejects.toThrow('does not belong'); expect(mocks.rpc).not.toHaveBeenCalled(); });
    it('cannot acknowledge another student even for an admin', async () => { mocks.getUser.mockResolvedValue({ data: { user: { id: 'teacher' } }, error: null }); await expect(markNoteRead(item(), 'teacher')).rejects.toThrow('does not belong'); expect(mocks.rpc).not.toHaveBeenCalled(); });
    it('preserves completed status and exact completion timestamp', async () => { expect(await markNoteRead({ ...item(), status: 'completed', completed_at: '2026-10-27T12:00:00Z' }, 'reader')).toMatchObject({ status: 'completed', completed_at: '2026-10-27T12:00:00Z' }); expect(mocks.from).not.toHaveBeenCalled(); });
    it('rejects mismatched issuance returned from the server', async () => { mocks.rpc.mockResolvedValue({ data: { ...receipt, issuance: 1 }, error: null }); await expect(markNoteRead(item(), 'reader')).rejects.toThrow('Could not confirm'); });
});
