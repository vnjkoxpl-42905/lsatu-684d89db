import { TimedWorkClient, TimedWorkError, type TimedObject, type TimedWorkParent, type TimedWorkCommand } from '@/lib/timedWorkClient';
import { initialState, type RcSessionState } from '../lib/rcSession';
import type { RcAttempt, RcDrillSession, RcLetter, RcPassage } from '../lib/rcTypes';

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const letter = (value: unknown): value is RcLetter => typeof value === 'string' && /^[A-E]$/.test(value);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function invalid(message: string): never { throw new TimedWorkError('contract', message); }
function equal(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right); }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
async function digest(value: string): Promise<string> {
  try {
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
      .map(byte => byte.toString(16).padStart(2, '0')).join('');
  } catch { return invalid('This browser cannot verify the frozen RC content.'); }
}

export interface TimedRcClock {
  elapsedMs: number;
  remainingMs: number | null;
  paused: boolean;
  requiresRefresh: boolean;
}
/** Projection uses elapsed time since the received server sample, never the device wall clock. */
export function projectTimedRcClock(parent: TimedWorkParent, serverTime: string, elapsedSinceSampleMs = 0, pending = false): TimedRcClock {
  if (!date(serverTime) || !Number.isFinite(elapsedSinceSampleMs) || elapsedSinceSampleMs < 0) invalid('Invalid RC clock sample.');
  const running = parent.timed_phase === 'leg-running';
  const sampleTime = Date.parse(serverTime) + elapsedSinceSampleMs;
  const leaseEnd = running ? Date.parse(parent.timed_lease_expires_at!) : 0;
  const addition = running ? Math.max(0, Math.min(sampleTime, leaseEnd) - Date.parse(parent.timed_running_anchor!)) : 0;
  const elapsedMs = parent.timed_elapsed_ms + addition;
  const requiresRefresh = running && sampleTime >= leaseEnd;
  return { elapsedMs, remainingMs: parent.section_seconds === null ? null : Math.max(0, parent.section_seconds * 1000 - elapsedMs),
    paused: pending || !running || requiresRefresh, requiresRefresh };
}

export interface TimedRcView {
  parent: TimedWorkParent;
  serverTime: string;
  observedAt: number;
  manifestSha256: string;
  session: RcDrillSession;
  attempts: RcAttempt[];
  state: RcSessionState;
  pending: TimedWorkCommand | null;
  clock: TimedRcClock;
  claimRequired: boolean;
}

/** Inactive integration adapter. Only the v1 transport can write; no legacy RC API is imported. */
export class TimedRcAdapter {
  constructor(private readonly client: TimedWorkClient, private readonly ownerId: string,
    private readonly workId: string, private readonly legIndex: number, private readonly passages: RcPassage[], private readonly deviceId: string) {}

  private definition(parent: TimedWorkParent) {
    const manifest = parent.timed_manifest;
    if (parent.user_id !== this.ownerId || parent.id !== this.workId || !integer(this.legIndex)
      || typeof parent.timed_manifest_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(parent.timed_manifest_sha256)
      || !object(manifest) || manifest.pt !== parent.pt || !Array.isArray(manifest.legs)) invalid('RC work is missing its matching server-owned manifest.');
    const leg = manifest.legs[this.legIndex]; const frozen = parent.timed_frozen_legs[this.legIndex];
    if (!object(leg) || leg.kind !== 'rc' || !frozen || frozen.kind !== 'rc' || leg.section !== frozen.section
      || leg.questionCount !== frozen.questionCount || !Array.isArray(leg.passageIds) || !leg.passageIds.every(integer)
      || !equal(leg.passageIds, frozen.passageIds) || !Array.isArray(leg.questions) || !Array.isArray(leg.qids)
      || leg.questions.length !== leg.questionCount || leg.qids.length !== leg.questionCount) invalid('The RC leg contradicts its frozen source.');
    const questions = new Map<number, number>();
    for (const [index, question] of leg.questions.entries()) {
      if (!object(question) || !integer(question.questionId) || !integer(question.passageId) || question.qid !== String(question.questionId)
        || leg.qids[index] !== question.qid || !leg.passageIds.includes(question.passageId) || questions.has(question.questionId)) invalid('Invalid frozen RC question ownership.');
      questions.set(question.questionId, question.passageId);
    }
    if (!equal(this.passages.map(passage => passage.passageId), leg.passageIds)
      || this.passages.some(passage => passage.preptest !== parent.pt || passage.section !== leg.section)
      || !equal(this.passages.flatMap(passage => passage.questions.map(question => String(question.questionId))), leg.qids)
      || this.passages.some(passage => passage.questions.some(question => questions.get(question.questionId) !== passage.passageId))) invalid('Loaded RC content differs from the frozen section.');
    return { questions, passageIds: leg.passageIds as number[], manifestSha256: parent.timed_manifest_sha256, leg };
  }

  private async verifyContent(parent: TimedWorkParent): Promise<void> {
    const { leg } = this.definition(parent);
    if (!Array.isArray(leg.passages)) invalid('Frozen RC passage fingerprints are missing.');
    for (const passage of this.passages) {
      const frozen = leg.passages.find(row => object(row) && row.passageId === passage.passageId);
      if (!object(frozen) || frozen.section !== passage.section || frozen.setNumber !== passage.setNumber
        || frozen.contentSha256 !== await digest(passage.text)) invalid('Loaded passage content differs from the frozen version.');
      for (const question of passage.questions) {
        const expected = (leg.questions as unknown[]).find(row => object(row) && row.questionId === question.questionId);
        const fingerprint = await digest(canonical({ text: passage.text, prompt: question.prompt,
          choices: question.choices.map(choice => ({ letter: choice.letter, text: choice.text })).sort((a, b) => a.letter.localeCompare(b.letter)) }));
        if (!object(expected) || expected.qnum !== question.position || expected.contentSha256 !== fingerprint) invalid('Loaded question content differs from the frozen version.');
      }
    }
  }

  private translate(parent: TimedWorkParent, checkpoint: TimedObject | null, serverTime: string): TimedRcView | null {
    const source = this.definition(parent);
    // A close receipt may already expose the following leg. Never fabricate an old child from it.
    if (parent.current_leg !== this.legIndex) {
      if (parent.current_leg < this.legIndex) invalid('The RC leg has not been started.');
      return null;
    }
    if (!checkpoint || checkpoint.kind !== 'rc' || !object(checkpoint.session) || !Array.isArray(checkpoint.attempts)) invalid('The account did not return the frozen RC session.');
    const row = checkpoint.session;
    if (typeof row.id !== 'string' || !uuid.test(row.id) || row.user_id !== this.ownerId || row.practice_test_run_id !== this.workId
      || row.practice_test_leg !== this.legIndex || !equal(row.passage_ids, source.passageIds) || !object(row.config)
      || row.config.practiceTestRunId !== this.workId || row.config.practiceTestLegIndex !== this.legIndex
      || !integer(row.config.currentQuestionIndex) || row.config.currentQuestionIndex >= source.questions.size
      || !['in_progress', 'completed', 'abandoned'].includes(String(row.status)) || !date(row.started_at)
      || typeof row.excluded_from_analytics !== 'boolean' || !(row.completed_at === null || date(row.completed_at))) invalid('Invalid RC session attribution or saved position.');
    if (row.status === 'completed' && !date(row.completed_at)) invalid('RC completion has no account timestamp.');
    if (['leg-running', 'leg-paused'].includes(parent.timed_phase) && row.status !== 'in_progress') invalid('RC child completion contradicts the authoritative current leg.');
    const seen = new Set<number>();
    const attempts: RcAttempt[] = checkpoint.attempts.map(value => {
      if (!object(value) || typeof value.id !== 'string' || !uuid.test(value.id) || value.user_id !== this.ownerId || value.session_id !== row.id
        || !integer(value.question_id) || !integer(value.passage_id) || source.questions.get(value.question_id) !== value.passage_id
        || seen.has(value.question_id) || value.is_first_attempt !== true || !(value.selected === null || letter(value.selected))
        || !(value.is_correct === null || typeof value.is_correct === 'boolean') || !integer(value.time_ms)
        || typeof value.flagged !== 'boolean' || !Array.isArray(value.eliminations) || !value.eliminations.every(letter) || !date(value.created_at)) invalid('Invalid RC first-attempt attribution.');
      seen.add(value.question_id);
      return { id: value.id, userId: this.ownerId, sessionId: row.id as string, questionId: value.question_id, passageId: value.passage_id,
        selected: value.selected as RcLetter | null, isCorrect: value.is_correct as boolean | null, timeMs: value.time_ms,
        flagged: value.flagged, eliminations: [...value.eliminations] as RcLetter[], isFirstAttempt: true, createdAt: value.created_at };
    });
    const pending = this.client.readPending();
    const clock = projectTimedRcClock(parent, serverTime, 0, pending !== null);
    const claimRequired = parent.active_device_id !== this.deviceId || clock.requiresRefresh;
    clock.paused = clock.paused || claimRequired;
    const session: RcDrillSession = { id: row.id, userId: this.ownerId, passageIds: [...source.passageIds],
      status: row.status as RcDrillSession['status'], excludedFromAnalytics: row.excluded_from_analytics, startedAt: row.started_at, completedAt: row.completed_at as string | null,
      config: { reveal: 'end_of_set', source: 'manual', timing: parent.section_seconds === null ? { mode: 'unlimited' } : { mode: 'per_passage_budget', secondsPerPassage: parent.section_seconds / source.passageIds.length },
        practiceTestRunId: this.workId, practiceTestLegIndex: this.legIndex, clockElapsedSeconds: Math.floor(clock.elapsedMs / 1000), currentQuestionIndex: row.config.currentQuestionIndex } };
    const state = initialState(this.passages);
    state.currentIndex = row.config.currentQuestionIndex; state.paused = clock.paused; state.submitted = session.status === 'completed';
    for (const attempt of attempts) {
      if (attempt.selected) state.answers.set(attempt.questionId, attempt.selected);
      state.eliminations.set(attempt.questionId, [...attempt.eliminations]);
      if (attempt.flagged) state.flagged.add(attempt.questionId);
      state.recorded.add(attempt.questionId);
    }
    return { parent, serverTime, observedAt: performance.now(), manifestSha256: source.manifestSha256, session, attempts, state, pending, clock, claimRequired };
  }

  async refresh(): Promise<TimedRcView | null> {
    const result = await this.client.refresh();
    await this.verifyContent(result.parent);
    return this.translate(result.parent, result.checkpoint, result.serverTime);
  }
  async retry(): Promise<TimedRcView | null> {
    const result = await this.client.retry();
    await this.verifyContent(result.parent);
    return this.translate(result.parent, result.checkpoint, result.serverTime);
  }
  readPending(): TimedWorkCommand | null { return this.client.readPending(); }

  async prepareCheckpoint(view: TimedRcView, currentIndex: number, attempts: RcAttempt[], deviceId: string): Promise<TimedWorkCommand> {
    await this.verifyContent(view.parent);
    const source = this.definition(view.parent);
    if (deviceId !== this.deviceId || view.parent.active_device_id !== deviceId || projectTimedRcClock(view.parent, view.serverTime, Math.max(0, performance.now() - view.observedAt)).requiresRefresh)
      throw new TimedWorkError('expired-writer', 'Claim or refresh the account writer before preparing an RC checkpoint.');
    if (view.parent.current_leg !== this.legIndex || view.parent.timed_phase !== 'leg-running' || view.clock.paused
      || !integer(currentIndex) || currentIndex >= source.questions.size || view.session.userId !== this.ownerId
      || view.session.config.practiceTestRunId !== this.workId || view.session.config.practiceTestLegIndex !== this.legIndex) invalid('RC checkpoint requires the matching acknowledged running section.');
    const seen = new Set<number>();
    const answers = attempts.map(attempt => {
      if (!attempt.id || !uuid.test(attempt.id) || attempt.userId !== this.ownerId || attempt.sessionId !== view.session.id
        || source.questions.get(attempt.questionId) !== attempt.passageId || seen.has(attempt.questionId) || !attempt.isFirstAttempt) invalid('RC answers require stable IDs and matching first-attempt ownership.');
      seen.add(attempt.questionId);
      return { attemptId: attempt.id, questionId: attempt.questionId, passageId: attempt.passageId, selected: attempt.selected,
        isCorrect: attempt.isCorrect, timeMs: attempt.timeMs, flagged: attempt.flagged, eliminations: [...attempt.eliminations] };
    });
    return this.client.prepare('checkpoint', { currentIndex, answers }, deviceId, view.parent);
  }

  async prepareControl(view: TimedRcView, operation: 'pause' | 'resume' | 'close-leg', deviceId: string): Promise<TimedWorkCommand> {
    await this.verifyContent(view.parent);
    this.definition(view.parent);
    if (view.parent.current_leg !== this.legIndex || view.session.userId !== this.ownerId
      || view.session.config.practiceTestRunId !== this.workId || view.session.config.practiceTestLegIndex !== this.legIndex
      || (operation === 'resume' ? view.parent.timed_phase !== 'leg-paused' : operation === 'close-leg' ? !['leg-running', 'leg-paused'].includes(view.parent.timed_phase) : view.parent.timed_phase !== 'leg-running')) invalid('RC control requires matching account phase and source.');
    if (deviceId !== this.deviceId || view.parent.active_device_id !== deviceId || projectTimedRcClock(view.parent, view.serverTime, Math.max(0, performance.now() - view.observedAt)).requiresRefresh)
      throw new TimedWorkError('expired-writer', 'Claim or refresh the account writer before preparing another RC command.');
    return this.client.prepare(operation, {}, deviceId, view.parent);
  }
  async prepareClose(view: TimedRcView, analysis: TimedObject, deviceId: string): Promise<TimedWorkCommand> {
    await this.verifyContent(view.parent);
    if (!object(analysis) || view.parent.current_leg !== this.legIndex || !['leg-running', 'leg-paused'].includes(view.parent.timed_phase)
      || deviceId !== this.deviceId || view.parent.active_device_id !== deviceId
      || projectTimedRcClock(view.parent, view.serverTime, Math.max(0, performance.now() - view.observedAt)).requiresRefresh) invalid('RC closeout requires matching writer, phase and analysis.');
    return this.client.prepare('close-leg', { analysis }, deviceId, view.parent);
  }
}
