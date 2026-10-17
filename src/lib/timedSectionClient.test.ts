import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimedSectionClient, TIMED_SECTION_OPERATIONS, type TimedSectionCommand, type TimedSectionSitting, type TimedSectionTransport } from './timedSectionClient';
const owner = '10000000-0000-4000-8000-000000000001';
const work = '20000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const rcId = '30000000-0000-4000-8000-000000000001';
const attemptId = '40000000-0000-4000-8000-000000000001';
const storageKey = `lsatu:timed-section:v1:${owner}:${work}`;
function locks() {
  const queued = new Map<string, Promise<unknown>>();
  return { request<T>(key: string, callback: () => Promise<T>): Promise<T> {
    const next = (queued.get(key) ?? Promise.resolve()).catch(() => {}).then(callback);
    queued.set(key, next); return next;
  } };
}
function state(revision = 2, kind: 'lr' | 'rc' = 'lr'): TimedSectionSitting {
  const qids = kind === 'lr' ? ['140:1:1', '140:1:2'] : ['rc:1', 'rc:2'];
  const frozen = { kind, section: 1, questionCount: 2, qids,
    questions: qids.map((qid, index) => kind === 'lr' ? { qid } : { qid, questionId: index + 1, passageId: 9 }),
    ...(kind === 'rc' ? { passageIds: [9] } : {}),
  };
  return { id: work, owner_id: owner, kind, source_kind: 'manual-canonical', source_key: `${kind}::pt140-s1`, pt: 140, section: 1,
    manifest_sha256: 'a'.repeat(64), frozen_source: frozen, frozen_qids: qids, pace: 'standard', budget_ms: 2100000, lease_ms: 30000,
    phase: 'paused', revision, writer_epoch: 1, device_id: 'device-a', elapsed_ms: 500,
    clock_anchor_at: null, lease_expires_at: null, current_index: 0, snapshot: { answers: [] }, result: null, completed_at: null,
    created_at: '2026-09-30T10:00:00Z', updated_at: '2026-09-30T10:01:00Z' };
}
function child(s: TimedSectionSitting) {
  return s.phase === 'ready' ? null : s.kind === 'lr' ? { kind: 'lr', record: {
    id: `timed-section::${work}`, user_id: owner, pool_slug: `drill::timed-section::${work}`, completion_id: `drill::timed-section::${work}`,
    question_queue: s.frozen_qids, current_index: s.current_index, attempts: [], status: s.phase === 'complete' ? 'completed' : 'in_progress',
  } } : { kind: 'rc', session: { id: rcId, user_id: owner, timed_section_sitting_id: work, passage_ids: [9],
    config: { timedSectionSittingId: work, currentQuestionIndex: s.current_index }, status: s.phase === 'complete' ? 'completed' : 'in_progress' }, attempts: [] };
}
function authority(s = state()) {
  return { contractVersion: 1, workKind: 'standalone-section', sitting: s, child: child(s), receipt: null, replayed: false, serverTime: '2026-09-30T10:02:00Z' };
}
function reply(command: TimedSectionCommand, s = state(command.operation === 'create' ? 1 : command.expectedRevision + 1)) {
  if (command.operation === 'create') s = { ...s, phase: 'ready', elapsed_ms: 0, updated_at: s.created_at };
  return { ...authority(s), receipt: { ownerId: owner, workId: work, commandId: command.commandId, command,
    committedRevision: command.operation === 'create' ? 1 : command.expectedRevision + 1, result: { operation: command.operation } } };
}
let actor: ReturnType<typeof vi.fn>;
let rpc: ReturnType<typeof vi.fn>;
let capability: unknown;
let coordinator: ReturnType<typeof locks>;
let client: TimedSectionClient;
const create = () => new TimedSectionClient(owner, work, { auth: { getUser: actor }, rpc } as TimedSectionTransport, localStorage, coordinator);
beforeEach(() => {
  localStorage.clear(); coordinator = locks();
  actor = vi.fn().mockResolvedValue({ data: { user: { id: owner } }, error: null });
  capability = { contractVersion: 1, workKind: 'standalone-section', enabled: true,
    operations: [...TIMED_SECTION_OPERATIONS, 'read'], sources: ['manual-canonical'] };
  rpc = vi.fn().mockImplementation(async (name, args) => ({ data: name.includes('capability') ? capability
    : name === 'read_timed_section_v1' ? authority() : reply(args.p_command), error: null }));
  client = create();
});
describe('isolated standalone section transport', () => {
  it('acknowledges only the new ordinary-auth section contract', async () => {
    const pending = await client.prepare('pause', {}, 'device-a', state());
    const acknowledged = await client.retry();
    expect(acknowledged.sitting.revision).toBe(3);
    expect(acknowledged.child?.kind).toBe('lr');
    expect(rpc).toHaveBeenCalledWith('commit_timed_section_v1', { p_command: pending });
    expect(client.readPending()).toBeNull();
    expect(client.readReceipt()?.command).toEqual(pending);
    expect(rpc.mock.calls.every(([name]) => name.includes('timed_section'))).toBe(true);
  });
  it('creates a manual canonical source with a revision-one receipt', async () => {
    const pending = await client.prepare('create', { kind: 'lr', pt: 140, section: 1, pace: 'standard' }, 'device-a', null);
    const result = await client.retry();
    expect(pending.expectedRevision).toBe(0);
    expect(result.sitting.phase).toBe('ready');
    expect(result.receipt.committedRevision).toBe(1);
    expect(result.child).toBeNull();
    expect(rpc).toHaveBeenCalledWith('create_timed_section_v1', { p_command: pending });
  });
  it('retains the identical command across lost reply and reload', async () => {
    const pending = await client.prepare('checkpoint', { currentIndex: 1, answers: [{ qid: '140:1:1', selected: 'A', correct: true, timeMs: 100 }] }, 'device-a', state());
    rpc.mockImplementation(async name => name.includes('capability') ? { data: capability, error: null } : Promise.reject(new Error('lost')));
    await expect(client.retry()).rejects.toMatchObject({ kind: 'transport' });
    expect(create().readPending()).toEqual(pending);
    rpc.mockImplementation(async (name, args) => ({ data: name.includes('capability') ? capability : { ...reply(args.p_command, state(8)), replayed: true }, error: null }));
    const result = await create().retry();
    expect(result.sitting.revision).toBe(8);
    expect(result.receipt.committedRevision).toBe(3);
    expect(rpc.mock.calls.filter(([name]) => name === 'commit_timed_section_v1').map(([, args]) => args.p_command)).toEqual([pending, pending]);
  });
  it('does not replace an uncertain pending command', async () => {
    const pending = await client.prepare('pause', {}, 'device-a', state());
    await expect(client.prepare('resume', {}, 'device-a', state())).rejects.toMatchObject({ kind: 'conflict' });
    await expect(client.archiveRejected()).rejects.toMatchObject({ kind: 'conflict' });
    expect(client.readPending()).toEqual(pending); expect(rpc).not.toHaveBeenCalled();
  });
  it('serializes two tabs preparing against the same retained authority', async () => {
    const results = await Promise.allSettled([client.prepare('pause', {}, 'device-a', state()), create().prepare('resume', {}, 'device-b', state())]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(client.readPending()?.operation).toBe('pause');
  });
  it('isolates owner, sitting and full-PT storage queues', async () => {
    const pending = await client.prepare('pause', {}, 'device-a', state());
    expect(new TimedSectionClient(other, work, { auth: { getUser: actor }, rpc } as TimedSectionTransport, localStorage, coordinator).readPending()).toBeNull();
    expect(new TimedSectionClient(owner, rcId, { auth: { getUser: actor }, rpc } as TimedSectionTransport, localStorage, coordinator).readPending()).toBeNull();
    expect(localStorage.getItem(`lsatu:timed-work:v1:${owner}:${work}`)).toBeNull();
    expect(client.readPending()).toEqual(pending);
  });
  it('refuses a changed actor before transmission and preserves recovery', async () => {
    await client.prepare('pause', {}, 'device-a', state());
    actor.mockResolvedValue({ data: { user: { id: other } }, error: null });
    await expect(client.retry()).rejects.toMatchObject({ kind: 'authentication' });
    expect(rpc).not.toHaveBeenCalled(); expect(client.readPending()).not.toBeNull();
  });
  it('withholds a response after account changes in flight', async () => {
    await client.prepare('pause', {}, 'device-a', state());
    actor.mockResolvedValueOnce({ data: { user: { id: owner } }, error: null }).mockResolvedValueOnce({ data: { user: { id: owner } }, error: null }).mockResolvedValueOnce({ data: { user: { id: other } }, error: null });
    await expect(client.retry()).rejects.toMatchObject({ kind: 'authentication' });
    expect(client.readPending()).not.toBeNull();
  });
  it.each([null, { contractVersion: 2 }, { contractVersion: 1, workKind: 'practice-test', enabled: true, operations: ['pause'], sources: ['manual-canonical'] },
    { contractVersion: 1, workKind: 'standalone-section', enabled: false, operations: ['pause'], sources: ['manual-canonical'] },
    { contractVersion: 1, workKind: 'standalone-section', enabled: true, operations: ['pause'], sources: ['guided'] }])('fails closed on unsupported capability %j', async value => {
    await client.prepare('pause', {}, 'device-a', state()); capability = value;
    await expect(client.retry()).rejects.toMatchObject({ kind: 'capability' });
    expect(rpc).toHaveBeenCalledTimes(1); expect(client.readPending()).not.toBeNull();
  });
  it('permits a read while new mutations are disabled', async () => {
    capability = { ...(capability as object), enabled: false };
    expect((await client.refresh()).sitting.id).toBe(work);
    await expect(client.requireCapability('create')).rejects.toMatchObject({ kind: 'capability' });
  });
  it.each([['PT401', 'access'], ['PT409', 'conflict'], ['PT410', 'expired-writer'], ['PT412', 'replay-mismatch'], ['PT422', 'invalid-command'], ['PT503', 'capability'], ['network', 'transport']])('preserves a typed %s denial', async (code, kind) => {
    await client.prepare('pause', {}, 'device-a', state());
    rpc.mockImplementation(async name => name.includes('capability') ? { data: capability, error: null } : { data: null, error: { code, message: 'denied', details: JSON.stringify({ sitting: state(8) }) } });
    await expect(client.retry()).rejects.toMatchObject({ kind, authoritativeSitting: { revision: 8 } });
    expect(client.readPending()).not.toBeNull();
    expect(client.readRejection() !== null).toBe(['PT401', 'PT409', 'PT410'].includes(code));
  });
  it('archives only a definite server rejection after fresh authority read', async () => {
    const pending = await client.prepare('pause', {}, 'device-a', state());
    rpc.mockImplementation(async name => name.includes('capability') ? { data: capability, error: null }
      : name === 'read_timed_section_v1' ? { data: authority(state(8)), error: null }
      : { data: null, error: { code: 'PT409', message: 'stale', details: JSON.stringify({ sitting: state(8) }) } });
    await expect(client.retry()).rejects.toMatchObject({ kind: 'conflict' });
    await client.archiveRejected();
    expect(client.readPending()).toBeNull();
    expect(client.readArchivedCommands()[0].command).toEqual(pending);
    expect(client.readAuthoritativeSitting()?.revision).toBe(8);
  });
  it('does not use an earlier rejection to discard a later lost reply', async () => {
    await client.prepare('pause', {}, 'device-a', state());
    rpc.mockImplementation(async name => name.includes('capability') ? { data: capability, error: null } : { data: null, error: { code: 'PT409', message: 'stale' } });
    await expect(client.retry()).rejects.toMatchObject({ kind: 'conflict' });
    rpc.mockImplementation(async name => name.includes('capability') ? { data: capability, error: null } : Promise.reject(new Error('lost')));
    await expect(client.retry()).rejects.toMatchObject({ kind: 'transport' });
    expect(client.readRejection()).toBeNull();
    await expect(client.archiveRejected()).rejects.toMatchObject({ kind: 'conflict' });
  });
  it.each(['owner', 'work', 'version', 'receipt-owner', 'receipt-command', 'receipt-payload', 'receipt-revision', 'receipt-result',
    'frozen-roster', 'manifest', 'source', 'clock', 'epoch', 'child-owner', 'child-source', 'child-position', 'child-missing'])('retains pending work on a mismatched %s response', async mismatch => {
    await client.prepare('pause', {}, 'device-a', state());
    rpc.mockImplementation(async (name, args) => {
      if (name.includes('capability')) return { data: capability, error: null };
      const result = reply(args.p_command);
      switch (mismatch) {
        case 'owner': result.sitting.owner_id = other; break;
        case 'work': result.sitting.id = rcId; break;
        case 'version': result.contractVersion = 2; break;
        case 'receipt-owner': result.receipt.ownerId = other; break;
        case 'receipt-command': result.receipt.commandId = rcId; break;
        case 'receipt-payload': result.receipt.command = { ...result.receipt.command, payload: { forged: true } }; break;
        case 'receipt-revision': result.receipt.committedRevision = 9; break;
        case 'receipt-result': result.receipt.result.operation = 'abandon'; break;
        case 'frozen-roster': result.sitting.frozen_qids = ['foreign']; break;
        case 'manifest': result.sitting.manifest_sha256 = 'bad'; break;
        case 'source': result.sitting.source_kind = 'guided' as 'manual-canonical'; break;
        case 'clock': result.sitting.phase = 'running'; break;
        case 'epoch': result.sitting.writer_epoch = 0; break;
        case 'child-owner': (result.child as { record: Record<string, unknown> }).record.user_id = other; break;
        case 'child-source': (result.child as { record: Record<string, unknown> }).record.pool_slug = 'drill::practice-test::old'; break;
        case 'child-position': (result.child as { record: Record<string, unknown> }).record.current_index = 1; break;
        case 'child-missing': result.child = null; break;
      }
      return { data: result, error: null };
    });
    await expect(client.retry()).rejects.toMatchObject({ kind: 'contract' });
    expect(client.readPending()).not.toBeNull(); expect(client.readReceipt()).toBeNull();
  });
  it('accepts a correctly bound RC session and first-attempt child', async () => {
    const s = state(2, 'rc');
    const pending = await client.prepare('checkpoint', { currentIndex: 0, answers: [{ attemptId, questionId: 1, passageId: 9, selected: null, isCorrect: null, timeMs: 1 }] }, 'device-a', s);
    rpc.mockImplementation(async name => {
      if (name.includes('capability')) return { data: capability, error: null };
      const result = reply(pending, state(3, 'rc'));
      (result.child as { attempts: unknown[] }).attempts.push({ id: attemptId, user_id: owner, session_id: rcId,
        question_id: 1, passage_id: 9, selected: null, is_correct: null, time_ms: 1, is_first_attempt: true });
      return { data: result, error: null };
    });
    expect((await client.retry()).child?.kind).toBe('rc');
  });
  it.each(['session-owner', 'session-source', 'attempt-owner', 'attempt-session', 'attempt-question', 'attempt-first', 'duplicate-question'])('rejects mismatched RC %s child', async mismatch => {
    const pending = await client.prepare('pause', {}, 'device-a', state(2, 'rc'));
    rpc.mockImplementation(async name => {
      if (name.includes('capability')) return { data: capability, error: null };
      const result = reply(pending, state(3, 'rc'));
      const c = result.child as { session: Record<string, unknown>; attempts: Record<string, unknown>[] };
      const a = { id: attemptId, user_id: owner, session_id: rcId, question_id: 1, passage_id: 9,
        selected: 'B', is_correct: false, time_ms: 1, is_first_attempt: true };
      c.attempts.push(a);
      switch (mismatch) {
        case 'session-owner': c.session.user_id = other; break;
        case 'session-source': c.session.timed_section_sitting_id = rcId; break;
        case 'attempt-owner': a.user_id = other; break;
        case 'attempt-session': a.session_id = attemptId; break;
        case 'attempt-question': a.question_id = 99; break;
        case 'attempt-first': a.is_first_attempt = false; break;
        case 'duplicate-question': c.attempts.push({ ...a, id: rcId }); break;
      }
      return { data: result, error: null };
    });
    await expect(client.retry()).rejects.toMatchObject({ kind: 'contract' });
    expect(client.readPending()).not.toBeNull();
  });
  it.each([
    { currentIndex: 2, answers: [] },
    { currentIndex: 0, answers: [{ qid: 'foreign', selected: 'A', correct: true, timeMs: 0 }] },
    { currentIndex: 0, answers: [], questionStates: [{ qid: '140:1:1', timeMs: 0, flagged: false, eliminations: ['A', 'A'] }] },
    { currentIndex: 0, answers: [], regulationAnsweredQids: ['foreign'] },
  ])('refuses invalid checkpoint identity before retaining or sending it %j', async payload => {
    await expect(client.prepare('checkpoint', payload as never, 'device-a', state())).rejects.toMatchObject({ kind: 'contract' });
    expect(client.readPending()).toBeNull(); expect(rpc).not.toHaveBeenCalled();
  });
  it('requires complete, unique LR answer keys for closeout', async () => {
    await expect(client.prepare('close', { answerKeys: [{ qid: '140:1:1', correctAnswer: 'A' }] }, 'device-a', state())).rejects.toMatchObject({ kind: 'contract' });
    await client.prepare('close', { answerKeys: [{ qid: '140:1:1', correctAnswer: 'A' }, { qid: '140:1:2', correctAnswer: 'B' }] }, 'device-a', state());
    expect(client.readPending()?.operation).toBe('close');
  });
  it('retains corrupt storage without overwriting or sending it', async () => {
    localStorage.setItem(storageKey, '{invalid');
    await expect(client.retry()).rejects.toMatchObject({ kind: 'contract' });
    expect(localStorage.getItem(storageKey)).toBe('{invalid'); expect(rpc).not.toHaveBeenCalled();
  });
  it('requires Web Locks and durable storage before sending any command', async () => {
    const transport = { auth: { getUser: actor }, rpc } as TimedSectionTransport;
    const unlocked = new TimedSectionClient(owner, work, transport, localStorage, {} as never);
    await expect(unlocked.prepare('pause', {}, 'device-a', state())).rejects.toMatchObject({ kind: 'storage' });
    const broken = new TimedSectionClient(owner, work, transport, { getItem: () => null, setItem: () => { throw new Error('quota'); } }, coordinator);
    await expect(broken.prepare('pause', {}, 'device-a', state())).rejects.toMatchObject({ kind: 'storage' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('retains newer authority and samples it again when an older valid replay arrives', async () => {
    const pending = await client.prepare('pause', {}, 'device-a', state());
    rpc.mockImplementation(async name => ({ data: name.includes('capability') ? capability
      : name === 'read_timed_section_v1' ? authority(state(8)) : { ...reply(pending, state(3)), replayed: true }, error: null }));
    await client.refresh();
    const result = await client.retry();
    expect(result.sitting.revision).toBe(8);
    expect(result.child?.kind).toBe('lr');
    expect(result.receipt.committedRevision).toBe(3);
    expect(rpc.mock.calls.filter(([name]) => name === 'read_timed_section_v1')).toHaveLength(2);
  });
  it('does not regress the elapsed clock or frozen source on a fresh read', async () => {
    await client.refresh();
    rpc.mockImplementation(async name => ({ data: name.includes('capability') ? capability : authority({ ...state(3), elapsed_ms: 0 }), error: null }));
    await expect(client.refresh()).rejects.toMatchObject({ kind: 'contract' });
    expect(client.readAuthoritativeSitting()?.elapsed_ms).toBe(500);
  });
  it.each(['lr', 'rc'] as const)('reads a completed %s result with the proper history identity', async kind => {
    const s = { ...state(4, kind), phase: 'complete' as const, completed_at: '2026-09-30T10:01:00Z',
      result: { correct: 1, answered: 1, total: 2, timeMs: 500, historyId: kind === 'lr' ? attemptId : null } };
    rpc.mockImplementation(async name => ({ data: name.includes('capability') ? capability : authority(s), error: null }));
    expect((await client.refresh()).sitting.result).toEqual(s.result);
  });
  it('rejects a contradictory complete score while preserving earlier authority', async () => {
    await client.refresh();
    const s = { ...state(4), phase: 'complete' as const, completed_at: '2026-09-30T10:01:00Z',
      result: { correct: 2, answered: 1, total: 2, timeMs: 500, historyId: attemptId } };
    rpc.mockImplementation(async name => ({ data: name.includes('capability') ? capability : authority(s), error: null }));
    await expect(client.refresh()).rejects.toMatchObject({ kind: 'contract' });
    expect(client.readAuthoritativeSitting()?.phase).toBe('paused');
  });
  it('does not expose a running clock without an account sample time', async () => {
    const s = { ...state(), phase: 'running' as const, clock_anchor_at: '2026-09-30T10:01:00Z', lease_expires_at: '2026-09-30T10:01:30Z' };
    rpc.mockImplementation(async name => ({ data: name.includes('capability') ? capability : { ...authority(s), serverTime: undefined }, error: null }));
    await expect(client.refresh()).rejects.toMatchObject({ kind: 'contract' });
    expect(client.readAuthoritativeSitting()).toBeNull();
  });
});
