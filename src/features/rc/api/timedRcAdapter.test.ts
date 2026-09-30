import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimedWorkClient, TIMED_WORK_OPERATIONS, type TimedObject, type TimedWorkCommand, type TimedWorkParent, type TimedWorkTransport } from '@/lib/timedWorkClient';
import { TimedRcAdapter, projectTimedRcClock } from './timedRcAdapter';
import type { RcAttempt, RcPassage } from '../lib/rcTypes';
import { createHash, webcrypto } from 'node:crypto';

const owner = 'owner'; const work = 'pt::test';
const sessionId = '11111111-1111-4111-8111-111111111111';
const attemptId = '22222222-2222-4222-8222-222222222222';
const serverTime = '2026-09-30T10:00:05Z';
const choices = ['A', 'B', 'C', 'D', 'E'].map(letter => ({ letter, text: `${letter} choice` }));
const passages = [{ passageId: 10, preptest: 101, section: 1, setNumber: 1, text: 'Canonical passage.', questions: [
  { questionId: 20, position: 1, prompt: 'First prompt', choices, correctAnswer: 'A' },
  { questionId: 21, position: 2, prompt: 'Second prompt', choices, correctAnswer: 'B' },
] }] as RcPassage[];
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function parent(): TimedWorkParent {
  const leg = { kind: 'rc', section: 1, questionCount: 2, passageIds: [10] };
  return { id: work, user_id: owner, pt: 101, pace: 'standard', section_seconds: 2100, revision: 2, timed_contract_version: 1,
    timed_writer_epoch: 1, timed_phase: 'leg-running', timed_elapsed_ms: 1000, timed_clock_leg: 0,
    timed_running_anchor: '2026-09-30T10:00:00Z', timed_lease_expires_at: '2026-09-30T10:00:10Z', timed_lease_ms: 10000,
    timed_frozen_legs: [leg, { kind: 'lr', section: 2, questionCount: 1 }], legs: [leg, { kind: 'lr', section: 2, questionCount: 1 }],
    current_leg: 0, active_device_id: 'device', status: 'in-progress', timed_manifest_sha256: 'a'.repeat(64),
    timed_manifest: { pt: 101, legs: [{ ...leg, qids: ['20', '21'],
      passages: [{ passageId: 10, section: 1, setNumber: 1, contentSha256: hash(passages[0].text) }],
      questions: passages[0].questions.map(question => ({ qid: String(question.questionId), questionId: question.questionId, passageId: 10, qnum: question.position,
        contentSha256: hash(JSON.stringify({ choices, prompt: question.prompt, text: passages[0].text })) })) },
      { kind: 'lr', section: 2, questionCount: 1, qids: ['PT101-S2-Q1'], questions: [{ qid: 'PT101-S2-Q1' }] }] } };
}
function checkpoint(): TimedObject {
  return { kind: 'rc', session: { id: sessionId, user_id: owner, practice_test_run_id: work, practice_test_leg: 0, passage_ids: [10],
    config: { practiceTestRunId: work, practiceTestLegIndex: 0, currentQuestionIndex: 1 }, status: 'in_progress', excluded_from_analytics: false,
    started_at: '2026-09-30T10:00:00Z', completed_at: null }, attempts: [{ id: attemptId, user_id: owner, session_id: sessionId,
    question_id: 20, passage_id: 10, selected: 'A', is_correct: true, time_ms: 400, flagged: true, eliminations: ['B'], is_first_attempt: true, created_at: serverTime }] };
}
const answer = (): RcAttempt => ({ id: attemptId, userId: owner, sessionId, questionId: 20, passageId: 10, selected: 'A', isCorrect: true,
  timeMs: 400, flagged: true, eliminations: ['B'], isFirstAttempt: true });
let authoritative: TimedWorkParent; let saved: TimedObject; let rpc: ReturnType<typeof vi.fn>; let actor: ReturnType<typeof vi.fn>;
const lockQueues = new Map<string, Promise<unknown>>();
const locks = { request: async <T>(name: string, callback: () => Promise<T>): Promise<T> => {
  const result = (lockQueues.get(name) ?? Promise.resolve()).catch(() => undefined).then(callback);
  lockQueues.set(name, result); return result;
} };
const capability = { contractVersion: 1, enabled: true, workKind: 'practice-test', operations: ['read', ...TIMED_WORK_OPERATIONS] };
function create(content = passages, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {
  return new TimedRcAdapter(new TimedWorkClient(owner, work, { auth: { getUser: actor }, rpc } as TimedWorkTransport, storage, locks), owner, work, 0, content, 'device');
}
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  localStorage.clear(); lockQueues.clear(); authoritative = parent(); saved = checkpoint(); actor = vi.fn().mockResolvedValue({ data: { user: { id: owner } }, error: null });
  rpc = vi.fn().mockImplementation(async name => ({ data: name.includes('capability') ? capability : { parent: authoritative, checkpoint: saved, serverTime }, error: null }));
});

describe('inactive RC atomic adapter', () => {
  it('accepts native PostgreSQL offset/microsecond session and attempt timestamps', async () => {
    (saved.session as TimedObject).started_at = '2026-09-30T10:00:00.454027+00:00';
    (saved.attempts as TimedObject[])[0].created_at = '2026-09-30T05:00:05.454027-05:00';
    expect((await create().refresh())!.state.answers.get(20)).toBe('A');
    (saved.session as TimedObject).started_at = 'invalid-account-timestamp';
    await expect(create().refresh()).rejects.toMatchObject({ kind: 'contract' });
  });
  it('renders foreign-writer recovery paused and permits acknowledged paused closeout', async () => {
    authoritative.active_device_id = 'foreign-device';
    const foreign = (await create().refresh())!;
    expect(foreign.claimRequired).toBe(true); expect(foreign.clock.paused).toBe(true); expect(foreign.state.paused).toBe(true);
    authoritative = { ...parent(), revision: 3, timed_phase: 'leg-paused', timed_running_anchor: null, timed_lease_expires_at: null };
    const paused = (await create().refresh())!;
    expect((await create().prepareControl(paused, 'close-leg', 'device')).operation).toBe('close-leg');
  });
  it('restores exact saved RC selection, flags, eliminations, position and attributed attempts from v1 reads', async () => {
    const view = (await create().refresh())!;
    expect(view.state.currentIndex).toBe(1); expect(view.state.answers.get(20)).toBe('A'); expect(view.state.flagged.has(20)).toBe(true);
    expect(view.state.eliminations.get(20)).toEqual(['B']); expect(view.state.recorded.has(20)).toBe(true);
    expect(view.session.config).toMatchObject({ reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 2100 }, practiceTestRunId: work, practiceTestLegIndex: 0 });
    expect(view.clock.elapsedMs).toBe(6000); expect(view.state.paused).toBe(false);
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(['timed_practice_test_capability_v1', 'read_timed_practice_test_v1']);
  });
  it.each(['session-owner', 'session-leg', 'config-leg', 'passages', 'attempt-owner', 'attempt-session', 'question-passage', 'duplicate', 'position', 'premature-completion'])('rejects %s checkpoint corruption', async mismatch => {
    const row = saved.session as TimedObject; const attempts = saved.attempts as TimedObject[];
    if (mismatch === 'session-owner') row.user_id = 'foreign';
    if (mismatch === 'session-leg') row.practice_test_leg = 1;
    if (mismatch === 'config-leg') (row.config as TimedObject).practiceTestLegIndex = 1;
    if (mismatch === 'passages') row.passage_ids = [99];
    if (mismatch === 'attempt-owner') attempts[0].user_id = 'foreign';
    if (mismatch === 'attempt-session') attempts[0].session_id = 'foreign';
    if (mismatch === 'question-passage') attempts[0].passage_id = 99;
    if (mismatch === 'duplicate') attempts.push({ ...attempts[0] });
    if (mismatch === 'position') (row.config as TimedObject).currentQuestionIndex = 2;
    if (mismatch === 'premature-completion') { row.status = 'completed'; row.completed_at = serverTime; }
    await expect(create().refresh()).rejects.toMatchObject({ kind: 'contract' });
  });
  it('rejects content with the same count but reordered or differently owned questions', async () => {
    const content = structuredClone(passages); content[0].questions.reverse();
    await expect(create(content).refresh()).rejects.toMatchObject({ kind: 'contract' });
    const foreign = structuredClone(passages); foreign[0].section = 2;
    await expect(create(foreign).refresh()).rejects.toMatchObject({ kind: 'contract' });
    const altered = structuredClone(passages); altered[0].questions[0].prompt = 'Changed text with the same identity';
    await expect(create(altered).refresh()).rejects.toMatchObject({ kind: 'contract' });
  });
  it('caps running time at the server lease and pauses expired recovery', async () => {
    const view = (await create().refresh())!;
    expect(projectTimedRcClock(view.parent, view.serverTime, 60000)).toEqual({ elapsedMs: 11000, remainingMs: 2089000, paused: true, requiresRefresh: true });
    const paused = { ...parent(), timed_phase: 'leg-paused', timed_elapsed_ms: 11000, timed_running_anchor: null, timed_lease_expires_at: null };
    expect(projectTimedRcClock(paused, serverTime, 60000)).toMatchObject({ elapsedMs: 11000, paused: true, requiresRefresh: false });
    authoritative.timed_lease_expires_at = serverTime;
    authoritative.revision++;
    const expired = (await create().refresh())!;
    await expect(create().prepareControl(expired, 'pause', 'device')).rejects.toMatchObject({ kind: 'expired-writer' });
    await expect(create().prepareCheckpoint(expired, 0, [answer()], 'device')).rejects.toMatchObject({ kind: 'expired-writer' });
    await expect(create().prepareControl(view, 'pause', 'foreign-device')).rejects.toMatchObject({ kind: 'expired-writer' });
  });
  it('keeps the exact checkpoint UUID and attributed attempt UUID after lost reply, reload and retry', async () => {
    const adapter = create(); const view = (await adapter.refresh())!;
    const pending = await adapter.prepareCheckpoint(view, 1, [answer()], 'device');
    rpc.mockImplementation(async name => {
      if (name.includes('capability')) return { data: capability, error: null };
      throw new Error('lost reply');
    });
    await expect(adapter.retry()).rejects.toMatchObject({ kind: 'transport' });
    expect(create().readPending()).toEqual(pending);
    await expect(create().prepareCheckpoint(view, 0, [{ ...answer(), id: crypto.randomUUID() }], 'device')).rejects.toMatchObject({ kind: 'conflict' });
    rpc.mockImplementation(async (name, args) => {
      if (name.includes('capability')) return { data: capability, error: null };
      const command = args.p_command as TimedWorkCommand;
      return { data: { parent: { ...authoritative, revision: 3 }, checkpoint: saved, serverTime, replayed: true,
        receipt: { ownerId: owner, workKind: 'practice-test', workId: work, commandId: command.commandId, command, operation: command.operation, committedRevision: 3, result: {} } }, error: null };
    });
    const recovered = (await create().retry())!;
    expect(recovered.attempts[0].id).toBe(attemptId); expect(create().readPending()).toBeNull();
    expect(rpc.mock.calls.filter(([name]) => name === 'commit_timed_work_v1').map(([, args]) => args.p_command)).toEqual([pending, pending]);
  });
  it('does not send when durable storage fails, and rejects foreign/unattributed attempt IDs', async () => {
    const adapter = create(); const view = (await adapter.refresh())!;
    await expect(adapter.prepareCheckpoint(view, 0, [{ ...answer(), userId: 'foreign' }], 'device')).rejects.toMatchObject({ kind: 'contract' });
    await expect(adapter.prepareCheckpoint(view, 0, [{ ...answer(), id: undefined }], 'device')).rejects.toMatchObject({ kind: 'contract' });
    const brokenStorage = { getItem: (key: string) => localStorage.getItem(key), setItem: () => { throw new Error('quota'); } };
    await expect(create(passages, brokenStorage).prepareCheckpoint(view, 0, [answer()], 'device')).rejects.toMatchObject({ kind: 'storage' });
    expect(rpc.mock.calls.some(([name]) => name === 'commit_timed_work_v1')).toBe(false);
  });
  it('holds pending recovery paused even when the account clock is running', async () => {
    const adapter = create(); const view = (await adapter.refresh())!;
    await adapter.prepareCheckpoint(view, 1, [answer()], 'device');
    const reopened = (await create().refresh())!;
    expect(reopened.pending?.payload.answers).toEqual([{ attemptId, questionId: 20, passageId: 10, selected: 'A', isCorrect: true, timeMs: 400, flagged: true, eliminations: ['B'] }]);
    expect(reopened.state.paused).toBe(true);
  });
  it('never fabricates a closed RC report from a receipt exposing the next leg', async () => {
    const adapter = create(); const view = (await adapter.refresh())!;
    await adapter.prepareControl(view, 'close-leg', 'device');
    rpc.mockImplementation(async (name, args) => {
      if (name.includes('capability')) return { data: capability, error: null };
      const command = args.p_command;
      return { data: { parent: { ...authoritative, revision: 3, current_leg: 1, timed_phase: 'ready', timed_clock_leg: null, timed_elapsed_ms: 0, timed_running_anchor: null, timed_lease_expires_at: null },
        checkpoint: null, serverTime, replayed: false,
        receipt: { ownerId: owner, workKind: 'practice-test', workId: work, commandId: command.commandId, command, operation: command.operation, committedRevision: 3, result: {} } }, error: null };
    });
    expect(await adapter.retry()).toBeNull();
    expect(adapter.readPending()).toBeNull();
  });
});
