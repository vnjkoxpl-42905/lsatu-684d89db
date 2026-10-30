import { supabase } from '@/integrations/supabase/client';

export type TimedJson = null | boolean | number | string | TimedJson[] | { [key: string]: TimedJson };
export type TimedObject = { [key: string]: TimedJson };
export const TIMED_WORK_OPERATIONS = ['create', 'claim', 'start-leg', 'checkpoint', 'heartbeat', 'pause', 'resume', 'close-leg', 'start-break', 'finish-break', 'abandon'] as const;
export type TimedWorkOperation = typeof TIMED_WORK_OPERATIONS[number];
export type TimedLetter = 'A' | 'B' | 'C' | 'D' | 'E';
export type TimedCheckpointPayload =
  | { currentIndex: number; answers: { qid: string; selected: TimedLetter; correct: boolean; timeMs: number; flagged?: boolean; switchCount?: number }[]; regulationAnsweredQids?: string[]; questionStates?: { qid: string; timeMs: number; flagged: boolean; eliminations: TimedLetter[] }[] }
  | { currentIndex: number; answers: { attemptId: string; questionId: number; passageId: number; selected: TimedLetter | null; isCorrect: boolean | null; timeMs: number; flagged?: boolean; eliminations?: TimedLetter[] }[] };
export interface TimedWorkPayloads {
  create: { pt: number; pace: 'standard' | 'time-and-a-half' | 'double-time' | 'untimed'; sectionSeconds: number | null };
  claim: Record<string, never>; 'start-leg': Record<string, never>; heartbeat: Record<string, never>; pause: Record<string, never>; resume: Record<string, never>;
  'start-break': Record<string, never>; 'finish-break': Record<string, never>; abandon: Record<string, never>;
  checkpoint: TimedCheckpointPayload;
  'close-leg': { answerKeys: { qid: string; correctAnswer: TimedLetter }[]; analysis?: TimedObject | null } | { analysis?: TimedObject | null };
}
export interface TimedWorkCommand {
  workKind: 'practice-test'; workId: string; commandId: string; deviceId: string;
  expectedRevision: number; writerEpoch: number; operation: TimedWorkOperation; payload: TimedObject;
}
export interface TimedWorkParent extends TimedObject {
  id: string; user_id: string; pt: number; pace: string; section_seconds: number | null;
  revision: number; timed_contract_version: 1; timed_writer_epoch: number;
  timed_phase: string; timed_elapsed_ms: number; timed_clock_leg: number | null;
  timed_running_anchor: string | null; timed_lease_expires_at: string | null; timed_lease_ms: number;
  timed_frozen_legs: TimedObject[]; legs: TimedObject[]; current_leg: number;
  timed_manifest_sha256: string; timed_manifest: TimedObject;
  active_device_id: string | null; status: string;
}
export interface TimedWorkReceipt {
  ownerId: string; workKind: 'practice-test'; workId: string; commandId: string;
  operation: TimedWorkOperation; command: TimedWorkCommand; committedRevision: number; result: TimedObject;
}
export interface TimedWorkAcknowledgment {
  receipt: TimedWorkReceipt; parent: TimedWorkParent; checkpoint: TimedObject | null;
  serverTime: string; replayed: boolean;
}
export type TimedWorkFailure = 'authentication' | 'capability' | 'contract' | 'conflict' | 'access' | 'expired-writer' | 'replay-mismatch' | 'invalid-command' | 'storage' | 'transport';
export class TimedWorkError extends Error {
  constructor(public readonly kind: TimedWorkFailure, message: string, public readonly authoritativeParent?: TimedWorkParent) { super(message); this.name = 'TimedWorkError'; }
}
interface RpcError { code?: string; message?: string; details?: string }
export interface TimedWorkTransport {
  auth: { getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  rpc(name: string, args?: { p_command: TimedWorkCommand } | { p_work_id: string }): PromiseLike<{ data: unknown; error: RpcError | null }>;
}
export interface TimedWorkLockCoordinator { request<T>(name: string, callback: () => Promise<T>): Promise<T> }
export interface TimedWorkRejection { command: TimedWorkCommand; code: 'PT401' | 'PT409' | 'PT410'; kind: 'access' | 'conflict' | 'expired-writer'; message: string; authoritativeRevision: number | null }
export interface TimedWorkArchivedCommand { command: TimedWorkCommand; rejection: TimedWorkRejection; authoritativeParent: TimedWorkParent; archivedAt: string }
interface StoredWork { version: 1; ownerId: string; workId: string; pending: TimedWorkCommand | null; parent: TimedWorkParent | null; pendingParent: TimedWorkParent | null; receipt: TimedWorkReceipt | null; rejection: TimedWorkRejection | null; archived: TimedWorkArchivedCommand[] }
const phases = ['ready', 'leg-running', 'leg-paused', 'closeout-pending', 'break-running', 'break-paused', 'complete', 'abandoned'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
function fail(message: string): never { throw new TimedWorkError('contract', message); }
/** Canonical comparison ignores JSON object key order, never array order. */
function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return fail('The timed command contains a value that cannot be persisted as JSON.');
}
function command(value: unknown, workId: string): TimedWorkCommand {
  if (!object(value) || value.workKind !== 'practice-test' || value.workId !== workId || typeof value.commandId !== 'string' || !uuid.test(value.commandId)
    || typeof value.deviceId !== 'string' || !value.deviceId.trim() || !integer(value.expectedRevision) || !integer(value.writerEpoch)
    || !TIMED_WORK_OPERATIONS.includes(value.operation as TimedWorkOperation) || !object(value.payload)) fail('Invalid timed command identity or version.');
  if (Object.keys(value).some(key => !['workKind', 'workId', 'commandId', 'deviceId', 'expectedRevision', 'writerEpoch', 'operation', 'payload'].includes(key))) fail('Unexpected timed command field.');
  canonical(value);
  if (value.operation === 'create' && (value.expectedRevision !== 0 || value.writerEpoch !== 0)) fail('Creation must start at revision and epoch zero.');
  return value as unknown as TimedWorkCommand;
}
function parent(value: unknown, ownerId: string, workId: string): TimedWorkParent {
  if (!object(value) || value.id !== workId || value.user_id !== ownerId || value.timed_contract_version !== 1
    || !integer(value.revision) || !integer(value.timed_writer_epoch) || value.timed_writer_epoch < 1 || !integer(value.timed_elapsed_ms)
    || !integer(value.current_leg) || !integer(value.pt) || value.pt < 1 || !integer(value.timed_lease_ms) || value.timed_lease_ms < 1
    || !phases.includes(value.timed_phase as string) || !Array.isArray(value.timed_frozen_legs) || !value.timed_frozen_legs.length
    || !Array.isArray(value.legs) || value.legs.length !== value.timed_frozen_legs.length || value.current_leg > value.legs.length
    || !['standard', 'time-and-a-half', 'double-time', 'untimed'].includes(value.pace as string)
    || (value.section_seconds === null ? value.pace !== 'untimed' : !integer(value.section_seconds) || value.section_seconds < 1)
    || !(value.active_device_id === null || typeof value.active_device_id === 'string')) fail('The account returned an invalid or differently owned timed parent.');
  const running = value.timed_phase === 'leg-running' || value.timed_phase === 'break-running';
  if (running ? !date(value.timed_running_anchor) || !date(value.timed_lease_expires_at) || Date.parse(value.timed_lease_expires_at as string) <= Date.parse(value.timed_running_anchor as string)
    : value.timed_running_anchor !== null || value.timed_lease_expires_at !== null) fail('The account returned an invalid clock lease.');
  const leg = ['leg-running', 'leg-paused', 'closeout-pending'].includes(value.timed_phase as string);
  if (leg ? value.timed_clock_leg !== value.current_leg || value.current_leg >= value.legs.length : value.timed_clock_leg !== null) fail('The timed clock belongs to a different leg.');
  const status = value.timed_phase === 'complete' ? 'complete' : value.timed_phase === 'abandoned' ? 'abandoned' : 'in-progress';
  if (value.status !== status || (status === 'complete' && (value.current_leg !== value.legs.length || !date(value.completed_at)))) fail('The timed parent has contradictory completion state.');
  if (typeof value.timed_manifest_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.timed_manifest_sha256) || !object(value.timed_manifest)
    || value.timed_manifest.pt !== value.pt || !Array.isArray(value.timed_manifest.legs) || value.timed_manifest.legs.length !== value.legs.length) fail('The timed parent has no matching frozen content manifest.');
  for (let index = 0; index < value.legs.length; index++) {
    const frozen = value.timed_frozen_legs[index]; const live = value.legs[index];
    if (!object(frozen) || !object(live) || !['lr', 'rc'].includes(frozen.kind as string) || !integer(frozen.section) || frozen.section < 1
      || !integer(frozen.questionCount) || frozen.questionCount < 1) fail('Invalid frozen timed leg.');
    const definition = (leg: Record<string, unknown>) => Object.fromEntries(['kind', 'section', 'questionCount', 'passageIds'].filter(key => leg[key] !== undefined && leg[key] !== null).map(key => [key, leg[key]]));
    if (canonical(definition(frozen)) !== canonical(definition(live))) fail('The current legs contradict the frozen source.');
    const manifestLeg = value.timed_manifest.legs[index];
    if (!object(manifestLeg) || canonical(definition(manifestLeg)) !== canonical(definition(frozen)) || !Array.isArray(manifestLeg.qids)
      || manifestLeg.qids.length !== frozen.questionCount || manifestLeg.qids.some(qid => typeof qid !== 'string' || !qid)
      || new Set(manifestLeg.qids).size !== manifestLeg.qids.length || !Array.isArray(manifestLeg.questions) || manifestLeg.questions.length !== manifestLeg.qids.length
      || manifestLeg.questions.some((question, qindex) => !object(question) || question.qid !== (manifestLeg.qids as unknown[])[qindex])) fail('The manifest contradicts the frozen question roster.');
  }
  canonical(value);
  return value as unknown as TimedWorkParent;
}
function source(value: TimedWorkParent): string {
  return canonical([value.pt, value.pace, value.section_seconds, value.timed_frozen_legs, value.timed_manifest_sha256, value.timed_manifest, value.timed_lease_ms, value.break_after_leg ?? null]);
}
function sameClock(a: TimedWorkParent, b: TimedWorkParent): boolean {
  return a.current_leg === b.current_leg && a.timed_clock_leg === b.timed_clock_leg && a.timed_phase.startsWith('break-') === b.timed_phase.startsWith('break-');
}
function validatePayload(operation: TimedWorkOperation, payload: TimedObject, state: TimedWorkParent | null): void {
  const keys = (allowed: string[]) => { if (Object.keys(payload).some(key => !allowed.includes(key))) fail('Unsupported operation payload field.'); };
  if (operation === 'create') {
    keys(['pt', 'pace', 'sectionSeconds']);
    if (!integer(payload.pt) || payload.pt < 1 || !['standard', 'time-and-a-half', 'double-time', 'untimed'].includes(payload.pace as string)
      || (payload.sectionSeconds === null ? payload.pace !== 'untimed' : !integer(payload.sectionSeconds) || payload.sectionSeconds < 1)) fail('Invalid creation payload.');
    return;
  }
  const kind = state?.timed_frozen_legs[state.current_leg]?.kind;
  const letter = (value: unknown) => typeof value === 'string' && /^[A-E]$/.test(value);
  if (operation === 'checkpoint') {
    keys(kind === 'lr' ? ['currentIndex', 'answers', 'regulationAnsweredQids', 'questionStates'] : ['currentIndex', 'answers']);
    if (!integer(payload.currentIndex) || !Array.isArray(payload.answers) || !['lr', 'rc'].includes(kind as string)) fail('Invalid checkpoint payload.');
    for (const answer of payload.answers) {
      if (!object(answer) || !integer(answer.timeMs) || (answer.flagged !== undefined && typeof answer.flagged !== 'boolean')) fail('Invalid checkpoint answer.');
      const allowed = kind === 'lr' ? ['qid', 'selected', 'correct', 'timeMs', 'flagged', 'switchCount'] : ['attemptId', 'questionId', 'passageId', 'selected', 'isCorrect', 'timeMs', 'flagged', 'eliminations'];
      if (Object.keys(answer).some(key => !allowed.includes(key))) fail('Unknown checkpoint answer field.');
      if (kind === 'lr' ? typeof answer.qid !== 'string' || !answer.qid || !letter(answer.selected) || typeof answer.correct !== 'boolean' || (answer.switchCount !== undefined && !integer(answer.switchCount))
        : typeof answer.attemptId !== 'string' || !uuid.test(answer.attemptId) || !integer(answer.questionId) || !integer(answer.passageId)
          || !(answer.selected === null || letter(answer.selected)) || !(answer.isCorrect === null || typeof answer.isCorrect === 'boolean')
          || (answer.eliminations !== undefined && (!Array.isArray(answer.eliminations) || !answer.eliminations.every(letter)))) fail('Invalid checkpoint answer identity.');
    }
    if (payload.questionStates !== undefined) validateQuestionStates(payload.questionStates, (state!.timed_manifest.legs as TimedObject[])[state!.current_leg].qids as string[]);
    if (payload.regulationAnsweredQids !== undefined && (!Array.isArray(payload.regulationAnsweredQids) || payload.regulationAnsweredQids.some(qid => typeof qid !== 'string'))) fail('Invalid regulation answer identities.');
    return;
  }
  if (operation === 'close-leg' && kind === 'lr') {
    keys(['answerKeys', 'analysis']);
    if (!Array.isArray(payload.answerKeys) || !payload.answerKeys.length || payload.answerKeys.some(answer => !object(answer) || typeof answer.qid !== 'string' || !answer.qid || !letter(answer.correctAnswer) || Object.keys(answer).some(key => !['qid', 'correctAnswer'].includes(key)))
      || (payload.analysis !== undefined && payload.analysis !== null && !object(payload.analysis))) fail('Invalid LR closeout payload.');
    return;
  }
  if (operation === 'close-leg' && kind === 'rc') {
    keys(['analysis']);
    if (payload.analysis !== undefined && payload.analysis !== null && !object(payload.analysis)) fail('Invalid RC closeout analysis.');
    return;
  }
  keys([]);
}
function validateQuestionStates(value: unknown, qids: string[]): void {
  if (!Array.isArray(value)) fail('Invalid LR question states.');
  const seen = new Set<string>();
  for (const entry of value) {
    if (!object(entry) || typeof entry.qid !== 'string' || !qids.includes(entry.qid) || seen.has(entry.qid) || !integer(entry.timeMs) || typeof entry.flagged !== 'boolean'
      || !Array.isArray(entry.eliminations) || entry.eliminations.some(letter => typeof letter !== 'string' || !/^[A-E]$/.test(letter)) || new Set(entry.eliminations).size !== entry.eliminations.length
      || Object.keys(entry).length !== 4 || Object.keys(entry).some(key => !['qid', 'timeMs', 'flagged', 'eliminations'].includes(key))) fail('Invalid LR question state identity or timing.');
    seen.add(entry.qid);
  }
}
function checkpoint(value: unknown, ownerId: string, workId: string, state: TimedWorkParent): TimedObject | null {
  if (value === null) return null;
  if (!object(value)) return fail('Invalid timed checkpoint.');
  if (value.kind === 'lr') {
    if (!object(value.record) || value.record.user_id !== ownerId || typeof value.record.completion_id !== 'string'
      || !value.record.completion_id.startsWith(`drill::practice-test::${workId}::leg-`)) fail('The LR checkpoint belongs to a different owner or source.');
    const suffix = value.record.completion_id.slice(`drill::practice-test::${workId}::leg-`.length);
    const manifestLeg = (state.timed_manifest.legs as TimedObject[])[state.current_leg];
    if (!/^(0|[1-9]\d*)$/.test(suffix) || Number(suffix) !== state.current_leg || state.timed_frozen_legs[Number(suffix)]?.kind !== 'lr'
      || value.record.pool_slug !== value.record.completion_id
      || !Array.isArray(value.record.question_queue) || !value.record.question_queue.length
      || value.record.question_queue.some(qid => typeof qid !== 'string') || !integer(value.record.current_index)
      || canonical(value.record.question_queue) !== canonical(manifestLeg.qids)
      || value.record.current_index > value.record.question_queue.length || !Array.isArray(value.record.attempts)) fail('Invalid LR checkpoint binding or saved position.');
    if (value.record.question_states !== undefined) validateQuestionStates(value.record.question_states, manifestLeg.qids as string[]);
  } else if (value.kind === 'rc') {
    if (!object(value.session) || value.session.user_id !== ownerId || value.session.practice_test_run_id !== workId || !Array.isArray(value.attempts)
      || value.attempts.some(attempt => !object(attempt) || attempt.user_id !== ownerId || attempt.session_id !== (value.session as Record<string, unknown>).id)) fail('The RC checkpoint belongs to a different owner or source.');
    if (!integer(value.session.practice_test_leg) || value.session.practice_test_leg !== state.current_leg || state.timed_frozen_legs[value.session.practice_test_leg]?.kind !== 'rc' || typeof value.session.id !== 'string'
      || canonical(value.session.passage_ids) !== canonical(state.timed_frozen_legs[state.current_leg].passageIds)) fail('Invalid RC checkpoint binding.');
  } else fail('Unsupported timed checkpoint kind.');
  canonical(value);
  return value as TimedObject;
}

/** Isolated v1 transport. It never calls a legacy parent or child writer. */
export class TimedWorkClient {
  private readonly key: string;
  constructor(private readonly ownerId: string, private readonly workId: string,
    private readonly transport: TimedWorkTransport = supabase as unknown as TimedWorkTransport,
    private readonly storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
    private readonly locks: TimedWorkLockCoordinator | undefined = globalThis.navigator?.locks) {
    if (!ownerId || !workId) fail('An owner and run are required.');
    this.key = `lsatu:timed-work:v1:${encodeURIComponent(ownerId)}:${encodeURIComponent(workId)}`;
  }
  private async locked<T>(action: () => Promise<T>): Promise<T> {
    if (!this.locks?.request) throw new TimedWorkError('storage', 'This browser cannot safely coordinate timed commands across tabs. No command was sent.');
    return this.locks.request(this.key, action);
  }
  private async actor(): Promise<void> {
    let response: Awaited<ReturnType<TimedWorkTransport['auth']['getUser']>>;
    try { response = await this.transport.auth.getUser(); } catch { throw new TimedWorkError('authentication', 'Could not verify the current account. The saved command is preserved.'); }
    const { data, error } = response;
    if (error || data.user?.id !== this.ownerId) throw new TimedWorkError('authentication', 'Your account session changed. Sign in to the run owner account before retrying.');
  }
  private raw(): string | null {
    try { return this.storage.getItem(this.key); } catch { throw new TimedWorkError('storage', 'This browser cannot read the saved timed command.'); }
  }
  private read(raw = this.raw()): StoredWork {
    if (raw === null) return { version: 1, ownerId: this.ownerId, workId: this.workId, pending: null, parent: null, pendingParent: null, receipt: null, rejection: null, archived: [] };
    let stored: unknown;
    try { stored = JSON.parse(raw); } catch { return fail('The saved timed command is unreadable. It has been preserved.'); }
    if (!object(stored) || stored.version !== 1 || stored.ownerId !== this.ownerId || stored.workId !== this.workId) fail('The saved timed command belongs to a different owner, run, or version.');
    const current = stored.parent === null ? null : parent(stored.parent, this.ownerId, this.workId);
    const receipt = stored.receipt ?? null;
    if (receipt !== null && (!object(receipt) || receipt.ownerId !== this.ownerId || receipt.workId !== this.workId || receipt.workKind !== 'practice-test'
      || !integer(receipt.committedRevision) || !current || receipt.committedRevision > current.revision || !object(receipt.result)
      || command(receipt.command, this.workId).commandId !== receipt.commandId || receipt.operation !== (receipt.command as TimedWorkCommand).operation)) fail('The saved receipt contradicts its owner, command, or authority.');
    const pending = stored.pending === null ? null : command(stored.pending, this.workId);
    const rejection = stored.rejection ?? null;
    if (rejection !== null && (!object(rejection) || !['PT401', 'PT409', 'PT410'].includes(rejection.code as string) || !['access', 'conflict', 'expired-writer'].includes(rejection.kind as string)
      || !pending || canonical(command(rejection.command, this.workId)) !== canonical(pending) || typeof rejection.message !== 'string'
      || !(rejection.authoritativeRevision === null || integer(rejection.authoritativeRevision)))) fail('The saved rejection does not prove this pending command was denied.');
    const archived = stored.archived ?? [];
    if (!Array.isArray(archived)) fail('Invalid timed recovery archive.');
    for (const entry of archived) {
      if (!object(entry) || !object(entry.rejection) || !date(entry.archivedAt)
        || canonical(command(entry.command, this.workId)) !== canonical(command(entry.rejection.command, this.workId))) fail('Invalid archived timed command.');
      parent(entry.authoritativeParent, this.ownerId, this.workId);
    }
    return { version: 1, ownerId: this.ownerId, workId: this.workId, pending, parent: current,
      pendingParent: stored.pendingParent == null ? current : parent(stored.pendingParent, this.ownerId, this.workId), receipt: receipt as unknown as TimedWorkReceipt | null,
      rejection: rejection as unknown as TimedWorkRejection | null, archived: archived as TimedWorkArchivedCommand[] };
  }
  private write(stored: StoredWork, expectedRaw: string | null): void {
    if (this.raw() !== expectedRaw) throw new TimedWorkError('conflict', 'Another browser context changed the saved command. Read it again before retrying.');
    const raw = canonical(stored);
    try { this.storage.setItem(this.key, raw); } catch { throw new TimedWorkError('storage', 'This browser cannot preserve the timed command. No new command was sent.'); }
    if (this.raw() !== raw) throw new TimedWorkError('storage', 'This browser did not preserve the timed command.');
  }
  /** Returns copies: a caller cannot mutate the retained command or authority. */
  readPending(): TimedWorkCommand | null { return this.read().pending; }
  readAuthoritativeParent(): TimedWorkParent | null { return this.read().parent; }
  readReceipt(): TimedWorkReceipt | null { return this.read().receipt; }
  readRejection(): TimedWorkRejection | null { return this.read().rejection; }
  readArchivedCommands(): TimedWorkArchivedCommand[] { return this.read().archived; }
  async prepare<O extends TimedWorkOperation>(operation: O, payload: TimedWorkPayloads[O], deviceId: string, authoritativeParent: TimedWorkParent | null): Promise<TimedWorkCommand> {
    return this.locked(() => this.prepareUnlocked(operation, payload, deviceId, authoritativeParent));
  }
  private async prepareUnlocked<O extends TimedWorkOperation>(operation: O, payload: TimedWorkPayloads[O], deviceId: string, authoritativeParent: TimedWorkParent | null): Promise<TimedWorkCommand> {
    await this.actor();
    const raw = this.raw(); const stored = this.read(raw);
    if (stored.pending) throw new TimedWorkError('conflict', 'Retry or resolve the existing command before creating another.');
    const state = authoritativeParent === null ? null : parent(authoritativeParent, this.ownerId, this.workId);
    if (operation === 'create' ? state !== null || stored.parent !== null : state === null) fail('This operation requires the matching authoritative parent.');
    if (stored.parent && state && (source(stored.parent) !== source(state) || state.revision < stored.parent.revision)) fail('Cannot prepare a command from older or differently sourced authority.');
    validatePayload(operation, payload as TimedObject, state);
    const next = command({ workKind: 'practice-test', workId: this.workId, commandId: crypto.randomUUID(), deviceId, expectedRevision: state?.revision ?? 0, writerEpoch: state?.timed_writer_epoch ?? 0, operation, payload }, this.workId);
    this.write({ ...stored, pending: next, parent: state, pendingParent: state, rejection: null }, raw);
    return this.read().pending!;
  }
  /** Read-only readiness check before offering a new protected sitting. */
  async requireCapability(operation: TimedWorkOperation | 'read'): Promise<void> { await this.actor(); await this.capability(operation); await this.actor(); }
  private async capability(operation: TimedWorkOperation | 'read'): Promise<void> {
    let response: Awaited<ReturnType<TimedWorkTransport['rpc']>>;
    try { response = await this.transport.rpc('timed_practice_test_capability_v1'); } catch { throw new TimedWorkError('capability', 'Could not verify atomic timed work v1 capability. The saved command is preserved.'); }
    const { data, error } = response;
    if (error || !object(data) || data.contractVersion !== 1 || typeof data.enabled !== 'boolean' || (operation !== 'read' && data.enabled !== true) || data.workKind !== 'practice-test'
      || !Array.isArray(data.operations) || !data.operations.includes(operation)) throw new TimedWorkError('capability', 'Atomic timed work v1 is not enabled for this operation. The pending command is preserved.');
  }
  async refresh(): Promise<{ parent: TimedWorkParent; checkpoint: TimedObject | null; serverTime: string }> {
    return this.locked(() => this.refreshUnlocked());
  }
  private async refreshUnlocked(): Promise<{ parent: TimedWorkParent; checkpoint: TimedObject | null; serverTime: string }> {
    await this.actor(); await this.capability('read'); await this.actor();
    const { data, error } = await this.transport.rpc('read_timed_practice_test_v1', { p_work_id: this.workId });
    await this.actor();
    if (error) throw new TimedWorkError(error.code === 'PT401' ? 'access' : error.code === 'PT503' ? 'capability' : error.code === 'PT409' ? 'conflict' : 'transport', error.message ?? 'Could not read timed authority.');
    if (!object(data) || !date(data.serverTime)) fail('Invalid timed authority read.');
    const current = parent(data.parent, this.ownerId, this.workId);
    const savedCheckpoint = checkpoint(data.checkpoint, this.ownerId, this.workId, current);
    const raw = this.raw(); const stored = this.read(raw);
    if (stored.parent) {
      if (source(current) !== source(stored.parent)) fail('The timed read changed the frozen source.');
      if (current.revision < stored.parent.revision) throw new TimedWorkError('conflict', 'The account read arrived behind newer acknowledged work. Read current authority again.', stored.parent);
      else if (current.timed_writer_epoch < stored.parent.timed_writer_epoch || current.current_leg < stored.parent.current_leg
        || (sameClock(current, stored.parent) && current.timed_elapsed_ms < stored.parent.timed_elapsed_ms)
        || (current.revision === stored.parent.revision && canonical(current) !== canonical(stored.parent))) fail('The timed read would regress saved work.');
    }
    this.write({ ...stored, parent: current }, raw);
    return { parent: current, checkpoint: savedCheckpoint, serverTime: data.serverTime as string };
  }
  /** Explicitly retain a definitely rejected command before enabling a fresh claim. */
  async archiveRejected(): Promise<{ parent: TimedWorkParent; checkpoint: TimedObject | null; serverTime: string }> {
    return this.locked(() => this.archiveRejectedUnlocked());
  }
  private async archiveRejectedUnlocked(): Promise<{ parent: TimedWorkParent; checkpoint: TimedObject | null; serverTime: string }> {
    await this.actor();
    const before = this.read();
    if (!before.pending || !before.rejection) throw new TimedWorkError('conflict', 'Only a definite server rejection can be archived. A lost reply must retry its original command.');
    const current = await this.refreshUnlocked();
    const raw = this.raw(); const stored = this.read(raw);
    if (!stored.pending || !stored.rejection || canonical(stored.pending) !== canonical(before.pending)
      || canonical(stored.rejection) !== canonical(before.rejection) || (stored.rejection.authoritativeRevision !== null && current.parent.revision < stored.rejection.authoritativeRevision)) throw new TimedWorkError('conflict', 'The rejected command or account authority changed during recovery.');
    this.write({ ...stored, archived: [...stored.archived, { command: stored.pending, rejection: stored.rejection, authoritativeParent: current.parent, archivedAt: new Date().toISOString() }], pending: null, pendingParent: null, rejection: null }, raw);
    return current;
  }
  /** Deliberate recovery only. A lost response keeps the identical durable request. */
  async retry(): Promise<TimedWorkAcknowledgment> {
    return this.locked(() => this.retryUnlocked());
  }
  private async retryUnlocked(): Promise<TimedWorkAcknowledgment> {
    await this.actor();
    const pending = this.read().pending;
    if (!pending) throw new TimedWorkError('invalid-command', 'There is no pending timed command to retry.');
    validatePayload(pending.operation, pending.payload, this.read().pendingParent);
    await this.capability(pending.operation);
    await this.actor();
    // A later transmission can commit even after an earlier denial. Its lost
    // reply must not reuse the earlier proof to discard this command.
    const beforeRaw = this.raw(); const before = this.read(beforeRaw);
    if (!before.pending || canonical(before.pending) !== canonical(pending)) throw new TimedWorkError('conflict', 'The pending command changed before transmission.');
    this.write({ ...before, rejection: null }, beforeRaw);
    let response: Awaited<ReturnType<TimedWorkTransport['rpc']>>;
    try { response = await this.transport.rpc(pending.operation === 'create' ? 'create_timed_practice_test_v1' : 'commit_timed_work_v1', { p_command: pending }); }
    catch (error) { throw new TimedWorkError('transport', error instanceof Error ? error.message : 'The timed command reply was lost. Retry the saved command.'); }
    const { data, error } = response;
    await this.actor();
    if (error) {
      const kinds: Record<string, TimedWorkFailure> = { PT401: 'access', PT409: 'conflict', PT410: 'expired-writer', PT412: 'replay-mismatch', PT422: 'invalid-command', PT503: 'capability' };
      let current: TimedWorkParent | undefined;
      if (error.details) {
        try { const details = JSON.parse(error.details); if (object(details) && details.parent) current = parent(details.parent, this.ownerId, this.workId); } catch { /* Keep the typed denial; never treat error detail as acknowledgment. */ }
      }
      const message = error.message ?? 'The timed command could not be acknowledged.';
      const kind = kinds[error.code ?? ''] ?? 'transport';
      if (['access', 'conflict', 'expired-writer'].includes(kind)) {
        const raw = this.raw(); const stored = this.read(raw);
        if (!stored.pending || canonical(stored.pending) !== canonical(pending)) throw new TimedWorkError('conflict', 'The denied command changed before its rejection could be preserved.');
        this.write({ ...stored, rejection: { command: pending, code: error.code as TimedWorkRejection['code'], kind: kind as TimedWorkRejection['kind'], message, authoritativeRevision: current?.revision ?? null } }, raw);
      }
      throw new TimedWorkError(kind, message, current);
    }
    if (!object(data) || !object(data.receipt) || !date(data.serverTime) || typeof data.replayed !== 'boolean') fail('Invalid timed command acknowledgment.');
    const receipt = data.receipt;
    if (receipt.ownerId !== this.ownerId || receipt.workKind !== 'practice-test' || receipt.workId !== this.workId || receipt.commandId !== pending.commandId
      || receipt.operation !== pending.operation || canonical(command(receipt.command, this.workId)) !== canonical(pending)
      || !integer(receipt.committedRevision) || receipt.committedRevision !== pending.expectedRevision + (pending.operation === 'create' ? 0 : 1) || !object(receipt.result)) fail('The timed receipt does not acknowledge the saved command.');
    let current = parent(data.parent, this.ownerId, this.workId);
    if (current.revision < receipt.committedRevision || current.timed_writer_epoch < pending.writerEpoch) fail('The timed response is older than its committed receipt or writer epoch.');
    if (pending.operation === 'create' && (current.pt !== pending.payload.pt || current.pace !== pending.payload.pace || current.section_seconds !== pending.payload.sectionSeconds)) fail('The created timed parent belongs to a different source.');
    let savedCheckpoint = checkpoint(data.checkpoint, this.ownerId, this.workId, current);
    const raw = this.raw(); const stored = this.read(raw);
    if (!stored.pending || canonical(stored.pending) !== canonical(pending)) throw new TimedWorkError('conflict', 'The pending command changed while its response was in flight.');
    let refreshRequired = false;
    if (stored.parent) {
      if (source(current) !== source(stored.parent)) fail('The timed response changed the frozen source.');
      if (current.revision < stored.parent.revision) { current = stored.parent; savedCheckpoint = null; refreshRequired = true; }
      else if (current.timed_writer_epoch < stored.parent.timed_writer_epoch || current.current_leg < stored.parent.current_leg
        || (sameClock(current, stored.parent) && current.timed_elapsed_ms < stored.parent.timed_elapsed_ms)
        || (current.revision === stored.parent.revision && canonical(current) !== canonical(stored.parent))) fail('The timed response would regress acknowledged work.');
    }
    this.write({ ...stored, pending: null, pendingParent: null, parent: current, receipt: receipt as unknown as TimedWorkReceipt, rejection: null }, raw);
    if (refreshRequired) {
      // The old receipt is valid, but its sample time cannot drive a newer
      // clock anchor. Obtain a current sample before exposing that authority.
      const fresh = await this.refreshUnlocked();
      return { receipt: receipt as unknown as TimedWorkReceipt, ...fresh, replayed: data.replayed };
    }
    return { receipt: receipt as unknown as TimedWorkReceipt, parent: current, checkpoint: savedCheckpoint, serverTime: data.serverTime as string, replayed: data.replayed };
  }
}
