import {
  TimedSectionClient, TimedSectionError, type TimedSectionAcknowledgment,
  type TimedSectionAuthority, type TimedSectionOperation, type TimedSectionPayloads,
} from './timedSectionClient';

export interface TimedSectionSnapshot extends TimedSectionAuthority {
  observedAt: number;
  pending: ReturnType<TimedSectionClient['readPending']>;
  rejection: ReturnType<TimedSectionClient['readRejection']>;
}
export interface TimedSectionClock {
  elapsedMs: number;
  remainingMs: number | null;
  leaseExpired: boolean;
  writer: 'active' | 'claim-required' | 'pending-recovery' | 'terminal';
}

/** Display estimate only. Account mutations remain subject to server clock and CAS. */
export function timedSectionClock(snapshot: TimedSectionSnapshot, deviceId: string, now = performance.now()): TimedSectionClock {
  const sitting = snapshot.sitting;
  if (!Number.isFinite(now) || !Number.isFinite(snapshot.observedAt)) throw new TimedSectionError('contract', 'A monotonic section clock sample is required.');
  const serverNow = Date.parse(snapshot.serverTime) + Math.max(0, now - snapshot.observedAt);
  const running = sitting.phase === 'running';
  const expiry = sitting.lease_expires_at === null ? null : Date.parse(sitting.lease_expires_at);
  const anchor = sitting.clock_anchor_at === null ? null : Date.parse(sitting.clock_anchor_at);
  if (!Number.isFinite(serverNow) || running && (expiry === null || anchor === null || !Number.isFinite(expiry) || !Number.isFinite(anchor))) {
    throw new TimedSectionError('contract', 'The account section has no valid running clock authority.');
  }
  const leaseExpired = running && serverNow >= expiry!;
  const elapsedMs = sitting.elapsed_ms + (running ? Math.max(0, Math.min(serverNow, expiry!) - anchor!) : 0);
  const terminal = sitting.phase === 'complete' || sitting.phase === 'abandoned';
  const writer = terminal ? 'terminal' : snapshot.pending ? 'pending-recovery'
    : sitting.device_id !== deviceId || leaseExpired ? 'claim-required' : 'active';
  return { elapsedMs, remainingMs: sitting.budget_ms === null ? null : Math.max(0, sitting.budget_ms - elapsedMs), leaseExpired, writer };
}

const phases: Record<Exclude<TimedSectionOperation, 'create' | 'claim'>, readonly string[]> = {
  start: ['ready'], checkpoint: ['running'], heartbeat: ['running'], pause: ['running'],
  resume: ['paused'], close: ['running', 'paused'], abandon: ['ready', 'running', 'paused'],
};

/** Standalone sitting authority; never constructs a full-PrepTest parent or uses legacy writers. */
export class TimedSectionStore {
  constructor(private readonly client: TimedSectionClient, private readonly deviceId: string,
    private readonly now: () => number = () => performance.now()) {}

  private snapshot(value: TimedSectionAuthority): TimedSectionSnapshot {
    return { ...value, observedAt: this.now(), pending: this.client.readPending(), rejection: this.client.readRejection() };
  }
  async load(): Promise<TimedSectionSnapshot> { return this.snapshot(await this.client.refresh()); }

  async prepare<O extends TimedSectionOperation>(operation: O, payload: TimedSectionPayloads[O], snapshot: TimedSectionSnapshot | null) {
    if (operation === 'create' ? snapshot !== null : snapshot === null) throw new TimedSectionError('invalid-command', 'Creation and existing-section commands require different authority.');
    // Re-read durable pending state: an old component snapshot cannot bypass another tab's command.
    if (snapshot?.pending || this.client.readPending()) throw new TimedSectionError('conflict', 'Resolve the retained section command before another transition.');
    if (snapshot) {
      const clock = timedSectionClock(snapshot, this.deviceId, this.now());
      if (clock.writer === 'terminal') throw new TimedSectionError('invalid-command', 'A finished section cannot accept another transition.');
      if (operation !== 'claim' && clock.writer !== 'active') throw new TimedSectionError('expired-writer', 'Claim the account section writer before preparing another command.');
      if (operation !== 'create' && operation !== 'claim' && !phases[operation as keyof typeof phases].includes(snapshot.sitting.phase)) {
        throw new TimedSectionError('invalid-command', 'This transition is unavailable in the acknowledged section phase.');
      }
    }
    return this.client.prepare(operation, payload, this.deviceId, snapshot?.sitting ?? null);
  }
  async retry(): Promise<TimedSectionSnapshot & { acknowledgment: TimedSectionAcknowledgment }> {
    const acknowledgment = await this.client.retry();
    return { ...this.snapshot(acknowledgment), acknowledgment };
  }
  async heartbeat(snapshot: TimedSectionSnapshot): Promise<TimedSectionSnapshot & { acknowledgment: TimedSectionAcknowledgment }> {
    await this.prepare('heartbeat', {}, snapshot);
    return this.retry();
  }
  async archiveRejectedCommand(): Promise<TimedSectionSnapshot> {
    return this.snapshot(await this.client.archiveRejected());
  }
}
