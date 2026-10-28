import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), maybeSingle: vi.fn(), updates: vi.fn(), filters: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: mocks.getUser },
  from: (table: string) => {
    const builder = { update: (value: unknown) => { mocks.updates(table, value); return builder; }, eq: (key: string, value: unknown) => { mocks.filters(table, key, value); return builder; }, like: (key: string, value: unknown) => { mocks.filters(table, key, value); return builder; }, select: () => builder, maybeSingle: mocks.maybeSingle, then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve) };
    return builder;
  },
} }));
import { markNoteRead } from './markNoteRead';
const item = () => ({ id: 'note-one', student_id: 'reader', status: 'assigned', metadata_json: { kind: 'note', source: 'retained' } } as unknown as ClassroomItem);
beforeEach(() => { vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: 'reader' } }, error: null }); });
describe('owned note read persistence', () => {
  it('verifies the owned updated row before clearing only that readers alerts', async () => {
    const updated = { ...item(), metadata_json: { ...item().metadata_json, read_at: '2026-10-27T12:00:00Z' } };
    mocks.maybeSingle.mockResolvedValue({ data: updated, error: null });
    expect(await markNoteRead(item(), 'reader')).toEqual(updated);
    expect(mocks.filters).toHaveBeenCalledWith('classroom_items', 'student_id', 'reader');
    expect(mocks.filters).toHaveBeenCalledWith('notifications', 'user_id', 'reader');
    expect(mocks.updates.mock.calls[0][1].metadata_json).toMatchObject({ kind: 'note', source: 'retained', read_at: expect.any(String) });
  });
  it('does not clear alerts when an update silently matches no row', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(markNoteRead(item(), 'reader')).rejects.toThrow('could not be marked read');
    expect(mocks.updates.mock.calls.map(call => call[0])).toEqual(['classroom_items']);
  });
  it('does not write another persons read state even for an authenticated admin', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'teacher' } }, error: null });
    await expect(markNoteRead(item(), 'teacher')).rejects.toThrow('does not belong');
    expect(mocks.updates).not.toHaveBeenCalled();
  });
  it('rejects an account change before writing', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'second-reader' } }, error: null });
    await expect(markNoteRead(item(), 'reader')).rejects.toThrow('does not belong');
    expect(mocks.updates).not.toHaveBeenCalled();
  });
  it('preserves completed semantics without another note write', async () => {
    await markNoteRead({ ...item(), status: 'completed' }, 'reader');
    expect(mocks.updates.mock.calls.map(call => call[0])).toEqual(['notifications']);
  });
});
