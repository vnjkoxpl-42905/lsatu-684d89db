import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { extractEdgeFunctionError } from "@/lib/edgeFunctionError";
import {
  executeActionProposal,
  isActionProposal,
  type ActionProposal,
  type Proposal,
} from "@/lib/agentActions";

export interface DraftPayload {
  title: string;
  content_html: string;
  asset_ids: string[];
}

export interface TAInteraction {
  id: string;
  student_id: string | null;
  role: "admin" | "assistant";
  message: string;
  draft_content: DraftPayload | null;
  draft_status: "pending" | "approved" | "rejected" | null;
  action_proposal: Proposal | null;
  action_status: "pending" | "confirmed" | "cancelled" | "failed" | null;
  asset_ids: string[];
  created_by: string | null;
  created_at: string;
}

interface SendResult {
  content: string;
  action_proposal?: Proposal | null;
  draft?: DraftPayload | null;
  interaction_id: string;
}

export type TABackend = "ta-chat" | "ta-agent";

// Sentinel key for the global (no student selected) agent thread.
const GLOBAL_KEY = "__global__";

/**
 * @param studentId  null only in agent mode (global thread).
 * @param backend    "ta-chat" (default) preserves the per-student draft + /prep
 *                   workflow. "ta-agent" enables the action agent (corner chat).
 */
export function useTAChat(studentId: string | null, backend: TABackend = "ta-chat") {
  const qc = useQueryClient();
  const { user } = useAuth();
  const threadKey = studentId ?? GLOBAL_KEY;
  const queryKey = ["ta-interactions", threadKey] as const;

  const {
    data: interactions = [],
    isLoading,
    error,
  } = useQuery<TAInteraction[]>({
    queryKey,
    queryFn: async () => {
      let q = supabase
        .from("ta_interactions")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      q = studentId ? q.eq("student_id", studentId) : q.is("student_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as TAInteraction[];
    },
  });

  // Realtime: INSERT/UPDATE on this thread's interactions reconcile the cache.
  // The global thread (student_id IS NULL) can't be server-filtered, so it
  // listens broadly and filters client-side before invalidating.
  useEffect(() => {
    const channel = supabase
      .channel(`ta-chat-${threadKey}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        studentId
          ? {
              event: "*",
              schema: "public",
              table: "ta_interactions",
              filter: `student_id=eq.${studentId}`,
            }
          : { event: "*", schema: "public", table: "ta_interactions" },
        (payload) => {
          if (!studentId) {
            const row = (payload.new ?? payload.old) as { student_id?: string | null } | null;
            if (row && row.student_id != null) return; // not the global thread
          }
          qc.invalidateQueries({ queryKey });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // queryKey is derived from threadKey — the deps warning is spurious.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, threadKey, qc]);

  const send = useMutation<SendResult, Error, string>({
    mutationFn: async (message: string) => {
      if (backend === "ta-chat" && !studentId) {
        throw new Error("Select a student first");
      }
      const { data, error } = await supabase.functions.invoke(backend, {
        body: { student_id: studentId, message },
      });
      if (error) {
        // supabase-js wraps a non-2xx response as FunctionsHttpError whose
        // message is the generic "Edge Function returned a non-2xx status
        // code". The real backend error ({ error: "..." }) lives in the
        // Response on error.context — read it so the chat shows, e.g.,
        // "GEMINI_API_KEY not configured" or Gemini's actual error.
        const real = await extractEdgeFunctionError(error);
        throw new Error(real ?? error.message);
      }
      if ((data as { error?: string })?.error) {
        throw new Error((data as { error: string }).error);
      }
      return data as SendResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  // Confirm a pending action: run the real mutation, then mark the interaction
  // confirmed. On failure mark it failed and rethrow so the UI can toast.
  const confirmAction = useMutation<
    { summary: string },
    Error,
    { interactionId: string; proposal: ActionProposal }
  >({
    mutationFn: async ({ interactionId, proposal }) => {
      if (!user) throw new Error("Not signed in");
      if (!isActionProposal(proposal)) throw new Error("Not an action proposal");
      try {
        const res = await executeActionProposal(proposal, user.id);
        await supabase
          .from("ta_interactions")
          .update({ action_status: "confirmed" })
          .eq("id", interactionId);
        return { summary: res.summary };
      } catch (e) {
        await supabase
          .from("ta_interactions")
          .update({ action_status: "failed" })
          .eq("id", interactionId);
        throw e instanceof Error ? e : new Error("Action failed");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const cancelAction = useMutation<void, Error, string>({
    mutationFn: async (interactionId: string) => {
      const { error } = await supabase
        .from("ta_interactions")
        .update({ action_status: "cancelled" })
        .eq("id", interactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  // Wipe this thread entirely (the /clear command).
  const clearThread = useMutation<void, Error, void>({
    mutationFn: async () => {
      let q = supabase.from("ta_interactions").delete();
      q = studentId ? q.eq("student_id", studentId) : q.is("student_id", null);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.setQueryData(queryKey, []);
      qc.invalidateQueries({ queryKey });
    },
  });

  return { interactions, isLoading, error, send, confirmAction, cancelAction, clearThread };
}
