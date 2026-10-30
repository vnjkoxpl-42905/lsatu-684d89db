import { describe, expect, it } from 'vitest';
import { mergeWorkSections, sectionFromCitation, sectionFromMetadata, sectionFromQuestionIds } from './assignedWorkSection';

describe('assignment section evidence', () => {
  it('classifies canonical question identities and refuses mixed or partly unknown lists', () => {
    expect(sectionFromQuestionIds(['PT101-S1-Q1', 'PT101-S4-Q2'])).toBe('rc');
    expect(sectionFromQuestionIds(['PT101-S2-Q1'])).toBe('lr');
    expect(sectionFromQuestionIds(['PT101-S1-Q1', 'PT101-S2-Q1'])).toBe('mixed');
    expect(sectionFromQuestionIds(['PT101-S1-Q1', 'unrecognized'])).toBe('unknown');
    expect(sectionFromQuestionIds([])).toBe('unknown');
  });
  it('identifies the actual legacy LR recall section independently of its display name', () => {
    expect(sectionFromCitation('PT21.S3')).toBe('lr');
    expect(sectionFromCitation('PT101.S1')).toBe('rc');
    expect(sectionFromCitation('PT999.S1')).toBe('unknown');
    expect(sectionFromMetadata({ title: 'RC Read Recall', slug: 'rc-example', item_format: 'spoken-recall', mode: 'section' })).toBe('unknown');
  });
  it('uses explicit section metadata and exact catalog identities, never names', () => {
    expect(sectionFromMetadata({ section_kind: 'rc' })).toBe('rc');
    expect(sectionFromMetadata({ bootcamp_id: 'rc-engaging-with-the-passage' })).toBe('rc');
    expect(sectionFromMetadata({ bootcamp_id: 'conditional-indicators-refresher', title: 'Reading practice' })).toBe('lr');
    expect(sectionFromMetadata({ bootcamp_id: 'something-rc-like' })).toBe('unknown');
    expect(sectionFromMetadata({ section_kind: 'rc', question_qids: ['PT101-S2-Q1'] })).toBe('mixed');
  });
  it('preserves source classification through an unclassified mirror and rejects conflicting evidence', () => {
    expect(mergeWorkSections('rc', 'unknown')).toBe('rc');
    expect(mergeWorkSections('lr', 'rc')).toBe('mixed');
    expect(mergeWorkSections(undefined, 'unknown')).toBe('unknown');
  });
});
