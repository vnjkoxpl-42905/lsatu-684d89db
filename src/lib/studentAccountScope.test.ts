import { expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/studentScopedWork', () => ({ assertActiveStudentScope: vi.fn() }));
import { resolveStudentAccountId } from './studentAccountScope';
const actor = '11111111-1111-4111-8111-111111111111', selected = '22222222-2222-4222-8222-222222222222', differentAuth = '33333333-3333-4333-8333-333333333333';
const scope = { mode: 'selected_student' as const, actorId: actor, studentId: selected };
const deps = () => ({ assertScope: vi.fn().mockResolvedValue(undefined), lookup: vi.fn().mockResolvedValue({ data: selected, error: null }) });
it('preserves the self UUID and never interprets it through a class lookup', async () => {
  const mock = deps(); expect(await resolveStudentAccountId({ mode: 'self', actorId: actor, studentId: actor }, mock)).toBe(actor); expect(mock.lookup).not.toHaveBeenCalled();
});
it('requires a matching canonical UUID from the deployed class identity validator', async () => {
  const mock = deps(); expect(await resolveStudentAccountId(scope, mock)).toBe(selected); expect(mock.lookup).toHaveBeenCalledWith(selected); expect(mock.assertScope).toHaveBeenCalledTimes(2); expect(scope.studentId).toBe(selected);
});
it('denies an actual distinct class/user UUID acknowledgement instead of silently attributing another account', async () => {
  const mock = deps(); mock.lookup.mockResolvedValue({ data: differentAuth, error: null });
  await expect(resolveStudentAccountId(scope, mock)).rejects.toThrow('canonical account');
});
it('surfaces missing identity and backend denial instead of representing no work', async () => {
  const mock = deps(); mock.lookup.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: null, error: { code: '42501' } });
  await expect(resolveStudentAccountId(scope, mock)).rejects.toThrow('no confirmed account');
  await expect(resolveStudentAccountId(scope, mock)).rejects.toThrow('missing or conflicting mapping');
});
it('rejects a late actor switch after the identity read', async () => {
  const mock = deps(); mock.assertScope.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('account changed'));
  await expect(resolveStudentAccountId(scope, mock)).rejects.toThrow('account changed');
});
