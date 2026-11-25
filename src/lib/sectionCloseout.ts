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
  /** Authoritative resume storage key for this sitting (`#adopted-g1` or `#<sittingId>`). */
  storageKey?: string;
  /** Pool key used for legacy local backup/IndexedDB recovery on generation 1. */
  legacyPoolKey?: string | null;
}

export function sittingStorageKey(poolKey: string, sittingId: string): string {
  return `${poolKey}#${sittingId}`;
}

export function adoptedSittingKey(poolKey: string): string {
  return `${poolKey}#adopted-g1`;
}

export function storageKeyForSitting(
  poolKey: string,
  sitting: { sittingId: string; adopted?: boolean },
): string {
  return sitting.adopted ? adoptedSittingKey(poolKey) : sittingStorageKey(poolKey, sitting.sittingId);
}

export interface CloseoutReply {
  status: 'created' | 'replayed' | 'stale';
  historyId: string | null;
  /** The saved first answers differ from what this tab sent. */
  conflict: boolean;
}

/**
 * Finish account bookkeeping using the committed history row. The RPC returns
 * an acknowledgment, so it never needs to send a sealed result to the runner.
 */
export async function reconcileStandaloneSection(sittingId: string, historyId: string): Promise<void> {
  const { data, error } = await rpc('reconcile_standalone_section_v1', {
    p_sitting_id: sittingId,
    p_history_id: historyId,
  });
  if (error) throw new Error(error.message);
  if ((data as { status?: string } | null)?.status !== 'reconciled') {
    throw new Error('Could not confirm the saved section.');
  }
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
    adopted: typeof d.adopted === 'boolean' ? d.adopted : undefined,
    adoptedRevision: typeof d.adopted_revision === 'string' ? d.adopted_revision : null,
  };
}

async function fetchSittingAdoptionInfo(sittingId: string): Promise<{
  adopted: boolean;
  adoptedRevision: string | null;
}> {
  const { data, error } = await (supabase as unknown as {
    from(table: string): {
      select(cols: string): {
        eq(col: string, val: string): {
          maybeSingle(): Promise<{
            data: { adopted_from_record_id?: string | null; adopted_revision?: string | null } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  })
    .from('standalone_section_sittings')
    .select('adopted_from_record_id, adopted_revision')
    .eq('id', sittingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    adopted: typeof data?.adopted_from_record_id === 'string' && data.adopted_from_record_id.length > 0,
    adoptedRevision: typeof data?.adopted_revision === 'string' ? data.adopted_revision : null,
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

export async function fetchSectionSittingGeneration(
  userId: string,
  sittingId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('standalone_section_sittings' as never)
    .select('generation')
    .eq('user_id', userId)
    .eq('id', sittingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const generation = (data as { generation?: number } | null)?.generation;
  if (typeof generation !== 'number' || !Number.isSafeInteger(generation) || generation <= 0) {
    throw new Error('Saved section generation is unavailable.');
  }
  return generation;
}

/**
 * Opens or reconciles the server-owned sitting at section START (plan 1.3).
 *
 * - Resume/reload never passes `restart`; only an explicit "start over" does,
 *   requiring the displayed sitting generation.
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
  expectedGeneration?: number | null;
  /** A historical report has no sitting to restart. Ordinary open can resume a current sitting. */
  fromHistoricalReport?: boolean;
}): Promise<SittingReply> {
  const cached = readCachedSitting(args.userId, args.poolKey);
  const isRestart = args.restart === true;
  const expectedGeneration = isRestart ? args.expectedGeneration ?? null : null;
  if (isRestart && (expectedGeneration == null || !Number.isSafeInteger(expectedGeneration) || expectedGeneration <= 0)) {
    throw new Error('Cannot start over without an existing sitting generation.');
  }
  const legacyRecordId = isRestart ? null : practiceSessionIdFor(args.userId, args.poolKey);
  const sittingRecordId = isRestart
    ? null
    : practiceSessionIdFor(args.userId, adoptedSittingKey(args.poolKey));

  const reply = await openSectionSitting({
    poolKey: args.poolKey,
    knownSittingId: isRestart || args.fromHistoricalReport ? null : (cached?.id ?? null),
    restart: isRestart,
    expectedGeneration,
    legacyRecordId,
    sittingRecordId,
  });

  if (reply.sittingId && reply.generation > 0) {
    writeCachedSitting(args.userId, args.poolKey, reply);
  }

  let adopted = reply.adopted;
  let adoptedRevision = reply.adoptedRevision ?? null;
  if (reply.sittingId && reply.generation === 1 && adopted === undefined) {
    const info = await fetchSittingAdoptionInfo(reply.sittingId);
    adopted = info.adopted;
    adoptedRevision = info.adoptedRevision;
  }
  const resolvedAdopted = adopted === true;
  const storageKey = reply.sittingId
    ? storageKeyForSitting(args.poolKey, { sittingId: reply.sittingId, adopted: resolvedAdopted })
    : args.poolKey;
  const legacyPoolKey = !isRestart && reply.generation === 1 ? args.poolKey : null;
  const normalizedStatus =
    reply.status === 'stale' && reply.latestState === 'closed' && reply.historyId
      ? ('closed' as const)
      : reply.status;

  return {
    ...reply,
    status: normalizedStatus,
    adopted: resolvedAdopted,
    adoptedRevision,
    storageKey,
    legacyPoolKey,
  };
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
}): Promise<CloseoutReply & { sittingId?: string; createdNow: boolean; questions?: SectionQuestionStat[] }> {
  if (args.sittingId) {
    const payload = buildCloseoutPayload(args.session, { assignmentId: args.assignmentId });
    const reply = await closeStandaloneSection(args.sittingId, payload);
    return {
      ...reply,
      sittingId: args.sittingId,
      createdNow: reply.status === 'created',
      questions: reply.status === 'created' ? payload.questions : undefined,
    };
  }

  const cached = readCachedSitting(args.userId, args.poolKey);
  const sitting = await openSectionSitting({ poolKey: args.poolKey, knownSittingId: cached?.id ?? null });

  if (sitting.status === 'stale') {
    // This tab's sitting was restarted elsewhere. If the latest one is closed,
    // its saved result is the answer; if it is open, this tab is not it.
    writeCachedSitting(args.userId, args.poolKey, sitting);
    if (sitting.latestState === 'closed' && sitting.historyId) {
      return { status: 'replayed', historyId: sitting.historyId, sittingId: sitting.sittingId, conflict: true, createdNow: false };
    }
    return { status: 'stale', historyId: null, conflict: false, createdNow: false };
  }
  writeCachedSitting(args.userId, args.poolKey, sitting);
  if (sitting.status === 'closed') {
    return { status: 'replayed', historyId: sitting.historyId, sittingId: sitting.sittingId, conflict: false, createdNow: false };
  }

  const payload = buildCloseoutPayload(args.session, { assignmentId: args.assignmentId });
  const reply = await closeStandaloneSection(sitting.sittingId, payload);
  return {
    ...reply,
    sittingId: sitting.sittingId,
    createdNow: reply.status === 'created',
    questions: reply.status === 'created' ? payload.questions : undefined,
  };
}
