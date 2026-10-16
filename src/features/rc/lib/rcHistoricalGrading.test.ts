import { describe, expect, it } from 'vitest';
import { isHistoricalRcGrade, rcCheckpointGrade } from './rcHistoricalGrading';

describe('documented historical RC grading', () => {
  it('recognizes only the documented previous grade with the verified current key', () => {
    expect(isHistoricalRcGrade(10733, 'D', 'B', true)).toBe(true);
    expect(isHistoricalRcGrade(10733, 'D', 'D', false)).toBe(true);
    expect(isHistoricalRcGrade(10734, 'D', 'B', true)).toBe(false);
    expect(isHistoricalRcGrade(10733, 'A', 'B', true)).toBe(false);
    expect(isHistoricalRcGrade(10733, 'D', 'A', true)).toBe(false);
    expect(isHistoricalRcGrade(10733, 'D', null, true)).toBe(false);
    expect(isHistoricalRcGrade(10733, 'D', 'B', null)).toBe(false);
  });
  it('preserves only the identical acknowledged response, and grades new or changed responses with D', () => {
    const old = { id: 'old', questionId: 10733, selected: 'B' as const, isCorrect: true };
    expect(rcCheckpointGrade(10733, 'D', 'B', 'old', old)).toBe(true);
    expect(rcCheckpointGrade(10733, 'D', 'B', 'new', old)).toBe(false);
    expect(rcCheckpointGrade(10733, 'D', 'D', 'old', old)).toBe(true);
    expect(rcCheckpointGrade(10734, 'D', 'B', 'old', old)).toBe(false);
    expect(rcCheckpointGrade(10733, 'D', 'B', 'new')).toBe(false);
    expect(rcCheckpointGrade(10733, 'D', 'B', undefined, { ...old, id: undefined })).toBe(false);
    expect(rcCheckpointGrade(10733, 'D', null, 'old', old)).toBeNull();
  });
});
