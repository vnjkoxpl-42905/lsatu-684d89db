import { supabase } from '@/integrations/supabase/client';
import { questionBank } from '@/lib/questionLoader';
import { completeLinkedTodo } from '@/lib/todoActions';
import {
  resolveLeveledDrillQids,
  type LeveledDrillResolution,
} from '@/lib/guidedDrillLevel';
import type { StudentLevel } from '@/lib/studentLevel';
import type { QuestionStat } from '@/lib/questionStats';

export interface GuidedDrillBankFilter {
  qtypes?: string[];
  features?: string[];
  reasoning_types?: string[];
  difficulty_min?: number | null;
  difficulty_max?: number | null;
  count?: number | null;
}

export interface GuidedDrill {
  id: string;
  slug: string;
  week: number;
  order_in_week: number;
  title: string;
  category: string | null;
  estimated_minutes: number | null;
  question_count: number | null;
  difficulty_min: number | null;
  difficulty_max: number | null;
  question_types: string[];
  question_features: string[];
  reasoning_types: string[];
  start_button_label: string;
  instruction_card: { left_md?: string; right_md?: string };
  bank_filter: GuidedDrillBankFilter;
  source_file?: string | null;
  is_published: boolean;
  question_qids?: string[];
  /**
   * Catalog tag: which band this drill is pitched at. NULL means it suits any
   * level. Drives filtering and the "advanced drill, beginner student" warning
   * in the assign sheet; it does NOT select questions. The student's level does.
   */
  level?: StudentLevel | null;
}

export interface GuidedDrillAssignment {
  id: string;
  guided_drill_id: string;
  student_id: string;
  class_id: string;
  assigned_by: string;
  assigned_at: string;
  scheduled_for: string | null;
  unlock_at: string | null;
  status: 'assigned' | 'read' | 'started' | 'completed';
  read_card_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  attempt_session_id: string | null;
  question_qids?: string[];
  /** The band this assignment draws at. NULL = the drill's own range. */
  level?: StudentLevel | null;
  /** Per-assignment size override. NULL = the drill's question_count. */
  question_count?: number | null;
}

/**
 * Resolve the ordered list of exact question IDs for a guided drill, if any.
 * Priority:
 *   1. Assignment-level override (per-student exact list)
 *   2. Drill-level exact list (guided_drills.question_qids)
 * Returns [] if no exact list is attached — caller should then fall back to bank_filter sampling.
 * Filters out qids not present in the loaded question bank to avoid broken drills.
 */
export function resolveExactGuidedDrillQids(
  drill: GuidedDrill | null | undefined,
  assignment: GuidedDrillAssignment | null | undefined,
  knownQids: Set<string>,
): string[] {
  const fromAssignment = assignment?.question_qids ?? [];
  const fromDrill = drill?.question_qids ?? [];
  const ordered = fromAssignment.length > 0 ? fromAssignment : fromDrill;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const qid of ordered) {
    if (!qid || seen.has(qid)) continue;
    if (knownQids.size > 0 && !knownQids.has(qid)) continue;
    seen.add(qid);
    out.push(qid);
  }
  return out;
}

export async function listGuidedDrills(): Promise<GuidedDrill[]> {
  const { data, error } = await supabase
    .from('guided_drills')
    .select('*')
    .order('week', { ascending: true })
    .order('order_in_week', { ascending: true });
  if (error) throw error;
  return (data || []) as GuidedDrill[];
}

export async function getGuidedDrill(id: string): Promise<GuidedDrill | null> {
  const { data, error } = await supabase
    .from('guided_drills')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as GuidedDrill) || null;
}

export async function getGuidedDrillBySlug(slug: string): Promise<GuidedDrill | null> {
  const { data, error } = await supabase
    .from('guided_drills')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as GuidedDrill) || null;
}

/**
 * Resolve the question pool for a guided drill from the in-memory question bank.
 * Filters by qtypes (any) ∩ features (any) ∩ reasoning_types (any) ∩ difficulty range.
 */
export function resolveGuidedDrillPool(filter: GuidedDrillBankFilter | null | undefined) {
  const all = questionBank.getAllQuestions();
  const f = filter ?? {};
  const qtypeSet = new Set((f.qtypes || []).map((s) => s.toLowerCase()));
  const featSet = new Set((f.features || []).map((s) => s.toLowerCase()));
  const rtSet = new Set((f.reasoning_types || []).map((s) => s.toLowerCase()));
  const dmin = f.difficulty_min ?? null;
  const dmax = f.difficulty_max ?? null;
  return all.filter((q) => {
    if (qtypeSet.size > 0 && !qtypeSet.has((q.qtype || '').toLowerCase())) return false;
    if (featSet.size > 0) {
      const hit = (q.questionFeatures || []).some((f) => featSet.has(f.toLowerCase()));
      if (!hit) return false;
    }
    if (rtSet.size > 0) {
      const hit = (q.reasoningType || []).some((r) => rtSet.has(r.toLowerCase()));
      if (!hit) return false;
    }
    if (dmin != null && q.difficulty < dmin) return false;
    if (dmax != null && q.difficulty > dmax) return false;
    return true;
  });
}

/**
 * Thrown rather than returning an empty list, because an unloaded bank and a
 * filter that matches nothing are otherwise indistinguishable: both look like
 * "no matching questions found" and the second is a real, actionable defect.
 */
export class QuestionBankNotLoadedError extends Error {
  constructor() {
    super('Question bank is not loaded yet; cannot resolve drill questions.');
    this.name = 'QuestionBankNotLoadedError';
  }
}

/**
 * Which questions a specific student should see for a guided drill.
 *
 * Combines the drill's own pool (bank_filter) with the student's level, so one
 * drill serves a beginner and an advanced student differently. Called at open
 * time rather than assign time, which is what keeps re-attempts fresh.
 *
 * Callers must have the bank loaded. In React, gate on
 * `useQuestionBank().isLoading` first, as the drill runner and admin catalog do.
 */
export function resolveGuidedDrillQidsForLevel(args: {
  drill: GuidedDrill;
  assignment?: GuidedDrillAssignment | null;
  /** Overrides the assignment's stored level. Undefined uses the assignment. */
  level?: StudentLevel | null;
  /** Overrides the assignment's stored count, then the drill's. */
  questionCount?: number | null;
  rng?: () => number;
  /**
   * Trap targeting, off unless both are supplied. Only the freeze path passes
   * these: an open-time draw has no teacher present to name a target, and
   * there is no column to remember one, so an ordinary assignment keeps
   * drawing exactly as it always has.
   */
  stats?: ReadonlyMap<string, QuestionStat> | null;
  targetTrapTags?: readonly string[] | null;
  trapWeight?: number;
  empiricalWeight?: number;
}): LeveledDrillResolution {
  const { drill, assignment, rng } = args;
  if (!questionBank.isReady()) throw new QuestionBankNotLoadedError();

  const level =
    args.level !== undefined ? args.level : (assignment?.level ?? null);
  const questionCount =
    args.questionCount ??
    assignment?.question_count ??
    drill.question_count ??
    null;

  const all = questionBank.getAllQuestions();
  return resolveLeveledDrillQids({
    pool: resolveGuidedDrillPool(drill.bank_filter),
    questionCount,
    drillQids: drill.question_qids,
    assignmentQids: assignment?.question_qids,
    knownQids: new Set(all.map((q) => q.qid)),
    level,
    rng,
    stats: args.stats ?? null,
    targetTrapTags: args.targetTrapTags ?? null,
    trapWeight: args.trapWeight ?? 0,
    empiricalWeight: args.empiricalWeight ?? 0,
  });
}

export async function listAssignmentsForStudent(studentId: string) {
  const { data, error } = await supabase
    .from('guided_drill_assignments')
    .select('*, guided_drill:guided_drills(*)')
    .eq('student_id', studentId)
    .order('scheduled_for', { ascending: true, nullsFirst: false })
    .order('assigned_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getAssignment(id: string) {
  const { data, error } = await supabase
    .from('guided_drill_assignments')
    .select('*, guided_drill:guided_drills(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function markCardRead(assignmentId: string) {
  const { error } = await supabase
    .from('guided_drill_assignments')
    .update({ read_card_at: new Date().toISOString(), status: 'read' })
    .eq('id', assignmentId);
  if (error) throw error;
}

export async function markStarted(assignmentId: string) {
  const { error } = await supabase
    .from('guided_drill_assignments')
    .update({ started_at: new Date().toISOString(), status: 'started' })
    .eq('id', assignmentId);
  if (error) throw error;
}

export async function markCompleted(assignmentId: string) {
  const { error } = await supabase
    .from('guided_drill_assignments')
    .update({ completed_at: new Date().toISOString(), status: 'completed' })
    .eq('id', assignmentId);
  if (error) throw error;
  await completeLinkedTodo(assignmentId);
}
