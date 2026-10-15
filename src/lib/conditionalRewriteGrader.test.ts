import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRateLimiter, parseGrade, validRequest } from '../../supabase/functions/grade-conditional-rewrite/core';
import { gradeConditionalRewrite } from './conditionalRewriteGrader';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

describe('conditional rewrite grading contract', () => {
  const request = { original: 'Mia takes the bus if it rains.', expected: 'Rain guarantees Mia takes the bus.', studentResponse: 'When it rains, Mia rides the bus.', task: 'rewrite', stagePrompt: 'Rewrite this conditional in your own words.' };
  it('allows natural English without requiring if/then syntax', () => {
    expect(validRequest(request)).toBe(true);
  });
  it('bounds input and rejects missing answers or unsupported tasks', () => {
    expect(validRequest({ ...request, studentResponse: ' ' })).toBe(false);
    expect(validRequest({ ...request, studentResponse: 'x'.repeat(2001) })).toBe(false);
    expect(validRequest({ ...request, task: 'free-chat' })).toBe(false);
  });
  it('limits repeated requests by user and reopens the window after a minute', () => {
    const admit = createRateLimiter();
    for (let n = 0; n < 10; n++) expect(admit('student-one', 100)).toBe(true);
    expect(admit('student-one', 100)).toBe(false);
    expect(admit('student-two', 100)).toBe(true);
    expect(admit('student-one', 60100)).toBe(true);
  });
  it('never turns malformed or absent model responses into a grade', () => {
    for (const value of [undefined, '', '{}', '{"correct":"true","feedback":"ok"}', '{"correct":false,"feedback":" "}']) {
      expect(() => parseGrade(value)).toThrow();
    }
    expect(parseGrade('{"correct":false,"feedback":"Your sentence makes taking the bus prove rain. What does rain guarantee?"}')).toEqual({ correct: false, feedback: 'Your sentence makes taking the bus prove rain. What does rain guarantee?' });
  });
  beforeEach(() => invoke.mockReset());
  it('keeps unavailable or malformed service responses ungraded', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: new Error('unavailable') });
    await expect(gradeConditionalRewrite({ ...request, task: 'rewrite' })).rejects.toThrow('has not been checked');
    invoke.mockResolvedValueOnce({ data: { feedback: 'Looks fine.' }, error: null });
    await expect(gradeConditionalRewrite({ ...request, task: 'rewrite' })).rejects.toThrow('has not been checked');
  });
  it('returns a genuine incorrect grade and its specific feedback without converting it into a service error', async () => {
    const grade = { correct: false, feedback: 'Your sentence makes taking the bus prove rain. What does rain guarantee?' };
    invoke.mockResolvedValueOnce({ data: grade, error: null });
    await expect(gradeConditionalRewrite({ ...request, task: 'rewrite' })).resolves.toEqual(grade);
  });
});
