import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClassId } from "@/hooks/useClassId";

/**
 * Admin-scoped CRUD for homework_sets.
 * RLS enforces created_by = auth.uid() and has_role(..., 'admin').
 */

export interface HomeworkSet {
  id: string;
  title: string;
  description: string | null;
  question_qids: string[];
  created_by: string;
  class_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHomeworkSetInput {
  title: string;
  description?: string | null;
  question_qids: string[];
}

export interface UpdateHomeworkSetInput {
  title?: string;
  description?: string | null;
  question_qids?: string[];
}

export interface UseHomeworkSetsResult {
  sets: HomeworkSet[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: CreateHomeworkSetInput) => Promise<HomeworkSet | null>;
  update: (id: string, input: UpdateHomeworkSetInput) => Promise<HomeworkSet | null>;
  remove: (id: string) => Promise<boolean>;
}

export function useHomeworkSets(): UseHomeworkSetsResult {
  const { user } = useAuth();
  const { classId } = useClassId();
  const [sets, setSets] = useState<HomeworkSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // TODO: drop `as any` after next supabase type regen (homework_sets)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
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
    async (input: CreateHomeworkSetInput): Promise<HomeworkSet | null> => {
      if (!user || !classId) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase as any)
        .from("homework_sets")
        .insert({
          title: input.title,
          description: input.description ?? null,
          question_qids: input.question_qids,
          created_by: user.id,
          class_id: classId,
        })
        .select()
        .single();
      if (err) {
        console.error("[homework:sets:create] failed", { userId: user.id, error: err });
        return null;
      }
      await refresh();
      return data as HomeworkSet;
    },
    [user, classId, refresh],
  );

  const update = useCallback(
    async (id: string, input: UpdateHomeworkSetInput): Promise<HomeworkSet | null> => {
      if (!user) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase as any)
        .from("homework_sets")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (err) {
        console.error("[homework:sets:update] failed", { userId: user.id, id, error: err });
        return null;
      }
      await refresh();
      return data as HomeworkSet;
    },
    [user, refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any)
        .from("homework_sets")
        .delete()
        .eq("id", id);
      if (err) {
        console.error("[homework:sets:delete] failed", { userId: user.id, id, error: err });
        return false;
      }
      await refresh();
      return true;
    },
    [user, refresh],
  );

  return { sets, loading, error, refresh, create, update, remove };
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
    if (!user || !setId) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
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
