import { describe, expect, it } from 'vitest';
import { questionTarget, type RcHighlightTarget } from './rcTypes';

describe('questionTarget', () => {
  it('names the question and the part', () => {
    expect(questionTarget(1188, 'stem')).toBe('q1188:stem');
    expect(questionTarget(1188, 'A')).toBe('q1188:A');
    expect(questionTarget(7, 'E')).toBe('q7:E');
  });

  it('keeps the same part on two questions apart', () => {
    expect(questionTarget(1, 'A')).not.toBe(questionTarget(2, 'A'));
    expect(questionTarget(1, 'stem')).not.toBe(questionTarget(1, 'A'));
  });

  it('never collides with the passage target', () => {
    const passage: RcHighlightTarget = 'passage';
    expect(questionTarget(0, 'stem')).not.toBe(passage);
  });
});
