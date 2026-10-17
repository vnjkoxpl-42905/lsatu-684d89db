import { describe, expect, it, vi } from 'vitest';
import { TimedSectionClient, type TimedSectionSitting } from './timedSectionClient';
import { TimedSectionStore, timedSectionClock, type TimedSectionSnapshot } from './timedSectionStore';

function snapshot(phase: TimedSectionSitting['phase'] = 'running'): TimedSectionSnapshot {
  const running = phase === 'running';
  return { contractVersion: 1, workKind: 'standalone-section', observedAt: 1000,
    serverTime: '2026-09-30T10:00:05Z', pending: null, rejection: null, receipt: null, replayed: false, child: null,
    sitting: { id: '20000000-0000-4000-8000-000000000001', owner_id: '10000000-0000-4000-8000-000000000001', kind: 'lr',
      source_kind: 'manual-canonical', source_key: 'lr::pt140-s1', pt: 140, section: 1, manifest_sha256: 'a'.repeat(64),
      frozen_source: {}, frozen_qids: [], pace: 'standard', budget_ms: 2100000, lease_ms: 30000, phase,
      revision: 2, writer_epoch: 1, device_id: 'device-a', elapsed_ms: 2000,
      clock_anchor_at: running ? '2026-09-30T10:00:00Z' : null,
      lease_expires_at: running ? '2026-09-30T10:00:30Z' : null,
      current_index: 0, snapshot: {}, result: null, completed_at: null,
      created_at: '2026-09-30T09:00:00Z', updated_at: '2026-09-30T10:00:00Z' } };
}
function setup() {
  const client = { refresh: vi.fn().mockResolvedValue(snapshot()), readPending: vi.fn().mockReturnValue(null),
    readRejection: vi.fn().mockReturnValue(null), prepare: vi.fn().mockResolvedValue({}),
    retry: vi.fn().mockResolvedValue(snapshot()), archiveRejected: vi.fn().mockResolvedValue(snapshot('paused')) };
  const now = vi.fn().mockReturnValue(1000);
  return { client, now, store: new TimedSectionStore(client as unknown as TimedSectionClient, 'device-a', now) };
}

describe('standalone section authority store', () => {
  it('bounds elapsed display at lease expiry and requires a claim rather than continuing an offline clock', () => {
    const state = snapshot();
    expect(timedSectionClock(state, 'device-a', 11000)).toMatchObject({ elapsedMs: 17000, leaseExpired: false, writer: 'active' });
    expect(timedSectionClock(state, 'device-a', 3601000)).toMatchObject({ elapsedMs: 32000, leaseExpired: true, writer: 'claim-required' });
    expect(timedSectionClock(state, 'device-a', 26000).leaseExpired).toBe(true);
  });
  it('ignores negative monotonic drift, keeps paused clocks fixed, and supports untimed budgets', () => {
    expect(timedSectionClock(snapshot(), 'device-a', 0).elapsedMs).toBe(7000);
    const state = snapshot('paused'); state.sitting.budget_ms = null;
    expect(timedSectionClock(state, 'device-a', 900000)).toEqual({ elapsedMs: 2000, remainingMs: null, leaseExpired: false, writer: 'active' });
  });
  it('blocks non-finite clock samples and malformed running authority', () => {
    expect(() => timedSectionClock(snapshot(), 'device-a', NaN)).toThrow('monotonic');
    const state = snapshot(); state.sitting.clock_anchor_at = null;
    expect(() => timedSectionClock(state, 'device-a')).toThrow('clock authority');
  });
  it('keeps foreign writers and retained commands visibly separate from terminal authority', () => {
    const state = snapshot();
    expect(timedSectionClock(state, 'other-device', 1000).writer).toBe('claim-required');
    state.pending = { workKind: 'standalone-section', workId: state.sitting.id, commandId: 'command', deviceId: 'device-a', operation: 'pause', expectedRevision: 2, writerEpoch: 1, payload: {} };
    expect(timedSectionClock(state, 'device-a', 1000).writer).toBe('pending-recovery');
    state.sitting.phase = 'complete';
    expect(timedSectionClock(state, 'device-a', 1000).writer).toBe('terminal');
  });
  it('samples fresh account responses without constructing a PT parent', async () => {
    const { store, now } = setup(); now.mockReturnValue(1234);
    const state = await store.load();
    expect(state.observedAt).toBe(1234); expect(state).not.toHaveProperty('parent');
    expect(state.workKind).toBe('standalone-section');
  });
  it('prevents expired writes while retaining explicit user-directed claim recovery', async () => {
    const { store, now, client } = setup(); now.mockReturnValue(26000);
    await expect(store.prepare('pause', {}, snapshot())).rejects.toMatchObject({ kind: 'expired-writer' });
    expect(client.prepare).not.toHaveBeenCalled();
    await store.prepare('claim', {}, snapshot());
    expect(client.prepare).toHaveBeenCalledWith('claim', {}, 'device-a', snapshot().sitting);
  });
  it('re-reads durable pending state even if the caller snapshot predates another tab', async () => {
    const { store, client } = setup(); client.readPending.mockReturnValue({ operation: 'checkpoint' });
    await expect(store.prepare('pause', {}, snapshot())).rejects.toMatchObject({ kind: 'conflict' });
    await expect(store.prepare('create', { kind: 'lr', pt: 140, section: 1, pace: 'standard' }, null)).rejects.toMatchObject({ kind: 'conflict' });
    expect(client.prepare).not.toHaveBeenCalled();
  });
  it('rejects paused heartbeat and premature close without transmitting a command', async () => {
    const { store, client } = setup();
    await expect(store.heartbeat(snapshot('paused'))).rejects.toMatchObject({ kind: 'invalid-command' });
    await expect(store.prepare('close', { answerKeys: [] }, snapshot('ready'))).rejects.toMatchObject({ kind: 'invalid-command' });
    await expect(store.prepare('claim', {}, snapshot('complete'))).rejects.toMatchObject({ kind: 'invalid-command' });
    expect(client.prepare).not.toHaveBeenCalled(); expect(client.retry).not.toHaveBeenCalled();
  });
  it('heartbeat prepares before retry and retry never replaces a pending command', async () => {
    const { store, client } = setup(); await store.heartbeat(snapshot());
    expect(client.prepare).toHaveBeenCalledWith('heartbeat', {}, 'device-a', snapshot().sitting);
    expect(client.prepare.mock.invocationCallOrder[0]).toBeLessThan(client.retry.mock.invocationCallOrder[0]);
    client.prepare.mockClear(); await store.retry(); expect(client.prepare).not.toHaveBeenCalled();
  });
  it('does not retry an unretained heartbeat if preparation fails', async () => {
    const { store, client } = setup(); client.prepare.mockRejectedValue(new Error('storage unavailable'));
    await expect(store.heartbeat(snapshot())).rejects.toThrow('storage unavailable');
    expect(client.retry).not.toHaveBeenCalled();
  });
});
