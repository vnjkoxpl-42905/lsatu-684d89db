/**
 * Atomic close-out for a standalone legacy full section (plan Phase 1).
 *
 * The server owns the sitting id, the user id and the class id. One call to
 * `close_standalone_section_v1` writes the `section_history` row, one attempt
 * per answered question and one journal item per miss in one transaction, and
 * only the call that created the row writes attempts or journal items. A retry,
 * a reload or a second tab therefore cannot duplicate anything.
 *
 * Practice-test legs, practice sets, guided drills and Smart Drill do NOT come
 * through here; they keep their own close-out code.
 */
import { supabase } from '@/integrations/supabase/client';
import { practiceSessionIdFor } from '@/bootcamps/main-conclusion/lib/practiceSessionStore';
import { questionBank } from '@/lib/questionLoader';
import { analyseSection } from '@/lib/sectionAnalysis';
import {
  buildAnalysisInput,
  buildSectionStats,
  buildSectionTotals,
  tally,
  type SectionQuestionStat,
} from '@/lib/sectionHistorySave';
import { UNANSWERED } from '@/lib/sectionAnswer';
import type { DrillSession } from '@/types/drill';

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
const rpc = (fn: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as Rpc).call(supabase, fn, args);

export type SittingStatus = 'open' | 'closed' | 'stale';

export interface SittingReply {
  status: SittingStatus;
  sittingId: string;
  generation: number;
  historyId: string | null;
  /** Only on `stale`: the state of the latest sitting the tab should reconcile to. */
  latestState?: 'open' | 'closed' | 'abandoned';
  /** True when generation 1 adopted an in-flight pool-derived resume record. */
  adopted?: boolean;
  /** `updated_at` of the adopted record, used for guarded recovery saves. */
  adoptedRevision?: string | null;
}

export function sittingStorageKey(poolKey: string, sittingId: string): string {
  return `${poolKey}#${sittingId}`;
}

export interface CloseoutReply {
  status: 'created' | 'replayed' | 'stale';
  historyId: string | null;
  /** The saved first answers differ from what this tab sent. */
  conflict: boolean;
}

const POOL_KEY = /^drill::(section::pt[0-9]+-s[0-9]+|assignment::[A-Za-z0-9-]+)$/;

/** True when the resume key names a section the new close-out owns. */
export function isStandalonePoolKey(key: string | null | undefined): key is string {
  return !!key && POOL_KEY.test(key);
}

/** Device cache of the sitting id, only ever sent back as `p_known_sitting_id`. */
const cacheKey = (userId: string, poolKey: string) => `lsatu:section-sitting:${userId}:${poolKey}`;

export function readCachedSitting(userId: string, poolKey: string): { id: string; generation: number } | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId, poolKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string; generation?: number };
    return parsed.id && typeof parsed.generation === 'number' ? { id: parsed.id, generation: parsed.generation } : null;
  } catch {
    return null;
  }
}

export function writeCachedSitting(userId: string, poolKey: string, reply: { sittingId: string; generation: number }) {
  try {
    localStorage.setItem(cacheKey(userId, poolKey), JSON.stringify({ id: reply.sittingId, generation: reply.generation }));
  } catch {
    // Storage can be unavailable (private window). The server is the source
    // of truth; the cache only shortens recovery.
  }
}

export function clearCachedSitting(userId: string, poolKey: string) {
  try { localStorage.removeItem(cacheKey(userId, poolKey)); } catch { /* see above */ }
}

function toSittingReply(data: unknown): SittingReply {
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    status: d.status as SittingStatus,
    sittingId: String(d.sitting_id ?? ''),
    generation: Number(d.generation ?? 0),
    historyId: (d.history_id as string | null) ?? null,
    latestState: d.latest_state as SittingReply['latestState'],
    adopted: d.adopted === true,
    adoptedRevision: (d.adopted_revision as string | null) ?? null,
  };
}

export async function openSectionSitting(args: {
  poolKey: string;
  knownSittingId?: string | null;
  restart?: boolean;
  expectedGeneration?: number | null;
  legacyRecordId?: string | null;
  sittingRecordId?: string | null;
}): Promise<SittingReply> {
  const { data, error } = await rpc('open_section_sitting_v1', {
    p_pool_key: args.poolKey,
    p_known_sitting_id: args.knownSittingId ?? null,
    p_restart: !!args.restart,
    p_expected_generation: args.expectedGeneration ?? null,
    ...(args.legacyRecordId ? { p_legacy_record_id: args.legacyRecordId } : {}),
    ...(args.sittingRecordId ? { p_sitting_record_id: args.sittingRecordId } : {}),
  });
  if (error) throw new Error(error.message);
  return toSittingReply(data);
}

/**
 * Opens or reconciles the server-owned sitting at section START (plan 1.3).
 *
 * - Resume/reload never passes `restart`; only an explicit "start over" does,
 *   sending the cached generation as `expectedGeneration`.
 * - Caches the returned sitting id and generation only to send back as
 *   `p_known_sitting_id`; never allocates a generation on the client.
 * - On `closed` (or `stale` whose latest sitting is `closed`), returns
 *   `status: 'closed'` + `historyId` so the caller loads the saved report
 *   instead of starting a new section.
 */
export async function initStandaloneSitting(args: {
  userId: string;
  poolKey: string;
  restart?: boolean;
}): Promise<SittingReply> {
  const cached = readCachedSitting(args.userId, args.poolKey);
  const isRestart = args.restart === true;
  const legacyRecordId = isRestart ? null : practiceSessionIdFor(args.userId, args.poolKey);
  const sittingRecordId = isRestart
    ? null
    : practiceSessionIdFor(args.userId, `${args.poolKey}#adopted-g1`);

  const reply = await openSectionSitting({
    poolKey: args.poolKey,
    knownSittingId: isRestart ? null : (cached?.id ?? null),
    restart: isRestart,
    expectedGeneration: isRestart ? (cached?.generation ?? 1) : null,
    legacyRecordId,
    sittingRecordId,
  });

  if (reply.sittingId && reply.generation > 0) {
    writeCachedSitting(args.userId, args.poolKey, reply);
  }

  if (reply.status === 'stale' && reply.latestState === 'closed' && reply.historyId) {
    return { ...reply, status: 'closed' };
  }
  return reply;
}

export interface CloseoutPayload {
  pt: number;
  section: number;
  assignment_id?: string;
  history: Record<string, unknown>;
  questions: SectionQuestionStat[];
  analysis: unknown;
  attempts: Array<Record<string, unknown>>;
  journal: Array<Record<string, unknown>>;
}

/**
 * Builds the close-out payload from a finished session. Pure apart from the
 * question bank and the clock stamp on each journal item.
 *
 * Every miss is journaled once here, answered or not, which replaces both the
 * `commitSessionAttempts` journal write and the second `logSectionWrongAnswers`
 * call from the results screen (audit F3).
 */
export function buildCloseoutPayload(
  session: DrillSession,
  options: { assignmentId?: string | null; nowIso?: string } = {},
): CloseoutPayload {
  const stats = buildSectionStats(session);
  const totals = buildSectionTotals(stats);
  const nowIso = options.nowIso ?? new Date().toISOString();

  const attempts: CloseoutPayload['attempts'] = [];
  const journal: CloseoutPayload['journal'] = [];
  for (const stat of stats) {
    const question = questionBank.getQuestion(stat.qid);
    if (!question) continue;
    const base = {
      qid: stat.qid,
      pt: question.pt,
      section: question.section,
      qnum: question.qnum,
      qtype: question.qtype,
      level: question.difficulty,
    };
    const answered = stat.initialAnswer !== UNANSWERED;
    if (answered) {
      attempts.push({ ...base, correct: stat.initialCorrect, time_ms: Math.max(0, Math.round(stat.timeMs || 0)), selected_answer: stat.initialAnswer });
    }
    if (!stat.initialCorrect) {
      journal.push({
        ...base,
        item: {
          attempt_at_iso: nowIso,
          result: 0,
          chosen_answer: stat.initialAnswer,
          correct_answer: stat.correctAnswer,
          time_ms: Math.max(0, Math.round(stat.timeMs || 0)),
          confidence_1_5: null,
        },
      });
    }
  }

  return {
    pt: session.fullSectionConfig?.pt || 0,
    section: session.fullSectionConfig?.section || 0,
    ...(options.assignmentId ? { assignment_id: options.assignmentId } : {}),
    history: {
      initial_score: totals.initialScore,
      initial_percent: totals.initialPercent,
      total_time_ms: totals.totalTimeMs,
      avg_time_ms: totals.avgTimeMs,
      unanswered_count: totals.unansweredCount,
      by_qtype_json: tally(stats, (s) => s.qtype),
      by_difficulty_json: tally(stats, (s) => s.difficulty),
    },
    questions: stats,
    analysis: analyseSection(buildAnalysisInput(session, stats)),
    attempts,
    journal,
  };
}

export async function closeStandaloneSection(sittingId: string, payload: CloseoutPayload): Promise<CloseoutReply> {
  const { data, error } = await rpc('close_standalone_section_v1', {
    p_sitting_id: sittingId,
    p_payload: payload,
  });
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    status: d.status as CloseoutReply['status'],
    historyId: (d.history_id as string | null) ?? null,
    conflict: d.conflict === true,
  };
}

/**
 * Open (or recover) the sitting and close it out. Safe to call again after any
 * failure: a sitting that already closed returns its saved history id.
 */
export async function runStandaloneCloseout(args: {
  userId: string;
  poolKey: string;
  session: DrillSession;
  assignmentId?: string | null;
  /** Sitting id already opened at section start (Phase 1.3). */
  sittingId?: string | null;
}): Promise<CloseoutReply & { createdNow: boolean }> {
  if (args.sittingId) {
    const payload = buildCloseoutPayload(args.session, { assignmentId: args.assignmentId });
    const reply = await closeStandaloneSection(args.sittingId, payload);
    return { ...reply, createdNow: reply.status === 'created' };
  }

  const cached = readCachedSitting(args.userId, args.poolKey);
  const sitting = await openSectionSitting({ poolKey: args.poolKey, knownSittingId: cached?.id ?? null });

  if (sitting.status === 'stale') {
    // This tab's sitting was restarted elsewhere. If the latest one is closed,
    // its saved result is the answer; if it is open, this tab is not it.
    writeCachedSitting(args.userId, args.poolKey, sitting);
    if (sitting.latestState === 'closed' && sitting.historyId) {
      return { status: 'replayed', historyId: sitting.historyId, conflict: true, createdNow: false };
    }
    return { status: 'stale', historyId: null, conflict: false, createdNow: false };
  }
  writeCachedSitting(args.userId, args.poolKey, sitting);
  if (sitting.status === 'closed') {
    return { status: 'replayed', historyId: sitting.historyId, conflict: false, createdNow: false };
  }

  const payload = buildCloseoutPayload(args.session, { assignmentId: args.assignmentId });
  const reply = await closeStandaloneSection(sitting.sittingId, payload);
  return { ...reply, createdNow: reply.status === 'created' };
}
