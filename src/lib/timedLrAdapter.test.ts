import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash, webcrypto } from 'node:crypto';
import { TimedLrAdapter, timedLrAttemptToAnswer, type TimedLrRawQuestion } from './timedLrAdapter';
import { TimedWorkClient, TIMED_WORK_OPERATIONS, type TimedObject, type TimedWorkCommand, type TimedWorkParent, type TimedWorkTransport } from './timedWorkClient';
import { TimedPracticeTestStore } from './timedPracticeTestStore';
import { normalizeQType } from './questionLoader';

const owner = '11111111-1111-4111-8111-111111111111'; const recordId = '22222222-2222-4222-8222-222222222222';
const work = 'test-run'; const source = `drill::practice-test::${work}::leg-0`; const sample = '2026-09-30T10:00:05Z';
const choices = { A: 'First\nchoice', B: 'B', C: 'C', D: 'D', E: 'E' };
const raw: TimedLrRawQuestion[] = [1, 2].map(questionNumber => ({ practiceTest: 'PT101', sectionNumber: 1, questionNumber, stimulus: 'Sentence\ncontinued.', questionStem: 'Which conclusion follows?', answerChoices: choices, correctAnswer: 'A', questionType: 'Must Be True', questionDifficulty: 3 }));
const qids = ['PT101-S1-Q1', 'PT101-S1-Q2'];
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function parent(): TimedWorkParent {
  const leg = { kind: 'lr', section: 1, questionCount: 2 };
  return { id: work, user_id: owner, pt: 101, pace: 'standard', section_seconds: 2100, revision: 2, timed_contract_version: 1, timed_writer_epoch: 1,
    timed_phase: 'leg-running', timed_elapsed_ms: 1000, timed_clock_leg: 0, timed_running_anchor: '2026-09-30T10:00:00Z', timed_lease_expires_at: '2026-09-30T10:00:10Z', timed_lease_ms: 10000,
    timed_frozen_legs: [leg, { ...leg, section: 2 }], legs: [leg, { ...leg, section: 2 }], current_leg: 0, active_device_id: 'device', status: 'in-progress',
    created_at: sample, break_after_leg: 1, break_taken: false, timed_manifest_sha256: 'a'.repeat(64),
    timed_manifest: { pt: 101, legs: [{ ...leg, qids, questions: raw.map((row, index) => ({ qid: qids[index], qnum: row.questionNumber, qtype: normalizeQType(row.questionType || '', row.questionStem), level: 3,
      contentSha256: digest({ choices: row.answerChoices, stem: row.questionStem, stimulus: row.stimulus }) })) },
      { ...leg, section: 2, qids: ['PT101-S2-Q1', 'PT101-S2-Q2'], questions: [{ qid: 'PT101-S2-Q1' }, { qid: 'PT101-S2-Q2' }] }] } };
}
function record(): TimedObject {
  return { id: recordId, user_id: owner, pool_slug: source, completion_id: source, data_version: 2, question_queue: qids,
    current_index: 1, attempts: [{ qid: qids[0], selected_answer: 'A', correct: true, time_ms: 300, flagged: true, switch_count: 2 }], status: 'in_progress', elapsed_ms: 1000,
    timer_mode: 'custom', timer_custom_minutes: 35, regulation_answered_qids: [qids[0]], started_at: sample, updated_at: sample };
}
let p: TimedWorkParent; let saved: TimedObject; let rpc: ReturnType<typeof vi.fn>; let now: number;
const lockQueues = new Map<string, Promise<unknown>>();
const locks = { request: async <T>(name: string, callback: () => Promise<T>): Promise<T> => {
  const result = (lockQueues.get(name) ?? Promise.resolve()).catch(() => undefined).then(callback);
  lockQueues.set(name, result); return result;
} };
const capability = { contractVersion: 1, enabled: true, workKind: 'practice-test', operations: ['read', ...TIMED_WORK_OPERATIONS] };
function create(content = raw, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {
  const client = new TimedWorkClient(owner, work, { auth: { getUser: async () => ({ data: { user: { id: owner } }, error: null }) }, rpc } as TimedWorkTransport, storage, locks);
  return new TimedLrAdapter(new TimedPracticeTestStore(client, 'device', () => now), owner, work, 0, 'device', content, undefined, () => now);
}
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto); localStorage.clear(); lockQueues.clear(); p = parent(); saved = record(); now = 1000;
  rpc = vi.fn().mockImplementation(async name => ({ data: name.includes('capability') ? capability : { parent: p, checkpoint: { kind: 'lr', record: saved }, serverTime: sample }, error: null }));
});

describe('inactive LR v1 adapter', () => {
  it('accepts an empty start-leg checkpoint with actual PostgreSQL offset/microsecond timestamps', async () => {
    saved = { id: recordId, user_id: owner, pool_slug: source, completion_id: source, data_version: 2, question_queue: qids,
      current_index: 0, attempts: [], status: 'in_progress', elapsed_ms: 0, timer_mode: 'custom', timer_custom_minutes: 35,
      started_at: '2026-09-30T14:20:06.454027+00:00', updated_at: '2026-09-30T14:20:06.454027+00:00' };
    const view = (await create().load())!;
    expect(view.session.current_index).toBe(0); expect(view.session.attempts).toEqual([]); expect(view.questionStates).toEqual([]);
    expect(view.session.started_at).toBe('2026-09-30T14:20:06.454Z');
    expect(saved.started_at).toBe('2026-09-30T14:20:06.454027+00:00');
    saved.updated_at = '2026-09-30T09:20:06.454027-05:00';
    expect((await create().load())!.session.updated_at).toBe('2026-09-30T14:20:06.454Z');
    saved.updated_at = 'invalid-account-timestamp';
    await expect(create().load()).rejects.toMatchObject({ kind: 'contract' });
    saved.updated_at = '2026-02-30T10:00:00+00:00';
    await expect(create().load()).rejects.toMatchObject({ kind: 'contract' });
    saved.updated_at = '2026-09-30T14:20:06';
    await expect(create().load()).rejects.toMatchObject({ kind: 'contract' });
  });
  it('keeps the frozen classification after a bank relabel, but still rejects changed content or a malformed frozen label', async () => {
    const relabeled = raw.map(row => ({ ...row, questionType: 'Weaken', questionDifficulty: 5 }));
    const view = (await create(relabeled).load())!;
    expect(view.questions.map(question => [question.qtype, question.difficulty])).toEqual([['Must Be True', 3], ['Must Be True', 3]]);
    await expect(create(raw.map(row => ({ ...row, questionStem: 'Which one weakens?' }))).load()).rejects.toMatchObject({ kind: 'contract' });
    const questions = (p.timed_manifest.legs as TimedObject[])[0].questions as TimedObject[];
    questions[0].qtype = '';
    await expect(create().load()).rejects.toMatchObject({ kind: 'contract' });
    questions[0].qtype = 'Must Be True'; questions[0].level = 9;
    await expect(create().load()).rejects.toMatchObject({ kind: 'contract' });
  });
  it('restores the exact PracticeSession queue, flags, switch count, regulation mark and lease clock with real loader normalization', async () => {
    const view = (await create().load())!;
    expect(view.session.question_queue).toEqual(qids); expect(view.session.current_index).toBe(1); expect(view.session.elapsed_ms).toBe(6000);
    expect(view.session.attempts[0]).toMatchObject({ flagged: true, switch_count: 2 }); expect(view.session.regulation_answered_qids).toEqual([qids[0]]);
    expect(view.questions[0].stimulus).toBe('Sentence continued.'); expect(view.questions[0].answerChoices.A).toBe('First choice');
    expect(raw[0].stimulus).toBe('Sentence\ncontinued.');
    expect(timedLrAttemptToAnswer(view.session.attempts[0])).toMatchObject({ qid: qids[0], selected: 'A', timeMs: 300, switchCount: 2, flagged: true });
  });
  it.each(['owner', 'source', 'queue', 'position', 'answer-source', 'duplicate', 'regulation', 'premature-completion'])('rejects %s mismatch', async mismatch => {
    if (mismatch === 'owner') saved.user_id = 'foreign';
    if (mismatch === 'source') saved.pool_slug = 'foreign';
    if (mismatch === 'queue') saved.question_queue = [...qids].reverse();
    if (mismatch === 'position') saved.current_index = 2;
    if (mismatch === 'answer-source') (saved.attempts as TimedObject[])[0].qid = 'foreign';
    if (mismatch === 'duplicate') (saved.attempts as TimedObject[]).push({ ...(saved.attempts as TimedObject[])[0] });
    if (mismatch === 'regulation') saved.regulation_answered_qids = [qids[1]];
    if (mismatch === 'premature-completion') saved.status = 'completed';
    await expect(create().load()).rejects.toMatchObject({ kind: 'contract' });
  });
  it('rejects changed content with unchanged IDs and removed or duplicate source positions', async () => {
    const changed = structuredClone(raw); changed[0].questionStem = 'Different text';
    await expect(create(changed).load()).rejects.toMatchObject({ kind: 'contract' });
    await expect(create([{ ...raw[0], practiceTest: 'PT102' }, raw[1]]).load()).rejects.toMatchObject({ kind: 'contract' });
    await expect(create([...raw, raw[0]]).load()).rejects.toMatchObject({ kind: 'contract' });
    await expect(create([{ ...raw[0], status: 'removed' }, raw[1]]).load()).rejects.toMatchObject({ kind: 'contract' });
  });
  it('retains the identical checkpoint UUID and regulation/flag/switch payload on lost reply and reload', async () => {
    const adapter = create(); const view = (await adapter.load())!;
    const pending = await adapter.prepareCheckpoint(view, 1, [timedLrAttemptToAnswer(view.session.attempts[0])], [qids[0]]);
    rpc.mockImplementation(async name => { if (name.includes('capability')) return { data: capability, error: null }; throw new Error('lost receipt'); });
    await expect(adapter.retry()).rejects.toMatchObject({ kind: 'transport' });
    await expect(create().prepareClose(view, view.questions.map(question => ({ qid: question.qid, correctAnswer: question.correctAnswer })), {})).rejects.toMatchObject({ kind: 'conflict' });
    rpc.mockImplementation(async (name, args) => {
      if (name.includes('capability')) return { data: capability, error: null };
      const command = args.p_command as TimedWorkCommand;
      return { data: { parent: { ...p, revision: 3 }, checkpoint: { kind: 'lr', record: saved }, serverTime: sample, replayed: true,
        receipt: { ownerId: owner, workKind: 'practice-test', workId: work, commandId: command.commandId, command, operation: command.operation, committedRevision: 3, result: {} } }, error: null };
    });
    expect((await create().retry())!.session.attempts[0].switch_count).toBe(2);
    expect(rpc.mock.calls.filter(([name]) => name === 'commit_timed_work_v1').map(([, args]) => args.p_command)).toEqual([pending, pending]);
  });
  it('requires full exact answer keys and analysis before retaining a close command, and permits paused close', async () => {
    const adapter = create(); const view = (await adapter.load())!; const keys = view.questions.map(question => ({ qid: question.qid, correctAnswer: question.correctAnswer }));
    await expect(adapter.prepareClose(view, keys.slice(0, 1), {})).rejects.toMatchObject({ kind: 'contract' });
    await expect(adapter.prepareClose(view, [{ ...keys[0], correctAnswer: 'B' }, keys[1]], {})).rejects.toMatchObject({ kind: 'contract' });
    await expect(adapter.prepareClose(view, keys, null)).rejects.toMatchObject({ kind: 'contract' });
    p = { ...p, revision: 3, timed_phase: 'leg-paused', timed_running_anchor: null, timed_lease_expires_at: null };
    const paused = (await adapter.load())!;
    expect((await adapter.prepareClose(paused, keys, { reviewFlags: [qids[0]] })).payload).toEqual({ answerKeys: keys, analysis: { reviewFlags: [qids[0]] } });
  });
  it('retries the exact retained close command after a lost response and exposes no fabricated previous child', async () => {
    const adapter = create(); const view = (await adapter.load())!;
    const pending = await adapter.prepareClose(view, view.questions.map(question => ({ qid: question.qid, correctAnswer: question.correctAnswer })), { reviewFlags: [] });
    rpc.mockImplementation(async name => { if (name.includes('capability')) return { data: capability, error: null }; throw new Error('lost close receipt'); });
    await expect(adapter.retry()).rejects.toMatchObject({ kind: 'transport' });
    rpc.mockImplementation(async (name, args) => {
      if (name.includes('capability')) return { data: capability, error: null };
      const command = args.p_command;
      return { data: { parent: { ...p, revision: 3, current_leg: 1, timed_phase: 'ready', timed_clock_leg: null, timed_elapsed_ms: 0, timed_running_anchor: null, timed_lease_expires_at: null }, checkpoint: null, serverTime: sample, replayed: true,
        receipt: { ownerId: owner, workKind: 'practice-test', workId: work, commandId: command.commandId, command, operation: command.operation, committedRevision: 3, result: {} } }, error: null };
    });
    expect(await create().retry()).toBeNull();
    expect(rpc.mock.calls.filter(([name]) => name === 'commit_timed_work_v1').map(([, args]) => args.p_command)).toEqual([pending, pending]);
  });
  it('caps expired clocks, retains foreign/pending recovery as inactive, and prevents writes after lease expiry', async () => {
    const adapter = create(); const view = (await adapter.load())!;
    now += 60000;
    await expect(adapter.prepareCheckpoint(view, 1, [], [])).rejects.toMatchObject({ kind: 'expired-writer' });
    const expired = (await adapter.load())!;
    expect(expired.clock.elapsedMs).toBe(6000); // Fresh account sample resets observation; authority decides advancement.
    p.active_device_id = 'foreign';
    p.revision++;
    expect((await adapter.load())!.clock.writer).toBe('claim-required');
    p.active_device_id = 'device';
    p.revision++;
    const current = (await adapter.load())!; await adapter.prepareControl(current, 'pause');
    expect((await create().load())!.clock.writer).toBe('pending-recovery');
  });
  it('does not send a command when durable storage rejects the write', async () => {
    const view = (await create().load())!;
    const broken = { getItem: (key: string) => localStorage.getItem(key), setItem: () => { throw new Error('quota'); } };
    await expect(create(raw, broken).prepareCheckpoint(view, 1, [], [])).rejects.toMatchObject({ kind: 'storage' });
    expect(rpc.mock.calls.some(([name]) => name === 'commit_timed_work_v1')).toBe(false);
  });
});
