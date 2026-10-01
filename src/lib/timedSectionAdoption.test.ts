import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ actor: 'owner', after: 'owner', count: 0, enabled: false, error: null as unknown, operations: ['create', 'read', 'start'], source: 'manual-canonical' }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: state.count++ === 0 ? state.actor : state.after } }, error: null }) },
  rpc: async () => ({ data: { contractVersion: 1, workKind: 'standalone-section', enabled: state.enabled, sources: [state.source], operations: state.operations }, error: state.error }),
} }));
import { canonicalRcSection, manualSectionCoverage, manualSectionsEnabled, missedRcConfig, newManualSectionHref, sectionPace, timedSectionResumeHref } from './timedSectionAdoption';
import coverage from './timedSectionCoverage.generated.json';
describe('standalone section adoption boundaries', () => {
  beforeEach(() => Object.assign(state, { actor: 'owner', after: 'owner', count: 0, enabled: true, error: null, operations: ['create', 'read', 'start'], source: 'manual-canonical' }));
  it('uses the exact installed manifest scored section roster without adopting excluded fourth sections', () => {
    const manifest = JSON.parse(readFileSync('docs/implementation-plans/artifacts/timed-content-manifest-v1.generated.json', 'utf8'));
    expect(coverage.map(({ kind, pt, section }) => ({ kind, pt, section }))).toEqual(manifest.blueprints.flatMap(test => test.legs.map(leg => ({ kind: leg.kind, pt: test.pt, section: leg.section }))));
    expect(coverage).toHaveLength(177);
    expect(manualSectionCoverage('lr', 101, 4)).toBeUndefined();
  });
  it('requires the exact ordered full RC passage set', () => {
    const row = coverage.find(row => row.kind === 'rc')!;
    expect(canonicalRcSection(row.passageIds)).toMatchObject({ pt: row.pt, section: row.section });
    expect(canonicalRcSection([...row.passageIds].reverse())).toBeUndefined();
    expect(canonicalRcSection(row.passageIds.slice(1))).toBeUndefined();
    expect(canonicalRcSection([...row.passageIds, row.passageIds[0]])).toBeUndefined();
  });
  it('preserves fixed section clocks and refuses custom clock substitutions', () => {
    expect([35, 52.5, 70, null, 53].map(sectionPace)).toEqual(['standard', 'time-and-a-half', 'double-time', 'untimed', null]);
    const href = newManualSectionHref('lr', 101, 2, 'standard');
    expect(href).toMatch(/\/testing\/sections\/[0-9a-f-]+\?kind=lr&pt=101&section=2&pace=standard/);
    expect(() => newManualSectionHref('lr', 101, 4, 'standard')).toThrow();
    expect(() => timedSectionResumeHref('not-a-uuid')).toThrow();
  });
  it('requires enabled capability, exact source and necessary operations under a stable actor', async () => {
    expect(await manualSectionsEnabled('owner')).toBe(true);
    for (const change of [{ enabled: false }, { source: 'assigned' }, { operations: ['read'] }, { after: 'admin-b' }, { error: new Error('offline') }]) {
      Object.assign(state, { enabled: true, source: 'manual-canonical', operations: ['create', 'read', 'start'], after: 'owner', error: null, count: 0 }, change);
      expect(await manualSectionsEnabled('owner')).toBe(false);
    }
  });
  it('starts retry misses as a fresh custom drill without any inherited section/test clock identity', () => {
    expect(missedRcConfig({ reveal: 'end_of_set', timing: { mode: 'unlimited' }, source: 'manual', timedSectionSittingId: 'sitting', practiceTestRunId: 'test', practiceTestLegIndex: 1, clockElapsedSeconds: 100, currentQuestionIndex: 3, lastActiveAt: 'old' })).toEqual({ reveal: 'end_of_set', timing: { mode: 'unlimited' }, source: 'manual' });
  });
});
