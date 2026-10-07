import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { verifyStandaloneLrContent, verifyStandaloneRcContent } from './timedSectionContent';
import type { TimedSectionSitting } from './timedSectionClient';
import type { TimedObject } from './timedWorkClient';
import type { TimedLrRawQuestion } from './timedLrAdapter';
import type { RcPassage } from '@/features/rc/lib/rcTypes';

const manifest = JSON.parse(readFileSync('docs/implementation-plans/artifacts/timed-content-manifest-v1.generated.json', 'utf8'));
const standalone = JSON.parse(readFileSync('docs/implementation-plans/artifacts/timed-section-all-sections-v2.generated.json', 'utf8')) as { sections: {pt:number;definition:TimedObject & {kind:'lr'|'rc';section:number;questions:TimedObject[];qids:string[];passageIds?:number[]}}[] };
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
    for (const {pt, definition:source} of standalone.sections) {
      const state = sitting(pt, source);
      if (source.kind === 'lr') { expect((await verifyStandaloneLrContent(state, lr(pt, source.section))).map(question => question.qid)).toEqual(source.qids); lrCount++; }
      else { expect((await verifyStandaloneRcContent(state, rc(pt))).map(passage => passage.passageId)).toEqual(source.passageIds); rcCount++; }
    }
    expect({ lrCount, rcCount }).toEqual({ lrCount: 156, rcCount: 80 });
  }, 30000);
  it('retains every old scored definition and verifies newly admitted original LR question gaps', async () => {
    for(const blueprint of manifest.blueprints) for(const source of blueprint.legs) expect(standalone.sections.find(row=>row.pt===blueprint.pt && row.definition.section===source.section && row.definition.kind===source.kind)?.definition).toEqual(source);
    const source=standalone.sections.find(row=>row.pt===118 && row.definition.section===3)!.definition;
    const questions=await verifyStandaloneLrContent(sitting(118,source),lr(118,3));
    expect(questions).toHaveLength(24);expect(questions.map(q=>q.qnum)).not.toContain(22);
    expect(questions.find(q=>q.qnum===23)?.qid).toBe('PT118-S3-Q23');
    const wrong=structuredClone(source);wrong.questions[21].qnum=22;
    await expect(verifyStandaloneLrContent(sitting(118,wrong),lr(118,3))).rejects.toMatchObject({kind:'contract'});
  });
  it('verifies the omitted second RC section without substituting the scored RC passage set', async () => {
    const source=standalone.sections.find(row=>row.pt===101 && row.definition.section===4)!.definition;
    const passages=await verifyStandaloneRcContent(sitting(101,source),rc(101));
    expect(passages.map(p=>p.passageId)).toEqual([1352,1353,1355,1359]);
    expect(passages.flatMap(p=>p.questions)).toHaveLength(27);
    const wrong=structuredClone(source);wrong.passageIds=manifest.blueprints[0].legs.find((leg:{kind:string;passageIds:number[]})=>leg.kind==='rc').passageIds;
    await expect(verifyStandaloneRcContent(sitting(101,wrong),rc(101))).rejects.toMatchObject({kind:'contract'});
  });
  it('denies LR source text drift even when qid and answer queue still match', async () => {
    const blueprint = manifest.blueprints[0]; const source = blueprint.legs.find((value: TimedObject) => value.kind === 'lr');
    const rows = lr(blueprint.pt, source.section); rows.find(row => row.status !== 'removed')!.questionStem += ' changed';
    await expect(verifyStandaloneLrContent(sitting(blueprint.pt, source), rows)).rejects.toMatchObject({ kind: 'contract' });
  });
  it('keeps the frozen LR classification after a bank relabel and rejects a malformed frozen label', async () => {
    const blueprint = manifest.blueprints[0]; const source = blueprint.legs.find((value: TimedObject) => value.kind === 'lr');
    const rows = lr(blueprint.pt, source.section).map(row => ({ ...row, questionType: 'Evaluate', questionDifficulty: 1 }));
    const questions = await verifyStandaloneLrContent(sitting(blueprint.pt, source), rows);
    expect(questions.map(q => [q.qtype, q.difficulty])).toEqual(source.questions.map((q: TimedObject) => [q.qtype, q.level]));
    const wrong = structuredClone(source); wrong.questions[0].level = 0;
    await expect(verifyStandaloneLrContent(sitting(blueprint.pt, wrong), rows)).rejects.toMatchObject({ kind: 'contract' });
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
