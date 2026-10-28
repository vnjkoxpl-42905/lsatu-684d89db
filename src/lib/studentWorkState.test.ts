import { beforeEach, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: mocks.getUser }, rpc: mocks.rpc, from: mocks.from } }));
import { loadStudentWorkState, acknowledgeStudentWork } from './studentWorkState';
const identity = { sourceTable: 'homework_assignments', sourceId: 'work-one', issuance: 2 };
const access = { source_table: identity.sourceTable, source_id: identity.sourceId, issuance: 2, available: true };
beforeEach(() => { vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: 'one' } }, error: null }); mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'get_student_work_access' ? [access] : [], error: null })); mocks.from.mockReturnValue({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }); });
describe('actor-scoped typed work adapter', () => {
    it('validates the actor around the complete access and receipt load', async () => { expect(await loadStudentWorkState('one')).toEqual({ access: [access], receipts: [], practiceTests: [] }); expect(mocks.getUser).toHaveBeenCalledTimes(2); });
    it('rejects an account switch before requesting another actors projection', async () => { await expect(loadStudentWorkState('two')).rejects.toThrow('reader changed'); expect(mocks.rpc).not.toHaveBeenCalled(); });
    it('rejects a switch while projection reads are in flight', async () => { mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'one' } }, error: null }).mockResolvedValueOnce({ data: { user: { id: 'two' } }, error: null }); await expect(loadStudentWorkState('one')).rejects.toThrow('reader changed'); });
    it('rejects malformed database payloads instead of presenting no work', async () => { mocks.rpc.mockResolvedValue({ data: [{ source_table: 'homework_assignments', source_id: 'work-one', issuance: '2', available: true }], error: null }); await expect(loadStudentWorkState('one')).rejects.toThrow('Invalid student work state'); });
    it('does not fallback to table writes when acknowledgement is denied', async () => { mocks.rpc.mockResolvedValue({ data: null, error: new Error('not owned') }); await expect(acknowledgeStudentWork(identity, 'one')).rejects.toThrow('not owned'); expect(mocks.from).not.toHaveBeenCalled(); });
});
