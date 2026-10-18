import { isRcSavedState } from '@/features/rc/lib/rcSavedSetCodec';
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface SavedSetRow {
  id: string;
  user_id: string;
  name: string;
  filter_state: Record<string, unknown>;
  question_ids: string[];
  created_at: string;
}

export interface SaveSetInput {
  name: string;
  filter_state: Record<string, unknown>;
  question_ids: string[];
}

// Silent-skip pattern mirrors lastActivity / questionExposure — table-not-
// deployed is a deploy race, not a write failure to toast.
function isMissingRelationError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "42P01" || e.code === "PGRST205") return true;
  return /relation .*user_saved_sets.* does not exist/i.test(e.message ?? "");
}

export async function listSavedSets(userId: string): Promise<SavedSetRow[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("user_saved_sets")
    .select("id, user_id, name, filter_state, question_ids, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingRelationError(error)) {
      console.warn("[savedSets] user_saved_sets table not deployed yet; returning empty list");
      return [];
    }
    throw new Error(`listSavedSets failed: ${error.message}`);
  }
  return ((data ?? []) as unknown as SavedSetRow[]).filter(row => !isRcSavedState(row.filter_state));
}

export async function saveSet(userId: string, input: SaveSetInput): Promise<SavedSetRow> {
  if (!userId) throw new Error("saveSet: userId required");
  if (!input.name.trim()) throw new Error("saveSet: name required");
  if (input.question_ids.length === 0) throw new Error("saveSet: question_ids required");
  const { data, error } = await supabase
    .from("user_saved_sets")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      filter_state: input.filter_state as unknown as Json,
      question_ids: input.question_ids,
    })
    .select("id, user_id, name, filter_state, question_ids, created_at")
    .single();
  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error("Saved sets aren't available yet — the table hasn't been deployed.");
    }
    throw new Error(`saveSet failed: ${error.message}`);
  }
  return data as unknown as SavedSetRow;
}

export async function deleteSavedSet(setId: string): Promise<void> {
  if (!setId) throw new Error("deleteSavedSet: setId required");
  const { error } = await supabase.from("user_saved_sets").delete().eq("id", setId);
  if (error) {
    if (isMissingRelationError(error)) return;
    throw new Error(`deleteSavedSet failed: ${error.message}`);
  }
}

export async function duplicateSavedSet(setId: string, newName?: string): Promise<SavedSetRow> {
  if (!setId) throw new Error("duplicateSavedSet: setId required");
  const { data: existing, error: fetchErr } = await supabase
    .from("user_saved_sets")
    .select("user_id, name, filter_state, question_ids")
    .eq("id", setId)
    .single();
  if (fetchErr) {
    throw new Error(`duplicateSavedSet (fetch) failed: ${fetchErr.message}`);
  }
  const src = existing as unknown as {
    user_id: string;
    name: string;
    filter_state: Record<string, unknown>;
    question_ids: string[];
  };
  return saveSet(src.user_id, {
    name: newName ?? `${src.name} (copy)`,
    filter_state: src.filter_state,
    question_ids: src.question_ids,
  });
}

export async function renameSavedSet(setId: string, newName: string): Promise<void> {
  if (!setId) throw new Error("renameSavedSet: setId required");
  if (!newName.trim()) throw new Error("renameSavedSet: name required");
  const { error } = await supabase
    .from("user_saved_sets")
    .update({ name: newName.trim() })
    .eq("id", setId);
  if (error) {
    throw new Error(`renameSavedSet failed: ${error.message}`);
  }
}
