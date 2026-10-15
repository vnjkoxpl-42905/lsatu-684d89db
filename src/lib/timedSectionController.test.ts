import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { TimedSectionController } from './timedSectionController';
import { TimedSectionClient, type TimedSectionSitting } from './timedSectionClient';
import type { TimedSectionSnapshot } from './timedSectionStore';
const manifest = JSON.parse(readFileSync('docs/implementation-plans/artifacts/timed-content-manifest-v1.generated.json', 'utf8'));
const blueprint = manifest.blueprints[0]; const nativeCrypto = crypto;
beforeAll(() => vi.stubGlobal('crypto', { randomUUID: nativeCrypto.randomUUID.bind(nativeCrypto), subtle: webcrypto.subtle }));
afterAll(() => vi.unstubAllGlobals());
const owner = '10000000-0000-4000-8000-000000000001'; const work = '20000000-0000-4000-8000-000000000001';
function setup(kind: 'lr' | 'rc', pt = blueprint.pt) {
  const selectedBlueprint = manifest.blueprints.find((value: { pt: number }) => value.pt === pt);
  const source = selectedBlueprint.legs.find((value: { kind: string }) => value.kind === kind);
  const sitting = { id: work, owner_id: owner, kind, pt, section: source.section, frozen_source: source, frozen_qids: source.qids,
    phase: 'running', budget_ms: 2100000, elapsed_ms: 1000, clock_anchor_at: '2026-09-30T10:00:00Z', lease_expires_at: '2026-09-30T10:00:30Z',
    device_id: 'device-a', revision: 2, writer_epoch: 1, current_index: 0 } as unknown as TimedSectionSitting;
  const snapshot = { contractVersion: 1, workKind: 'standalone-section', sitting, serverTime: '2026-09-30T10:00:05Z',
    observedAt: 1000, pending: null, rejection: null, receipt: null, replayed: false,
    child: kind === 'lr' ? { kind: 'lr', record: { attempts: [], question_states: [] } } : { kind: 'rc', session: { id: '30000000-0000-4000-8000-000000000001' }, attempts: [] },
  } as unknown as TimedSectionSnapshot;
  const client = { refresh: vi.fn().mockResolvedValue(snapshot), readPending: vi.fn().mockReturnValue(null), readRejection: vi.fn().mockReturnValue(null),
    prepare: vi.fn().mockResolvedValue({}), retry: vi.fn().mockResolvedValue(snapshot), requireCapability: vi.fn().mockResolvedValue(undefined) };
  const controller = new TimedSectionController(client as unknown as TimedSectionClient, 'device-a',
    async (pt, section) => JSON.parse(readFileSync(`public/data/PT${pt}-S${section}-LR.json`, 'utf8')),
    async () => JSON.parse(readFileSync(`public/data/rc/RC-PT${pt}.json`, 'utf8')).passages.map(passage => ({ ...passage,
      questions: passage.questions.map(question => question.questionId === 10733 ? { ...question, correctAnswer: 'D' } : question) })), () => 1000);
  return { snapshot, controller, client };
}
describe('parentless standalone section controller', () => {
  it.each([
    ['running', 'B', true], ['complete', 'B', true], ['running', 'D', false], ['complete', 'D', false],
  ] as const)('preserves the acknowledged historical %s %s score without regrading', async (phase, selected, isCorrect) => {
    const { controller, client, snapshot } = setup('rc', 159);
    const id = '40000000-0000-4000-8000-000000000001';
    snapshot.sitting.phase = phase;
    snapshot.child = { kind: 'rc', session: { id: '30000000-0000-4000-8000-000000000001' }, attempts: [{ id,
      question_id: 10733, passage_id: 1756, selected, is_correct: isCorrect, time_ms: 100, flagged: false, eliminations: [] }] };
    const before = structuredClone(snapshot.child);
    const state = await controller.load();
    expect(state.answers['10733'].selected).toBe(selected);
    expect(state.questions.find(question => question.qid === '10733')!.correctAnswer).toBe('D');
    expect(client.prepare).not.toHaveBeenCalled();
    expect(snapshot.child).toEqual(before);
    if (phase === 'complete') return;
    await controller.checkpoint(state, 0, state.answers);
    expect(client.prepare.mock.calls[0][1].answers.find(answer => answer.questionId === 10733).isCorrect).toBe(isCorrect);
    await controller.close(state);
    expect(client.prepare.mock.calls[1][1].analysis.totals.correct).toBe(isCorrect ? 1 : 0);
    state.answers['10733'].selected = selected === 'B' ? 'D' : 'B';
    await controller.checkpoint(state, 0, state.answers);
    expect(client.prepare.mock.calls[2][1].answers.find(answer => answer.questionId === 10733).isCorrect).toBe(selected === 'B');
  });
  it('prepares LR correctness from verified source and preserves unselected marker state', async () => {
    const { controller, client } = setup('lr'); const state = await controller.load(); const qid = state.questions[0].qid;
    state.answers[qid] = { ...state.answers[qid], selected: state.questions[0].correctAnswer, timeMs: 120.8, flagged: true };
    await controller.checkpoint(state, 1, state.answers);
    const [operation, payload, device, authority] = client.prepare.mock.calls[0];
    expect(operation).toBe('checkpoint'); expect(device).toBe('device-a'); expect(authority).not.toHaveProperty('legs');
    expect(payload.answers[0]).toMatchObject({ qid, correct: true, timeMs: 120 });
    expect(payload.questionStates).toHaveLength(state.questions.length);
  });
  it('uses exact RC attemptId keys and reuses acknowledged attempt UUID across revisits', async () => {
    const { controller, client, snapshot } = setup('rc'); const question = snapshot.sitting.frozen_source.questions[0];
    const id = '40000000-0000-4000-8000-000000000001';
    snapshot.child = { kind: 'rc', session: { id: '30000000-0000-4000-8000-000000000001' }, attempts: [{ id, question_id: question.questionId, passage_id: question.passageId, selected: null, is_correct: null, time_ms: 100, flagged: true, eliminations: [] }] };
    const state = await controller.load(); const qid = state.questions[0].qid;
    state.answers[qid].selected = state.questions[0].correctAnswer;
    await controller.checkpoint(state, 0, state.answers);
    expect(client.prepare.mock.calls[0][1].answers[0]).toMatchObject({ attemptId: id, questionId: question.questionId, passageId: question.passageId, isCorrect: true });
    expect(client.prepare.mock.calls[0][1].answers[0]).not.toHaveProperty('id');
  });
  it('retains lost-reply RC intent and retries without constructing a replacement command', async () => {
    const { controller, client, snapshot } = setup('rc'); const question = snapshot.sitting.frozen_source.questions[0];
    const id = '40000000-0000-4000-8000-000000000001';
    client.readPending.mockReturnValue({ operation: 'checkpoint', payload: { answers: [{ attemptId: id, questionId: question.questionId, passageId: question.passageId, selected: 'A', timeMs: 90, flagged: true, eliminations: ['B'] }] } });
    const state = await controller.load();
    expect(state.answers[String(question.questionId)]).toMatchObject({ attemptId: id, selected: 'A', timeMs: 90, flagged: true, eliminations: ['B'] });
    await controller.retry(); expect(client.prepare).not.toHaveBeenCalled(); expect(client.retry).toHaveBeenCalledTimes(1);
  });
  it('rejects child correctness drift before showing an account answer', async () => {
    const { controller, snapshot } = setup('lr');
    snapshot.child = { kind: 'lr', record: { attempts: [{ qid: snapshot.sitting.frozen_qids[0], selected_answer: 'Z', correct: true, time_ms: 0 }] } };
    await expect(controller.load()).rejects.toMatchObject({ kind: 'contract' });
  });
  it('rejects a mismatch not explained by the corrected question previous key', async () => {
    const { controller, snapshot } = setup('rc', 159);
    snapshot.child = { kind: 'rc', session: { id: '30000000-0000-4000-8000-000000000001' }, attempts: [{
      id: crypto.randomUUID(), question_id: 10733, passage_id: 1756, selected: 'A', is_correct: true,
      time_ms: 100, flagged: false, eliminations: [],
    }] };
    await expect(controller.load()).rejects.toMatchObject({ kind: 'contract' });
  });
  it('builds the LR report from close receipt history UUID and RC report from native child UUID', async () => {
    const lr = setup('lr'); const lrState = await lr.controller.load(); lrState.snapshot.sitting.phase = 'complete'; lrState.snapshot.sitting.result = { historyId: 'history-uuid' };
    expect(lr.controller.reportHref(lrState)).toBe('/testing/attempts/section/lr/history-uuid');
    const rc = setup('rc'); const rcState = await rc.controller.load(); rcState.snapshot.sitting.phase = 'complete';
    expect(rc.controller.reportHref(rcState)).toBe('/rc/results/30000000-0000-4000-8000-000000000001');
  });
  it('requires capability before preparing creation and never calls a legacy child writer', async () => {
    const { controller, client, snapshot } = setup('lr'); snapshot.sitting.phase = 'ready';
    const request = { kind: 'lr' as const, pt: blueprint.pt, section: snapshot.sitting.section, pace: 'standard' as const };
    await controller.create(request);
    expect(client.requireCapability).toHaveBeenCalledWith('create');
    expect(client.requireCapability.mock.invocationCallOrder[0]).toBeLessThan(client.prepare.mock.invocationCallOrder[0]);
    expect(client.prepare).toHaveBeenCalledWith('create', request, 'device-a', null);
  });
  it('accepts the atomic RC closeout unanswered rows and rejects unanswered true correctness', async () => {
    const { controller, snapshot } = setup('rc'); const source = snapshot.sitting.frozen_source;
    if (!Array.isArray(source.questions)) throw new Error('RC fixture has no frozen questions');
    snapshot.sitting.phase = 'complete';
    snapshot.child = { kind: 'rc', session: { id: '30000000-0000-4000-8000-000000000001' }, attempts: source.questions.map(question => {
      if (!question || typeof question !== 'object' || Array.isArray(question)) throw new Error('Invalid frozen RC question fixture');
      return { id: crypto.randomUUID(), question_id: question.questionId, passage_id: question.passageId, selected: null,
        is_correct: false, time_ms: 0, flagged: false, eliminations: [] };
    }) };
    expect(Object.values((await controller.load()).answers).every(answer => answer.selected === null)).toBe(true);
    snapshot.child.attempts[0].is_correct = true;
    await expect(controller.load()).rejects.toMatchObject({ kind: 'contract' });
  });
});
