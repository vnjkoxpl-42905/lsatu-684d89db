import { describe, expect, it } from 'vitest';
import { LrRunProvenanceSchema, lrRunProvenanceForSpec, lrRunProvenanceLabel } from './lrRunProvenance';
import type { DrillRunSpec } from './drillRunSpec';

const fixed: DrillRunSpec = { launchKind: 'questions', mode: 'type-drill', config: { qtypes: [], difficulties: [], pts: [], count: 1, selectedQids: ['PT150-S1-Q1'] } };
const source = 'drill::type-drill::set';

describe('saved LR conditions', () => {
  it('records manual official feedback and the fixed list pick model', () => {
    expect(lrRunProvenanceForSpec(fixed, source, 'official')).toMatchObject({ study_mode: 'training', feedback: 'manual_answer_and_explanation', pick_model: 'list', launch_kind: 'questions', source_key: source });
  });
  it('keeps classic list reveal manual while classic commit and adaptive use submit feedback', () => {
    expect(lrRunProvenanceForSpec(fixed, source, 'classic')).toMatchObject({ feedback: 'manual_answer_and_explanation', pick_model: 'list' });
    const filter: DrillRunSpec = { ...fixed, launchKind: 'filter', config: { qtypes: [], difficulties: [], pts: [], count: 1 } };
    expect(lrRunProvenanceForSpec(filter, source, 'classic')).toMatchObject({ feedback: 'after_submit', pick_model: 'commit' });
    expect(lrRunProvenanceForSpec({ mode: 'adaptive', launchKind: 'smart-drill' }, 'drill::adaptive', 'official')).toMatchObject({ feedback: 'after_submit', pick_model: 'commit' });
    expect(lrRunProvenanceForSpec(filter, source, 'official')).toMatchObject({ feedback: 'manual_answer_and_explanation', pick_model: 'commit' });
  });
  it('excludes assigned, guided, practice, sealed and exam launches rather than guessing', () => {
    for (const extra of [{ sealed: true }, { assignmentId: 'a' }, { guidedSetId: 'a' }, { isGuidedDrill: true }, { practiceSource: 'a' }, { resumeIdentity: { kind: 'bootcamp-day' as const, day: 1, part: 'a' } }]) {
      expect(lrRunProvenanceForSpec({ ...fixed, ...extra } as DrillRunSpec, source, 'official')).toBeUndefined();
    }
    expect(lrRunProvenanceForSpec({ ...fixed, mode: 'full-section' }, source, 'official')).toBeUndefined();
    expect(lrRunProvenanceForSpec(fixed, 'guided::a', 'official')).toBeUndefined();
  });
  it('rejects inconsistent, unsupported and extra conditions while disclosing legacy absence', () => {
    const saved = lrRunProvenanceForSpec(fixed, source, 'official')!;
    for (const extra of [{ version: 2 }, { feedback: 'after_submit' }, { study_mode: 'test' }, { unexpected: true }, { source_key: 'drill::adaptive' }]) {
      expect(LrRunProvenanceSchema.safeParse({ ...saved, ...extra }).success).toBe(false);
    }
    expect(lrRunProvenanceLabel(undefined)).toContain('not saved');
    expect(lrRunProvenanceLabel(saved)).toContain('when you choose');
  });
});
