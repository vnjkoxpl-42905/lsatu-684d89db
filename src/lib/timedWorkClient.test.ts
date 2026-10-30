import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimedWorkClient, TimedWorkError, TIMED_WORK_OPERATIONS, type TimedWorkCommand, type TimedWorkParent, type TimedWorkTransport } from './timedWorkClient';

function testLocks() {
  const queued = new Map<string, Promise<unknown>>();
  return { request<T>(name: string, callback: () => Promise<T>): Promise<T> {
    const previous = queued.get(name) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(callback);
    queued.set(name, next);
    return next;
  } };
}

const owner = 'owner-1';
const work = 'pt-run:text-id';
function state(revision = 2): TimedWorkParent {
  const leg = { kind: 'lr', section: 1, questionCount: 2 };
  return { id: work, user_id: owner, pt: 150, pace: 'standard', section_seconds: 2100, revision, timed_contract_version: 1, timed_writer_epoch: 1,
    timed_phase: 'leg-paused', timed_elapsed_ms: 500, timed_clock_leg: 0, timed_running_anchor: null, timed_lease_expires_at: null,
    timed_lease_ms: 45000, timed_frozen_legs: [leg, { ...leg, section: 2 }], legs: [leg, { ...leg, section: 2 }], timed_manifest_sha256: 'a'.repeat(64),
    timed_manifest: { pt: 150, legs: [leg, { ...leg, section: 2 }].map(item => ({ ...item, qids: ['150:1:1', 'q2'], questions: [{ qid: '150:1:1' }, { qid: 'q2' }] })) }, current_leg: 0, active_device_id: 'device-1', status: 'in-progress' };
}
function reply(command: TimedWorkCommand, parent = state(command.expectedRevision + 1)) {
  return { receipt: { ownerId: owner, workKind: 'practice-test', workId: work, commandId: command.commandId, operation: command.operation, command, committedRevision: command.expectedRevision + 1, result: {} }, parent, checkpoint: null, serverTime: '2026-09-30T10:00:00Z', replayed: false };
}
let actor: ReturnType<typeof vi.fn>;
let rpc: ReturnType<typeof vi.fn>;
let capability: unknown;
let client: TimedWorkClient;
const create = () => new TimedWorkClient(owner, work, { auth: { getUser: actor }, rpc } as TimedWorkTransport, localStorage);
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: testLocks() });
  actor = vi.fn().mockResolvedValue({ data: { user: { id: owner } }, error: null });
  capability = { contractVersion: 1, enabled: true, workKind: 'practice-test', operations: [...TIMED_WORK_OPERATIONS, 'read'] };
  rpc = vi.fn().mockImplementation(async (name, args) => name === 'timed_practice_test_capability_v1' ? { data: capability, error: null } : { data: reply(args.p_command), error: null });
  client = create();
});

describe('durable authenticated timed-work transport', () => {
  it('sends only the ordinary-auth versioned command and acknowledges the account parent', async () => {
    const pending = await client.prepare('pause', {}, 'device-1', state());
    const result = await client.retry();
    expect(result.parent.revision).toBe(3);
    expect(rpc).toHaveBeenCalledWith('commit_timed_work_v1', { p_command: pending });
    expect(client.readPending()).toBeNull();
    expect(client.readAuthoritativeParent()?.revision).toBe(3);
    expect(actor).toHaveBeenCalledTimes(4);
  });
  it('retains the exact UUID, payload, expected revision and epoch after a lost response, including reload', async () => {
    const pending = await client.prepare('checkpoint', { currentIndex: 1, answers: [{ qid: '150:1:1', selected: 'A', correct: true, timeMs: 100 }] }, 'device-1', state());
    rpc.mockImplementationOnce(async () => ({ data: capability, error: null })).mockImplementationOnce(async () => { throw new Error('reply lost after commit'); });
    await expect(client.retry()).rejects.toThrow('reply lost');
    expect(create().readPending()).toEqual(pending);
    rpc.mockImplementation(async (name, args) => ({ data: name.includes('capability') ? capability : { ...reply(args.p_command, state(7)), replayed: true }, error: null }));
    const result = await create().retry();
    expect(result.parent.revision).toBe(7);
    expect(result.receipt.committedRevision).toBe(3);
    expect(rpc.mock.calls.filter(([name]) => name === 'commit_timed_work_v1').map(([, args]) => args.p_command)).toEqual([pending, pending]);
  });
  it('does not mint another command over a retained pending command', async () => {
    const pending = await client.prepare('pause', {}, 'device-1', state());
    await expect(client.prepare('resume', {}, 'device-1', state())).rejects.toMatchObject({ kind: 'conflict' });
    expect(client.readPending()).toEqual(pending);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('isolates owner/run queues and refuses a switched actor before sending', async () => {
    await client.prepare('pause', {}, 'device-1', state());
    expect(new TimedWorkClient('other-owner', work, { auth: { getUser: actor }, rpc } as TimedWorkTransport).readPending()).toBeNull();
    expect(new TimedWorkClient(owner, 'other-run', { auth: { getUser: actor }, rpc } as TimedWorkTransport).readPending()).toBeNull();
    actor.mockResolvedValue({ data: { user: { id: 'other-owner' } }, error: null });
    await expect(client.retry()).rejects.toMatchObject({ kind: 'authentication' });
    expect(rpc).not.toHaveBeenCalled();
    expect(client.readPending()).not.toBeNull();
  });
  it('refuses acknowledgment if the actor changes during the command', async () => {
    await client.prepare('pause', {}, 'device-1', state());
    actor.mockResolvedValueOnce({ data: { user: { id: owner } }, error: null }).mockResolvedValueOnce({ data: { user: { id: owner } }, error: null }).mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(client.retry()).rejects.toMatchObject({ kind: 'authentication' });
    expect(client.readPending()).not.toBeNull();
  });
  it.each([null, { contractVersion: 2, enabled: true, workKind: 'practice-test', operations: ['pause'] }, { contractVersion: 1, enabled: false, workKind: 'practice-test', operations: ['pause'] }, { contractVersion: 1, enabled: true, workKind: 'practice-test', operations: [] }])('fails closed on missing/inactive/unsupported capability (%j)', async value => {
    await client.prepare('pause', {}, 'device-1', state()); capability = value;
    await expect(client.retry()).rejects.toMatchObject({ kind: 'capability' });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(client.readPending()).not.toBeNull();
  });
  it.each([['PT409', 'conflict'], ['PT401', 'access'], ['PT410', 'expired-writer'], ['PT422', 'invalid-command'], ['PT503', 'capability'], ['network', 'transport']])('parses %s explicitly and preserves recovery', async (code, kind) => {
    await client.prepare('pause', {}, 'device-1', state());
    rpc.mockImplementation(async name => name.includes('capability') ? { data: capability, error: null } : { data: null, error: { code, message: 'denied', details: JSON.stringify({ parent: state(9) }) } });
    await expect(client.retry()).rejects.toMatchObject({ kind, authoritativeParent: { revision: 9 } });
    expect(client.readPending()).not.toBeNull();
  });
  it.each(['owner', 'run', 'command', 'payload', 'receipt-revision', 'parent-version', 'frozen-source', 'clock', 'checkpoint-owner'])('rejects a mismatched %s acknowledgment', async mismatch => {
    await client.prepare('pause', {}, 'device-1', state());
    rpc.mockImplementation(async (name, args) => {
      if (name.includes('capability')) return { data: capability, error: null };
      const data = reply(args.p_command) as ReturnType<typeof reply> & { checkpoint: unknown };
      if (mismatch === 'owner') data.receipt.ownerId = 'other';
      if (mismatch === 'run') data.parent.id = 'other';
      if (mismatch === 'command') data.receipt.commandId = crypto.randomUUID();
      if (mismatch === 'payload') data.receipt.command = { ...args.p_command, payload: { score: 100 } };
      if (mismatch === 'receipt-revision') data.receipt.committedRevision = 4;
      if (mismatch === 'parent-version') data.parent.timed_contract_version = 2 as 1;
      if (mismatch === 'frozen-source') data.parent.pt = 151;
      if (mismatch === 'clock') data.parent.timed_elapsed_ms = 0;
      if (mismatch === 'checkpoint-owner') data.checkpoint = { kind: 'lr', record: { user_id: 'other', completion_id: `drill::practice-test::${work}::leg-0` } };
      return { data, error: null };
    });
    await expect(client.retry()).rejects.toMatchObject({ kind: 'contract' });
    expect(client.readPending()).not.toBeNull();
    expect(client.readAuthoritativeParent()?.revision).toBe(2);
  });
  it('does not regress newer locally acknowledged authority when an old response arrives', async () => {
    await client.prepare('pause', {}, 'device-1', state());
    // Another context has read newer authority while this exact command is pending.
    const key = localStorage.key(0)!; const entry = JSON.parse(localStorage.getItem(key)!);
    entry.parent = state(8); localStorage.setItem(key, JSON.stringify(entry));
    rpc.mockImplementation(async (name, args) => ({ data: name.includes('capability') ? capability : name === 'read_timed_practice_test_v1'
      ? { parent: state(8), checkpoint: null, serverTime: '2026-09-30T10:30:00Z' } : reply(args.p_command), error: null }));
    const result = await client.retry();
    expect(result.receipt.committedRevision).toBe(3);
    expect(result.parent.revision).toBe(8);
    expect(result.checkpoint).toBeNull();
    expect(result.serverTime).toBe('2026-09-30T10:30:00Z');
    expect(client.readAuthoritativeParent()?.revision).toBe(8);
  });
  it('does not send a command when durable storage cannot retain it', async () => {
    const broken = new TimedWorkClient(owner, work, { auth: { getUser: actor }, rpc } as TimedWorkTransport, { getItem: () => null, setItem: () => { throw new Error('quota'); } });
    await expect(broken.prepare('pause', {}, 'device-1', state())).rejects.toMatchObject({ kind: 'storage' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects corrupt or transplanted local recovery without clearing it', () => {
    const key = `lsatu:timed-work:v1:${encodeURIComponent(owner)}:${encodeURIComponent(work)}`;
    localStorage.setItem(key, '{bad');
    expect(() => client.readPending()).toThrow(TimedWorkError);
    expect(localStorage.getItem(key)).toBe('{bad');
    localStorage.setItem(key, JSON.stringify({ version: 1, ownerId: 'other', workId: work, pending: null, parent: null }));
    expect(() => client.readPending()).toThrow(/different owner/);
  });
  it('uses the distinct create RPC without trusting a supplied owner', async () => {
    const pending = await client.prepare('create', { pt: 150, pace: 'standard', sectionSeconds: 2100 }, 'device-1', null);
    rpc.mockImplementation(async (name, args) => ({ data: name.includes('capability') ? capability : { ...reply(args.p_command, state(0)), receipt: { ...reply(args.p_command).receipt, committedRevision: 0 } }, error: null }));
    expect((await client.retry()).parent.revision).toBe(0);
    expect(rpc).toHaveBeenCalledWith('create_timed_practice_test_v1', { p_command: pending });
    expect(pending).not.toHaveProperty('ownerId');
    expect(pending.writerEpoch).toBe(0);
  });
  it('rejects arbitrary patches in typed operation payloads before network writes', async () => {
    await expect(client.prepare('pause', { score: 100 } as never, 'device-1', state())).rejects.toMatchObject({ kind: 'contract' });
    await expect(client.prepare('checkpoint', { currentIndex: 0, answers: [{ qid: 'q', selected: 'Z', correct: true, timeMs: 0 }] } as never, 'device-1', state())).rejects.toMatchObject({ kind: 'contract' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('validates attributed LR checkpoint output without consuming receipt result as current state', async () => {
    await client.prepare('pause', {}, 'device-1', state());
    const record = { user_id: owner, id: crypto.randomUUID(), pool_slug: `drill::practice-test::${work}::leg-0`, completion_id: `drill::practice-test::${work}::leg-0`, question_queue: ['150:1:1', 'q2'], current_index: 1, attempts: [] };
    rpc.mockImplementation(async (name, args) => ({ data: name.includes('capability') ? capability : { ...reply(args.p_command, state(6)), checkpoint: { kind: 'lr', record }, replayed: true }, error: null }));
    const result = await client.retry();
    expect(result.parent.revision).toBe(6);
    expect(result.receipt.committedRevision).toBe(3);
    expect(result.checkpoint).toEqual({ kind: 'lr', record });
  });
  it('validates RC checkpoint/session/attempt ownership and leg binding', async () => {
    const rcState = state(); rcState.legs[0].kind = 'rc'; rcState.timed_frozen_legs[0].kind = 'rc'; rcState.legs[0].passageIds = [2];
    (rcState.timed_manifest.legs as Record<string, unknown>[])[0].kind = 'rc'; (rcState.timed_manifest.legs as Record<string, unknown>[])[0].passageIds = [2];
    const pending = await client.prepare('checkpoint', { currentIndex: 1, answers: [{ attemptId: crypto.randomUUID(), questionId: 1, passageId: 2, selected: 'B', isCorrect: false, timeMs: 100 }] }, 'device-1', rcState);
    const next = { ...rcState, revision: 3 };
    const saved = { kind: 'rc', session: { id: 'session1', user_id: owner, practice_test_run_id: work, practice_test_leg: 0, passage_ids: [2] }, attempts: [{ user_id: owner, session_id: 'session1' }] };
    rpc.mockImplementation(async name => ({ data: name.includes('capability') ? capability : { ...reply(pending, next), checkpoint: saved }, error: null }));
    expect((await client.retry()).checkpoint).toEqual(saved);
  });
  it('retains a confirmed command when writing its acknowledgment fails, enabling the same receipt retry', async () => {
    const storage = { getItem: (key: string) => localStorage.getItem(key), setItem: vi.fn((key: string, value: string) => localStorage.setItem(key, value)) };
    const durable = new TimedWorkClient(owner, work, { auth: { getUser: actor }, rpc } as TimedWorkTransport, storage);
    const pending = await durable.prepare('pause', {}, 'device-1', state());
    storage.setItem.mockImplementationOnce((key, value) => localStorage.setItem(key, value)).mockImplementationOnce(() => { throw new Error('quota'); });
    await expect(durable.retry()).rejects.toMatchObject({ kind: 'storage' });
    expect(durable.readPending()).toEqual(pending);
    expect((await durable.retry()).parent.revision).toBe(3);
  });
  it('does not accept creation for a different frozen source', async () => {
    await client.prepare('create', { pt: 150, pace: 'standard', sectionSeconds: 2100 }, 'device-1', null);
    rpc.mockImplementation(async (name, args) => {
      const next = state(0); next.pt = 151;
      return { data: name.includes('capability') ? capability : { ...reply(args.p_command, next), receipt: { ...reply(args.p_command).receipt, committedRevision: 0 } }, error: null };
    });
    await expect(client.retry()).rejects.toMatchObject({ kind: 'contract' });
    expect(client.readPending()).not.toBeNull();
  });
  it('refresh allows protected history while new writes remain disabled', async () => {
    capability = { contractVersion: 1, enabled: false, workKind: 'practice-test', operations: [...TIMED_WORK_OPERATIONS, 'read'] };
    rpc.mockImplementation(async name => ({ data: name.includes('capability') ? capability : { parent: state(), checkpoint: null, serverTime: '2026-09-30T10:00:00Z' }, error: null }));
    expect((await client.refresh()).parent.revision).toBe(2);
    await client.prepare('pause', {}, 'device-1', state());
    await expect(client.retry()).rejects.toMatchObject({ kind: 'capability' });
  });
  it('retains original checkpoint payload authority across a refresh to the next leg', async () => {
    const pending = await client.prepare('checkpoint', { currentIndex: 1, answers: [{ qid: '150:1:1', selected: 'A', correct: true, timeMs: 100 }] }, 'device-1', state());
    const newer = state(9); newer.current_leg = 1; newer.timed_clock_leg = null; newer.timed_phase = 'ready'; newer.timed_elapsed_ms = 0;
    rpc.mockImplementation(async (name, args) => ({ data: name.includes('capability') ? capability : name === 'read_timed_practice_test_v1' ? { parent: newer, checkpoint: null, serverTime: '2026-09-30T10:00:00Z' } : { ...reply(args.p_command, newer), replayed: true }, error: null }));
    await client.refresh();
    expect(client.readPending()).toEqual(pending);
    expect((await client.retry()).parent.current_leg).toBe(1);
  });
  it('rejects full-manifest or manifest-hash changes despite identical short leg definitions', async () => {
    await client.prepare('pause', {}, 'device-1', state());
    const newer = state(3); newer.timed_manifest_sha256 = 'b'.repeat(64);
    rpc.mockImplementation(async name => ({ data: name.includes('capability') ? capability : { parent: newer, checkpoint: null, serverTime: '2026-09-30T10:00:00Z' }, error: null }));
    await expect(client.refresh()).rejects.toMatchObject({ kind: 'contract' });
    newer.timed_manifest_sha256 = 'a'.repeat(64);
    ((newer.timed_manifest.legs as Record<string, unknown>[])[0].questions as Record<string, unknown>[])[0].content = 'different content';
    await expect(client.refresh()).rejects.toMatchObject({ kind: 'contract' });
    expect(client.readPending()).not.toBeNull();
  });
  it.each(['PT409', 'PT410', 'PT401'])('deliberately archives a definite %s rejection before allowing a fresh claim', async code => {
    const pending = await client.prepare('checkpoint', { currentIndex: 1, answers: [{ qid: '150:1:1', selected: 'A', correct: true, timeMs: 100 }] }, 'device-1', state());
    const newer = state(9); newer.timed_writer_epoch = 2;
    rpc.mockImplementation(async name => name.includes('capability') ? { data: capability, error: null } : name === 'read_timed_practice_test_v1'
      ? { data: { parent: newer, checkpoint: null, serverTime: '2026-09-30T10:00:00Z' }, error: null } : { data: null, error: { code, message: 'definitely denied', details: JSON.stringify({ parent: newer }) } });
    await expect(client.retry()).rejects.toBeInstanceOf(TimedWorkError);
    expect(client.readRejection()?.command).toEqual(pending);
    await client.archiveRejected();
    expect(client.readPending()).toBeNull();
    expect(client.readArchivedCommands()[0]).toMatchObject({ command: pending, rejection: { code }, authoritativeParent: { revision: 9 } });
    const claim = await client.prepare('claim', {}, 'device-1', newer);
    expect(claim.commandId).not.toBe(pending.commandId);
    expect(claim.expectedRevision).toBe(9);
    expect(claim.writerEpoch).toBe(2);
  });
  it('cannot archive a lost reply or reuse an older denial after another uncertain transmission', async () => {
    await client.prepare('pause', {}, 'device-1', state());
    rpc.mockImplementation(async name => name.includes('capability') ? { data: capability, error: null } : { data: null, error: { code: 'PT410', message: 'expired' } });
    await expect(client.retry()).rejects.toMatchObject({ kind: 'expired-writer' });
    expect(client.readRejection()).not.toBeNull();
    rpc.mockImplementation(async name => { if (name.includes('capability')) return { data: capability, error: null }; throw new Error('reply lost'); });
    await expect(client.retry()).rejects.toMatchObject({ kind: 'transport' });
    expect(client.readRejection()).toBeNull();
    await expect(client.archiveRejected()).rejects.toThrow(/lost reply/);
    expect(client.readPending()).not.toBeNull();
  });
  it('distinguishes changed-command replay from a safe definitive writer rejection', async () => {
    await client.prepare('pause', {}, 'device-1', state());
    rpc.mockImplementation(async name => name.includes('capability') ? { data: capability, error: null } : { data: null, error: { code: 'PT412', message: 'Any translated receipt rejection text' } });
    await expect(client.retry()).rejects.toMatchObject({ kind: 'replay-mismatch' });
    expect(client.readRejection()).toBeNull();
    await expect(client.archiveRejected()).rejects.toThrow(/definite server rejection/);
  });
  it('rejects stale reads and same-revision contradictory reads without changing saved authority', async () => {
    await client.prepare('pause', {}, 'device-1', state(8));
    const original = localStorage.getItem(localStorage.key(0)!);
    let incoming = state(7);
    rpc.mockImplementation(async name => ({ data: name.includes('capability') ? capability : { parent: incoming, checkpoint: null, serverTime: '2026-09-30T10:00:00Z' }, error: null }));
    await expect(client.refresh()).rejects.toMatchObject({ kind: 'conflict' });
    expect(localStorage.getItem(localStorage.key(0)!)).toBe(original);
    incoming = state(8); incoming.active_device_id = 'contradictory-device';
    await expect(client.refresh()).rejects.toMatchObject({ kind: 'contract' });
    expect(localStorage.getItem(localStorage.key(0)!)).toBe(original);
  });
  it('serializes concurrent preparation from two independent contexts so one UUID is retained and transmitted', async () => {
    const second = create();
    const prepared = await Promise.allSettled([client.prepare('pause', {}, 'device-1', state()), second.prepare('pause', {}, 'device-1', state())]);
    expect(prepared.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(prepared.filter(result => result.status === 'rejected')).toHaveLength(1);
    const pending = client.readPending(); expect(second.readPending()).toEqual(pending);
    const acks = await Promise.allSettled([client.retry(), second.retry()]);
    expect(acks.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(rpc.mock.calls.filter(([name]) => name === 'commit_timed_work_v1')).toHaveLength(1);
    expect(rpc.mock.calls.find(([name]) => name === 'commit_timed_work_v1')![1].p_command.commandId).toBe(pending!.commandId);
    expect(client.readReceipt()?.commandId).toBe(pending!.commandId);
  });
  it('fails closed if the browser cannot provide a real cross-context lock coordinator', async () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    const unsupported = create();
    await expect(unsupported.prepare('pause', {}, 'device-1', state())).rejects.toMatchObject({ kind: 'storage' });
    await expect(unsupported.refresh()).rejects.toMatchObject({ kind: 'storage' });
    expect(rpc).not.toHaveBeenCalled();
    expect(unsupported.readPending()).toBeNull();
  });
});


describe('protected question-state and RC analysis contract', () => {
  it('retains unanswered LR question states under the same command after reply loss', async () => {
    const payload = { currentIndex: 0, answers: [], questionStates: [{ qid: 'q2', timeMs: 300, flagged: true, eliminations: ['A' as const, 'B' as const] }] };
    const pending = await client.prepare('checkpoint', payload, 'device-1', state());
    rpc.mockImplementation(async name => { if (name.includes('capability')) return { data: capability, error: null }; throw new Error('lost'); });
    await expect(client.retry()).rejects.toMatchObject({ kind: 'transport' });
    expect(create().readPending()).toEqual(pending);
    expect(pending.payload).toEqual(payload);
  });
  it.each([
    [{ qid: 'foreign', timeMs: 1, flagged: false, eliminations: [] }],
    [{ qid: 'q2', timeMs: -1, flagged: false, eliminations: [] }],
    [{ qid: 'q2', timeMs: 1, flagged: false, eliminations: ['A', 'A'] }],
    [{ qid: 'q2', timeMs: 1, flagged: false, eliminations: [] }, { qid: 'q2', timeMs: 2, flagged: false, eliminations: [] }],
  ])('rejects invalid or duplicate LR state before persisting (%j)', async questionStates => {
    await expect(client.prepare('checkpoint', { currentIndex: 0, answers: [], questionStates } as never, 'device-1', state())).rejects.toMatchObject({ kind: 'contract' });
    expect(client.readPending()).toBeNull();
  });
  it('permits optional RC analysis and rejects LR fields for the RC contract', async () => {
    const rc = state(); const leg = { kind: 'rc', section: 1, questionCount: 2, passageIds: [7] };
    rc.timed_frozen_legs[0] = leg; rc.legs[0] = leg; (rc.timed_manifest.legs as Record<string, unknown>[])[0] = { ...leg, qids: ['1', '2'], questions: [{ qid: '1' }, { qid: '2' }] };
    await expect(client.prepare('checkpoint', { currentIndex: 0, answers: [], questionStates: [] } as never, 'device-1', rc)).rejects.toMatchObject({ kind: 'contract' });
    expect((await client.prepare('close-leg', { analysis: { summary: 'saved' } }, 'device-1', rc)).payload).toEqual({ analysis: { summary: 'saved' } });
  });
});
