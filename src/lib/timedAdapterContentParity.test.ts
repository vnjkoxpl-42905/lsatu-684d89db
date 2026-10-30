import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimedWorkClient, TIMED_WORK_OPERATIONS, type TimedObject, type TimedWorkParent, type TimedWorkTransport } from './timedWorkClient';
import { TimedPracticeTestStore } from './timedPracticeTestStore';
import { TimedLrAdapter, type TimedLrRawQuestion } from './timedLrAdapter';
import { TimedRcAdapter } from '@/features/rc/api/timedRcAdapter';
import { normalizeQuestionTextFields, normalizeQType, type LRQuestion } from './questionLoader';
import type { RcPreptestFile } from '@/features/rc/lib/rcTypes';

const read = (path: string) => JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
const catalog = read('docs/implementation-plans/artifacts/timed-content-manifest-v1.generated.json') as { manifestSha256: string; blueprints: TimedObject[] };
const owner = '11111111-1111-4111-8111-111111111111'; const child = '22222222-2222-4222-8222-222222222222';
const sample = '2026-09-30T10:00:05Z';
const cases = catalog.blueprints.flatMap(blueprint => (blueprint.legs as TimedObject[]).map((leg, index) => ({ blueprint, leg, index, name: `PT${blueprint.pt} ${leg.kind} S${leg.section}` })));
const lockQueues = new Map<string, Promise<unknown>>();
const locks = { request: async <T>(name: string, callback: () => Promise<T>): Promise<T> => {
  const result = (lockQueues.get(name) ?? Promise.resolve()).catch(() => undefined).then(callback);
  lockQueues.set(name, result); return result;
} };
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); localStorage.clear(); lockQueues.clear(); });

describe('actual canonical bank → frozen manifest → prepared child adapters', () => {
  it('covers every offered leg including the real PT118 removed and experimental sections', () => {
    expect(cases).toHaveLength(177);
    expect(cases.filter(value => value.blueprint.pt === 118).map(value => value.leg.section)).toEqual([1, 2, 4]);
  });
  it.each(cases)('$name retains exact content, ordered queue and native ownership', async ({ blueprint, leg, index }) => {
    const work = `parity-PT${blueprint.pt}`;
    const definitions = (blueprint.legs as TimedObject[]).map(value => ({ kind: value.kind, section: value.section, questionCount: value.questionCount,
      ...(value.passageIds === undefined ? {} : { passageIds: value.passageIds }) }));
    const parent: TimedWorkParent = { id: work, user_id: owner, pt: blueprint.pt as number, pace: 'standard', section_seconds: 2100,
      revision: 2, timed_contract_version: 1, timed_writer_epoch: 1, timed_phase: 'leg-paused', timed_elapsed_ms: 1000, timed_clock_leg: index,
      timed_running_anchor: null, timed_lease_expires_at: null, timed_lease_ms: 45000, timed_frozen_legs: definitions, legs: definitions,
      current_leg: index, active_device_id: 'device', status: 'in-progress', created_at: sample, break_after_leg: 2, break_taken: false,
      timed_manifest_sha256: catalog.manifestSha256, timed_manifest: blueprint };
    const source = `drill::practice-test::${work}::leg-${index}`;
    const checkpoint: TimedObject = leg.kind === 'lr' ? { kind: 'lr', record: { id: child, user_id: owner, pool_slug: source, completion_id: source,
      question_queue: leg.qids, current_index: 0, attempts: [], status: 'in_progress', started_at: sample, updated_at: sample } }
      : { kind: 'rc', session: { id: child, user_id: owner, practice_test_run_id: work, practice_test_leg: index, passage_ids: leg.passageIds,
        config: { practiceTestRunId: work, practiceTestLegIndex: index, currentQuestionIndex: 0 }, status: 'in_progress', started_at: sample,
        completed_at: null, excluded_from_analytics: false }, attempts: [] };
    const transport: TimedWorkTransport = { auth: { getUser: async () => ({ data: { user: { id: owner } }, error: null }) },
      rpc: async name => ({ data: name.includes('capability') ? { contractVersion: 1, enabled: true, workKind: 'practice-test', operations: ['read', ...TIMED_WORK_OPERATIONS] }
        : { parent, checkpoint, serverTime: sample }, error: null }) };
    const client = new TimedWorkClient(owner, work, transport, localStorage, locks);
    if (leg.kind === 'lr') {
      const raw = read(`public/data/PT${blueprint.pt}-S${leg.section}-LR.json`) as TimedLrRawQuestion[];
      const loaded: LRQuestion[] = normalizeQuestionTextFields(raw).filter(row => row.status !== 'removed').sort((a, b) => a.questionNumber - b.questionNumber)
        .map(row => ({ qid: `PT${blueprint.pt}-S${leg.section}-Q${row.questionNumber}`, pt: blueprint.pt as number, section: leg.section as number,
          qnum: row.questionNumber, qtype: normalizeQType(row.questionType || '', row.questionStem), difficulty: row.questionDifficulty || row.Question_Difficulty || 3,
          stimulus: row.stimulus, questionStem: row.questionStem, answerChoices: row.answerChoices, correctAnswer: row.correctAnswer }));
      const adapter = new TimedLrAdapter(new TimedPracticeTestStore(client, 'device', () => 1000), owner, work, index, 'device', raw, loaded, () => 1000);
      const view = (await adapter.load())!;
      expect(view.session.question_queue).toEqual(leg.qids); expect(view.questions.map(question => question.qid)).toEqual(leg.qids);
      expect(view.questions).toEqual(loaded);
      if (blueprint.pt === 118 && leg.section === 1) { expect(view.session.question_queue).not.toContain('PT118-S1-Q5'); expect(view.session.question_queue).toContain('PT118-S1-Q26'); }
    } else {
      const file = read(`public/data/rc/RC-PT${blueprint.pt}.json`) as RcPreptestFile;
      const passages = (leg.passageIds as number[]).map(id => file.passages.find(passage => passage.passageId === id)!);
      const view = (await new TimedRcAdapter(client, owner, work, index, passages, 'device').refresh())!;
      expect(view.session.passageIds).toEqual(leg.passageIds);
      expect(view.state.items.map(item => String(item.question.questionId))).toEqual(leg.qids);
    }
  });
});
