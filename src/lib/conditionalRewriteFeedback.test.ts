import { describe, expect, it } from 'vitest';
import { contextualRewriteFeedback, sufficientRewriteHints } from './conditionalRewriteFeedback';

describe('authored rewrite feedback', () => {
  it('covers all thirteen sufficient-practice rules with distinct contextual prompts', () => {
    expect(Object.keys(sufficientRewriteHints)).toHaveLength(13);
    expect(new Set(Object.values(sufficientRewriteHints)).size).toBe(13);
  });
  it('uses the actual learner wording and authored rain/bus reasoning, without asserting what mistake they made', () => {
    const result = contextualRewriteFeedback({ original: 'Mia takes the bus if it is raining.', studentResponse: 'If Mia takes the bus, it rains.', task: 'rewrite' }, { correct: false, feedback: 'Unreliable reversal diagnosis.' });
    expect(result.correct).toBe(false);
    expect(result.feedback).toContain('If Mia takes the bus, it rains.');
    expect(result.feedback).toContain('what the weather is');
    expect(result.feedback).not.toContain('diagnosis');
    expect(result.feedback).not.toContain('If it is raining, then Mia takes the bus.');
  });
  it('calls attention to the particular complete-condition restriction', () => {
    const result = contextualRewriteFeedback({ original: 'Any car parked in the fire lane gets towed.', studentResponse: 'Every parked car gets towed.', task: 'rewrite' }, { correct: false, feedback: 'Generic' });
    expect(result.feedback).toContain('fire lane');
    expect(result.feedback).not.toContain('Your sentence reverses');
  });
  it('keeps genuine correct grades, unknown rules, and contrapositive feedback unchanged', () => {
    const request = { original: 'Mia takes the bus if it is raining.', studentResponse: 'Rain means Mia takes the bus.', task: 'rewrite' as const };
    const correct = { correct: true, feedback: 'Verified correct response.' };
    expect(contextualRewriteFeedback(request, correct)).toBe(correct);
    const incorrect = { correct: false, feedback: 'Comparison' };
    expect(contextualRewriteFeedback({ ...request, task: 'contrapositive' }, incorrect)).toBe(incorrect);
    expect(contextualRewriteFeedback({ ...request, original: 'Unknown rule' }, incorrect)).toBe(incorrect);
  });
});
