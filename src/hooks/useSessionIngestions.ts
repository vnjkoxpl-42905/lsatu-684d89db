import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Phase 1B — session-ingestion ledger reads + scan/resolve/discard actions.
// All actions run through the admin-only `scan-session-notes` edge function;
// reads go straight at the (admin-RLS) table.

export type SessionIngestion = Tables<"session_ingestions">;

const QUERY_KEY = ["session-ingestions"];

/** Open resolution-queue items (needs_match) plus recent activity. */
export function useSessionIngestions() {
  return useQuery<SessionIngestion[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_ingestions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error("[useSessionIngestions] fetch failed:", error);
        throw error;
      }
      return (data ?? []) as SessionIngestion[];
    },
  });
}

interface ScanResult {
  ok: boolean;
  scanned: number;
  queued: number;
  skipped_existing: number;
  skipped_no_doc: number;
  error?: string;
}

export function useScanSessionNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opts?: { q?: string; max?: number }) => {
      const { data, error } = await supabase.functions.invoke<ScanResult>(
        "scan-session-notes",
        { body: { action: "scan", ...opts } },
      );
      if (error) throw error;
      if (data && !data.ok) throw new Error(data.error || "Scan failed");
      return data as ScanResult;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useResolveIngestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { ledgerId: string; studentClassId: string }) => {
      const { data, error } = await supabase.functions.invoke(
        "scan-session-notes",
        { body: { action: "resolve", ledger_id: args.ledgerId, student_class_id: args.studentClassId } },
      );
      if (error) throw error;
      if (data && !data.ok) throw new Error(data.error || data.reason || "Resolve failed");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDiscardIngestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { ledgerId: string; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke(
        "scan-session-notes",
        { body: { action: "discard", ledger_id: args.ledgerId, discard_reason: args.reason } },
      );
      if (error) throw error;
      if (data && !data.ok) throw new Error(data.error || "Discard failed");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
