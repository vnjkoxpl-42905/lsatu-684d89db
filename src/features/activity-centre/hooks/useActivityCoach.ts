import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ActivityItem, CoachVerdict } from "../api/types";
import { replaceRevisionCoachRequest, retainCoachRequest, type CoachSource } from "./activityCoachRequest";
export interface JudgeArgs { item: ActivityItem; studentResponse: string; attemptNo: number; source?: CoachSource }
export interface JudgeResult { ok: boolean; verdict?: CoachVerdict; error?: string; discarded?: boolean }
const COACH_TIMEOUT_MS = 12_000;
async function permitsRevisionRecovery(error: unknown): Promise<boolean> {
  // Supabase puts non-2xx replies in FunctionsHttpError.context, not data.
  // Never infer retry permission from an error message or transport failure.
  const context = (error as { context?: unknown } | null)?.context;
  if (!(context instanceof Response) || context.status !== 409) return false;
  try { return (await context.clone().json())?.code === "grader_revision_changed"; }
  catch { return false; }
}
export function useActivityCoach() {
  const { user } = useAuth();
  const actor = user?.id;
  const scope = useRef(actor); scope.current = actor;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [busyActor, setBusyActor] = useState<string | null>(null);
  const judge = useCallback(async ({ item, studentResponse, attemptNo, source }: JudgeArgs): Promise<JudgeResult> => {
    if (!actor || !source) return { ok: false, error: "This Activity grading source is unavailable." };
    const current = () => mounted.current && scope.current === actor;
    setBusyActor(actor);
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), COACH_TIMEOUT_MS);
    try {
      const auth = await supabase.auth.getUser();
      if (!current() || auth.error || auth.data.user?.id !== actor) return { ok: false, discarded: true, error: "The signed-in account changed." };
      let body;
      try { body = retainCoachRequest(actor, source, item.order, studentResponse, attemptNo); }
      catch { return { ok: false, error: "Could not retain this grading request on your device. No Coach call was made." }; }
      if (!current()) return { ok: false, discarded: true };
      let { data, error } = await supabase.functions.invoke("activity-coach", { signal: abort.signal, body });
      let after = await supabase.auth.getUser();
      if (!current() || after.error || after.data.user?.id !== actor) return { ok: false, discarded: true, error: "The signed-in account changed." };
      if (await permitsRevisionRecovery(error)) {
        // The declined request never reached the provider, and SQL explicitly
        // confirmed the old receipt terminal. Persist before one bounded retry.
        // Keep the same response and attempt number, including a valid attempt 2.
        if (!current() || abort.signal.aborted) return { ok: false, discarded: !current(), error: "Coach could not confirm this request." };
        try { body = replaceRevisionCoachRequest(actor, body); }
        catch { return { ok: false, error: "Could not retain the updated grading request. No retry was made." }; }
        if (!current()) return { ok: false, discarded: true };
        ({ data, error } = await supabase.functions.invoke("activity-coach", { signal: abort.signal, body }));
        after = await supabase.auth.getUser();
        if (!current() || after.error || after.data.user?.id !== actor) return { ok: false, discarded: true, error: "The signed-in account changed." };
      }
      if (error) return { ok: false, error: "Coach could not confirm this request. Its saved identity is kept for retry." };
      if (!data || !["correct", "partial", "incorrect"].includes(data.verdict) || typeof data.feedback !== "string" || !data.feedback.trim()) return { ok: false, error: "Coach returned no verified judgment." };
      const covered = Array.isArray(data.covered) ? data.covered.filter((n: unknown) => typeof n === "number" && Number.isFinite(n)) : undefined;
      return { ok: true, verdict: { verdict: data.verdict, feedback: data.feedback, covered } };
    } catch {
      if (!current()) return { ok: false, discarded: true };
      return { ok: false, error: abort.signal.aborted ? "Coach timed out. Its saved request identity is kept for retry." : "Coach unavailable. Its saved request identity is kept for retry." };
    } finally { clearTimeout(timeout); if (current()) setBusyActor(null); }
  }, [actor]);
  return { judge, judging: Boolean(actor && busyActor === actor) };
}
