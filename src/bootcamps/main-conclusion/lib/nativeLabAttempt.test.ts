import { beforeEach, expect, it, vi } from 'vitest';
const { from, getUser } = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from, auth: { getUser } } }));
import { saveNativeLabSubmission, type NativeLabSubmission } from './nativeLabAttempt';
const input: NativeLabSubmission = { id: 'response-id', user_id: 'student', drill_id: 'sitting', question_id: 'question', mode: 'native_lab_v1', selected_answer: '{"answer":"B"}', correct: false };
beforeEach(() => { from.mockReset(); getUser.mockReset().mockResolvedValue({ data: { user: { id: 'student' } }, error: null }); });
it('accepts only exact acknowledged immutable response', async () => {
  const builder = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: input, error: null }) };
  from.mockReturnValue(builder); await saveNativeLabSubmission(input);
  expect(builder.insert).toHaveBeenCalledWith(input); expect(from).toHaveBeenCalledTimes(1);
});
it('reconciles lost response using same exact owner/UUID without changing a row', async () => {
  const builder = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: new Error('lost response') }), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: input, error: null }) };
  from.mockReturnValue(builder); await saveNativeLabSubmission(input);
  expect(builder.eq.mock.calls).toEqual([['user_id', 'student'], ['id', 'response-id']]);
  expect(builder.insert).toHaveBeenCalledTimes(1);
});
it('does not acknowledge a conflicting existing response', async () => {
  const builder = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: new Error('duplicate') }), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { ...input, selected_answer: 'different' }, error: null }) };
  from.mockReturnValue(builder); await expect(saveNativeLabSubmission(input)).rejects.toThrow('duplicate');
});
it('denies account changes before sending the pending response', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'other' } }, error: null });
  await expect(saveNativeLabSubmission(input)).rejects.toThrow('account changed'); expect(from).not.toHaveBeenCalled();
});
