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
  timeMs?: number;
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
    time_ms: attempt.timeMs ?? null,
  });
  if (error) return { ok: false, error };
  return { ok: true };
}

export async function fetchDrillAttempts(userId: string) {
  const { data, error } = await supabase
    .from("abstract_drill_attempts")
    .select("drill_id, drill_type, selected_index, correct, confidence, trap_tag, time_ms, completed_at")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---------- abstract_translator_attempts ----------

export interface TranslatorAttemptInput {
  stemNumber: number;
  keywordsPicked: string[];
  translationText: string;
}

export async function insertTranslatorAttempt(
  userId: string,
  attempt: TranslatorAttemptInput,
): Promise<BootcampMutationResult> {
  const { error } = await supabase.from("abstract_translator_attempts").insert({
    user_id: userId,
    stem_number: attempt.stemNumber,
    keywords_picked: attempt.keywordsPicked,
    translation_text: attempt.translationText,
  });
  if (error) return { ok: false, error };
  return { ok: true };
}

export async function fetchTranslatorAttempts(userId: string) {
  const { data, error } = await supabase
    .from("abstract_translator_attempts")
    .select("stem_number, keywords_picked, translation_text, completed_at")
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

// ---------- flashcard_reviews ----------
//
// Append-only review log shared with `useRecordFlashcardReview`. Mirrored
// here so AppContext (not a hook) can write through after a rating.

export interface FlashcardReviewInput {
  topicTag: string;
  cardId: string;
  rating: "again" | "hard" | "good" | "easy";
  intervalDays: number;
  dueAtIso: string;
  reviewCount: number;
}

export async function insertFlashcardReview(
  userId: string,
  input: FlashcardReviewInput,
): Promise<BootcampMutationResult> {
  const { error } = await supabase.from("flashcard_reviews").insert({
    user_id: userId,
    topic_tag: input.topicTag,
    card_id: input.cardId,
    rating: input.rating,
    interval_days: input.intervalDays,
    due_at: input.dueAtIso,
    review_count: input.reviewCount,
    reviewed_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error };
  return { ok: true };
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
  // Atomic upsert (increment_chapter_view): a single ON CONFLICT statement so a
  // fast double-fire or two tabs can't lose a view_count increment. The RPC takes
  // user_id from auth.uid() internally (the userId param is the same current user
  // and is retained only for the call-site signature).
  void userId;
  const { error } = await supabase.rpc("increment_chapter_view", {
    p_topic_tag: topicTag,
    p_section_id: sectionId,
  });
  if (error) return { ok: false, error };
  return { ok: true };
}
