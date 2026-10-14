import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ assign: vi.fn(), notify: vi.fn() }));
vi.mock('@/lib/readingCenterAccess', () => ({ assignReadingCenter: mocks.assign, READING_CENTER_PATH: '/reading-center' }));
vi.mock('@/lib/classroomNotify', () => ({ notifyStudentOfClassroomItem: mocks.notify }));
import { assignWork } from './assignWork';
const input = { teacherId: 'teacher', studentIds: ['student'], item: { kind: 'reading_center' as const } };
beforeEach(() => {
  mocks.assign.mockReset().mockResolvedValue({ item: { id: 'launcher', title: 'Reading Center', description: 'Reading practice' }, reused: false });
  mocks.notify.mockReset().mockResolvedValue({ inbox_ok: true, bell_ok: true, email_ok: true });
});
describe('assignWork Reading Center', () => {
  it('returns the verified Classroom launcher and notifies only once', async () => {
    const first = await assignWork(input);
    expect(first.ok[0]).toMatchObject({ studentId: 'student', classroomItemId: 'launcher', route: '/reading-center' });
    mocks.assign.mockResolvedValue({ item: { id: 'launcher', title: 'Reading Center' }, reused: true });
    const retry = await assignWork(input);
    expect(retry.ok[0].classroomItemId).toBe('launcher'); expect(mocks.notify).toHaveBeenCalledTimes(1);
  });
  it('keeps a verified grant when notification delivery fails', async () => {
    mocks.notify.mockRejectedValue(new Error('notification unavailable'));
    const result = await assignWork(input);
    expect(result.failed).toEqual([]); expect(result.ok[0].notify).toMatchObject({ inbox_ok: false, bell_ok: false, email_ok: false });
  });
  it('does not notify or report success if the actual assignment cannot be verified', async () => {
    mocks.assign.mockRejectedValue(new Error('readback failed'));
    const result = await assignWork(input);
    expect(result.ok).toEqual([]); expect(result.failed[0].error).toBe('readback failed'); expect(mocks.notify).not.toHaveBeenCalled();
  });
  it('deduplicates selected students and supports explicit silent assignments', async () => {
    const result = await assignWork({ ...input, studentIds: ['student', 'student'], notify: false });
    expect(result.ok).toHaveLength(1); expect(mocks.assign).toHaveBeenCalledTimes(1); expect(mocks.notify).not.toHaveBeenCalled();
  });
});
