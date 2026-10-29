import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  readPendingManualCreate,
  prepareManualCreate,
  confirmManualCreate,
  manualCreateWasRejected,
  type PendingManualCreate,
} from "./manualCreatePending";
import type { ManagedUser } from "@/lib/adminUsers";
import type {
  TeachingDesk,
  DeskRegion,
  ManualTask,
  DeskPage,
  ManualChange,
} from "./teachingDeskModel";
const rpc = (name: string, args?: Record<string, unknown>) =>
  (
    supabase.rpc as unknown as (
      n: string,
      a?: Record<string, unknown>,
    ) => Promise<{ data: any; error: any }>
  )(name, args);
export const deskKey = (actor: string | undefined, part: string) =>
  ["teacher-home:desk", actor, part] as const;
export async function readDeskRpc(
  name: string,
  args?: Record<string, unknown>,
) {
  const { data, error } = await rpc(name, args);
  if (error) throw error;
  if (name === "teacher_home_results" && !Array.isArray(data))
    throw new Error("Invalid results response");
  if (
    ["teacher_home_manual_tasks", "teacher_post_session_page"].includes(name) &&
    (!data || !Array.isArray(data.items) || !Number.isInteger(data.total))
  )
    throw new Error("Invalid task response");
  if (
    name === "teacher_home_payments" &&
    (!data || !Array.isArray(data.recent) || !Array.isArray(data.attention))
  )
    throw new Error("Invalid payments response");
  return data;
}
/** Setup envelopes are not successful provider data and may contain no list at all. */
export function decodeDeskProvider(action: "agenda" | "email", data: any) {
  if (!data || typeof data !== "object")
    throw new Error("Provider did not return data");
  if (data.setup_required === true && data.ok !== true) return data;
  if (data.ok !== true) throw new Error("Provider did not return data");
  if (action === "agenda" && !Array.isArray(data.events))
    throw new Error("Invalid primary calendar response");
  if (
    action === "email" &&
    (!Array.isArray(data.threads) ||
      !Number.isInteger(data.count) ||
      data.count < 0)
  )
    throw new Error("Invalid student email response");
  return data;
}

function useDeskQuery(
  actorId: string | undefined,
  enabled: boolean,
  part: string,
  fn: () => Promise<any>,
) {
  const attemptedAt = React.useRef(-Infinity);
  const provider = part === "agenda" || part === "email";
  return useQuery({
    queryKey: deskKey(actorId, part),
    enabled,
    queryFn: () => {
      attemptedAt.current = Date.now();
      return fn();
    },
    retry: false,
    staleTime: part === "agenda" || part === "email" ? 120_000 : 60_000,
    refetchOnWindowFocus: provider
      ? () => Date.now() - attemptedAt.current >= 120_000
      : true,
    refetchInterval: 120_000,
  });
}
export function useTeachingDesk(
  actorId: string | undefined,
  isAdmin: boolean,
): TeachingDesk {
  const client = useQueryClient();
  const [pendingState, setPendingState] = React.useState<{
    actorId: string;
    pending: PendingManualCreate | null;
    error?: string;
  } | null>(null);
  const retryAt = React.useRef(new Map<string, number>());
  const retryTimers = React.useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );
  const [retryBlocks, setRetryBlocks] = React.useState<Record<string, boolean>>(
    {},
  );
  const actor = React.useRef(actorId);
  actor.current = actorId;
  const enabled = !!actorId && isAdmin;
  React.useEffect(() => {
    if (!enabled) return;
    try {
      setPendingState({
        actorId: actorId!,
        pending: readPendingManualCreate(actorId!),
      });
    } catch (error) {
      setPendingState({
        actorId: actorId!,
        pending: null,
        error:
          error instanceof Error
            ? error.message
            : "Could not read the earlier task request.",
      });
    }
  }, [actorId, enabled]);
  React.useEffect(
    () => () => {
      retryTimers.current.forEach((timer) => clearTimeout(timer));
    },
    [],
  );

  const manual = useDeskQuery(actorId, enabled, "manual", () =>
    readDeskRpc("teacher_home_manual_tasks", {
      _handled: false,
      _cursor: null,
      _student_id: null,
    }),
  );
  const provider = async (action: "agenda" | "email") => {
    const { data, error } = await supabase.functions.invoke(
      "teacher-post-session-sync",
      { body: { action } },
    );
    if (error) throw error;
    return decodeDeskProvider(action, data);
  };
  const agenda = useDeskQuery(actorId, enabled, "agenda", () =>
    provider("agenda"),
  );
  const email = useDeskQuery(actorId, enabled, "email", () =>
    provider("email"),
  );
  const payments = useDeskQuery(actorId, enabled, "payments", () =>
    readDeskRpc("teacher_home_payments", { _cursor: null }),
  );
  const results = useDeskQuery(actorId, enabled, "results", () =>
    readDeskRpc("teacher_home_results"),
  );
  const access = useDeskQuery(actorId, enabled, "access", async () => {
    const { data, error } = await supabase.functions.invoke(
      "admin-manage-users",
      { method: "GET" },
    );
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid roster");
    return data.filter(
      (p: ManagedUser) => p.role !== "admin" && !p.archived_at,
    );
  });
  const region = <T>(
    q: any,
    part: string,
    transform: (data: any) => T = (d) => d,
  ): DeskRegion<T> => ({
    state: !enabled
      ? "setup"
      : q.data?.setup_required && !q.data?.threads?.length
        ? "setup"
        : q.data !== undefined
          ? "ready"
          : q.isError
            ? "error"
            : "loading",
    data:
      enabled &&
      q.data !== undefined &&
      !(q.data?.setup_required && !q.data?.threads?.length)
        ? transform(q.data)
        : undefined,
    stale: q.data !== undefined && q.isError,
    retryBlocked: !!retryBlocks[`${actorId}:${part}`] || q.isFetching,
    retry: () => {
      if (!enabled || actor.current !== actorId || q.isFetching) return;
      const key = `${actorId}:${part}`;
      const now = Date.now();
      if (now - (retryAt.current.get(key) ?? -Infinity) < 15_000) return;
      retryAt.current.set(key, now);
      setRetryBlocks((previous) => ({ ...previous, [key]: true }));
      const timer = setTimeout(() => {
        setRetryBlocks((previous) => ({ ...previous, [key]: false }));
        retryTimers.current.delete(key);
      }, 15_000);
      retryTimers.current.set(key, timer);
      void q.refetch({ cancelRefetch: false });
    },
  });
  React.useEffect(
    () => () => {
      if (actorId) {
        void client.cancelQueries({ queryKey: ["teacher-home:desk", actorId] });
        client.removeQueries({ queryKey: ["teacher-home:desk", actorId] });
      }
    },
    [actorId, client],
  );
  const guard = () => {
    if (!enabled || actor.current !== actorId)
      throw new Error("Sign in again before saving.");
  };
  const mutateManual = async (
    task: ManualTask | null,
    change: ManualChange,
  ) => {
    guard();
    const hadEarlierRequest = !task && !!readPendingManualCreate(actorId!);
    const pending = !task ? prepareManualCreate(actorId!, change) : null;
    if (pending && actor.current === actorId)
      setPendingState({ actorId: actorId!, pending });
    const operationKey = pending?.key ?? null;
    let saved: any;
    try {
      saved = await readDeskRpc("teacher_home_manual_update", {
        _operation_key: operationKey,
        _task_id: task?.id ?? null,
        _expected_revision: task?.revision ?? null,
        _action: change.action,
        _title: change.title ?? task?.title ?? null,
        _student_id:
          change.studentId === undefined
            ? (task?.student_id ?? null)
            : change.studentId,
        _blocker:
          change.blocker === undefined
            ? (task?.blocker ?? null)
            : change.blocker,
      });
    } catch (error) {
      // A rejection of this new request is different from an earlier unknown outcome.
      if (pending && !hadEarlierRequest && manualCreateWasRejected(error)) {
        confirmManualCreate(pending);
        if (actor.current === actorId)
          setPendingState({ actorId: actorId!, pending: null });
      }
      throw error;
    }
    if (!saved?.id || !Number.isInteger(saved.revision))
      throw new Error("Task save was not verified");
    if (pending) {
      confirmManualCreate(pending);
      if (actor.current === actorId)
        setPendingState({ actorId: actorId!, pending: null });
    }
    if (actor.current === actorId)
      await client.invalidateQueries({
        queryKey: deskKey(actorId, "manual"),
      });
  };
  return {
    actorId,
    manual: region(manual, "manual"),
    agenda: region(agenda, "agenda"),
    email: region(email, "email"),
    payments: region(payments, "payments", (d) => ({
      ...d,
      total: d.total ?? d.recent?.length ?? 0,
      attention_total: d.attention_count ?? 0,
    })),
    results: region(results, "results", (d) =>
      (Array.isArray(d) ? d : (d.items ?? [])).map((r: any) => ({
        ...r,
        title: `PT${r.pt} · ${r.section || r.mode || "Practice"}`,
        score: r.initial_total
          ? `${r.initial_score}/${r.initial_total}`
          : r.initial_score,
      })),
    ),
    access: region(access, "access"),
    mutateManual,
    pendingManual:
      enabled && pendingState?.actorId === actorId
        ? pendingState.pending?.change
        : undefined,
    pendingManualError:
      enabled && pendingState?.actorId === actorId
        ? pendingState.error
        : undefined,
    retryManualCreate: async () => {
      guard();
      const pending = readPendingManualCreate(actorId!);
      if (!pending) throw new Error("No earlier task request is waiting.");
      await mutateManual(null, pending.change);
    },
    loadManual: async (handled, cursor, studentId, kind) => {
      guard();
      return readDeskRpc("teacher_home_manual_tasks", {
        _handled: handled,
        _cursor: cursor,
        _student_id: studentId,
        _kind: kind ?? null,
      });
    },
    loadSessions: async (handled, cursor, studentId) => {
      guard();
      return readDeskRpc("teacher_post_session_page", {
        _handled: handled,
        _cursor: cursor,
        _student_id: studentId,
      });
    },
    refreshBooking: () => {
      if (!enabled || actor.current !== actorId) return;
      void client.invalidateQueries({ queryKey: deskKey(actorId, "agenda") });
      void client.invalidateQueries({ queryKey: deskKey(actorId, "access") });
      void client.invalidateQueries({ queryKey: ["student-booking", "info"] });
    },
    refreshAccess: () => {
      void client.invalidateQueries({ queryKey: deskKey(actorId, "access") });
    },
    classify: async (eventId, kind) => {
      guard();
      const event = agenda.data?.events?.find((e: any) => e.id === eventId);
      await readDeskRpc("teacher_home_label", {
        _event_id: eventId,
        _kind: kind,
        _expected_revision: event?.label_revision ?? 0,
      });
      if (actor.current === actorId)
        await Promise.all([
          client.invalidateQueries({ queryKey: deskKey(actorId, "agenda") }),
          client.invalidateQueries({ queryKey: deskKey(actorId, "manual") }),
        ]);
    },
  };
}
