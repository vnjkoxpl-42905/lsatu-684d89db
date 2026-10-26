import { describe, it, expect } from 'vitest';

import { drillRunSpecFromLaunch } from './drillRunSpec';
import type { FullSectionConfig, TypeDrillConfig } from '@/types/drill';

describe('an assignment launch whose qids are all one real section', () => {
  it('runs as a timed full section, not an untimed type-drill', () => {
    const qids = Array.from({ length: 25 }, (_, i) => `PT156-S2-Q${i + 1}`);
    const spec = drillRunSpecFromLaunch(
      { kind: 'assignment', assignmentId: 'assign_1' },
      qids,
    );

    expect(spec.mode).toBe('full-section');
    expect(spec.sealed).toBe(true);
    expect(spec.assignmentId).toBe('assign_1');
    const config = spec.config as FullSectionConfig;
    expect(config.pt).toBe(156);
    expect(config.section).toBe(2);
    expect(config.timer.mode).toBe('35');
  });

  it('carries a guided set id through to the section spec', () => {
    const qids = ['PT156-S2-Q1', 'PT156-S2-Q2'];
    const spec = drillRunSpecFromLaunch(
      { kind: 'assignment', assignmentId: 'assign_1', guidedSetId: 'set_1' },
      qids,
    );
    expect(spec.mode).toBe('full-section');
    expect(spec.guidedSetId).toBe('set_1');
  });
});

describe('an assignment launch whose qids span more than one section', () => {
  it('keeps the untimed type-drill behaviour', () => {
    const qids = ['PT156-S2-Q1', 'PT156-S4-Q1'];
    const spec = drillRunSpecFromLaunch(
      { kind: 'assignment', assignmentId: 'assign_1' },
      qids,
    );

    expect(spec.mode).toBe('type-drill');
    expect(spec.assignmentId).toBe('assign_1');
    const config = spec.config as TypeDrillConfig;
    expect(config.selectedQids).toEqual(qids);
  });
});

describe('an assignment launch whose qids do not name a real section', () => {
  it('keeps the untimed type-drill behaviour rather than guessing', () => {
    const qids = ['generated-qid-1', 'generated-qid-2'];
    const spec = drillRunSpecFromLaunch(
      { kind: 'assignment', assignmentId: 'assign_1' },
      qids,
    );

    expect(spec.mode).toBe('type-drill');
  });
});

describe('an assigned section for an accommodated student', () => {
  it('runs on the clock the launch carries, not a flat 35', () => {
    const qids = Array.from({ length: 25 }, (_, i) => `PT156-S2-Q${i + 1}`);
    const spec = drillRunSpecFromLaunch(
      { kind: 'assignment', assignmentId: 'assign_1', timerMode: '52.5' },
      qids,
    );

    expect(spec.mode).toBe('full-section');
    const config = spec.config as FullSectionConfig;
    expect(config.timer.mode).toBe('52.5');
  });
});

describe('an assigned section hides the answers until it is scored', () => {
  const qids = Array.from({ length: 25 }, (_, i) => `PT156-S2-Q${i + 1}`);

  it('is sealed by default', () => {
    const spec = drillRunSpecFromLaunch({ kind: 'assignment', assignmentId: 'a1' }, qids);
    expect(spec.sealed).toBe(true);
  });

  it('is unsealed only when the launch says so', () => {
    const spec = drillRunSpecFromLaunch(
      { kind: 'assignment', assignmentId: 'a1', revealAllowed: true },
      qids,
    );
    expect(spec.sealed).toBe(false);
  });

  it('leaves a mixed set unsealed, as before', () => {
    const spec = drillRunSpecFromLaunch(
      { kind: 'assignment', assignmentId: 'a1' },
      ['PT156-S2-Q1', 'PT101-S2-Q1'],
    );
    expect(spec.sealed).toBe(false);
  });
});
