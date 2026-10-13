// Data layer for the top-level /memory admin route. Talks to the `memory-admin`
// Edge Function (admin-verified, service-role) and exposes typed list/audit reads
// plus the mutation actions. Mirrors the AdminDashboard pattern: plain state +
// useCallback, no generated DB types needed because everything flows through the
// function's JSON contract.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MemoryKind = "semantic" | "procedural";
export type MemoryStatus = "active" | "archived" | "superseded" | "proposed" | "rejected";
export type MemoryOwnerType = "operator" | "student" | "activity" | "global";
export type MemoryReviewState = "clean" | "conflict" | "needs_review" | "approved" | "rejected";

export interface MemoryNamespaceRef {
  owner_type: MemoryOwnerType;
  owner_id: string | null;
  label: string | null;
}

export interface MemoryItem {
  id: string;
  namespace_id: string;
  kind: MemoryKind;
  title: string;
  content: string;
  tags: string[];
  structured: Record<string, unknown> | null;
  source: string | null;
  source_authority: string;
  subject_user_id: string | null;
  visibility: string;
  claim_key: string | null;
  supersedes: string | null;
  review_state: MemoryReviewState;
  needs_review: boolean;
  confidence: number;
  importance: number;
  use_count: number;
  success_count: number;
  last_used_at: string | null;
  pinned: boolean;
  status: MemoryStatus;
  created_at: string;
  updated_at: string;
  memory_namespaces: MemoryNamespaceRef | null;
}

export interface MemoryCounts {
  active: number;
  pinned: number;
  needs_review: number;
  proposed: number;
}

export interface MemoryAuditRow {
  id: string;
  memory_id: string | null;
  namespace_id: string | null;
  action: string;
  detail: Record<string, unknown>;
  actor: string | null;
  created_at: string;
}

export interface MemoryFilters {
  owner_type?: MemoryOwnerType;
  kind?: MemoryKind;
  status?: MemoryStatus | "all";
  review?: "needs";
  q?: string;
}

interface ListResponse {
  items?: MemoryItem[];
  counts?: MemoryCounts;
  error?: string;
}
interface AuditResponse {
  audit?: MemoryAuditRow[];
  error?: string;
}
interface MutationResponse {
  success?: boolean;
  error?: string;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("memory-admin", { body });
  if (error) throw error;
  const payload = (data ?? {}) as T & { error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload;
}

export function useMemoryAdmin() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [counts, setCounts] = useState<MemoryCounts>({ active: 0, pinned: 0, needs_review: 0, proposed: 0 });
  const [audit, setAudit] = useState<MemoryAuditRow[]>([]);
  const [filters, setFilters] = useState<MemoryFilters>({ status: "active" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (next?: MemoryFilters) => {
    const active = next ?? filters;
    setLoading(true);
    setError(null);
    try {
      const [list, auditRes] = await Promise.all([
        invoke<ListResponse>({ action: "list", ...active }),
        invoke<AuditResponse>({ action: "audit" }),
      ]);
      setItems(list.items ?? []);
      setCounts(list.counts ?? { active: 0, pinned: 0, needs_review: 0, proposed: 0 });
      setAudit(auditRes.audit ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load memory");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void refresh(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const mutate = useCallback(async (body: Record<string, unknown>) => {
    await invoke<MutationResponse>(body);
    await refresh();
  }, [refresh]);

  const editMemory = useCallback(
    (id: string, fields: { title?: string; content?: string; tags?: string[]; importance?: number }) =>
      mutate({ action: "edit", id, ...fields }),
    [mutate],
  );
  const setPinned = useCallback((id: string, value: boolean) => mutate({ action: "pin", id, value }), [mutate]);
  const archiveMemory = useCallback((id: string) => mutate({ action: "archive", id }), [mutate]);
  const restoreMemory = useCallback((id: string) => mutate({ action: "restore", id }), [mutate]);
  const forgetMemory = useCallback((id: string) => mutate({ action: "forget", id }), [mutate]);
  const resolveConflict = useCallback(
    (id: string, decision: "approved" | "rejected") => mutate({ action: "resolve_conflict", id, decision }),
    [mutate],
  );
  const approveSkill = useCallback((id: string) => mutate({ action: "approve_skill", id }), [mutate]);

  return {
    items,
    counts,
    audit,
    filters,
    setFilters,
    loading,
    error,
    refresh,
    editMemory,
    setPinned,
    archiveMemory,
    restoreMemory,
    forgetMemory,
    resolveConflict,
    approveSkill,
  };
}
