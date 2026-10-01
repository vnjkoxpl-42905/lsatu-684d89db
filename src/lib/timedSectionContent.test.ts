import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { verifyStandaloneLrContent, verifyStandaloneRcContent } from './timedSectionContent';
import type { TimedSectionSitting } from './timedSectionClient';
import type { TimedObject } from './timedWorkClient';
import type { TimedLrRawQuestion } from './timedLrAdapter';
import type { RcPassage } from '@/features/rc/lib/rcTypes';

const manifest = JSON.parse(readFileSync('docs/implementation-plans/artifacts/timed-content-manifest-v1.generated.json', 'utf8'));
const nativeCrypto = crypto;
beforeAll(() => vi.stubGlobal('crypto', { randomUUID: nativeCrypto.randomUUID.bind(nativeCrypto), subtle: webcrypto.subtle }));
afterAll(() => vi.unstubAllGlobals());
function sitting(pt: number, source: TimedObject): TimedSectionSitting {
  return { kind: source.kind, pt, section: source.section, frozen_source: source, frozen_qids: source.qids } as TimedSectionSitting;
}
function lr(pt: number, section: number): TimedLrRawQuestion[] { return JSON.parse(readFileSync(`public/data/PT${pt}-S${section}-LR.json`, 'utf8')); }
function rc(pt: number): RcPassage[] { return JSON.parse(readFileSync(`public/data/rc/RC-PT${pt}.json`, 'utf8')).passages; }
describe('standalone canonical frozen content', () => {
  it('verifies every supported section without substituting a PT leg or dropping removed-question gaps', async () => {
    let lrCount = 0; let rcCount = 0;
    for (const blueprint of manifest.blueprints) for (const source of blueprint.legs) {
      const state = sitting(blueprint.pt, source);
      if (source.kind === 'lr') { expect((await verifyStandaloneLrContent(state, lr(blueprint.pt, source.section))).map(question => question.qid)).toEqual(source.qids); lrCount++; }
      else { expect((await verifyStandaloneRcContent(state, rc(blueprint.pt))).map(passage => passage.passageId)).toEqual(source.passageIds); rcCount++; }
    }
    expect({ lrCount, rcCount }).toEqual({ lrCount: 118, rcCount: 59 });
  }, 30000);
  it('denies LR source text drift even when qid and answer queue still match', async () => {
    const blueprint = manifest.blueprints[0]; const source = blueprint.legs.find((value: TimedObject) => value.kind === 'lr');
    const rows = lr(blueprint.pt, source.section); rows.find(row => row.status !== 'removed')!.questionStem += ' changed';
    await expect(verifyStandaloneLrContent(sitting(blueprint.pt, source), rows)).rejects.toMatchObject({ kind: 'contract' });
  });
  it('denies wrong LR section and duplicate removed rows', async () => {
    const blueprint = manifest.blueprints[0]; const source = blueprint.legs.find((value: TimedObject) => value.kind === 'lr');
    const rows = lr(blueprint.pt, source.section);
    await expect(verifyStandaloneLrContent(sitting(blueprint.pt + 1, source), rows)).rejects.toMatchObject({ kind: 'contract' });
    await expect(verifyStandaloneLrContent(sitting(blueprint.pt, source), [...rows, { ...rows[0], status: 'removed' }])).rejects.toMatchObject({ kind: 'contract' });
  });
  it('denies RC question ownership drift and passage content drift', async () => {
    const blueprint = manifest.blueprints[0]; const source = blueprint.legs.find((value: TimedObject) => value.kind === 'rc');
    const bank = rc(blueprint.pt); const passage = bank.find(value => value.passageId === source.passageIds[0])!;
    passage.text += ' changed';
    await expect(verifyStandaloneRcContent(sitting(blueprint.pt, source), bank)).rejects.toMatchObject({ kind: 'contract' });
    const changed = structuredClone(source); changed.questions[0].passageId = changed.passageIds[1];
    await expect(verifyStandaloneRcContent(sitting(blueprint.pt, changed), rc(blueprint.pt))).rejects.toMatchObject({ kind: 'contract' });
  });
});
