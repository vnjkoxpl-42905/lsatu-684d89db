import { supabase } from '@/integrations/supabase/client';
import type { TimedCheckpointPayload, TimedObject, TimedWorkFailure, TimedWorkLockCoordinator } from './timedWorkClient';

export const TIMED_SECTION_OPERATIONS = ['create', 'claim', 'start', 'checkpoint', 'heartbeat', 'pause', 'resume', 'close', 'abandon'] as const;
export type TimedSectionOperation = typeof TIMED_SECTION_OPERATIONS[number];
export type TimedSectionPace = 'standard' | 'time-and-a-half' | 'double-time' | 'untimed';
export interface TimedSectionPayloads {
  create: { kind: 'lr' | 'rc'; pt: number; section: number; pace: TimedSectionPace };
  claim: Record<string, never>; start: Record<string, never>; heartbeat: Record<string, never>;
  pause: Record<string, never>; resume: Record<string, never>; abandon: Record<string, never>;
  checkpoint: TimedCheckpointPayload;
  close: { answerKeys: { qid: string; correctAnswer: string }[]; analysis?: TimedObject | null } | { analysis?: TimedObject | null };
}
export interface TimedSectionCommand {
  workKind: 'standalone-section'; workId: string; commandId: string; deviceId: string;
  expectedRevision: number; writerEpoch: number; operation: TimedSectionOperation; payload: TimedObject;
}
export interface TimedSectionSitting extends TimedObject {
  id: string; owner_id: string; kind: 'lr' | 'rc'; source_kind: 'manual-canonical'; source_key: string;
  pt: number; section: number; manifest_sha256: string; frozen_source: TimedObject; frozen_qids: string[];
  pace: TimedSectionPace; budget_ms: number | null; lease_ms: number; phase: 'ready' | 'running' | 'paused' | 'complete' | 'abandoned';
  revision: number; writer_epoch: number; device_id: string; elapsed_ms: number;
  clock_anchor_at: string | null; lease_expires_at: string | null; current_index: number; snapshot: TimedObject;
  result: TimedObject | null; completed_at: string | null; created_at: string; updated_at: string;
}
export type TimedSectionChild = { kind: 'lr'; record: TimedObject } | { kind: 'rc'; session: TimedObject; attempts: TimedObject[] };
export interface TimedSectionReceipt {
  ownerId: string; workId: string; commandId: string; command: TimedSectionCommand; committedRevision: number; result: TimedObject;
}
export interface TimedSectionAuthority {
  contractVersion: 1; workKind: 'standalone-section'; sitting: TimedSectionSitting; child: TimedSectionChild | null;
  replayed: boolean; receipt: TimedSectionReceipt | null; serverTime: string;
}
export interface TimedSectionAcknowledgment extends TimedSectionAuthority { receipt: TimedSectionReceipt }
export interface TimedSectionTransport {
  auth: { getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  rpc(name: string, args?: { p_command: TimedSectionCommand } | { p_work_id: string }): PromiseLike<{ data: unknown; error: { code?: string; message?: string; details?: string } | null }>;
}
export class TimedSectionError extends Error {
  constructor(public readonly kind: TimedWorkFailure, message: string, public readonly authoritativeSitting?: TimedSectionSitting) {
    super(message); this.name = 'TimedSectionError';
  }
}
interface Rejection { command: TimedSectionCommand; code: string; message: string; authoritativeRevision: number | null }
interface Archived { command: TimedSectionCommand; rejection: Rejection; sitting: TimedSectionSitting; archivedAt: string }
interface Stored {
  version: 1; ownerId: string; workId: string; pending: TimedSectionCommand | null; pendingSitting: TimedSectionSitting | null;
  sitting: TimedSectionSitting | null; receipt: TimedSectionReceipt | null; rejection: Rejection | null; archived: Archived[];
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const date = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
const letter = (v: unknown) => typeof v === 'string' && /^[A-E]$/.test(v);
function fail(message: string): never { throw new TimedSectionError('contract', message); }
function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return fail('The section command contains a value that cannot be retained as JSON.');
}
function keys(value: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(value).some(key => !allowed.includes(key))) fail('Unexpected section contract field.');
}
function parseCommand(value: unknown, workId: string): TimedSectionCommand {
  if (!object(value) || value.workKind !== 'standalone-section' || value.workId !== workId || !uuid.test(String(value.workId))
    || typeof value.commandId !== 'string' || !uuid.test(value.commandId) || typeof value.deviceId !== 'string' || !value.deviceId.trim() || value.deviceId.length > 128
    || !integer(value.expectedRevision) || !integer(value.writerEpoch) || !TIMED_SECTION_OPERATIONS.includes(value.operation as TimedSectionOperation) || !object(value.payload)) fail('Invalid section command identity.');
  keys(value, ['workKind', 'workId', 'commandId', 'deviceId', 'expectedRevision', 'writerEpoch', 'operation', 'payload']);
  if (value.operation === 'create' ? value.expectedRevision !== 0 || value.writerEpoch !== 0 : value.expectedRevision < 1 || value.writerEpoch < 1) fail('Invalid section command revision or epoch.');
  canonical(value);
  return value as unknown as TimedSectionCommand;
}
function parseSitting(value: unknown, owner: string, work: string): TimedSectionSitting {
  if (!object(value) || value.id !== work || value.owner_id !== owner || !['lr', 'rc'].includes(value.kind as string) || value.source_kind !== 'manual-canonical'
    || !integer(value.pt) || value.pt < 1 || !integer(value.section) || value.section < 1 || value.source_key !== `${value.kind}::pt${value.pt}-s${value.section}`
    || typeof value.manifest_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.manifest_sha256) || !object(value.frozen_source)
    || !Array.isArray(value.frozen_qids) || !value.frozen_qids.length || value.frozen_qids.some(qid => typeof qid !== 'string' || !qid)
    || new Set(value.frozen_qids).size !== value.frozen_qids.length || !integer(value.current_index) || value.current_index >= value.frozen_qids.length
    || !integer(value.revision) || value.revision < 1 || !integer(value.writer_epoch) || value.writer_epoch < 1 || !integer(value.elapsed_ms)
    || !integer(value.lease_ms) || value.lease_ms < 10000 || value.lease_ms > 120000 || typeof value.device_id !== 'string' || !value.device_id.trim() || value.device_id.length > 128
    || !['ready', 'running', 'paused', 'complete', 'abandoned'].includes(value.phase as string) || !object(value.snapshot)
    || !date(value.created_at) || !date(value.updated_at) || Date.parse(value.updated_at) < Date.parse(value.created_at)) fail('Invalid or differently owned section authority.');
  const budgets: Record<string, number | null> = { standard: 2100000, 'time-and-a-half': 3150000, 'double-time': 4200000, untimed: null };
  if (!Object.prototype.hasOwnProperty.call(budgets, String(value.pace)) || value.budget_ms !== budgets[String(value.pace)]) fail('Invalid section pace or frozen budget.');
  if (value.phase === 'running' ? !date(value.clock_anchor_at) || !date(value.lease_expires_at) || Date.parse(value.lease_expires_at) <= Date.parse(value.clock_anchor_at)
    : value.clock_anchor_at !== null || value.lease_expires_at !== null) fail('Invalid section clock lease.');
  if (value.phase === 'complete' ? !object(value.result) || !date(value.completed_at) : value.result !== null || value.completed_at !== null) fail('Contradictory section completion state.');
  const frozen = value.frozen_source;
  if (frozen.kind !== value.kind || frozen.section !== value.section || frozen.questionCount !== value.frozen_qids.length
    || canonical(frozen.qids) !== canonical(value.frozen_qids) || !Array.isArray(frozen.questions) || frozen.questions.length !== value.frozen_qids.length
    || frozen.questions.some((q, index) => !object(q) || q.qid !== (value.frozen_qids as unknown[])[index])) fail('The section contradicts its frozen canonical roster.');
  if (value.kind === 'rc' && (!Array.isArray(frozen.passageIds) || !frozen.passageIds.length || frozen.passageIds.some(id => !integer(id))
    || frozen.questions.some(q => !integer((q as Record<string, unknown>).questionId) || !integer((q as Record<string, unknown>).passageId)
      || !(frozen.passageIds as unknown[]).includes((q as Record<string, unknown>).passageId)))) fail('Invalid frozen RC passage roster.');
  if (value.phase === 'complete') {
    const result = value.result as Record<string, unknown>;
    if (!integer(result.correct) || !integer(result.answered) || result.correct > result.answered || result.answered > value.frozen_qids.length
      || result.total !== value.frozen_qids.length || result.timeMs !== value.elapsed_ms
      || (value.kind === 'lr' ? typeof result.historyId !== 'string' || !uuid.test(result.historyId) : result.historyId !== null)) fail('Invalid complete section result.');
  }
  canonical(value);
  return value as unknown as TimedSectionSitting;
}
function source(s: TimedSectionSitting): string {
  return canonical([s.id, s.owner_id, s.kind, s.source_kind, s.source_key, s.pt, s.section, s.manifest_sha256, s.frozen_source, s.frozen_qids, s.pace, s.budget_ms, s.lease_ms, s.created_at]);
}
function questionStates(value: unknown, roster: string[]): void {
  if (!Array.isArray(value)) fail('Invalid LR saved question states.');
  const seen = new Set<string>();
  for (const entry of value) {
    if (!object(entry) || typeof entry.qid !== 'string' || !roster.includes(entry.qid) || seen.has(entry.qid) || !integer(entry.timeMs)
      || typeof entry.flagged !== 'boolean' || !Array.isArray(entry.eliminations) || entry.eliminations.some(v => !letter(v)) || new Set(entry.eliminations).size !== entry.eliminations.length) fail('Invalid LR state identity.');
    keys(entry, ['qid', 'timeMs', 'flagged', 'eliminations']); seen.add(entry.qid);
  }
}
function validatePayload(op: TimedSectionOperation, value: TimedObject, s: TimedSectionSitting | null): void {
  if (op === 'create') {
    keys(value, ['kind', 'pt', 'section', 'pace']);
    if (!['lr', 'rc'].includes(value.kind as string) || !integer(value.pt) || value.pt < 1 || !integer(value.section) || value.section < 1
      || !['standard', 'time-and-a-half', 'double-time', 'untimed'].includes(value.pace as string)) fail('Invalid standalone section creation source.');
    return;
  }
  if (!s) fail('A matching section authority is required.');
  if (op === 'checkpoint') {
    keys(value, s.kind === 'lr' ? ['currentIndex', 'answers', 'questionStates', 'regulationAnsweredQids'] : ['currentIndex', 'answers']);
    if (!integer(value.currentIndex) || value.currentIndex >= s.frozen_qids.length || !Array.isArray(value.answers)) fail('Invalid section checkpoint.');
    const seen = new Set<string>();
    for (const answer of value.answers) {
      if (!object(answer) || !integer(answer.timeMs) || answer.flagged !== undefined && typeof answer.flagged !== 'boolean') fail('Invalid checkpoint answer.');
      if (s.kind === 'lr') {
        keys(answer, ['qid', 'selected', 'correct', 'timeMs', 'flagged', 'switchCount']);
        if (typeof answer.qid !== 'string' || !s.frozen_qids.includes(answer.qid) || !letter(answer.selected) || typeof answer.correct !== 'boolean'
          || answer.switchCount !== undefined && !integer(answer.switchCount) || seen.has(answer.qid)) fail('Invalid LR checkpoint source.');
        seen.add(answer.qid);
      } else {
        keys(answer, ['attemptId', 'questionId', 'passageId', 'selected', 'isCorrect', 'timeMs', 'flagged', 'eliminations']);
        if (typeof answer.attemptId !== 'string' || !uuid.test(answer.attemptId) || !integer(answer.questionId) || !integer(answer.passageId)
          || !(s.frozen_source.questions as TimedObject[]).some(q => q.questionId === answer.questionId && q.passageId === answer.passageId)
          || !(answer.selected === null || letter(answer.selected)) || !(answer.isCorrect === null || typeof answer.isCorrect === 'boolean')
          || answer.selected !== null && typeof answer.isCorrect !== 'boolean' || answer.selected === null && answer.isCorrect !== null && answer.isCorrect !== false
          || answer.eliminations !== undefined && (!Array.isArray(answer.eliminations) || answer.eliminations.some(v => !letter(v))) || seen.has(String(answer.questionId))) fail('Invalid RC checkpoint source.');
        seen.add(String(answer.questionId));
      }
    }
    if (value.questionStates !== undefined) questionStates(value.questionStates, s.frozen_qids);
    if (value.regulationAnsweredQids !== undefined && (!Array.isArray(value.regulationAnsweredQids) || value.regulationAnsweredQids.some(qid => typeof qid !== 'string' || !s.frozen_qids.includes(qid))
      || new Set(value.regulationAnsweredQids).size !== value.regulationAnsweredQids.length)) fail('Invalid regulation roster.');
    return;
  }
  if (op === 'close') {
    keys(value, s.kind === 'lr' ? ['answerKeys', 'analysis'] : ['analysis']);
    if (value.analysis !== undefined && value.analysis !== null && !object(value.analysis)) fail('Invalid section analysis.');
    if (s.kind === 'lr') {
      if (!Array.isArray(value.answerKeys) || value.answerKeys.length !== s.frozen_qids.length || value.answerKeys.some(a => !object(a) || typeof a.qid !== 'string' || !s.frozen_qids.includes(a.qid) || !letter(a.correctAnswer))
        || new Set(value.answerKeys.map(a => (a as TimedObject).qid)).size !== s.frozen_qids.length) fail('Invalid LR section closeout roster.');
      for (const a of value.answerKeys) keys(a as TimedObject, ['qid', 'correctAnswer']);
    }
    return;
  }
  keys(value, []);
}
function parseChild(value: unknown, s: TimedSectionSitting): TimedSectionChild | null {
  if (value === null) {
    if (!['ready', 'abandoned'].includes(s.phase)) fail('Started section child is missing.');
    return null;
  }
  if (!object(value) || value.kind !== s.kind || s.phase === 'ready') fail('Section child kind contradicts its authority.');
  if (value.kind === 'lr') {
    const r = value.record;
    if (!object(r) || r.user_id !== s.owner_id || r.id !== `timed-section::${s.id}` || r.pool_slug !== `drill::timed-section::${s.id}` || r.completion_id !== r.pool_slug
      || canonical(r.question_queue) !== canonical(s.frozen_qids) || !integer(r.current_index) || r.current_index !== s.current_index || !Array.isArray(r.attempts)
      || r.status !== (s.phase === 'complete' ? 'completed' : 'in_progress')) fail('LR child belongs to another owner, source or position.');
    const seen = new Set<string>();
    for (const a of r.attempts) {
      if (!object(a) || typeof a.qid !== 'string' || !s.frozen_qids.includes(a.qid) || seen.has(a.qid) || !letter(a.selected_answer) || typeof a.correct !== 'boolean' || !integer(a.time_ms)) fail('Invalid saved LR attempt.');
      seen.add(a.qid);
    }
    if (r.question_states !== undefined) questionStates(r.question_states, s.frozen_qids);
  } else {
    const r = value.session;
    if (!object(r) || r.user_id !== s.owner_id || typeof r.id !== 'string' || !uuid.test(r.id) || r.timed_section_sitting_id !== s.id
      || !object(r.config) || r.config.timedSectionSittingId !== s.id || r.config.currentQuestionIndex !== s.current_index
      || canonical(r.passage_ids) !== canonical(s.frozen_source.passageIds) || !Array.isArray(value.attempts)
      || r.status !== (s.phase === 'complete' ? 'completed' : s.phase === 'abandoned' ? 'abandoned' : 'in_progress')) fail('RC child belongs to another owner, source or position.');
    const ids = new Set<string>(); const questions = new Set<number>();
    for (const a of value.attempts) {
      if (!object(a) || typeof a.id !== 'string' || !uuid.test(a.id) || ids.has(a.id) || a.user_id !== s.owner_id || a.session_id !== r.id
        || !integer(a.question_id) || questions.has(a.question_id) || !integer(a.passage_id) || a.is_first_attempt !== true
        || !(s.frozen_source.questions as TimedObject[]).some(q => q.questionId === a.question_id && q.passageId === a.passage_id)
        || !(a.selected === null || letter(a.selected)) || !(a.is_correct === null || typeof a.is_correct === 'boolean')
        || a.selected !== null && typeof a.is_correct !== 'boolean' || a.selected === null && a.is_correct !== null && a.is_correct !== false
        || !integer(a.time_ms)) fail('Invalid saved RC attempt binding.');
      ids.add(a.id); questions.add(a.question_id);
    }
  }
  canonical(value);
  return value as unknown as TimedSectionChild;
}
function parseReceipt(value: unknown, owner: string, work: string): TimedSectionReceipt {
  if (!object(value) || value.ownerId !== owner || value.workId !== work || typeof value.commandId !== 'string' || !uuid.test(value.commandId)
    || !integer(value.committedRevision) || value.committedRevision < 1 || !object(value.result)) fail('Invalid section receipt owner or revision.');
  const command = parseCommand(value.command, work);
  keys(value, ['ownerId', 'workId', 'commandId', 'command', 'committedRevision', 'result']);
  if (command.commandId !== value.commandId || value.committedRevision !== (command.operation === 'create' ? 1 : command.expectedRevision + 1)
    || value.result.operation !== command.operation) fail('Receipt does not match its section command.');
  canonical(value);
  return value as unknown as TimedSectionReceipt;
}
function parseAuthority(value: unknown, owner: string, work: string): TimedSectionAuthority {
  if (!object(value) || value.contractVersion !== 1 || value.workKind !== 'standalone-section' || typeof value.replayed !== 'boolean' || !date(value.serverTime)) fail('Invalid standalone section response contract.');
  const sitting = parseSitting(value.sitting, owner, work);
  const child = parseChild(value.child, sitting);
  const receipt = value.receipt === null ? null : parseReceipt(value.receipt, owner, work);
  if (receipt && (receipt.committedRevision > sitting.revision || sitting.writer_epoch < receipt.command.writerEpoch)) fail('Section response predates its committed receipt.');
  if (receipt) validatePayload(receipt.command.operation, receipt.command.payload, receipt.command.operation === 'create' ? null : sitting);
  if (receipt?.command.operation === 'close' && (sitting.phase !== 'complete'
    || canonical(Object.fromEntries(Object.entries(receipt.result).filter(([key]) => key !== 'operation'))) !== canonical(sitting.result))) fail('Closeout receipt contradicts the terminal section result.');
  return { contractVersion: 1, workKind: 'standalone-section', sitting, child, receipt, replayed: value.replayed, serverTime: value.serverTime };
}
function forward(next: TimedSectionSitting, previous: TimedSectionSitting): void {
  if (source(next) !== source(previous)) fail('The account changed the frozen section source.');
  if (next.revision < previous.revision) throw new TimedSectionError('conflict', 'The read predates acknowledged section work.', previous);
  if (next.writer_epoch < previous.writer_epoch || next.elapsed_ms < previous.elapsed_ms
    || next.revision === previous.revision && canonical(next) !== canonical(previous)
    || ['complete', 'abandoned'].includes(previous.phase) && canonical(next) !== canonical(previous)) fail('The account would regress acknowledged section work.');
}

/** Separate namespace and parser; the established full-PrepTest client is unchanged. */
export class TimedSectionClient {
  private readonly key: string;
  constructor(private readonly ownerId: string, private readonly workId: string,
    private readonly transport: TimedSectionTransport = supabase as unknown as TimedSectionTransport,
    private readonly storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
    private readonly locks: TimedWorkLockCoordinator | undefined = globalThis.navigator?.locks) {
    if (!uuid.test(ownerId) || !uuid.test(workId)) fail('A section owner and sitting UUID are required.');
    this.key = `lsatu:timed-section:v1:${encodeURIComponent(ownerId)}:${encodeURIComponent(workId)}`;
  }
  private async locked<T>(action: () => Promise<T>): Promise<T> {
    if (!this.locks?.request) throw new TimedSectionError('storage', 'This browser cannot coordinate section commands across tabs. No command was sent.');
    return this.locks.request(this.key, action);
  }
  private async actor(): Promise<void> {
    let response: Awaited<ReturnType<TimedSectionTransport['auth']['getUser']>>;
    try { response = await this.transport.auth.getUser(); } catch { throw new TimedSectionError('authentication', 'Could not verify the current account. The section command is retained.'); }
    if (response.error || response.data.user?.id !== this.ownerId) throw new TimedSectionError('authentication', 'Sign in to the section owner account before retrying.');
  }
  private raw(): string | null {
    try { return this.storage.getItem(this.key); } catch { throw new TimedSectionError('storage', 'This browser cannot read the retained section command.'); }
  }
  private read(raw = this.raw()): Stored {
    if (raw === null) return { version: 1, ownerId: this.ownerId, workId: this.workId, pending: null, pendingSitting: null, sitting: null, receipt: null, rejection: null, archived: [] };
    let value: unknown; try { value = JSON.parse(raw); } catch { return fail('The saved section command is unreadable and has been retained.'); }
    if (!object(value) || value.version !== 1 || value.ownerId !== this.ownerId || value.workId !== this.workId || !Array.isArray(value.archived)) fail('Saved section state belongs to another owner, sitting or version.');
    const sitting = value.sitting === null ? null : parseSitting(value.sitting, this.ownerId, this.workId);
    const pending = value.pending === null ? null : parseCommand(value.pending, this.workId);
    const pendingSitting = value.pendingSitting === null ? null : parseSitting(value.pendingSitting, this.ownerId, this.workId);
    const receipt = value.receipt === null ? null : parseReceipt(value.receipt, this.ownerId, this.workId);
    if (receipt && (!sitting || receipt.committedRevision > sitting.revision)) fail('Saved receipt contradicts the retained authority.');
    if (pending) {
      if (pending.operation === 'create' ? pendingSitting !== null : !pendingSitting || pending.expectedRevision !== pendingSitting.revision || pending.writerEpoch !== pendingSitting.writer_epoch) fail('Pending command contradicts its original section authority.');
      validatePayload(pending.operation, pending.payload, pendingSitting);
    } else if (pendingSitting !== null) fail('Section recovery authority has no retained command.');
    const rejection = value.rejection;
    if (rejection !== null && (!object(rejection) || !pending || !['PT401', 'PT409', 'PT410'].includes(rejection.code as string)
      || canonical(parseCommand(rejection.command, this.workId)) !== canonical(pending) || typeof rejection.message !== 'string'
      || !(rejection.authoritativeRevision === null || integer(rejection.authoritativeRevision)))) fail('Invalid retained section denial.');
    for (const archived of value.archived) {
      if (!object(archived) || !object(archived.rejection) || !date(archived.archivedAt)
        || canonical(parseCommand(archived.command, this.workId)) !== canonical(parseCommand(archived.rejection.command, this.workId))) fail('Invalid archived section command.');
      parseSitting(archived.sitting, this.ownerId, this.workId);
    }
    return { version: 1, ownerId: this.ownerId, workId: this.workId, sitting, pending, pendingSitting, receipt, rejection: rejection as unknown as Rejection | null, archived: value.archived as unknown as Archived[] };
  }
  private write(next: Stored, expectedRaw: string | null): void {
    if (this.raw() !== expectedRaw) throw new TimedSectionError('conflict', 'Another tab changed the retained section command. Read it again.');
    const raw = canonical(next);
    try { this.storage.setItem(this.key, raw); } catch { throw new TimedSectionError('storage', 'The browser cannot retain the section command. No new command was sent.'); }
    if (this.raw() !== raw) throw new TimedSectionError('storage', 'The browser did not retain the section command.');
  }
  readPending(): TimedSectionCommand | null { return this.read().pending; }
  readAuthoritativeSitting(): TimedSectionSitting | null { return this.read().sitting; }
  readReceipt(): TimedSectionReceipt | null { return this.read().receipt; }
  readRejection(): Rejection | null { return this.read().rejection; }
  readArchivedCommands(): Archived[] { return this.read().archived; }
  async prepare<O extends TimedSectionOperation>(operation: O, payload: TimedSectionPayloads[O], deviceId: string, authority: TimedSectionSitting | null): Promise<TimedSectionCommand> {
    return this.locked(async () => {
      await this.actor(); const raw = this.raw(); const stored = this.read(raw);
      if (stored.pending) throw new TimedSectionError('conflict', 'Retry or resolve the retained section command first.');
      const sitting = authority === null ? null : parseSitting(authority, this.ownerId, this.workId);
      if (operation === 'create' ? sitting !== null || stored.sitting !== null : sitting === null) fail('This operation requires the matching section authority.');
      if (stored.sitting && sitting) forward(sitting, stored.sitting);
      validatePayload(operation, payload as TimedObject, sitting);
      const pending = parseCommand({ workKind: 'standalone-section', workId: this.workId, commandId: crypto.randomUUID(), deviceId,
        expectedRevision: sitting?.revision ?? 0, writerEpoch: sitting?.writer_epoch ?? 0, operation, payload }, this.workId);
      this.write({ ...stored, pending, pendingSitting: sitting, sitting, rejection: null }, raw);
      return this.read().pending!;
    });
  }
  private async capability(operation: TimedSectionOperation | 'read'): Promise<void> {
    let response: Awaited<ReturnType<TimedSectionTransport['rpc']>>;
    try { response = await this.transport.rpc('timed_section_capability_v1'); } catch { throw new TimedSectionError('capability', 'Section capability could not be verified. The command is retained.'); }
    const value = response.data;
    if (response.error || !object(value) || value.contractVersion !== 1 || value.workKind !== 'standalone-section' || typeof value.enabled !== 'boolean'
      || operation !== 'read' && value.enabled !== true || !Array.isArray(value.operations) || !value.operations.includes(operation)
      || !Array.isArray(value.sources) || value.sources.length !== 1 || value.sources[0] !== 'manual-canonical') throw new TimedSectionError('capability', 'The protected section writer is not available for this source or operation.');
  }
  async requireCapability(operation: TimedSectionOperation | 'read'): Promise<void> { await this.actor(); await this.capability(operation); await this.actor(); }
  async refresh(): Promise<TimedSectionAuthority> { return this.locked(() => this.refreshUnlocked()); }
  private async refreshUnlocked(): Promise<TimedSectionAuthority> {
    await this.actor(); await this.capability('read'); await this.actor();
    let response: Awaited<ReturnType<TimedSectionTransport['rpc']>>;
    try { response = await this.transport.rpc('read_timed_section_v1', { p_work_id: this.workId }); } catch { throw new TimedSectionError('transport', 'The account section read failed. Retained work is unchanged.'); }
    await this.actor();
    if (response.error) throw new TimedSectionError(this.errorKind(response.error.code), response.error.message ?? 'The section authority could not be read.');
    const result = parseAuthority(response.data, this.ownerId, this.workId);
    if (result.receipt !== null || result.replayed) fail('A section read must not claim a command receipt.');
    const raw = this.raw(); const stored = this.read(raw);
    if (stored.sitting) forward(result.sitting, stored.sitting);
    this.write({ ...stored, sitting: result.sitting }, raw);
    return result;
  }
  private errorKind(code?: string): TimedWorkFailure {
    return ({ PT401: 'access', PT409: 'conflict', PT410: 'expired-writer', PT412: 'replay-mismatch', PT422: 'invalid-command', PT503: 'capability' } as Record<string, TimedWorkFailure>)[code ?? ''] ?? 'transport';
  }
  async retry(): Promise<TimedSectionAcknowledgment> {
    return this.locked(async () => {
      await this.actor(); const pending = this.read().pending;
      if (!pending) throw new TimedSectionError('invalid-command', 'There is no retained section command to retry.');
      await this.capability(pending.operation); await this.actor();
      const beforeRaw = this.raw(); const before = this.read(beforeRaw);
      if (!before.pending || canonical(before.pending) !== canonical(pending)) throw new TimedSectionError('conflict', 'The section command changed before transmission.');
      this.write({ ...before, rejection: null }, beforeRaw);
      let response: Awaited<ReturnType<TimedSectionTransport['rpc']>>;
      try { response = await this.transport.rpc(pending.operation === 'create' ? 'create_timed_section_v1' : 'commit_timed_section_v1', { p_command: pending }); }
      catch { throw new TimedSectionError('transport', 'The command reply was lost. Retry the retained section command.'); }
      await this.actor();
      if (response.error) {
        let authoritative: TimedSectionSitting | undefined;
        if (response.error.details) {
          try { const details = JSON.parse(response.error.details); if (object(details) && details.sitting) authoritative = parseSitting(details.sitting, this.ownerId, this.workId); } catch { /* A denial is not an acknowledgment. */ }
        }
        const message = response.error.message ?? 'The section command was not acknowledged.';
        if (['PT401', 'PT409', 'PT410'].includes(response.error.code ?? '')) {
          const raw = this.raw(); const stored = this.read(raw);
          if (!stored.pending || canonical(stored.pending) !== canonical(pending)) throw new TimedSectionError('conflict', 'The denied section command changed in flight.');
          this.write({ ...stored, rejection: { command: pending, code: response.error.code!, message, authoritativeRevision: authoritative?.revision ?? null } }, raw);
        }
        throw new TimedSectionError(this.errorKind(response.error.code), message, authoritative);
      }
      let result = parseAuthority(response.data, this.ownerId, this.workId);
      if (!result.receipt || canonical(result.receipt.command) !== canonical(pending) || result.sitting.writer_epoch < pending.writerEpoch
        || !result.replayed && result.sitting.revision !== result.receipt.committedRevision) fail('The receipt does not acknowledge the retained section command.');
      if (!result.replayed && (result.sitting.writer_epoch !== (pending.operation === 'create' ? 1 : pending.writerEpoch + (pending.operation === 'claim' ? 1 : 0))
        || result.sitting.device_id !== pending.deviceId)) fail('The new section receipt contradicts its writer ownership.');
      if (pending.operation === 'create' && (result.sitting.kind !== pending.payload.kind || result.sitting.pt !== pending.payload.pt
        || result.sitting.section !== pending.payload.section || result.sitting.pace !== pending.payload.pace)) fail('The created section has a different source.');
      if (pending.operation === 'create' && !result.replayed && (result.sitting.phase !== 'ready' || result.sitting.elapsed_ms !== 0 || result.sitting.current_index !== 0)) fail('New section authority must begin fresh.');
      const raw = this.raw(); const stored = this.read(raw);
      if (!stored.pending || canonical(stored.pending) !== canonical(pending)) throw new TimedSectionError('conflict', 'The retained section command changed in flight.');
      let refreshRequired = false;
      if (stored.sitting) {
        if (source(result.sitting) !== source(stored.sitting)) fail('The command response changed the frozen section source.');
        if (result.sitting.revision < stored.sitting.revision) { refreshRequired = true; result = { ...result, sitting: stored.sitting, child: null }; }
        else forward(result.sitting, stored.sitting);
      }
      const receipt = result.receipt!;
      this.write({ ...stored, pending: null, pendingSitting: null, sitting: result.sitting, receipt, rejection: null }, raw);
      if (refreshRequired) return { ...await this.refreshUnlocked(), receipt, replayed: result.replayed };
      return { ...result, receipt };
    });
  }
  async archiveRejected(): Promise<TimedSectionAuthority> {
    return this.locked(async () => {
      const before = this.read();
      if (!before.pending || !before.rejection) throw new TimedSectionError('conflict', 'A lost reply must retry its original command. Only a definite denial can be archived.');
      const current = await this.refreshUnlocked(); const raw = this.raw(); const stored = this.read(raw);
      if (!stored.pending || !stored.rejection || canonical(before.pending) !== canonical(stored.pending) || canonical(before.rejection) !== canonical(stored.rejection)
        || stored.rejection.authoritativeRevision !== null && current.sitting.revision < stored.rejection.authoritativeRevision) throw new TimedSectionError('conflict', 'The rejected command or section authority changed during recovery.');
      this.write({ ...stored, pending: null, pendingSitting: null, rejection: null,
        archived: [...stored.archived, { command: stored.pending, rejection: stored.rejection, sitting: current.sitting, archivedAt: new Date().toISOString() }] }, raw);
      return current;
    });
  }
}
