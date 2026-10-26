import { TimedWorkClient, TimedWorkError, type TimedLetter, type TimedObject, type TimedWorkCommand, type TimedWorkParent } from './timedWorkClient';
import { TimedPracticeTestStore, timedParentToPracticeTestRun, timedPracticeTestClock, type TimedPracticeTestSnapshot } from './timedPracticeTestStore';
import { TimedLrAdapter, type TimedLrRawQuestion, type TimedLrView } from './timedLrAdapter';
import { TimedRcAdapter, type TimedRcView } from '@/features/rc/api/timedRcAdapter';
import { loadPassages } from '@/features/rc/lib/rcBank';
import type { RcAttempt, RcPassage } from '@/features/rc/lib/rcTypes';
import type { LRQuestion } from './questionLoader';
import { analyseSection } from './sectionAnalysis';
import { UNANSWERED } from './sectionAnswer';
import { rcCheckpointGrade } from '@/features/rc/lib/rcHistoricalGrading';

export interface TimedChildAnswer {
  selected: TimedLetter | null; timeMs: number; flagged: boolean; switchCount: number; eliminations: TimedLetter[]; attemptId?: string;
}
export interface TimedChildState {
  snapshot: TimedPracticeTestSnapshot;
  view: TimedLrView | TimedRcView | null;
  questions: (LRQuestion | { qid: string; qnum: number; questionStem: string; stimulus: string; answerChoices: Record<string, string>; correctAnswer: TimedLetter })[];
  passages: RcPassage[];
  answers: Record<string, TimedChildAnswer>;
  currentIndex: number;
  pending: TimedWorkCommand | null;
}
function invalid(message: string): never { throw new TimedWorkError('contract', message); }

/** Official protected children share this controller and never call legacy writers. */
export class TimedChildController {
  private readonly store: TimedPracticeTestStore;
  private lr: TimedLrAdapter | null = null;
  private rc: TimedRcAdapter | null = null;
  constructor(private readonly client: TimedWorkClient, private readonly ownerId: string, private readonly runId: string,
    private readonly legIndex: number, readonly kind: 'lr' | 'rc', readonly deviceId: string,
    private readonly loadRaw: (pt: number, section: number) => Promise<TimedLrRawQuestion[]> = async (pt, section) => {
      const response = await fetch(`/data/PT${pt}-S${section}-LR.json`);
      if (!response.ok) throw new Error('The canonical section could not be loaded.');
      return response.json();
    }, private readonly loadRc: (ids: number[]) => Promise<RcPassage[]> = loadPassages,
    private readonly now: () => number = () => performance.now()) {
    this.store = new TimedPracticeTestStore(client, deviceId, now);
  }
  private snapshot(parent: TimedWorkParent, serverTime: string): TimedPracticeTestSnapshot {
    return { parent, serverTime, run: timedParentToPracticeTestRun(parent), observedAt: this.now(), checkpoint: null,
      pending: this.client.readPending(), receipt: this.client.readReceipt(), rejection: this.client.readRejection() };
  }
  private state(view: TimedLrView | TimedRcView | null, fallback: TimedPracticeTestSnapshot): TimedChildState {
    const snapshot = view && 'questions' in view ? view.snapshot : view && 'parent' in view ? this.snapshot(view.parent, view.serverTime) : fallback;
    const answers: Record<string, TimedChildAnswer> = {};
    if (view && 'session' in view && 'question_queue' in view.session) {
      for (const attempt of view.session.attempts) answers[attempt.qid] = { selected: attempt.selected_answer as TimedLetter, timeMs: attempt.time_ms,
        flagged: attempt.flagged ?? false, switchCount: attempt.switch_count ?? 0, eliminations: [] };
      if ('questionStates' in view) for (const marker of view.questionStates) answers[marker.qid] = { ...(answers[marker.qid] ?? { selected: null, switchCount: 0 }), timeMs: Math.max(marker.timeMs, answers[marker.qid]?.timeMs ?? 0), flagged: marker.flagged, eliminations: [...marker.eliminations] };
    } else if (view && 'attempts' in view) {
      for (const attempt of view.attempts) answers[String(attempt.questionId)] = { selected: attempt.selected, timeMs: attempt.timeMs,
        flagged: attempt.flagged, switchCount: 0, eliminations: [...attempt.eliminations], attemptId: attempt.id };
    }
    const questions = view && 'questions' in view ? view.questions : view && 'state' in view ? view.state.items.map(item => ({ qid: String(item.question.questionId),
      qnum: item.question.position, questionStem: item.question.prompt ?? '', stimulus: item.passage.text,
      answerChoices: Object.fromEntries(item.question.choices.map(choice => [choice.letter, choice.text])), correctAnswer: item.question.correctAnswer })) : [];
    const passages = view && 'state' in view ? [...new Map(view.state.items.map(item => [item.passage.passageId, item.passage])).values()] : [];
    const pending = this.client.readPending();
    if (pending?.operation === 'checkpoint' && Array.isArray(pending.payload.answers)) {
      for (const value of pending.payload.answers) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
        const qid = this.kind === 'lr' ? value.qid : String(value.questionId);
        if (typeof qid !== 'string' || !questions.some(question => question.qid === qid)) continue;
        answers[qid] = { selected: value.selected as TimedLetter | null, timeMs: value.timeMs as number, flagged: value.flagged === true,
          switchCount: this.kind === 'lr' ? (value.switchCount as number ?? 0) : 0,
          eliminations: (value.eliminations as TimedLetter[] ?? []), ...(this.kind === 'rc' ? { attemptId: value.attemptId as string } : {}) };
      }
    }
    return { snapshot, view, questions, passages, answers, currentIndex: view && 'state' in view ? view.state.currentIndex : view && 'session' in view && 'current_index' in view.session ? view.session.current_index : 0,
      pending };
  }
  async load(): Promise<TimedChildState> {
    const snapshot = await this.store.load(); const p = snapshot.parent;
    const leg = p.timed_frozen_legs[this.legIndex];
    if (!Number.isSafeInteger(this.legIndex) || this.legIndex < 0 || !leg || leg.kind !== this.kind) invalid('This route does not identify the frozen section.');
    if (this.kind === 'lr') {
      const raw = await this.loadRaw(p.pt, leg.section as number);
      this.lr = new TimedLrAdapter(this.store, this.ownerId, this.runId, this.legIndex, this.deviceId, raw, undefined, this.now);
      return this.state(await this.lr.load(), snapshot);
    }
    const passages = await this.loadRc(leg.passageIds as number[]);
    this.rc = new TimedRcAdapter(this.client, this.ownerId, this.runId, this.legIndex, passages, this.deviceId);
    return this.state(await this.rc.refresh(), snapshot);
  }
  async retry(state: TimedChildState): Promise<TimedChildState> {
    const view = this.lr ? await this.lr.retry() : this.rc ? await this.rc.retry() : invalid('The frozen section is not loaded.');
    const parent = this.client.readAuthoritativeParent();
    return this.state(view, parent ? { ...state.snapshot, parent, run: timedParentToPracticeTestRun(parent), pending: this.client.readPending() } : state.snapshot);
  }
  clock(state: TimedChildState) { return timedPracticeTestClock(state.snapshot, this.deviceId, this.now()); }
  pending(): TimedWorkCommand | null { return this.client.readPending(); }
  private rcAnswers(state: TimedChildState, answers: Record<string, TimedChildAnswer>): RcAttempt[] {
    if (!state.view || !('state' in state.view)) return invalid('The acknowledged RC child is missing.');
    const view = state.view;
    return Object.entries(answers).map(([qid, answer]) => {
      const item = (state.view as TimedRcView).state.items.find(value => String(value.question.questionId) === qid);
      if (!item || !answer.attemptId) return invalid('RC answers require the exact frozen question and stable ID.');
      const prior = view.attempts.find(attempt => attempt.id === answer.attemptId && attempt.questionId === item.question.questionId
        && attempt.userId === this.ownerId && attempt.sessionId === view.session.id);
      return { id: answer.attemptId, userId: this.ownerId, sessionId: state.view!.session.id, questionId: item.question.questionId, passageId: item.passage.passageId,
        selected: answer.selected, isCorrect: rcCheckpointGrade(item.question.questionId, item.question.correctAnswer, answer.selected, answer.attemptId, prior),
        timeMs: Math.floor(answer.timeMs), flagged: answer.flagged, eliminations: answer.eliminations, isFirstAttempt: true };
    });
  }
  async checkpoint(state: TimedChildState, currentIndex: number, answers: Record<string, TimedChildAnswer>, regulationAnsweredQids?: string[]): Promise<TimedChildState> {
    if (!state.view) invalid('There is no running account section to save.');
    if (this.lr && 'questions' in state.view) {
      await this.lr.prepareCheckpoint(state.view, currentIndex, Object.entries(answers).filter(([, answer]) => answer.selected !== null).map(([qid, answer]) => {
        const question = state.questions.find(value => value.qid === qid);
        if (!question) invalid('Unknown frozen LR question.');
        return { qid, selected: answer.selected!, correct: answer.selected === question.correctAnswer, timeMs: Math.floor(answer.timeMs), flagged: answer.flagged, switchCount: answer.switchCount };
      }), regulationAnsweredQids, Object.entries(answers).map(([qid, answer]) => ({ qid, timeMs: Math.floor(answer.timeMs), flagged: answer.flagged, eliminations: answer.eliminations })));
    } else if (this.rc && 'state' in state.view) {
      await this.rc.prepareCheckpoint(state.view, currentIndex, this.rcAnswers(state, answers), this.deviceId);
    } else invalid('The child kind changed while saving.');
    return this.retry(state);
  }
  async control(state: TimedChildState, operation: 'pause' | 'resume'): Promise<TimedChildState> {
    if (!state.view) invalid('The account section is not available.');
    if (this.lr && 'questions' in state.view) await this.lr.prepareControl(state.view, operation);
    else if (this.rc && 'state' in state.view) await this.rc.prepareControl(state.view, operation, this.deviceId);
    else invalid('The account section kind changed.');
    return this.retry(state);
  }
  async close(state: TimedChildState, answers: Record<string, TimedChildAnswer>, telemetry: TimedObject): Promise<TimedChildState> {
    if (!state.view) invalid('The account section is not available.');
    if (this.lr && 'questions' in state.view) {
      const questions = state.view.questions;
      const stats = questions.map(question => { const answer = answers[question.qid]; return { qid: question.qid, qnum: question.qnum, qtype: question.qtype,
        difficulty: question.difficulty, initialAnswer: answer?.selected ?? UNANSWERED, correctAnswer: question.correctAnswer,
        initialCorrect: answer?.selected === question.correctAnswer, timeMs: answer?.timeMs ?? 0, switchCount: answer?.switchCount ?? 0,
        flagged: answer?.flagged ?? false, eliminations: answer?.eliminations ?? [],
        visitCount: (telemetry.visits && typeof telemetry.visits === 'object' && !Array.isArray(telemetry.visits) ? Number(telemetry.visits[question.qid] ?? 0) : 0),
        everVisited: Boolean(telemetry.visits && typeof telemetry.visits === 'object' && !Array.isArray(telemetry.visits) && telemetry.visits[question.qid]),
        answerTrail: telemetry.trail && typeof telemetry.trail === 'object' && !Array.isArray(telemetry.trail) ? telemetry.trail[question.qid] as { answer: string; atMs: number }[] ?? [] : [],
        answeredInOvertime: state.view && 'questions' in state.view && state.view.session.regulation_answered_qids ? !state.view.session.regulation_answered_qids.includes(question.qid) : undefined }; });
      const analysis = JSON.parse(JSON.stringify(analyseSection({ questions: stats, paceMsPerQuestion: state.snapshot.parent.section_seconds === null ? null : state.snapshot.parent.section_seconds * 1000 / questions.length, blindReviewDone: false, kind: 'lr' }))) as TimedObject;
      await this.lr.prepareClose(state.view, questions.map(question => ({ qid: question.qid, correctAnswer: question.correctAnswer })), { ...analysis, timedTelemetry: telemetry });
    } else if (this.rc && 'state' in state.view) await this.rc.prepareClose(state.view, { timedTelemetry: telemetry }, this.deviceId);
    else invalid('The section kind changed during closeout.');
    return this.retry(state);
  }
}
