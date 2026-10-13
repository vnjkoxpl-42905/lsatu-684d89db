import { beforeEach, expect, it, vi } from 'vitest';
import { listStudentAssignments } from './activitiesClient';

const db = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(), capability: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: db.from } }));
vi.mock('./activityRevocation', () => ({ activityRevocationAvailable: db.capability }));
beforeEach(() => {
  vi.clearAllMocks();
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db);
  db.capability.mockResolvedValue(false);
  db.order.mockReset().mockResolvedValue({ data: [], error: null });
});
it('does not request absent revocation columns from the current backend', async () => {
  await listStudentAssignments('student');
  expect(db.select.mock.calls[0][0]).not.toContain('revoked_at');
});
it('keeps installed revocation fields for source and mirror projection', async () => {
  db.capability.mockResolvedValue(true);
  db.order.mockResolvedValue({ data: [{ id: 'issued', student_id: 'student', item_count: 1, revoked_at: '2026-09-30T00:00:00Z', revoked_by: 'teacher' }], error: null });
  const rows = await listStudentAssignments('student');
  expect(db.select.mock.calls[0][0]).toContain('revoked_at,revoked_by');
  expect(rows[0].revoked_by).toBe('teacher');
});
it('preserves revocation fields through item-count fallback', async () => {
  db.capability.mockResolvedValue(true);
  db.order.mockResolvedValueOnce({ data: null, error: { code: 'PGRST204' } }).mockResolvedValueOnce({ data: [{ id: 'issued', items: [1], revoked_at: '2026-09-30T00:00:00Z' }], error: null });
  const rows = await listStudentAssignments('student');
  expect(db.select.mock.calls[1][0]).toContain('items,revoked_at,revoked_by');
  expect(rows[0].revoked_at).toBeTruthy();
});
