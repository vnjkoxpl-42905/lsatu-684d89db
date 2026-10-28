import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimedWorkClient, TIMED_WORK_OPERATIONS, type TimedWorkParent, type TimedWorkTransport } from './timedWorkClient';
import { TimedPracticeTestStore, timedParentToPracticeTestRun, timedPracticeTestChildLaunch, timedPracticeTestClock, type TimedPracticeTestSnapshot } from './timedPracticeTestStore';

const owner = 'owner'; const runId = 'existing-text-run'; const observedAt = 100000;
const serverTime = '2026-09-30T12:00:10Z';
function authority(): TimedWorkParent {
  const lr = { kind: 'lr', section: 1, questionCount: 2 }; const rc = { kind: 'rc', section: 2, questionCount: 2, passageIds: [20, 21] };
  return { id: runId, user_id: owner, pt: 150, pace: 'time-and-a-half', section_seconds: 3150, revision: 2, timed_contract_version: 1, timed_writer_epoch: 1,
    timed_phase: 'leg-running', timed_elapsed_ms: 5000, timed_clock_leg: 0, timed_running_anchor: '2026-09-30T12:00:00Z', timed_lease_expires_at: '2026-09-30T12:00:45Z', timed_lease_ms: 45000,
    timed_frozen_legs: [lr, rc], legs: [lr, rc], timed_manifest_sha256: 'a'.repeat(64), timed_manifest: { pt: 150, legs: [lr, rc].map(leg => ({ ...leg, qids: ['q1', 'q2'], questions: [{ qid: 'q1' }, { qid: 'q2' }] })) },
    current_leg: 0, active_device_id: 'device-1', status: 'in-progress', break_after_leg: 1, break_taken: false, created_at: '2026-09-30T11:00:00Z', updated_at: serverTime, break_started_at: null };
}
function lrCheckpoint() { return { kind: 'lr', record: { id: 'saved-record', user_id: owner, completion_id: `drill::practice-test::${runId}::leg-0`, question_queue: ['q1', 'q2'], current_index: 1, attempts: [], pool_slug: `drill::practice-test::${runId}::leg-0` } }; }
function snapshot(parent = authority()): TimedPracticeTestSnapshot { return { parent, run: timedParentToPracticeTestRun(parent), checkpoint: lrCheckpoint(), serverTime, observedAt, receipt: null, pending: null, rejection: null }; }
beforeEach(() => { localStorage.clear(); Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: async (_name: string, callback: () => Promise<unknown>) => callback() } }); });

describe('protected parent mapping and launch metadata', () => {
  it('maps existing run identity, frozen accommodation, revision and leg results without rewriting history', () => {
    const p = authority(); p.legs[0] = { ...p.legs[0], correct: 1, answered: 2, timeMs: 90000, startedAt: '2026-09-30T11:00:00Z', completedAt: '2026-09-30T11:01:30Z' };
    const before = JSON.stringify(p); const mapped = timedParentToPracticeTestRun(p);
    expect(mapped).toMatchObject({ id: runId, userId: owner, revision: 2, activeDeviceId: 'device-1', pace: 'time-and-a-half', sectionSeconds: 3150, breakAfterLeg: 1, breakTaken: false });
    expect(mapped.legs[0]).toMatchObject({ correct: 1, answered: 2, timeMs: 90000 });
    expect(JSON.stringify(p)).toBe(before);
    mapped.legs[0].correct = 2;
    expect(p.legs[0].correct).toBe(1);
  });
  it('refuses legacy parent adoption and incomplete metadata', () => {
    const p = authority(); p.timed_contract_version = null as unknown as 1;
    expect(() => timedParentToPracticeTestRun(p)).toThrow(/Legacy adoption/);
    const incomplete = authority(); delete incomplete.created_at;
    expect(() => timedParentToPracticeTestRun(incomplete)).toThrow(/Legacy adoption/);
  });
  it('freezes display elapsed at lease expiry and requests claim without granting new time', () => {
    const s = snapshot();
    expect(timedPracticeTestClock(s, 'device-1', observedAt)).toEqual({ elapsedMs: 15000, remainingMs: 3135000, leaseExpired: false, writer: 'active' });
    expect(timedPracticeTestClock(s, 'device-1', observedAt + 100000)).toMatchObject({ elapsedMs: 50000, leaseExpired: true, writer: 'claim-required' });
    expect(timedPracticeTestClock(s, 'device-1', observedAt + 900000).elapsedMs).toBe(50000);
    expect(timedPracticeTestClock(s, 'device-2', observedAt).writer).toBe('claim-required');
  });
  it('uses a monotonic sample for lease expiry even if the wall clock moves backwards', () => {
    const s = snapshot();
    const wall = vi.spyOn(Date, 'now').mockReturnValue(0);
    const monotonic = vi.spyOn(performance, 'now').mockReturnValue(observedAt + 100000);
    expect(timedPracticeTestClock(s, 'device-1')).toMatchObject({ leaseExpired: true, writer: 'claim-required', elapsedMs: 50000 });
    wall.mockRestore(); monotonic.mockRestore();
  });
  it('keeps paused elapsed stable, untimed remaining null, and the break at its 600-second budget', () => {
    const p = authority(); p.timed_phase = 'leg-paused'; p.timed_running_anchor = null; p.timed_lease_expires_at = null; p.pace = 'untimed'; p.section_seconds = null;
    expect(timedPracticeTestClock(snapshot(p), 'device-1', observedAt + 10000)).toMatchObject({ elapsedMs: 5000, remainingMs: null });
    p.timed_phase = 'break-paused'; p.timed_clock_leg = null; p.current_leg = 1;
    expect(timedPracticeTestClock(snapshot(p), 'device-1', observedAt + 10000).remainingMs).toBe(595000);
  });
  it('launches LR only from the exact saved account queue and source identity', () => {
    const s = snapshot();
    expect(timedPracticeTestChildLaunch(s, 'device-1', observedAt)).toMatchObject({ kind: 'lr', recordId: 'saved-record', sourceKey: `drill::practice-test::${runId}::leg-0`, questionQueue: ['q1', 'q2'], currentIndex: 1, sectionSeconds: 3150 });
    (s.checkpoint!.record as Record<string, unknown>).question_queue = ['q1', 'q1'];
    expect(() => timedPracticeTestChildLaunch(s, 'device-1', observedAt)).toThrow(/queue/);
    s.checkpoint = null;
    expect(() => timedPracticeTestChildLaunch(s, 'device-1', observedAt)).toThrow(/not acknowledged/);
  });
  it('launches RC using the exact session and passage order, rejecting mismatched attribution', () => {
    const p = authority(); p.current_leg = 1; p.timed_clock_leg = 1;
    const s = snapshot(p); s.checkpoint = { kind: 'rc', session: { id: 'rc-session', user_id: owner, practice_test_run_id: runId, practice_test_leg: 1, passage_ids: [20, 21] }, attempts: [] };
    expect(timedPracticeTestChildLaunch(s, 'device-1', observedAt)).toMatchObject({ kind: 'rc', sessionId: 'rc-session', passageIds: [20, 21], legIndex: 1 });
    (s.checkpoint.session as Record<string, unknown>).passage_ids = [21, 20];
    expect(() => timedPracticeTestChildLaunch(s, 'device-1', observedAt)).toThrow(/passages/);
  });
  it('blocks opening a child under pending recovery, another writer or expiry', () => {
    const s = snapshot(); s.pending = { workKind: 'practice-test', workId: runId, commandId: crypto.randomUUID(), deviceId: 'device-1', expectedRevision: 2, writerEpoch: 1, operation: 'pause', payload: {} };
    expect(timedPracticeTestClock(s, 'device-1', observedAt).writer).toBe('pending-recovery');
    expect(() => timedPracticeTestChildLaunch(s, 'device-1', observedAt)).toThrow(/Claim or recover/);
    s.pending = null;
    expect(() => timedPracticeTestChildLaunch(s, 'device-2', observedAt)).toThrow(/Claim or recover/);
  });
});

describe('isolated account store preparation', () => {
  function setup() {
    let parent = authority();
    const capability = { contractVersion: 1, enabled: true, workKind: 'practice-test', operations: [...TIMED_WORK_OPERATIONS, 'read'] };
    const rpc = vi.fn(async (name: string, args?: unknown) => {
      if (name.includes('capability')) return { data: capability, error: null };
      if (name === 'read_timed_practice_test_v1') return { data: { parent, checkpoint: lrCheckpoint(), serverTime }, error: null };
      const command = (args as { p_command: unknown }).p_command as ReturnType<TimedWorkClient['readPending']>;
      parent = { ...parent, revision: parent.revision + 1, timed_phase: 'leg-paused', timed_running_anchor: null, timed_lease_expires_at: null, timed_elapsed_ms: 15000 };
      return { data: { parent, checkpoint: lrCheckpoint(), serverTime, replayed: false, receipt: { ownerId: owner, workKind: 'practice-test', workId: runId, commandId: command!.commandId, operation: command!.operation, command, committedRevision: parent.revision, result: {} } }, error: null };
    });
    const client = new TimedWorkClient(owner, runId, { auth: { getUser: async () => ({ data: { user: { id: owner } }, error: null }) }, rpc } as TimedWorkTransport);
    const store = new TimedPracticeTestStore(client, 'device-1', () => observedAt);
    return { store, client, rpc };
  }
  it('loads one atomic account snapshot and consumes acknowledged parent/receipt after control commands', async () => {
    const { store, client, rpc } = setup();
    const s = await store.load();
    expect(rpc).toHaveBeenCalledWith('read_timed_practice_test_v1', { p_work_id: runId });
    const command = await store.prepare('pause', {}, s);
    const result = await store.retry();
    expect(result.run.revision).toBe(3);
    expect(result.parent.timed_phase).toBe('leg-paused');
    expect(result.receipt?.commandId).toBe(command.commandId);
    expect(client.readReceipt()?.commandId).toBe(command.commandId);
    expect(result.pending).toBeNull();
  });
  it('refresh preserves pending envelope and its original authority for receipt replay', async () => {
    const { store, client } = setup();
    const s = await store.load(); const pending = await store.prepare('pause', {}, s);
    expect((await store.load()).pending).toEqual(pending);
    expect(client.readPending()?.expectedRevision).toBe(2);
    await expect(store.prepare('resume', {}, await store.load())).rejects.toMatchObject({ kind: 'conflict' });
  });
  it('blocks local transition from another device but permits explicit claim preparation', async () => {
    const { store } = setup(); const s = await store.load(); s.parent.active_device_id = 'other-device';
    await expect(store.prepare('pause', {}, s)).rejects.toMatchObject({ kind: 'expired-writer' });
    expect((await store.prepare('claim', {}, s)).operation).toBe('claim');
  });
  it('prepares heartbeat for a running break and rejects renewal after lease expiry', async () => {
    const { client, store } = setup();
    const p = authority(); p.current_leg = 1; p.timed_clock_leg = null; p.timed_phase = 'break-running';
    const s = snapshot(p);
    const expiredStore = new TimedPracticeTestStore(client, 'device-1', () => observedAt + 100000);
    await expect(expiredStore.heartbeat(s)).rejects.toMatchObject({ kind: 'expired-writer' });
    expect(client.readPending()).toBeNull();
    expect((await store.prepare('heartbeat', {}, s)).operation).toBe('heartbeat');
  });
});
