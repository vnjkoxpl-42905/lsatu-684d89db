import { PracticeSession, type PracticeSessionAttempt } from '@/bootcamps/main-conclusion/persistence/records';
import { normalizeQuestionTextFields, normalizeQType, type LRQuestion } from './questionLoader';
import { TimedPracticeTestStore, timedPracticeTestClock, type TimedPracticeTestSnapshot } from './timedPracticeTestStore';
import { TimedWorkError, type TimedObject, type TimedLetter, type TimedWorkCommand } from './timedWorkClient';
import { z } from 'zod';

export interface TimedLrRawQuestion {
  practiceTest: string; sectionNumber: number;
  questionNumber: number; stimulus?: string; questionStem: string; answerChoices: LRQuestion['answerChoices'];
  correctAnswer: TimedLetter; questionType?: string; questionDifficulty?: number; Question_Difficulty?: number; status?: string;
}
export interface TimedLrAnswer {
  qid: string; selected: TimedLetter; correct: boolean; timeMs: number; flagged?: boolean; switchCount?: number;
}
export interface TimedLrView {
  snapshot: TimedPracticeTestSnapshot;
  session: PracticeSession;
  questions: LRQuestion[];
  clock: ReturnType<typeof timedPracticeTestClock>;
  questionStates: TimedLrQuestionState[];
}
export interface TimedLrQuestionState { qid: string; timeMs: number; flagged: boolean; eliminations: TimedLetter[] }
const object = (value: unknown): value is TimedObject => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const letter = (value: unknown): value is TimedLetter => typeof value === 'string' && /^[A-E]$/.test(value);
function invalid(message: string): never { throw new TimedWorkError('contract', message); }
/** A sealed sitting keeps the qtype and level it was frozen with; only their shape is checked. */
export function frozenClassification(expected: TimedObject): boolean {
  return typeof expected.qtype === 'string' && expected.qtype.trim().length > 0
    && Number.isSafeInteger(expected.level) && Number(expected.level) >= 1 && Number(expected.level) <= 5;
}
// PostgreSQL JSON timestamps include an offset and microseconds; the legacy
// PracticeSession schema requires UTC Z timestamps. Normalize this transport
// representation only, without relaxing source or legacy-session validation.
const accountTimestampSchema = z.string().datetime({ offset: true });
function accountTimestamp(value: unknown): unknown {
  if (typeof value !== 'string' || !accountTimestampSchema.safeParse(value).success) return value;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : value;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
async function hash(value: unknown): Promise<string> {
  try { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)))))
    .map(byte => byte.toString(16).padStart(2, '0')).join(''); }
  catch { return invalid('This browser cannot verify the frozen LR content.'); }
}

/** Prepared v1-only LR adapter. No legacy session, history, attempt or KV writer is called. */
export class TimedLrAdapter {
  constructor(private readonly store: TimedPracticeTestStore, private readonly ownerId: string, private readonly workId: string,
    private readonly legIndex: number, private readonly deviceId: string, private readonly rawSection: TimedLrRawQuestion[],
    private readonly loadedQuestions?: LRQuestion[], private readonly now: () => number = () => performance.now()) {}

  private async content(snapshot: TimedPracticeTestSnapshot): Promise<LRQuestion[]> {
    const p = snapshot.parent; const leg = (p.timed_manifest.legs as TimedObject[])[this.legIndex]; const frozen = p.timed_frozen_legs[this.legIndex];
    if (p.user_id !== this.ownerId || p.id !== this.workId || !leg || leg.kind !== 'lr' || !frozen || frozen.kind !== 'lr'
      || !Array.isArray(leg.qids) || !Array.isArray(leg.questions) || leg.section !== frozen.section || leg.questionCount !== frozen.questionCount) invalid('LR source does not match the frozen account leg.');
    const raw = this.rawSection.filter(row => row.status !== 'removed').sort((a, b) => a.questionNumber - b.questionNumber);
    const qid = (row: TimedLrRawQuestion) => `PT${p.pt}-S${leg.section}-Q${row.questionNumber}`;
    if (canonical(raw.map(qid)) !== canonical(leg.qids) || new Set(this.rawSection.map(row => row.questionNumber)).size !== this.rawSection.length) invalid('Canonical LR content differs from the frozen queue.');
    for (const [index, row] of raw.entries()) {
      const expected = leg.questions[index];
      if (row.practiceTest !== `PT${p.pt}` || row.sectionNumber !== leg.section || !object(expected) || expected.qid !== qid(row) || expected.qnum !== row.questionNumber || !letter(row.correctAnswer)
        || expected.contentSha256 !== await hash({ stimulus: row.stimulus ?? '', stem: row.questionStem, choices: row.answerChoices })) invalid('LR question content differs from its frozen version.');
    }
    const normalized = normalizeQuestionTextFields(this.rawSection).filter(row => row.status !== 'removed').sort((a, b) => a.questionNumber - b.questionNumber);
    const bankQuestions: LRQuestion[] = normalized.map(row => ({ qid: qid(row), pt: p.pt, section: leg.section as number, qnum: row.questionNumber,
      qtype: normalizeQType(row.questionType || '', row.questionStem), difficulty: row.questionDifficulty || row.Question_Difficulty || 3,
      stimulus: row.stimulus, questionStem: row.questionStem, answerChoices: { ...row.answerChoices }, correctAnswer: row.correctAnswer }));
    // A later bank relabel must never lock a student out of a sealed sitting.
    const questions = bankQuestions.map((question, index) => {
      const expected = leg.questions[index];
      if (!object(expected) || !frozenClassification(expected)) invalid('LR classification in the frozen manifest is invalid.');
      return { ...question, qtype: expected.qtype as string, difficulty: expected.level as number };
    });
    if (this.loadedQuestions) {
      const fields = (question: LRQuestion) => ({ qid: question.qid, pt: question.pt, section: question.section, qnum: question.qnum,
        stimulus: question.stimulus ?? '', stem: question.questionStem, choices: question.answerChoices, correctAnswer: question.correctAnswer,
        qtype: question.qtype, difficulty: question.difficulty });
      if (canonical(this.loadedQuestions.map(fields)) !== canonical(questions.map(fields))) invalid('Loaded QuestionBank content contradicts the verified normalized LR section.');
    }
    return questions;
  }

  private async view(snapshot: TimedPracticeTestSnapshot): Promise<TimedLrView | null> {
    const questions = await this.content(snapshot);
    if (snapshot.parent.current_leg !== this.legIndex) {
      if (snapshot.parent.current_leg < this.legIndex) invalid('The LR section has not been started.');
      return null;
    }
    // Validate read-only recovery independently; never replace the authoritative writer to launch it.
    const saved = snapshot.checkpoint; const sourceKey = `drill::practice-test::${this.workId}::leg-${this.legIndex}`;
    if (!saved || saved.kind !== 'lr' || !object(saved.record) || saved.record.user_id !== this.ownerId
      || saved.record.pool_slug !== sourceKey || saved.record.completion_id !== sourceKey
      || canonical(saved.record.question_queue) !== canonical(questions.map(question => question.qid))) invalid('Expected the exact acknowledged LR child.');
    const parsed = PracticeSession.safeParse({ ...saved.record,
      started_at: accountTimestamp(saved.record.started_at), updated_at: accountTimestamp(saved.record.updated_at),
      timer_mode: snapshot.parent.section_seconds === null ? 'unlimited' : 'custom',
      ...(snapshot.parent.section_seconds === null ? { timer_custom_minutes: undefined } : { timer_custom_minutes: snapshot.parent.section_seconds / 60 }) });
    if (!parsed.success || parsed.data.current_index >= questions.length) invalid('The LR account checkpoint is invalid.');
    const session = parsed.data; const seen = new Set<string>();
    if (['leg-running', 'leg-paused'].includes(snapshot.parent.timed_phase) && session.status !== 'in_progress') invalid('LR child completion contradicts the authoritative current leg.');
    for (const attempt of session.attempts) {
      const question = questions.find(value => value.qid === attempt.qid);
      if (!question || seen.has(attempt.qid) || !letter(attempt.selected_answer) || attempt.correct !== (attempt.selected_answer === question.correctAnswer)) invalid('LR answer attribution or correctness contradicts the frozen content.');
      seen.add(attempt.qid);
    }
    if (session.regulation_answered_qids && (new Set(session.regulation_answered_qids).size !== session.regulation_answered_qids.length
      || session.regulation_answered_qids.some(value => !seen.has(value)))) invalid('Invalid frozen LR regulation answers.');
    const clock = timedPracticeTestClock(snapshot, this.deviceId, this.now());
    session.elapsed_ms = clock.elapsedMs;
    const rawStates = saved.record.question_states ?? [];
    if (!Array.isArray(rawStates)) invalid('Invalid LR question markers.');
    const seenStates = new Set<string>();
    const questionStates = rawStates.map(value => {
      if (!object(value) || typeof value.qid !== 'string' || !questions.some(question => question.qid === value.qid)
        || seenStates.has(value.qid) || !integer(value.timeMs) || typeof value.flagged !== 'boolean'
        || !Array.isArray(value.eliminations) || !value.eliminations.every(letter)) invalid('Invalid LR question marker ownership.');
      seenStates.add(value.qid);
      return { qid: value.qid, timeMs: value.timeMs, flagged: value.flagged, eliminations: [...value.eliminations] as TimedLetter[] };
    });
    return { snapshot, session, questions, clock, questionStates };
  }
  async load(): Promise<TimedLrView | null> { return this.view(await this.store.load()); }
  async retry(): Promise<TimedLrView | null> { return this.view(await this.store.retry()); }

  async prepareCheckpoint(view: TimedLrView, currentIndex: number, answers: TimedLrAnswer[], regulationAnsweredQids?: string[], questionStates?: TimedLrQuestionState[]): Promise<TimedWorkCommand> {
    const questions = await this.content(view.snapshot);
    if (view.snapshot.parent.current_leg !== this.legIndex || view.snapshot.parent.timed_phase !== 'leg-running' || !integer(currentIndex) || currentIndex >= questions.length) invalid('LR checkpoint requires its acknowledged running leg and exact position.');
    const seen = new Set<string>();
    for (const answer of answers) {
      const question = questions.find(value => value.qid === answer.qid);
      if (!question || seen.has(answer.qid) || !letter(answer.selected) || answer.correct !== (answer.selected === question.correctAnswer)
        || !integer(answer.timeMs) || (answer.switchCount !== undefined && !integer(answer.switchCount))
        || (answer.flagged !== undefined && typeof answer.flagged !== 'boolean')) invalid('Invalid LR answer or source identity.');
      seen.add(answer.qid);
    }
    if (regulationAnsweredQids && (new Set(regulationAnsweredQids).size !== regulationAnsweredQids.length
      || regulationAnsweredQids.some(qid => !seen.has(qid) && !view.session.attempts.some(attempt => attempt.qid === qid)))) invalid('Regulation answers must belong to saved or pending frozen LR answers.');
    if (questionStates && (new Set(questionStates.map(value => value.qid)).size !== questionStates.length || questionStates.some(value => !questions.some(question => question.qid === value.qid)
      || !integer(value.timeMs) || typeof value.flagged !== 'boolean' || !Array.isArray(value.eliminations) || !value.eliminations.every(letter)))) invalid('Invalid LR question marker source or values.');
    return this.store.prepare('checkpoint', { currentIndex, answers,
      ...(regulationAnsweredQids === undefined ? {} : { regulationAnsweredQids }), ...(questionStates === undefined ? {} : { questionStates }) }, view.snapshot);
  }
  async prepareClose(view: TimedLrView, answerKeys: { qid: string; correctAnswer: TimedLetter }[], analysis: TimedObject): Promise<TimedWorkCommand> {
    const questions = await this.content(view.snapshot);
    if (view.snapshot.parent.current_leg !== this.legIndex || !['leg-running', 'leg-paused'].includes(view.snapshot.parent.timed_phase)
      || !object(analysis) || canonical(answerKeys) !== canonical(questions.map(question => ({ qid: question.qid, correctAnswer: question.correctAnswer })))) invalid('LR closeout requires the entire frozen answer-key set and analysis.');
    return this.store.prepare('close-leg', { answerKeys, analysis }, view.snapshot);
  }
  async prepareControl(view: TimedLrView, operation: 'pause' | 'resume'): Promise<TimedWorkCommand> {
    await this.content(view.snapshot);
    if (view.snapshot.parent.current_leg !== this.legIndex || (operation === 'resume' ? view.snapshot.parent.timed_phase !== 'leg-paused' : view.snapshot.parent.timed_phase !== 'leg-running')) invalid('LR control requires the matching account phase.');
    return this.store.prepare(operation, {}, view.snapshot);
  }
}

export function timedLrAttemptToAnswer(attempt: PracticeSessionAttempt): TimedLrAnswer {
  if (!letter(attempt.selected_answer)) return invalid('The saved LR selection is invalid.');
  return { qid: attempt.qid, selected: attempt.selected_answer, correct: attempt.correct, timeMs: attempt.time_ms,
    ...(attempt.flagged === undefined ? {} : { flagged: attempt.flagged }), ...(attempt.switch_count === undefined ? {} : { switchCount: attempt.switch_count }) };
}
