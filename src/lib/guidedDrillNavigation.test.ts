import { describe, expect, it } from 'vitest';
import {
  appendGuidedResumeParams,
  buildGuidedLaunchReturnPath,
  parseGuidedResumeIndex,
  parseGuidedResumeQids,
  safeGuidedReturnPath,
  TEACHER_GUIDED_DRILLS_RETURN_TO,
} from './guidedDrillNavigation';

describe('guidedDrillNavigation', () => {
  it('builds an assignment launch path that exits back to Classroom', () => {
    expect(
      buildGuidedLaunchReturnPath({
        assignmentId: 'guided-abc',
        originReturnTo: '/classroom',
      }),
    ).toBe('/guided/guided-abc?returnTo=%2Fclassroom');
  });

  it('builds a direct teacher preview launch path that exits back to the guided-drill Library', () => {
    expect(
      buildGuidedLaunchReturnPath({
        slug: 'first-sentence-conclusions',
        originReturnTo: TEACHER_GUIDED_DRILLS_RETURN_TO,
      }),
    ).toBe('/guided-drills/first-sentence-conclusions?returnTo=%2Fteacher%2Flibrary%2Fguided-drills');
  });

  it('appends resume qids and the current question index to guided launch return paths', () => {
    expect(
      appendGuidedResumeParams(
        '/guided/guided-abc?returnTo=%2Fclassroom',
        ['PT118-S4-Q1', 'PT118-S4-Q2'],
        1,
      ),
    ).toBe('/guided/guided-abc?returnTo=%2Fclassroom&resumeQids=PT118-S4-Q1%2CPT118-S4-Q2&resumeIndex=1');
  });

  it('does not append resume params to non-guided return paths', () => {
    expect(appendGuidedResumeParams('/classroom', ['PT118-S4-Q1'], 0)).toBe('/classroom');
  });

  it('parses and clamps resume params', () => {
    const qids = parseGuidedResumeQids(' PT118-S4-Q1,PT118-S4-Q2 ,, ');
    expect(qids).toEqual(['PT118-S4-Q1', 'PT118-S4-Q2']);
    expect(parseGuidedResumeIndex('9', qids)).toBe(1);
    expect(parseGuidedResumeIndex('-3', qids)).toBe(0);
    expect(parseGuidedResumeIndex('nope', qids)).toBeNull();
  });

  it('rejects unsafe return paths', () => {
    expect(safeGuidedReturnPath('//evil.test', '/classroom')).toBe('/classroom');
    expect(safeGuidedReturnPath('https://evil.test', '/classroom')).toBe('/classroom');
    expect(safeGuidedReturnPath('/teacher', '/classroom')).toBe('/teacher');
  });
});
