import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClassId } from "@/hooks/useClassId";

/**
 * Admin-scoped CRUD for homework_sets.
 * RLS enforces created_by = auth.uid() and has_role(..., 'admin').
 */

export type InstructionLayout = 'two_column' | 'single_column';

export interface HomeworkSet {
  id: string;
  title: string;
  description: string | null;
  question_qids: string[];
  created_by: string;
  class_id: string;
  created_at: string;
  updated_at: string;
  /** Guided-set extension fields (nullable on legacy rows). */
  is_guided_set?: boolean;
  instructions_markdown?: string | null;
  instruction_layout?: InstructionLayout | null;
  guided_set_type?: string | null;
  question_type?: string | null;
  reasoning_type?: string | null;
  question_feature?: string | null;
  estimated_minutes?: number | null;
  source_pts?: string[] | null;
  difficulty_min?: number | null;
  difficulty_max?: number | null;
  start_button_label?: string | null;
}

export interface GuidedSetFields {
  is_guided_set?: boolean;
  instructions_markdown?: string | null;
  instruction_layout?: InstructionLayout | null;
  guided_set_type?: string | null;
  question_type?: string | null;
  reasoning_type?: string | null;
  question_feature?: string | null;
  estimated_minutes?: number | null;
  source_pts?: string[] | null;
  difficulty_min?: number | null;
  difficulty_max?: number | null;
  start_button_label?: string | null;
}

export interface CreateHomeworkSetInput extends GuidedSetFields {
  title: string;
  description?: string | null;
  question_qids: string[];
}

export interface UpdateHomeworkSetInput extends GuidedSetFields {
  title?: string;
  description?: string | null;
  question_qids?: string[];
}

export interface MutationResult<T> {
  data: T | null;
  error: string | null;
}

export interface UseHomeworkSetsResult {
  sets: HomeworkSet[];
  loading: boolean;
  error: string | null;
  classIdReady: boolean;
  refresh: () => Promise<void>;
  create: (input: CreateHomeworkSetInput) => Promise<MutationResult<HomeworkSet>>;
  update: (id: string, input: UpdateHomeworkSetInput) => Promise<MutationResult<HomeworkSet>>;
  remove: (id: string) => Promise<{ ok: boolean; error: string | null }>;
}

export function useHomeworkSets(): UseHomeworkSetsResult {
  const { user } = useAuth();
  const { classId, loading: classIdLoading } = useClassId();
  const [sets, setSets] = useState<HomeworkSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Returning while `loading` is still true left the list stuck on its
    // skeleton forever for anyone signed out — a spinner that never resolves
    // reads as a broken page, not as "nothing to show."
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("homework_sets")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[homework:sets:list] failed", { userId: user.id, error: err });
      setError(err.message);
      setSets([]);
    } else {
      setSets((data || []) as HomeworkSet[]);
      setError(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  const create = useCallback(
    async (input: CreateHomeworkSetInput): Promise<MutationResult<HomeworkSet>> => {
      if (!user) return { data: null, error: "Not signed in." };
      if (classIdLoading) return { data: null, error: "Still loading your class. Try again in a moment." };
      const effectiveClassId = classId || user.id;
      const guidedFields: Record<string, unknown> = {};
      const guidedKeys: (keyof GuidedSetFields)[] = [
        'is_guided_set', 'instructions_markdown', 'instruction_layout',
        'guided_set_type', 'question_type', 'reasoning_type', 'question_feature',
        'estimated_minutes', 'source_pts', 'difficulty_min', 'difficulty_max',
        'start_button_label',
      ];
      for (const k of guidedKeys) {
        const v = input[k];
        if (v !== undefined) guidedFields[k] = v;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await supabase
        .from("homework_sets")
        .insert({
          title: input.title,
          description: input.description ?? null,
          question_qids: input.question_qids,
          created_by: user.id,
          class_id: effectiveClassId,
          ...guidedFields,
        })
        .select()
        .single();
      if (err) {
        console.error("[homework:sets:create] failed", {
          userId: user.id,
          classId: effectiveClassId,
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint,
          error: err,
        });
        const msg = err.message || err.details || err.hint || "Unknown DB error";
        return { data: null, error: `${err.code ? `[${err.code}] ` : ""}${msg}` };
      }
      await refresh();
      return { data: data as HomeworkSet, error: null };
    },
    [user, classId, classIdLoading, refresh],
  );

  const update = useCallback(
    async (id: string, input: UpdateHomeworkSetInput): Promise<MutationResult<HomeworkSet>> => {
      if (!user) return { data: null, error: "Not signed in." };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await supabase
        .from("homework_sets")
        .update(input as any)
        .eq("id", id)
        .select()
        .single();
      if (err) {
        console.error("[homework:sets:update] failed", {
          userId: user.id,
          id,
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint,
          error: err,
        });
        const msg = err.message || err.details || err.hint || "Unknown DB error";
        return { data: null, error: `${err.code ? `[${err.code}] ` : ""}${msg}` };
      }
      await refresh();
      return { data: data as HomeworkSet, error: null };
    },
    [user, refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<{ ok: boolean; error: string | null }> => {
      if (!user) return { ok: false, error: "Not signed in." };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await supabase
        .from("homework_sets")
        .delete()
        .eq("id", id);
      if (err) {
        console.error("[homework:sets:delete] failed", {
          userId: user.id,
          id,
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint,
          error: err,
        });
        const msg = err.message || err.details || err.hint || "Unknown DB error";
        return { ok: false, error: `${err.code ? `[${err.code}] ` : ""}${msg}` };
      }
      await refresh();
      return { ok: true, error: null };
    },
    [user, refresh],
  );

  return {
    sets,
    loading,
    error,
    classIdReady: !classIdLoading,
    refresh,
    create,
    update,
    remove,
  };
}

export function useHomeworkSet(setId: string | undefined): {
  set: HomeworkSet | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const [set, setSet] = useState<HomeworkSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Same stuck-skeleton bug as the list hook above: with no user or no setId
    // there is nothing to wait for, so stop waiting.
    if (!user || !setId) {
      setLoading(false);
      setSet(null);
      return;
    }
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await supabase
      .from("homework_sets")
      .select("*")
      .eq("id", setId)
      .maybeSingle();
    if (err) {
      console.error("[homework:sets:get] failed", { userId: user.id, setId, error: err });
      setError(err.message);
      setSet(null);
    } else {
      setSet((data as HomeworkSet) || null);
      setError(null);
    }
    setLoading(false);
  }, [user, setId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { set, loading, error, refresh };
}
