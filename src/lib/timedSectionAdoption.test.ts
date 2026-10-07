import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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
  it('uses all236 exact standalone bank sections without substituting the scored PT selection', () => {
    const manifest = JSON.parse(readFileSync('docs/implementation-plans/artifacts/timed-section-all-sections-v2.generated.json', 'utf8')) as {sections:{pt:number;definition:{kind:string;section:number}}[]};
    expect(coverage.map(({ kind, pt, section }) => ({ kind, pt, section }))).toEqual(manifest.sections.map(({pt,definition})=>({kind:definition.kind,pt,section:definition.section})));
    expect(coverage).toHaveLength(236);
    expect(manualSectionCoverage('lr', 118, 3)).toMatchObject({kind:'lr',pt:118,section:3});
    expect(manualSectionCoverage('rc', 101, 4)).toMatchObject({kind:'rc',pt:101,section:4,passageIds:[1352,1353,1355,1359]});
    expect(manualSectionCoverage('lr', 101, 4)).toBeUndefined();
  });
  it('regenerates the exact reviewed coverage deterministically without writing in check mode', () => {
    const path='src/lib/timedSectionCoverage.generated.json';const before=readFileSync(path,'utf8');
    const result=execFileSync(process.execPath,['scripts/knowledge/build-standalone-coverage.mjs','--check'],{encoding:'utf8'});
    expect(JSON.parse(result)).toMatchObject({sections:236,check:true,manifestSha256:'45ef6f554a1f1c402aa9f87d61326d17f16642a953757a8fb71d33b910e9aae1'});
    expect(readFileSync(path,'utf8')).toBe(before);
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
    expect(newManualSectionHref('lr',118,3,'untimed')).toContain('?kind=lr&pt=118&section=3&pace=untimed');
    expect(newManualSectionHref('rc',101,4,'standard')).toContain('?kind=rc&pt=101&section=4&pace=standard');
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
