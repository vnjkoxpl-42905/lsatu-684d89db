import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRateLimiter, parseGrade, validRequest } from '../../supabase/functions/grade-conditional-rewrite/core';
import { gradeConditionalRewrite } from './conditionalRewriteGrader';
import liveResults from '../../docs/agent/verification/2026-10-14-conditional-rewrite-live-tests.json';

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
      expect(() => parseGrade(value, request)).toThrow();
    }
  });
  it('rejects hallucinated evidence and contradictory issue/verdict pairs', () => {
    for (const value of [
      { correct: false, issue: 'reversal', evidence: 'made up text' },
      { correct: true, issue: 'reversal', evidence: 'Mia' },
      { correct: false, issue: 'correct', evidence: 'Mia' },
      { correct: false, issue: '__proto__', evidence: 'Mia' },
      { correct: true, issue: 'correct', evidence: 'Mia', condition: 'rainfall', result: 'Mia' },
    ]) expect(() => parseGrade(JSON.stringify(value), request)).toThrow();
  });
  it('replaces the three captured bad hints with diagnosis-specific hints, without answer leaks or contradictory praise', () => {
    const diagnostics = [
      { case: 'converse-reversal', issue: 'reversal', evidence: 'If Mia takes the bus' },
      { case: 'missing-time-qualifier', issue: 'missing_restriction', evidence: 'Every order' },
      { case: 'weakened-guarantee', issue: 'weakened_modality', evidence: 'might' },
    ];
    for (const diagnosis of diagnostics) {
      const captured = liveResults.results.find(row => row.case === diagnosis.case)!;
      const result = parseGrade(JSON.stringify({ correct: false, issue: diagnosis.issue, evidence: diagnosis.evidence, feedback: captured.feedback }), captured.request);
      expect(result.correct).toBe(false);
      expect(result.feedback).toContain(diagnosis.evidence);
      expect(result.feedback).not.toContain(captured.request.expected);
      expect(result.feedback).not.toMatch(/matches the meaning|causal|student|e\.g\.|precise rewrite/i);
      expect(result.feedback).toMatch(/\?$/);
    }
  });
  it('uses verified learner condition/result excerpts for the two captured correct judgments', () => {
    const paraphrase = liveResults.results.find(row => row.case === 'faithful-paraphrase')!;
    expect(parseGrade(JSON.stringify({ correct: true, issue: 'correct', evidence: 'Whenever it rains', condition: 'it rains', result: 'Mia rides the bus' }), paraphrase.request).feedback)
      .toBe('In your sentence, “it rains” guarantees “Mia rides the bus”. That preserves the original rule.');
    const contrapositive = liveResults.results.find(row => row.case === 'valid-contrapositive')!;
    expect(parseGrade(JSON.stringify({ correct: true, issue: 'correct', evidence: 'Mia does not ride the bus', condition: 'Mia does not ride the bus', result: 'it is not raining' }), contrapositive.request).feedback)
      .toContain('You switched the original conditions and negated both.');
  });
  it('accepts explanation evidence without forcing it into a conditional rewrite', () => {
    const studentResponse = 'A dry day when Mia takes the bus leaves the rule true but disproves the reverse.';
    expect(parseGrade(JSON.stringify({ correct: true, issue: 'correct', evidence: studentResponse }), { studentResponse, task: 'explanation' }).feedback)
      .toContain('keeps the original rule true while disproving its reverse');
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
