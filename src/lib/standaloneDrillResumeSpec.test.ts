import { describe, expect, it } from 'vitest';
import { standaloneDrillResumeSpec } from './standaloneDrillResumeSpec';
import type { StandaloneDrillRun } from './drillRunLedger';
const run = {
  id: '11111111-1111-4111-8111-111111111111', mode: 'type-drill', label: 'Original filter',
  source_key: 'drill::type-drill::original-filter',
  session: { question_queue: ['PT101-S2-Q1', 'PT101-S2-Q2'] },
  provenance: { version: 1, study_mode: 'training', feedback: 'manual_answer_and_explanation',
    launch_kind: 'filter', source_key: 'drill::type-drill::original-filter', pick_model: 'commit', layout: 'official' },
} as StandaloneDrillRun;
describe('saved standalone drill resume', () => {
  it('uses the original source, label and commit model instead of a new question-list identity', () => {
    const spec = standaloneDrillResumeSpec(run);
    expect(spec.savedStandaloneRun).toBe(run);
    expect(spec.launchKind).toBe('filter');
    expect(spec.practicingLabel).toBe('Original filter');
    expect(spec.config).not.toHaveProperty('selectedQids');
    expect(spec.initialIndex).toBeUndefined();
  });
  it('retains the frozen list model and does not invent provenance for an old sitting', () => {
    const legacy = { ...run, provenance: undefined };
    const spec = standaloneDrillResumeSpec(legacy);
    expect(spec.config).toHaveProperty('selectedQids', run.session.question_queue);
    expect(spec.savedStandaloneRun.provenance).toBeUndefined();
  });
  it('does not reinterpret official, assigned or guided sources as standalone training', () => {
    for (const source_key of ['guided::x', 'drill::section::pt101-s2', 'drill::assignment::x', 'drill::adaptive']) {
      expect(() => standaloneDrillResumeSpec({ ...run, source_key })).toThrow();
    }
  });
});
