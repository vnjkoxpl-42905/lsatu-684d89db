import { supabase } from "@/integrations/supabase/client";
import type { BootcampMutationResult, ConfidenceLevel, DrillType } from "../types";

// Supabase fetch + upsert helpers for the four Abstract v2 progress tables.
//
// Every mutation returns { ok }|{ ok:false, error } matching the LSATU-wide
// AttemptResult contract. Toast surfacing is the caller's responsibility so
// AppContext can choose where to emit user-visible errors.
//
// Session-dead errors (JWT expiry, 401) are detected and surfaced; the
// AppContext layer decides whether to redirect or just toast.

// Narrow session-death classifier matching the implementation in
// `src/hooks/useUserPermissions.ts`. Replicated here (rather than imported)
// because the helper is private to that module.
export function isSessionDeadError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; message?: string };
  if (e.status === 401) return true;
  const msg = String(e.message || "").toLowerCase();
  return (
    msg.includes("jwt") ||
    msg.includes("token is expired") ||
    msg.includes("token expired") ||
    msg.includes("invalid_token")
  );
}

// ---------- abstract_lesson_progress ----------

export interface LessonProgressRow {
  lessonId: string;
  completedAt: string;
}

export async function fetchLessonProgress(userId: string): Promise<LessonProgressRow[]> {
  const { data, error } = await supabase
    .from("abstract_lesson_progress")
    .select("lesson_id, completed_at")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    lessonId: row.lesson_id,
    completedAt: row.completed_at,
  }));
}

export async function upsertLessonProgress(
  userId: string,
  lessonId: string,
): Promise<BootcampMutationResult> {
  const { error } = await supabase
    .from("abstract_lesson_progress")
    .upsert(
      { user_id: userId, lesson_id: lessonId, completed_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" },
    );
  if (error) return { ok: false, error };
  return { ok: true };
}

// ---------- abstract_drill_attempts ----------

export interface DrillAttemptInput {
  drillId: string;
  drillType: DrillType;
  selectedIndex: number;
  correct: boolean;
  confidence: ConfidenceLevel;
  trapTag?: string;
}

export async function insertDrillAttempt(
  userId: string,
  attempt: DrillAttemptInput,
): Promise<BootcampMutationResult> {
  const { error } = await supabase.from("abstract_drill_attempts").insert({
    user_id: userId,
    drill_id: attempt.drillId,
    drill_type: attempt.drillType,
    selected_index: attempt.selectedIndex,
    correct: attempt.correct,
    confidence: attempt.confidence,
    trap_tag: attempt.trapTag ?? null,
  });
  if (error) return { ok: false, error };
  return { ok: true };
}

export async function fetchDrillAttempts(userId: string) {
  const { data, error } = await supabase
    .from("abstract_drill_attempts")
    .select("drill_id, drill_type, selected_index, correct, confidence, trap_tag, completed_at")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---------- abstract_gauntlet_attempts ----------

export interface GauntletAttemptInput {
  choiceId: number;
  keywordsPicked: string[];
  translationText: string;
  requirementsChecked: number[];
  correctCount: number;
}

export async function insertGauntletAttempt(
  userId: string,
  attempt: GauntletAttemptInput,
): Promise<BootcampMutationResult> {
  const { error } = await supabase.from("abstract_gauntlet_attempts").insert({
    user_id: userId,
    choice_id: attempt.choiceId,
    keywords_picked: attempt.keywordsPicked,
    translation_text: attempt.translationText,
    requirements_checked: attempt.requirementsChecked,
    correct_count: attempt.correctCount,
  });
  if (error) return { ok: false, error };
  return { ok: true };
}

export async function fetchGauntletAttempts(userId: string) {
  const { data, error } = await supabase
    .from("abstract_gauntlet_attempts")
    .select("choice_id, keywords_picked, translation_text, requirements_checked, correct_count, completed_at")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---------- abstract_final_set ----------

export async function upsertFinalSetScore(
  userId: string,
  score: number,
  total: number,
): Promise<BootcampMutationResult> {
  const { error } = await supabase.from("abstract_final_set").insert({
    user_id: userId,
    score,
    total,
  });
  if (error) return { ok: false, error };
  return { ok: true };
}

export async function fetchLatestFinalSetScore(userId: string) {
  const { data, error } = await supabase
    .from("abstract_final_set")
    .select("score, total, completed_at")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---------- analytics mirror: chapter_progress ----------
//
// Used so the teacher Bootcamps dashboard sees Abstract lesson completion.
// Pattern mirrors `useRecordChapterSection` in
// `src/components/teacher/bootcamps/hooks/useChapterProgress.ts` but is
// awaitable from AppContext (which is not a hook).
export async function recordChapterProgress(
  userId: string,
  topicTag: string,
  sectionId: string,
): Promise<BootcampMutationResult> {
  const nowIso = new Date().toISOString();
  const insertRes = await supabase.from("chapter_progress").insert({
    user_id: userId,
    topic_tag: topicTag,
    section_id: sectionId,
    first_viewed_at: nowIso,
    last_viewed_at: nowIso,
    view_count: 1,
  });
  if (!insertRes.error) return { ok: true };
  const isUniqueViolation =
    typeof insertRes.error === "object" &&
    insertRes.error !== null &&
    "code" in insertRes.error &&
    (insertRes.error as { code: string }).code === "23505";
  if (!isUniqueViolation) return { ok: false, error: insertRes.error };

  const { data, error: selErr } = await supabase
    .from("chapter_progress")
    .select("view_count")
    .eq("user_id", userId)
    .eq("topic_tag", topicTag)
    .eq("section_id", sectionId)
    .maybeSingle();
  if (selErr) return { ok: false, error: selErr };

  const updateRes = await supabase
    .from("chapter_progress")
    .update({
      last_viewed_at: nowIso,
      view_count: (data?.view_count ?? 1) + 1,
    })
    .eq("user_id", userId)
    .eq("topic_tag", topicTag)
    .eq("section_id", sectionId);
  if (updateRes.error) return { ok: false, error: updateRes.error };
  return { ok: true };
}
