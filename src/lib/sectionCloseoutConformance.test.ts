import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { buildCloseoutPayload } from './sectionCloseout';
import { buildProtectedCloseoutStats, TimedSectionController } from './timedSectionController';
import type { TimedSectionClient, TimedSectionSitting } from './timedSectionClient';
import type { TimedSectionSnapshot } from './timedSectionStore';
import type { TimedLrRawQuestion } from './timedLrAdapter';
import type { SectionQuestionStat } from './sectionHistorySave';
import type { DrillSession } from '@/types/drill';
import type { SectionAnalysis } from './sectionAnalysis';

const manifest = JSON.parse(
  readFileSync('docs/implementation-plans/artifacts/timed-content-manifest-v1.generated.json', 'utf8'),
);
const blueprint = manifest.blueprints[0];
const lrSource = blueprint.legs.find((leg: { kind: string }) => leg.kind === 'lr');
const rawSection: TimedLrRawQuestion[] = JSON.parse(
  readFileSync(`public/data/PT${blueprint.pt}-S${lrSource.section}-LR.json`, 'utf8'),
);

const questionMap = new Map(
  (lrSource.questions as Array<{ qid: string; qnum: number; qtype: string; level: number }>).map(
    (frozen) => {
      const raw = rawSection.find((r) => r.questionNumber === frozen.qnum)!;
      return [
        frozen.qid,
        {
          qid: frozen.qid,
          pt: blueprint.pt as number,
          section: lrSource.section as number,
          qnum: frozen.qnum,
          qtype: frozen.qtype,
          difficulty: frozen.level,
          correctAnswer: raw.correctAnswer,
          stimulus: raw.stimulus ?? '',
          questionStem: raw.questionStem,
          answerChoices: raw.answerChoices,
        },
      ];
    },
  ),
);

vi.mock('@/lib/questionLoader', async () => {
  const actual = await vi.importActual<typeof import('@/lib/questionLoader')>('@/lib/questionLoader');
  return {
    ...actual,
    questionBank: {
      getQuestion: (qid: string) => questionMap.get(qid) ?? null,
    },
  };
});

const nativeCrypto = crypto;
beforeAll(() => {
  vi.stubGlobal('crypto', {
    randomUUID: nativeCrypto.randomUUID.bind(nativeCrypto),
    subtle: webcrypto.subtle,
  });
});
afterAll(() => {
  vi.unstubAllGlobals();
});

function wrongChoice(correct: string): 'A' | 'B' | 'C' | 'D' | 'E' {
  return (['A', 'B', 'C', 'D', 'E'].find((c) => c !== correct) ?? 'A') as
    | 'A'
    | 'B'
    | 'C'
    | 'D'
    | 'E';
}

/**
 * Conformance test (Plan Phase 5.2 / Finding F10):
 * Drives BOTH production close-out builders (`buildCloseoutPayload` and
 * `TimedSectionController.close`) over the same frozen section and identical
 * answers, and verifies the closeout payloads + SQL writer columns agree.
 */
describe('legacy and protected close-out conformance (Phase 5.2 / F10)', () => {
  const REQUIRED_STAT_KEYS: Array<keyof SectionQuestionStat> = [
    'qid',
    'qnum',
    'qtype',
    'difficulty',
    'initialAnswer',
    'correctAnswer',
    'initialCorrect',
    'timeMs',
    'flagged',
    'switchCount',
  ];

  it('produces identical SectionQuestionStat fields and analysis_json across real legacy and protected close-out paths', async () => {
    const qids = lrSource.qids as string[];
    const q0 = questionMap.get(qids[0])!;
    const q1 = questionMap.get(qids[1])!;
    const q1Wrong = wrongChoice(q1.correctAnswer);

    // Leave qids[1] out of regulationAnsweredQids so both paths mark only qids[1] as overtime.
    const regulationQids = qids.filter((_, idx) => idx !== 1);

    const legacySession = {
      mode: 'full-section',
      fullSectionConfig: {
        pt: blueprint.pt,
        section: lrSource.section,
        timer: { mode: '35', isPaused: false, elapsedMs: 180_000, startedAt: 0 },
      },
      questionQueue: qids,
      currentIndex: 2,
      flaggedQuestions: new Set([q1.qid]),
      regulationMark: { answeredQids: regulationQids },
      attempts: new Map([
        [
          q0.qid,
          {
            selectedAnswer: q0.correctAnswer,
            correct: true,
            timeMs: 45_000,
            timestamp: 1,
            switchCount: 0,
            brMarked: false,
          },
        ],
        [
          q1.qid,
          {
            selectedAnswer: q1Wrong,
            correct: false,
            timeMs: 90_000,
            timestamp: 2,
            switchCount: 1,
            brMarked: true,
          },
        ],
      ]),
    } as unknown as DrillSession;

    const legacyPayload = buildCloseoutPayload(legacySession, {
      nowIso: '2026-11-23T10:00:00Z',
    });

    const owner = '10000000-0000-4000-8000-000000000001';
    const work = '20000000-0000-4000-8000-000000000001';
    const sitting = {
      id: work,
      owner_id: owner,
      kind: 'lr',
      pt: blueprint.pt,
      section: lrSource.section,
      frozen_source: lrSource,
      frozen_qids: qids,
      phase: 'running',
      budget_ms: 35 * 60_000,
      elapsed_ms: 180_000,
      clock_anchor_at: '2026-11-23T09:57:00Z',
      lease_expires_at: '2026-11-23T10:05:00Z',
      device_id: 'device-a',
      revision: 2,
      writer_epoch: 1,
      current_index: 2,
    } as unknown as TimedSectionSitting;

    const snapshot = {
      contractVersion: 1,
      workKind: 'standalone-section',
      sitting,
      serverTime: '2026-11-23T10:00:00Z',
      observedAt: 1000,
      pending: null,
      rejection: null,
      receipt: null,
      replayed: false,
      child: {
        kind: 'lr',
        record: {
          attempts: [
            {
              qid: q0.qid,
              selected_answer: q0.correctAnswer,
              correct: true,
              time_ms: 45_000,
              flagged: false,
              switch_count: 0,
            },
            {
              qid: q1.qid,
              selected_answer: q1Wrong,
              correct: false,
              time_ms: 90_000,
              flagged: true,
              switch_count: 1,
            },
          ],
          question_states: [],
          regulation_answered_qids: regulationQids,
        },
      },
    } as unknown as TimedSectionSnapshot;

    const prepare = vi.fn().mockResolvedValue({});
    const client = {
      refresh: vi.fn().mockResolvedValue(snapshot),
      readPending: vi.fn().mockReturnValue(null),
      readRejection: vi.fn().mockReturnValue(null),
      prepare,
      retry: vi.fn().mockResolvedValue(snapshot),
      requireCapability: vi.fn().mockResolvedValue(undefined),
    };

    const controller = new TimedSectionController(
      client as unknown as TimedSectionClient,
      'device-a',
      async () => rawSection,
      async () => [],
      () => 1000,
    );

    const state = await controller.load();
    await controller.close(state);

    expect(prepare).toHaveBeenCalledTimes(1);
    const [operation, closePayload] = prepare.mock.calls[0] as [
      string,
      { answerKeys: Array<{ qid: string; correctAnswer: string }>; analysis: SectionAnalysis },
    ];
    expect(operation).toBe('close');
    expect(closePayload.answerKeys).toHaveLength(qids.length);

    const protectedStats = buildProtectedCloseoutStats(state);
    expect(legacyPayload.questions).toHaveLength(qids.length);
    expect(protectedStats).toHaveLength(qids.length);

    for (let i = 0; i < qids.length; i++) {
      const leg = legacyPayload.questions[i];
      const prot = protectedStats[i];
      for (const key of REQUIRED_STAT_KEYS) {
        expect(prot).toHaveProperty(key);
        expect(leg[key]).toEqual(prot[key]);
      }
      expect(leg.answeredInOvertime).toEqual(prot.answeredInOvertime);
    }

    const legAnalysis = legacyPayload.analysis as SectionAnalysis;
    const protAnalysis = closePayload.analysis;

    expect(legAnalysis).toBeTruthy();
    expect(protAnalysis).toBeTruthy();
    expect(typeof protAnalysis.headline).toBe('string');
    expect(Array.isArray(protAnalysis.categories)).toBe(true);
    expect(Array.isArray(protAnalysis.findings)).toBe(true);
    expect(Array.isArray(protAnalysis.notRun)).toBe(true);
    expect(protAnalysis.totals).toEqual(legAnalysis.totals);
  });

  it('persists every required SectionQuestionStat key and analysis_json in the protected SQL writer', () => {
    const sql = readFileSync('docs/implementation-plans/artifacts/2026-09-30-standalone-timed-writer.sql', 'utf8');
    const closeFnStart = sql.indexOf('create function public.timed_section_close_v1');
    const closeFnEnd = sql.indexOf('$$;', closeFnStart);
    const closeFn = sql.slice(closeFnStart, closeFnEnd);

    for (const key of [...REQUIRED_STAT_KEYS, 'answeredInOvertime']) {
      expect(closeFn).toContain(`'${key}'`);
    }
    expect(closeFn).toContain('analysis_json');
    expect(closeFn).toContain("p_payload->'analysis'");
  });
});
