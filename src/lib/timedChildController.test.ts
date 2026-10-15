import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash, webcrypto } from 'node:crypto';
import { TimedChildController, type TimedChildAnswer } from './timedChildController';
import { TimedWorkClient, TIMED_WORK_OPERATIONS, type TimedObject, type TimedWorkCommand, type TimedWorkParent, type TimedWorkTransport } from './timedWorkClient';
import { normalizeQType } from './questionLoader';
import type { TimedLrRawQuestion } from './timedLrAdapter';
import type { RcPassage } from '@/features/rc/lib/rcTypes';

const owner = '11111111-1111-4111-8111-111111111111'; const child = '22222222-2222-4222-8222-222222222222'; const work = 'controller-run';
const sample = '2026-09-30T10:00:05Z'; const qids = ['PT101-S1-Q1', 'PT101-S1-Q2'];
const choices = { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' };
const raw: TimedLrRawQuestion[] = [1, 2].map(questionNumber => ({ practiceTest: 'PT101', sectionNumber: 1, questionNumber, stimulus: 'Text', questionStem: 'Which conclusion follows?', answerChoices: choices, correctAnswer: 'A', questionType: 'Must Be True', questionDifficulty: 3 }));
const rcChoices = Object.entries(choices).map(([letter, text]) => ({ letter, text }));
const passages = [{ passageId: 10, preptest: 101, section: 2, setNumber: 1, text: 'Passage', questions: [20, 21].map((questionId, index) => ({ questionId, position: index + 1, prompt: 'Prompt', choices: rcChoices, correctAnswer: 'A' })) }] as RcPassage[];
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
let p: TimedWorkParent; let lrRecord: TimedObject; let rcSession: TimedObject; let rcAttempts: TimedObject[]; let kind: 'lr' | 'rc'; let lost: boolean;
let rpc: ReturnType<typeof vi.fn>; const receipts = new Map<string, unknown>(); const queues = new Map<string, Promise<unknown>>();
const locks = { request: async <T>(name: string, callback: () => Promise<T>): Promise<T> => { const result = (queues.get(name) ?? Promise.resolve()).catch(() => undefined).then(callback); queues.set(name, result); return result; } };
function initialize(sectionKind: 'lr' | 'rc') {
  kind = sectionKind; const lrLeg = { kind: 'lr', section: 1, questionCount: 2 }; const rcLeg = { kind: 'rc', section: 2, questionCount: 2, passageIds: [10] };
  const definitions = [lrLeg, rcLeg, { kind: 'lr', section: 3, questionCount: 1 }];
  p = { id: work, user_id: owner, pt: 101, pace: 'standard', section_seconds: 2100, revision: 2, timed_contract_version: 1, timed_writer_epoch: 1,
    timed_phase: 'leg-running', timed_elapsed_ms: 0, timed_clock_leg: kind === 'lr' ? 0 : 1, timed_running_anchor: sample, timed_lease_expires_at: '2026-09-30T10:00:35Z', timed_lease_ms: 30000,
    timed_frozen_legs: definitions, legs: definitions, current_leg: kind === 'lr' ? 0 : 1, active_device_id: 'device', status: 'in-progress', created_at: sample, break_after_leg: 2, break_taken: false,
    timed_manifest_sha256: 'a'.repeat(64), timed_manifest: { pt: 101, legs: [{ ...lrLeg, qids, questions: raw.map((row, index) => ({ qid: qids[index], qnum: row.questionNumber, qtype: normalizeQType(row.questionType || '', row.questionStem), level: 3,
      contentSha256: digest(JSON.stringify({ choices, stem: row.questionStem, stimulus: row.stimulus })) })) },
      { ...rcLeg, qids: ['20', '21'], passages: [{ passageId: 10, section: 2, setNumber: 1, contentSha256: digest('Passage') }], questions: passages[0].questions.map(question => ({ qid: String(question.questionId), questionId: question.questionId, passageId: 10, qnum: question.position,
        contentSha256: digest(JSON.stringify({ choices: rcChoices, prompt: question.prompt, text: 'Passage' })) })) },
      { kind: 'lr', section: 3, questionCount: 1, qids: ['PT101-S3-Q1'], questions: [{ qid: 'PT101-S3-Q1' }] }] } };
  const source = `drill::practice-test::${work}::leg-0`;
  lrRecord = { id: child, user_id: owner, pool_slug: source, completion_id: source, question_queue: qids, current_index: 0, attempts: [], status: 'in_progress', started_at: sample, updated_at: sample };
  rcSession = { id: child, user_id: owner, practice_test_run_id: work, practice_test_leg: 1, passage_ids: [10], config: { practiceTestRunId: work, practiceTestLegIndex: 1, currentQuestionIndex: 0 }, status: 'in_progress', started_at: sample, completed_at: null, excluded_from_analytics: false };
  rcAttempts = [];
}
const saved = () => p.current_leg !== (kind === 'lr' ? 0 : 1) ? null : kind === 'lr' ? { kind: 'lr', record: lrRecord } : { kind: 'rc', session: rcSession, attempts: rcAttempts };
function controller(rcBank = passages) {
  const transport = { auth: { getUser: async () => ({ data: { user: { id: owner } }, error: null }) }, rpc } as TimedWorkTransport;
  return new TimedChildController(new TimedWorkClient(owner, work, transport, localStorage, locks), owner, work, kind === 'lr' ? 0 : 1, kind, 'device', async () => raw, async () => rcBank, () => 1000);
}
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto); localStorage.clear(); queues.clear(); receipts.clear(); lost = false; initialize('lr');
  rpc = vi.fn(async (name, args) => {
    if (name.includes('capability')) return { data: { contractVersion: 1, enabled: true, workKind: 'practice-test', operations: ['read', ...TIMED_WORK_OPERATIONS] }, error: null };
    if (name.startsWith('read_')) return { data: { parent: structuredClone(p), checkpoint: structuredClone(saved()), serverTime: sample }, error: null };
    const command = args.p_command as TimedWorkCommand; let receipt = receipts.get(command.commandId);
    if (!receipt) {
      if (command.operation === 'checkpoint' && kind === 'lr') {
        lrRecord.current_index = command.payload.currentIndex;
        lrRecord.attempts = (command.payload.answers as TimedObject[]).map(answer => ({ qid: answer.qid, selected_answer: answer.selected, correct: answer.correct, time_ms: answer.timeMs, flagged: answer.flagged, switch_count: answer.switchCount }));
        lrRecord.question_states = command.payload.questionStates ?? [];
        if (command.payload.regulationAnsweredQids !== undefined) lrRecord.regulation_answered_qids = command.payload.regulationAnsweredQids;
      } else if (command.operation === 'checkpoint') {
        (rcSession.config as TimedObject).currentQuestionIndex = command.payload.currentIndex;
        rcAttempts = (command.payload.answers as TimedObject[]).map(answer => ({ id: answer.attemptId, user_id: owner, session_id: child, question_id: answer.questionId, passage_id: answer.passageId, selected: answer.selected,
          is_correct: answer.isCorrect, time_ms: answer.timeMs, flagged: answer.flagged, eliminations: answer.eliminations, is_first_attempt: true, created_at: sample }));
      } else if (command.operation === 'close-leg') {
        if (kind === 'rc') (rcSession.config as TimedObject).analysis = command.payload.analysis ?? null;
        p.current_leg++; p.timed_phase = 'ready'; p.timed_clock_leg = null; p.timed_running_anchor = null; p.timed_lease_expires_at = null;
      }
      p.revision++;
      receipt = { ownerId: owner, workKind: 'practice-test', workId: work, commandId: command.commandId, command, operation: command.operation, committedRevision: p.revision, result: {} };
      receipts.set(command.commandId, receipt);
      if (lost) { lost = false; throw new Error('lost response after commit'); }
    }
    return { data: { receipt, parent: structuredClone(p), checkpoint: structuredClone(saved()), serverTime: sample, replayed: true }, error: null };
  });
});
const answer = (selected: TimedChildAnswer['selected'], attemptId?: string): TimedChildAnswer => ({ selected, timeMs: 1000, flagged: true, switchCount: 1, eliminations: ['C'], ...(attemptId ? { attemptId } : {}) });

describe('official child controller uses protected source commands exclusively', () => {
  it.each([['B', true], ['D', false]] as const)('preserves an unchanged historical RC %s grade but grades changed answers with the current key', async (selected, isCorrect) => {
    initialize('rc');
    const rcBank = structuredClone(passages);
    rcBank[0].questions[0].questionId = 10733;
    rcBank[0].questions[0].correctAnswer = 'D';
    const frozen = p.timed_manifest as TimedObject;
    const leg = (frozen.legs as TimedObject[])[1];
    leg.qids = ['10733', '21'];
    Object.assign((leg.questions as TimedObject[])[0], { qid: '10733', questionId: 10733 });
    const id = crypto.randomUUID();
    rcAttempts = [{ id, user_id: owner, session_id: child, question_id: 10733, passage_id: 10, selected,
      is_correct: isCorrect, time_ms: 100, flagged: false, eliminations: [], is_first_attempt: true, created_at: sample }];
    const c = controller(rcBank); const state = await c.load();
    expect(state.answers['10733'].selected).toBe(selected);
    expect(rpc.mock.calls.some(([name]) => name === 'commit_timed_work_v1')).toBe(false);
    const next = await c.checkpoint(state, 0, state.answers);
    expect(rcAttempts[0].is_correct).toBe(isCorrect);
    expect(rcAttempts[0].id).toBe(id);
    next.answers['10733'].selected = selected === 'B' ? 'D' : 'B';
    await c.checkpoint(next, 0, next.answers);
    expect(rcAttempts[0].is_correct).toBe(selected === 'B');
  });
  it('persists unanswered LR flags/time/eliminations and restores them through an account reload without inventing an answer', async () => {
    const c = controller(); const state = await c.load();
    const next = await c.checkpoint(state, 1, { [qids[0]]: answer(null), [qids[1]]: answer('A') }, [qids[1]]);
    expect(next.answers[qids[0]]).toEqual({ ...answer(null), switchCount: 0 }); expect((lrRecord.attempts as TimedObject[])).toHaveLength(1);
    expect((await controller().load()).answers[qids[0]].selected).toBeNull();
    expect((await controller().load()).answers[qids[0]].timeMs).toBe(1000);
    expect(rpc.mock.calls.every(([name]) => ['timed_practice_test_capability_v1', 'read_timed_practice_test_v1', 'commit_timed_work_v1'].includes(name))).toBe(true);
  });
  it('retains exact checkpoint and close UUIDs after commit response loss, including reload with advanced parent', async () => {
    const c = controller(); const state = await c.load(); lost = true;
    await expect(c.checkpoint(state, 0, { [qids[0]]: answer('A') })).rejects.toThrow('lost response');
    const pending = c.pending(); const reload = controller(); const restored = await reload.load();
    expect(restored.answers[qids[0]].selected).toBe('A'); expect(restored.pending).toEqual(pending);
    const acknowledged = await reload.retry(restored); lost = true;
    await expect(reload.close(acknowledged, acknowledged.answers, { visits: { [qids[0]]: 1 } })).rejects.toThrow('lost response');
    const closeCommand = reload.pending(); const finalController = controller(); const recovery = await finalController.load();
    expect(recovery.view).toBeNull(); expect(recovery.pending).toEqual(closeCommand);
    const complete = await finalController.retry(recovery); expect(complete.pending).toBeNull(); expect(complete.snapshot.parent.current_leg).toBe(1);
    expect(rpc.mock.calls.filter(([name]) => name === 'commit_timed_work_v1').map(([, args]) => args.p_command.commandId)).toEqual([pending!.commandId, pending!.commandId, closeCommand!.commandId, closeCommand!.commandId]);
  });
  it('updates RC choices under the same first-attempt UUID on revisit and persists close telemetry', async () => {
    initialize('rc'); const c = controller(); const state = await c.load(); const id = crypto.randomUUID();
    const first = await c.checkpoint(state, 0, { '20': answer('A', id) });
    const changed = await c.checkpoint(first, 1, { '20': answer('B', id) });
    expect(changed.answers['20'].attemptId).toBe(id); expect(changed.answers['20'].selected).toBe('B'); expect(rcAttempts).toHaveLength(1);
    const result = await c.close(changed, changed.answers, { visits: { '20': 2 }, trail: { '20': [{ answer: 'A', atMs: 200 }, { answer: 'B', atMs: 1000 }] } });
    expect((rcSession.config as TimedObject).analysis).toMatchObject({ timedTelemetry: { visits: { '20': 2 } } });
    expect(result.view).toBeNull(); expect(result.pending).toBeNull();
  });
});
