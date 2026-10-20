import { describe, it, expect, vi } from 'vitest';
import { createInteractiveLifecycle, guidedDrillRunnerMode } from './interactiveGuidedDrill';
import { findGuidedDrillHtmlBySlug } from '@/data/guidedDrillHtmlManifest';

const deps = (assignmentId: string | null, initialStatus: string | null = 'assigned') => ({
  assignmentId, initialStatus,
  markCardRead: vi.fn(async () => {}),
  markStarted: vi.fn(async () => {}),
  markCompleted: vi.fn(async () => {}),
});
const START = { type: 'lsatu:interactive-guided-start' };
const DONE = { type: 'lsatu:interactive-guided-complete', score: 9, total: 12, accuracy: 75 };

describe('interactive guided drill runner mode', () => {
  it('keeps old launch-page drills on the native runner', () => {
    expect(guidedDrillRunnerMode(findGuidedDrillHtmlBySlug('first-sentence-conclusions'))).toBe('native');
    expect(guidedDrillRunnerMode(null)).toBe('native');
  });
  it('keeps Missing Links mastery in its HTML runner', () => {
    const e = findGuidedDrillHtmlBySlug('missing-links-sufficient-assumption-mastery');
    expect(e?.sourceFile).toBe('109_missing_links_sufficient_assumption_mastery.html');
    expect(guidedDrillRunnerMode(e)).toBe('interactive');
  });
});

describe('interactive guided drill lifecycle', () => {
  it('admin preview (no assignment) never mutates', async () => {
    const d = deps(null);
    const h = createInteractiveLifecycle(d);
    await h(START); await h(DONE);
    expect(d.markCardRead).not.toHaveBeenCalled();
    expect(d.markStarted).not.toHaveBeenCalled();
    expect(d.markCompleted).not.toHaveBeenCalled();
  });
  it('assigned start marks read+started once, completion marks completed once', async () => {
    const d = deps('a1');
    const h = createInteractiveLifecycle(d);
    await h(START); await h(START);
    expect(d.markCardRead).toHaveBeenCalledTimes(1);
    expect(d.markStarted).toHaveBeenCalledWith('a1');
    await h(DONE); await h(DONE);
    expect(d.markCompleted).toHaveBeenCalledTimes(1);
    expect(d.markCompleted).toHaveBeenCalledWith('a1');
  });
  it('does not re-mark an already completed assignment, and ignores junk', async () => {
    const d = deps('a1', 'completed');
    const h = createInteractiveLifecycle(d);
    await h(START); await h(DONE); await h({ type: 'other' }); await h(null);
    expect(d.markStarted).not.toHaveBeenCalled();
    expect(d.markCompleted).not.toHaveBeenCalled();
  });
});
