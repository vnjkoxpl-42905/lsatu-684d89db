import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import * as sectionRelease from './sectionRelease';

describe('sectionRelease canonical status & fail-closed rules (F7)', () => {
  it('treats only "complete" (not "completed" or "in-progress") as a finished practice-test run', () => {
    const isComplete = (sectionRelease as Record<string, unknown>).isPracticeTestRunComplete as
      | ((s: string | null | undefined) => boolean)
      | undefined;
    expect(typeof isComplete).toBe('function');
    expect(isComplete!('complete')).toBe(true);
    expect(isComplete!('completed')).toBe(false);
    expect(isComplete!('in-progress')).toBe(false);
    expect(isComplete!('abandoned')).toBe(false);
    expect(isComplete!(null)).toBe(false);
    expect(isComplete!(undefined)).toBe(false);
  });

  it('seals practice-test legs fail-closed whenever runComplete is unknown (undefined) or false', () => {
    expect(
      sectionRelease.sectionReleaseState({ practiceTestRunId: 'run-1', releaseRequiresBr: false }, undefined, undefined),
    ).toBe('sealed');
    expect(
      sectionRelease.sectionReleaseState({ practiceTestRunId: 'run-1', releaseRequiresBr: false }, undefined, false),
    ).toBe('sealed');
    expect(
      sectionRelease.sectionReleaseState({ practiceTestRunId: 'run-1', releaseRequiresBr: false }, undefined, true),
    ).toBe('released');
  });
});
