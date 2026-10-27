import type { PracticeTestLeg, PracticeTestPaceId, PracticeTestRun, PracticeTestStatus } from './practiceTest';
import { TimedWorkClient, TimedWorkError, type TimedObject, type TimedWorkAcknowledgment, type TimedWorkCommand, type TimedWorkOperation, type TimedWorkParent, type TimedWorkPayloads, type TimedWorkReceipt, type TimedWorkRejection } from './timedWorkClient';

export interface TimedPracticeTestSnapshot {
  run: PracticeTestRun;
  parent: TimedWorkParent;
  checkpoint: TimedObject | null;
  serverTime: string;
  observedAt: number;
  receipt: TimedWorkReceipt | null;
  pending: TimedWorkCommand | null;
  rejection: TimedWorkRejection | null;
}
export interface TimedPracticeTestClock {
  elapsedMs: number;
  remainingMs: number | null;
  leaseExpired: boolean;
  writer: 'active' | 'claim-required' | 'pending-recovery' | 'terminal';
}
export type TimedPracticeTestChildLaunch =
  | { kind: 'lr'; runId: string; ownerId: string; legIndex: number; pt: number; section: number; sectionSeconds: number | null; recordId: string; sourceKey: string; questionQueue: string[]; currentIndex: number; record: TimedObject }
  | { kind: 'rc'; runId: string; ownerId: string; legIndex: number; pt: number; section: number; sectionSeconds: number | null; sessionId: string; passageIds: number[]; session: TimedObject; attempts: TimedObject[] };
function invalid(message: string): never { throw new TimedWorkError('contract', message); }
const object = (value: unknown): value is TimedObject => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const iso = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

/** Only already protected, account-validated v1 parents enter this adapter. */
export function timedParentToPracticeTestRun(parent: TimedWorkParent): PracticeTestRun {
  if (parent.timed_contract_version !== 1 || !parent.user_id || !parent.id || !integer(parent.revision) || !iso(parent.created_at)
    || !integer(parent.break_after_leg) || parent.break_after_leg < 1 || parent.break_after_leg >= parent.legs.length || typeof parent.break_taken !== 'boolean') invalid('A protected parent with complete account metadata is required. Legacy adoption is not supported.');
  const legs: PracticeTestLeg[] = parent.legs.map(value => {
    if (!['lr', 'rc'].includes(value.kind as string) || !integer(value.section) || !integer(value.questionCount)) invalid('Invalid authoritative leg definition.');
    const leg: PracticeTestLeg = { kind: value.kind as 'lr' | 'rc', section: value.section, questionCount: value.questionCount };
    if (value.passageIds !== undefined) {
      if (!Array.isArray(value.passageIds) || value.passageIds.some(id => !integer(id))) invalid('Invalid frozen passages.');
      leg.passageIds = [...value.passageIds] as number[];
    }
    for (const key of ['startedAt', 'completedAt'] as const) { if (value[key] !== undefined) { if (!iso(value[key])) invalid('Invalid leg timestamp.'); leg[key] = value[key]; } }
    for (const key of ['correct', 'answered', 'timeMs'] as const) { if (value[key] !== undefined) { if (!integer(value[key]) || (key !== 'timeMs' && value[key] > leg.questionCount)) invalid('Invalid official leg result.'); leg[key] = value[key]; } }
    return leg;
  });
  return { timedContractVersion: 1, id: parent.id, userId: parent.user_id, revision: parent.revision, activeDeviceId: parent.active_device_id,
    ...(iso(parent.updated_at) ? { updatedAt: parent.updated_at } : {}), pt: parent.pt, pace: parent.pace as PracticeTestPaceId,
    sectionSeconds: parent.section_seconds, legs, currentLeg: parent.current_leg, breakAfterLeg: parent.break_after_leg,
    breakTaken: parent.break_taken, ...(iso(parent.break_started_at) ? { breakStartedAt: parent.break_started_at } : {}),
    status: parent.status as PracticeTestStatus, createdAt: parent.created_at };
}

/** Server-time anchored display estimate, bounded by the acknowledged lease. */
export function timedPracticeTestClock(snapshot: TimedPracticeTestSnapshot, deviceId: string, now = performance.now()): TimedPracticeTestClock {
  const p = snapshot.parent;
  const serverNow = Date.parse(snapshot.serverTime) + Math.max(0, now - snapshot.observedAt);
  const running = p.timed_phase === 'leg-running' || p.timed_phase === 'break-running';
  const expiry = p.timed_lease_expires_at === null ? null : Date.parse(p.timed_lease_expires_at);
  const leaseExpired = running && expiry !== null && serverNow >= expiry;
  const delta = running ? Math.max(0, Math.min(serverNow, expiry!) - Date.parse(p.timed_running_anchor!)) : 0;
  const elapsedMs = p.timed_elapsed_ms + delta;
  const budget = p.timed_phase.startsWith('break-') ? 600000 : p.section_seconds === null ? null : p.section_seconds * 1000;
  const terminal = p.status !== 'in-progress';
  const writer = terminal ? 'terminal' : snapshot.pending ? 'pending-recovery' : p.active_device_id !== deviceId || leaseExpired ? 'claim-required' : 'active';
  return { elapsedMs, remainingMs: budget === null ? null : Math.max(0, budget - elapsedMs), leaseExpired, writer };
}

/** Exact acknowledged child identity. Missing content is an error, never a new queue. */
export function timedPracticeTestChildLaunch(snapshot: TimedPracticeTestSnapshot, deviceId: string, now = performance.now()): TimedPracticeTestChildLaunch {
  const { parent: p, checkpoint: saved } = snapshot;
  if (timedPracticeTestClock(snapshot, deviceId, now).writer !== 'active' || !['leg-running', 'leg-paused'].includes(p.timed_phase)) throw new TimedWorkError('expired-writer', 'Claim or recover the account writer before opening this section.');
  const definition = p.timed_frozen_legs[p.current_leg];
  if (!definition || !saved) invalid('The account has not acknowledged this child. Start the leg and reload its frozen checkpoint.');
  const common = { runId: p.id, ownerId: p.user_id, legIndex: p.current_leg, pt: p.pt, section: definition.section as number, sectionSeconds: p.section_seconds };
  if (definition.kind === 'lr' && saved.kind === 'lr' && object(saved.record)) {
    const record = saved.record;
    const sourceKey = `drill::practice-test::${p.id}::leg-${p.current_leg}`;
    if (record.user_id !== p.user_id || record.completion_id !== sourceKey || typeof record.id !== 'string' || !Array.isArray(record.question_queue)
      || record.pool_slug !== sourceKey || record.question_queue.length !== definition.questionCount || record.question_queue.some(qid => typeof qid !== 'string') || new Set(record.question_queue).size !== record.question_queue.length
      || JSON.stringify(record.question_queue) !== JSON.stringify((p.timed_manifest.legs as TimedObject[])[p.current_leg].qids)
      || !integer(record.current_index) || record.current_index > record.question_queue.length) invalid('The saved LR child contradicts its frozen run or queue.');
    return { ...common, kind: 'lr', recordId: record.id, sourceKey, questionQueue: [...record.question_queue] as string[], currentIndex: record.current_index, record };
  }
  if (definition.kind === 'rc' && saved.kind === 'rc' && object(saved.session) && Array.isArray(saved.attempts)) {
    const session = saved.session;
    if (session.user_id !== p.user_id || session.practice_test_run_id !== p.id || session.practice_test_leg !== p.current_leg || typeof session.id !== 'string'
      || !Array.isArray(session.passage_ids) || !Array.isArray(definition.passageIds) || JSON.stringify(session.passage_ids) !== JSON.stringify(definition.passageIds)
      || saved.attempts.some(attempt => !object(attempt) || attempt.user_id !== p.user_id || attempt.session_id !== session.id)) invalid('The saved RC child contradicts its frozen run or passages.');
    return { ...common, kind: 'rc', sessionId: session.id, passageIds: [...session.passage_ids] as number[], session, attempts: saved.attempts as TimedObject[] };
  }
  return invalid('The account checkpoint belongs to another section kind.');
}

/** Account-authoritative parent transitions used by protected sittings. */
export class TimedPracticeTestStore {
  constructor(private readonly client: TimedWorkClient, private readonly deviceId: string, private readonly now: () => number = () => performance.now()) {}
  private snapshot(value: { parent: TimedWorkParent; checkpoint: TimedObject | null; serverTime: string }): TimedPracticeTestSnapshot {
    return { ...value, run: timedParentToPracticeTestRun(value.parent), observedAt: this.now(), receipt: this.client.readReceipt(), pending: this.client.readPending(), rejection: this.client.readRejection() };
  }
  async load(): Promise<TimedPracticeTestSnapshot> { return this.snapshot(await this.client.refresh()); }
  async prepare<O extends TimedWorkOperation>(operation: O, payload: TimedWorkPayloads[O], snapshot: TimedPracticeTestSnapshot | null): Promise<TimedWorkCommand> {
    if (operation === 'create' ? snapshot !== null : snapshot === null) invalid('Creation and existing-run commands require different authority.');
    if (snapshot?.pending) throw new TimedWorkError('conflict', 'Resolve the saved command before another transition.');
    if (snapshot && operation !== 'claim' && timedPracticeTestClock(snapshot, this.deviceId, this.now()).writer !== 'active') throw new TimedWorkError('expired-writer', 'Claim the authoritative writer before creating another command.');
    return this.client.prepare(operation, payload, this.deviceId, snapshot?.parent ?? null);
  }
  async retry(): Promise<TimedPracticeTestSnapshot & { acknowledgment: TimedWorkAcknowledgment }> {
    const acknowledgment = await this.client.retry();
    return { ...this.snapshot(acknowledgment), acknowledgment };
  }
  /** The caller schedules cadence; this renews neither an expired nor foreign writer. */
  async heartbeat(snapshot: TimedPracticeTestSnapshot): Promise<TimedPracticeTestSnapshot & { acknowledgment: TimedWorkAcknowledgment }> {
    if (!['leg-running', 'break-running'].includes(snapshot.parent.timed_phase)) throw new TimedWorkError('invalid-command', 'A paused clock has no active lease to renew.');
    await this.prepare('heartbeat', {}, snapshot);
    return this.retry();
  }
  /** User-directed recovery; saved answers remain in the owner/run archive. */
  async archiveRejectedCommand(): Promise<TimedPracticeTestSnapshot> { return this.snapshot(await this.client.archiveRejected()); }
}
