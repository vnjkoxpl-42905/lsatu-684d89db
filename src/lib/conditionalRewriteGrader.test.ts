import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRateLimiter, parseGrade, validRequest } from '../../supabase/functions/grade-conditional-rewrite/core';
import { gradeConditionalRewrite } from './conditionalRewriteGrader';
import liveResults from '../../docs/agent/verification/2026-10-14-conditional-rewrite-live-tests.json';
import finalResults from '../../docs/agent/verification/2026-10-15-conditional-rewrite-final-three-live-tests.json';

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
    for (const value of [undefined, '', '{}', '{"correct":"true","feedback":"ok"}']) {
      expect(() => parseGrade(value, request)).toThrow();
    }
  });
  it('rejects invalid semantic verdicts', () => {
    for (const value of [
      { correct: 'true', issue: 'correct', evidence: 'Mia' },
      { issue: 'correct', evidence: 'Mia' },
    ]) expect(() => parseGrade(JSON.stringify(value), request)).toThrow();
  });
  it('replaces captured bad hints with grounded comparisons without answer leaks or contradictory praise', () => {
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
  it('maps case and whitespace normalization back to the actual learner text without accepting invented words', () => {
    const studentResponse = 'Whenever it RAINS, Mia   rides the bus.';
    const result = parseGrade(JSON.stringify({ correct: true, issue: 'correct', evidence: 'it rains', condition: 'it rains', result: 'Mia rides the bus' }), { studentResponse, task: 'rewrite' });
    expect(result.feedback).toContain('“it RAINS” guarantees “Mia rides the bus”');
    const normalized = parseGrade(JSON.stringify({ correct: true, issue: 'correct', evidence: 'it snows', condition: 'it snows', result: 'Mia rides the bus' }), { studentResponse, task: 'rewrite' });
    expect(normalized.feedback).not.toContain('snows');
    expect(normalized.feedback).toContain('it RAINS');
  });
  it('accepts the captured correct verdict when optional condition metadata paraphrases the learner', () => {
    const studentResponse = 'Whenever it rains, Mia rides the bus.';
    const captured = { correct: true, issue: 'correct', evidence: studentResponse, condition: 'If it is raining', result: 'Mia rides the bus' };
    expect(parseGrade(JSON.stringify(captured), { studentResponse, task: 'rewrite' })).toEqual({
      correct: true,
      feedback: '“Whenever it rains, Mia rides the bus.” expresses the same guarantee as the original rule.',
    });
    expect(parseGrade(JSON.stringify({ correct: true, issue: 'correct', evidence: studentResponse }), { studentResponse, task: 'rewrite' }).correct).toBe(true);
  });
  it('keeps valid AI judgments when all optional quotation metadata is absent or invented', () => {
    for (const evidence of [undefined, '', 'If it is raining']) {
      const studentResponse = 'Whenever it rains, Mia rides the bus.';
      const result = parseGrade(JSON.stringify({ correct: true, issue: 'correct', evidence }), { studentResponse, task: 'rewrite' });
      expect(result.correct).toBe(true);
      expect(result.feedback).toContain(studentResponse);
      expect(result.feedback).not.toContain('If it is raining');
    }
    const result = parseGrade(JSON.stringify({ correct: false, issue: 'weakened_modality', evidence: 'invented sentence' }), { studentResponse: 'The market might move indoors.', task: 'rewrite' });
    expect(result.feedback).toContain('The market might move indoors.');
    expect(result.feedback).not.toContain('invented');
    expect(result.feedback).toContain('What guarantee changed');
  });
  it('accepts the second captured verdict with omitted issue and safely handles unknown incorrect categories', () => {
    const studentResponse = 'Whenever it rains, Mia rides the bus.';
    const captured = { correct: true, evidence: studentResponse, condition: 'Whenever it rains', result: 'Mia rides the bus.' };
    expect(parseGrade(JSON.stringify(captured), { studentResponse, task: 'rewrite' }).correct).toBe(true);
    for (const issue of [undefined, '__proto__', 'unknown', 'correct']) {
      const grade = parseGrade(JSON.stringify({ correct: false, issue }), { studentResponse, task: 'rewrite' });
      expect(grade.correct).toBe(false);
      expect(grade.feedback).toContain('What guarantee changed');
      expect(grade.feedback).toContain(studentResponse);
    }
  });
  it('ignores both observed wrong diagnostic categories and compares the exact learner text with the original rule', () => {
    for (const name of ['converse-reversal', 'missing-time-qualifier']) {
      const captured = finalResults.results.find(row => row.case === name)!;
      const grade = parseGrade(JSON.stringify({ correct: false, issue: 'reversal', evidence: captured.request.studentResponse }), captured.request);
      expect(grade.correct).toBe(false);
      expect(grade.feedback).toContain(captured.request.studentResponse);
      expect(grade.feedback).toContain(captured.request.original);
      expect(grade.feedback).not.toContain(captured.request.expected);
      expect(grade.feedback).not.toMatch(/requirement|revers|enough to prove|causal|matches the meaning/);
      expect(grade.feedback).toContain('What guarantee changed');
    }
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
