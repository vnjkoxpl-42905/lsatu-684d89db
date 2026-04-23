import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DraftPayload {
  title: string;
  content_html: string;
  asset_ids: string[];
}

export interface TAInteraction {
  id: string;
  student_id: string;
  role: "admin" | "assistant";
  message: string;
  draft_content: DraftPayload | null;
  draft_status: "pending" | "approved" | "rejected" | null;
  asset_ids: string[];
  created_by: string | null;
  created_at: string;
}

interface SendResult {
  content: string;
  draft: DraftPayload | null;
  interaction_id: string;
  parse_error?: "malformed_draft";
}

export function useTAChat(studentId: string | null) {
  const qc = useQueryClient();
  const queryKey = ["ta-interactions", studentId] as const;

  const {
    data: interactions = [],
    isLoading,
    error,
  } = useQuery<TAInteraction[]>({
    queryKey,
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await (supabase as any)
        .from("ta_interactions")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TAInteraction[];
    },
  });

  // Realtime: INSERT events on this student's interactions. Both /admin/ta and
  // the Foyer widget subscribe so edits in one surface reconcile the other.
  useEffect(() => {
    if (!studentId) return;
    const channel = supabase
      .channel(
        `ta-chat-${studentId}-${Math.random().toString(36).slice(2)}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ta_interactions",
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ta_interactions",
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // queryKey is derived from studentId — the eslint deps warning is spurious.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, qc]);

  const send = useMutation<SendResult, Error, string>({
    mutationFn: async (message: string) => {
      if (!studentId) throw new Error("Select a student first");
      const { data, error } = await supabase.functions.invoke("ta-chat", {
        body: { student_id: studentId, message },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) {
        throw new Error((data as { error: string }).error);
      }
      return data as SendResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  return { interactions, isLoading, error, send };
}
