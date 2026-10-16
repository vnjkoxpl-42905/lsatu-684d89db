import { TimedSectionClient, TimedSectionError, type TimedSectionPayloads } from './timedSectionClient';
import { TimedSectionStore, timedSectionClock, type TimedSectionSnapshot } from './timedSectionStore';
import { verifyStandaloneLrContent, verifyStandaloneRcContent } from './timedSectionContent';
import type { TimedLrRawQuestion } from './timedLrAdapter';
import type { TimedChildAnswer } from './timedChildController';
import type { LRQuestion } from './questionLoader';
import type { TimedObject } from './timedWorkClient';
import { loadPassages } from '@/features/rc/lib/rcBank';
import { initialState } from '@/features/rc/lib/rcSession';
import type { RcLetter, RcPassage } from '@/features/rc/lib/rcTypes';
import { analyseSection } from './sectionAnalysis';
import { UNANSWERED } from './sectionAnswer';
import { isHistoricalRcGrade, rcCheckpointGrade } from '@/features/rc/lib/rcHistoricalGrading';

export interface TimedSectionState {
  snapshot: TimedSectionSnapshot;
  questions: LRQuestion[];
  passages: RcPassage[];
  answers: Record<string, TimedChildAnswer>;
  currentIndex: number;
  regulationAnsweredQids?: string[];
}
const object = (value: unknown): value is TimedObject => !!value && typeof value === 'object' && !Array.isArray(value);
function invalid(message: string): never { throw new TimedSectionError('contract', message); }
const empty = (rc: boolean): TimedChildAnswer => ({ selected: null, timeMs: 0, flagged: false, switchCount: 0, eliminations: [], ...(rc ? { attemptId: crypto.randomUUID() } : {}) });

function rcGrade(state: TimedSectionState, question: LRQuestion, answer: TimedChildAnswer) {
  const child = state.snapshot.child;
  const prior = child?.kind === 'rc' ? child.attempts.find(attempt => attempt.id === answer.attemptId
    && String(attempt.question_id) === question.qid) : undefined;
  return rcCheckpointGrade(Number(question.qid), question.correctAnswer, answer.selected, answer.attemptId, prior ? {
    id: String(prior.id), questionId: Number(prior.question_id), selected: prior.selected as RcLetter | null,
    isCorrect: prior.is_correct as boolean | null,
  } : undefined);
}

export class TimedSectionController {
  private readonly store: TimedSectionStore;
  constructor(private readonly client: TimedSectionClient, private readonly deviceId: string,
    private readonly loadRaw: (pt: number, section: number) => Promise<TimedLrRawQuestion[]> = async (pt, section) => {
      const response = await fetch(`/data/PT${pt}-S${section}-LR.json`);
      if (!response.ok) throw new TimedSectionError('contract', 'The frozen section content could not be loaded.');
      return response.json();
    }, private readonly loadRc: (ids: number[]) => Promise<RcPassage[]> = loadPassages, private readonly now: () => number = () => performance.now()) {
    this.store = new TimedSectionStore(client, deviceId, now);
  }
  pending() { return this.client.readPending(); }
  rejection() { return this.client.readRejection(); }
  clock(state: TimedSectionState) { return timedSectionClock(state.snapshot, this.deviceId, this.now()); }
  async load() { return this.hydrate(await this.store.load()); }
  async create(payload: TimedSectionPayloads['create']) {
    await this.client.requireCapability('create');
    await this.store.prepare('create', payload, null);
    return this.hydrate(await this.store.retry());
  }
  async retry() { return this.hydrate(await this.store.retry()); }
  async recoverRejected() { return this.hydrate(await this.store.archiveRejectedCommand()); }
  async control(state: TimedSectionState, operation: 'start' | 'claim' | 'pause' | 'resume' | 'abandon' | 'heartbeat') {
    await this.store.prepare(operation, {}, state.snapshot);
    return this.retry();
  }
  private async hydrate(snapshot: TimedSectionSnapshot): Promise<TimedSectionState> {
    const sitting = snapshot.sitting;
    const passages = sitting.kind === 'rc' ? await verifyStandaloneRcContent(sitting, await this.loadRc(sitting.frozen_source.passageIds as number[])) : [];
    const questions: LRQuestion[] = sitting.kind === 'lr'
      ? await verifyStandaloneLrContent(sitting, await this.loadRaw(sitting.pt, sitting.section))
      : initialState(passages).items.map(item => ({ qid: String(item.question.questionId), pt: sitting.pt, section: sitting.section,
        qnum: item.question.position, stimulus: item.passage.text, questionStem: item.question.prompt,
        answerChoices: Object.fromEntries(item.question.choices.map(choice => [choice.letter, choice.text])) as LRQuestion['answerChoices'],
        correctAnswer: item.question.correctAnswer, difficulty: 3, qtype: 'RC' }));
    const answers = Object.fromEntries(questions.map(question => [question.qid, empty(sitting.kind === 'rc')]));
    const put = (qid: unknown, fields: Partial<TimedChildAnswer>) => {
      if (typeof qid !== 'string' || !answers[qid]) invalid('An account answer is outside the frozen section.');
      answers[qid] = { ...answers[qid], ...fields };
    };
    const child = snapshot.child;
    if (child?.kind === 'lr') {
      for (const attempt of child.record.attempts as TimedObject[]) {
        const question = questions.find(value => value.qid === attempt.qid);
        if (!question || attempt.correct !== (attempt.selected_answer === question.correctAnswer)) invalid('An account LR answer contradicts verified content.');
        put(attempt.qid, { selected: attempt.selected_answer as TimedChildAnswer['selected'], timeMs: Number(attempt.time_ms), flagged: Boolean(attempt.flagged), switchCount: Number(attempt.switch_count ?? 0) });
      }
      for (const marker of (child.record.question_states ?? []) as TimedObject[]) put(marker.qid, { timeMs: Number(marker.timeMs), flagged: Boolean(marker.flagged), eliminations: marker.eliminations as TimedChildAnswer['eliminations'] });
    } else if (child?.kind === 'rc') {
      for (const attempt of child.attempts) {
        const question = questions.find(value => value.qid === String(attempt.question_id));
        if (!question || (attempt.selected === null ? attempt.is_correct !== null && attempt.is_correct !== false
          : attempt.is_correct !== (attempt.selected === question.correctAnswer)
            && !isHistoricalRcGrade(Number(question.qid), question.correctAnswer, attempt.selected, attempt.is_correct))) invalid('An account RC answer contradicts verified content.');
        put(String(attempt.question_id), { selected: attempt.selected as TimedChildAnswer['selected'], timeMs: Number(attempt.time_ms),
          flagged: Boolean(attempt.flagged), eliminations: attempt.eliminations as TimedChildAnswer['eliminations'], attemptId: String(attempt.id) });
      }
    }
    // Lost replies keep their exact answer intent visible until the original command is acknowledged.
    const pending = this.pending();
    if (pending?.operation === 'checkpoint' && Array.isArray(pending.payload.answers)) {
      for (const answer of pending.payload.answers as TimedObject[]) put(answer.qid ?? String(answer.questionId), {
        selected: answer.selected as TimedChildAnswer['selected'], timeMs: Number(answer.timeMs), flagged: Boolean(answer.flagged),
        switchCount: Number(answer.switchCount ?? 0), ...(sitting.kind === 'rc' ? { attemptId: String(answer.attemptId), eliminations: answer.eliminations as TimedChildAnswer['eliminations'] } : {}),
      });
      for (const marker of (pending.payload.questionStates ?? []) as TimedObject[]) put(marker.qid, { timeMs: Number(marker.timeMs), flagged: Boolean(marker.flagged), eliminations: marker.eliminations as TimedChildAnswer['eliminations'] });
    }
    return { snapshot, questions, passages, answers, currentIndex: sitting.current_index,
      ...(child?.kind === 'lr' && Array.isArray(child.record.regulation_answered_qids) ? { regulationAnsweredQids: child.record.regulation_answered_qids as string[] } : {}) };
  }
  async checkpoint(state: TimedSectionState, currentIndex: number, answers: Record<string, TimedChildAnswer>, regulationAnsweredQids?: string[]) {
    const sitting = state.snapshot.sitting;
    if (Object.keys(answers).some(qid => !state.questions.some(question => question.qid === qid))) invalid('A section answer is outside its frozen source.');
    const payload: TimedSectionPayloads['checkpoint'] = sitting.kind === 'lr' ? {
      currentIndex,
      ...(regulationAnsweredQids === undefined ? {} : { regulationAnsweredQids }),
      answers: Object.entries(answers).filter(([, answer]) => answer.selected !== null).map(([qid, answer]) => ({ qid, selected: answer.selected!,
        correct: answer.selected === state.questions.find(question => question.qid === qid)!.correctAnswer,
        timeMs: Math.floor(answer.timeMs), flagged: answer.flagged, switchCount: answer.switchCount })),
      questionStates: Object.entries(answers).map(([qid, answer]) => ({ qid, timeMs: Math.floor(answer.timeMs), flagged: answer.flagged, eliminations: answer.eliminations })),
    } : { currentIndex, answers: Object.entries(answers).filter(([, answer]) => answer.selected !== null || answer.flagged || answer.timeMs > 0 || answer.eliminations.length > 0).map(([qid, answer]) => {
      const passage = state.passages.find(value => value.questions.some(question => String(question.questionId) === qid));
      if (!passage || !answer.attemptId) invalid('The RC answer has no stable account attempt identity.');
      return { attemptId: answer.attemptId, questionId: Number(qid), passageId: passage.passageId, selected: answer.selected,
        isCorrect: rcGrade(state, state.questions.find(question => question.qid === qid)!, answer),
        timeMs: Math.floor(answer.timeMs), flagged: answer.flagged, eliminations: answer.eliminations };
    }) };
    await this.store.prepare('checkpoint', payload, state.snapshot);
    return this.retry();
  }
  async close(state: TimedSectionState) {
    // Closeout uses acknowledged child answers only. The runner must checkpoint first.
    const stats = state.questions.map(question => { const answer = state.answers[question.qid]; return {
      qid: question.qid, qnum: question.qnum, qtype: question.qtype, difficulty: question.difficulty,
      initialAnswer: answer.selected ?? UNANSWERED, correctAnswer: question.correctAnswer,
      initialCorrect: state.snapshot.sitting.kind === 'rc' ? rcGrade(state, question, answer) === true : answer.selected === question.correctAnswer,
      timeMs: answer.timeMs, flagged: answer.flagged, switchCount: answer.switchCount, eliminations: answer.eliminations,
      answeredInOvertime: state.regulationAnsweredQids === undefined ? undefined : !state.regulationAnsweredQids.includes(question.qid),
    }; });
    const analysis = JSON.parse(JSON.stringify(analyseSection({ questions: stats,
      paceMsPerQuestion: state.snapshot.sitting.budget_ms === null ? null : state.snapshot.sitting.budget_ms / state.questions.length,
      blindReviewDone: false, kind: state.snapshot.sitting.kind }))) as TimedObject;
    await this.store.prepare('close', state.snapshot.sitting.kind === 'lr'
      ? { answerKeys: state.questions.map(question => ({ qid: question.qid, correctAnswer: question.correctAnswer })), analysis } : { analysis }, state.snapshot);
    return this.retry();
  }
  reportHref(state: TimedSectionState): string | null {
    if (state.snapshot.sitting.phase !== 'complete') return null;
    if (state.snapshot.sitting.kind === 'lr') return typeof state.snapshot.sitting.result?.historyId === 'string'
      ? `/testing/attempts/section/lr/${encodeURIComponent(state.snapshot.sitting.result.historyId)}` : invalid('Completed section has no acknowledged report.');
    return state.snapshot.child?.kind === 'rc' && typeof state.snapshot.child.session.id === 'string'
      ? `/rc/results/${encodeURIComponent(state.snapshot.child.session.id)}` : invalid('Completed section has no acknowledged RC report.');
  }
}
