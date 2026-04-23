import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SessionStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export interface StudentSession {
  id: string;
  student_id: string;
  scheduled_at: string;
  status: SessionStatus;
  duration_minutes: number | null;
  transcript_id: string | null;
  notes: string | null;
  source: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Cast until Lovable regenerates src/integrations/supabase/types.ts.
const sessionsTable = () => (supabase as any).from("student_sessions");

export function useStudentSessions(studentId: string) {
  const qc = useQueryClient();
  const query = useQuery<StudentSession[]>({
    queryKey: ["student-sessions", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await sessionsTable()
        .select("*")
        .eq("student_id", studentId)
        .order("scheduled_at", { ascending: false });
      if (error) {
        console.error("[useStudentSessions] fetch failed:", error);
        throw error;
      }
      return (data ?? []) as StudentSession[];
    },
  });

  // Realtime: defensive symmetry with useStudentContext. Sessions are
  // mutated far less often, but cross-tab freshness is free.
  useEffect(() => {
    if (!studentId) return;
    const channel = supabase
      .channel(`student-sessions-${studentId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_sessions",
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["student-sessions", studentId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, qc]);

  return query;
}

export interface LogSessionInput {
  studentId: string;
  scheduledAt: string;
  status?: SessionStatus;
  durationMinutes?: number | null;
  transcriptId?: string | null;
  notes?: string | null;
  source?: string | null;
}

export function useLogStudentSession() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LogSessionInput) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await sessionsTable()
        .insert({
          student_id: input.studentId,
          scheduled_at: input.scheduledAt,
          status: input.status ?? "completed",
          duration_minutes: input.durationMinutes ?? null,
          transcript_id: input.transcriptId ?? null,
          notes: input.notes ?? null,
          source: input.source ?? "manual",
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["student-sessions", vars.studentId] });
    },
  });
}

export function useDeleteStudentSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: Pick<StudentSession, "id" | "student_id">) => {
      const { error } = await sessionsTable().delete().eq("id", session.id);
      if (error) throw error;
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["student-sessions", vars.student_id] });
    },
  });
}
