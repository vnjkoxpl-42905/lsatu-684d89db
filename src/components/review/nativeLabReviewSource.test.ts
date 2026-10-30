import { expect, it, vi } from 'vitest';
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));
import { ORDERED_CANONICAL_MAIN_CONCLUSION_QUESTIONS } from '@/bootcamps/main-conclusion/data/reference-drills/canonicalStructureQuestions';
import { fetchOwnedNativeLabAttempt, loadNativeLabReviewResult, nativeLabQueueItem, parseNativeLabAttempt } from './nativeLabReviewSource';
import type { IntroLrAttempt } from './introLrReviewSource';
const run = '00000000-0000-4000-8000-000000000001';
const row: IntroLrAttempt = { id: 'a', user_id: 'student', drill_id: `native-lab:main-conclusion:${run}`, question_id: ORDERED_CANONICAL_MAIN_CONCLUSION_QUESTIONS[0].id, mode: 'native_lab_v1', selected_answer: JSON.stringify({ answer: '0', ordinal: 1, run_id: run }), correct: false, created_at: '2026-09-30T12:00:00Z', time_ms: null };
it('keeps first and later submissions distinct, preserving first answer evidence only for ordinal one', () => {
  const first = nativeLabQueueItem(parseNativeLabAttempt(row, 'student'));
  const later = nativeLabQueueItem(parseNativeLabAttempt({ ...row, id: 'b', selected_answer: JSON.stringify({ answer: '0', ordinal: 2, run_id: run }) }, 'student'));
  expect(first.firstAnswer).not.toBeNull(); expect(later.firstAnswer).toBeNull(); expect(first.key).not.toBe(later.key);
});
it('rejects unknown source, owner conflict, mismatched run and malformed choices', () => {
  expect(() => parseNativeLabAttempt(row, 'other')).toThrow();
  expect(() => parseNativeLabAttempt({ ...row, question_id: 'retired' }, 'student')).toThrow();
  expect(() => parseNativeLabAttempt({ ...row, selected_answer: JSON.stringify({ answer: '1000', ordinal: 1, run_id: run }) }, 'student')).toThrow();
  expect(() => parseNativeLabAttempt({ ...row, selected_answer: JSON.stringify({ answer: '0', ordinal: 1, run_id: 'other' }) }, 'student')).toThrow();
});
it('isolates malformed submissions while preserving a valid row and strict detail validation', async () => {
  const invalid = { ...row, id: 'broken', selected_answer: 'not json' };
  const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), like: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: [invalid, row], error: null }), maybeSingle: vi.fn().mockResolvedValue({ data: invalid, error: null }) };
  from.mockReturnValue(chain);
  const result = await loadNativeLabReviewResult('student');
  expect(result.items).toHaveLength(1);
  expect(result.items[0].href).toBe('/review/native-lab/a');
  expect(result.unavailable).toEqual(['1 native lab saved submissions unavailable']);
  expect(JSON.stringify(result)).not.toContain('not json');
  await expect(fetchOwnedNativeLabAttempt('student', 'broken')).rejects.toThrow('saved answer');
});
