import { describe, expect, it } from 'vitest';
import { questionTarget, rcPresentationTraining, readRcTrainingModes, type RcHighlightTarget } from './rcTypes';

describe('questionTarget', () => {
  it('keeps legacy and malformed training flags disabled', () => {
    expect(readRcTrainingModes(undefined)).toEqual({ anticipation: false, lineByLine: false });
    expect(readRcTrainingModes({ anticipation: 'true', lineByLine: true })).toEqual({ anticipation: false, lineByLine: false });
    expect(readRcTrainingModes({ anticipation: true, lineByLine: false, resultsRevealedAt: 'unsafe' })).toEqual({ anticipation: true, lineByLine: false });
  });
  it('blocks presentation training for resumable assignment-origin sessions', () => {
    expect(rcPresentationTraining({ source: 'manual', assignmentOrigin: true, reveal: 'end_of_set', timing: { mode: 'unlimited' }, training: { anticipation: true, lineByLine: true } }, false)).toEqual({ anticipation: false, lineByLine: false });
  });
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
