import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  batchModifyThreads,
  batchTrashThreads,
  GmailApiError,
  modifyThread,
  SYSTEM_LABELS,
  trashThread,
  untrashThread,
} from "../api";
import type { GmailLabelId, GmailThreadSummary, ListThreadsResult } from "../api";
import { gmailThreadQueryKey } from "./useGmailThread";

export type ModifyAction =
  | { kind: "star" | "unstar"; ids: string[] }
  | { kind: "markRead" | "markUnread"; ids: string[] }
  | { kind: "archive" | "untrash"; ids: string[] }
  | { kind: "trash"; ids: string[] }
  | { kind: "addLabel" | "removeLabel"; ids: string[]; labelId: GmailLabelId };

interface PatchPlan {
  addLabelIds: GmailLabelId[];
  removeLabelIds: GmailLabelId[];
  /** When true, the row should be removed from inbox listings (archive / trash). */
  removesFromInbox?: boolean;
}

function planFor(action: ModifyAction): PatchPlan {
  switch (action.kind) {
    case "star":
      return { addLabelIds: [SYSTEM_LABELS.STARRED], removeLabelIds: [] };
    case "unstar":
      return { addLabelIds: [], removeLabelIds: [SYSTEM_LABELS.STARRED] };
    case "markRead":
      return { addLabelIds: [], removeLabelIds: [SYSTEM_LABELS.UNREAD] };
    case "markUnread":
      return { addLabelIds: [SYSTEM_LABELS.UNREAD], removeLabelIds: [] };
    case "archive":
      return { addLabelIds: [], removeLabelIds: [SYSTEM_LABELS.INBOX], removesFromInbox: true };
    case "untrash":
      return { addLabelIds: [SYSTEM_LABELS.INBOX], removeLabelIds: [SYSTEM_LABELS.TRASH] };
    case "trash":
      // Trash is its own endpoint, but reflect the label flip in the cache patch.
      return { addLabelIds: [SYSTEM_LABELS.TRASH], removeLabelIds: [SYSTEM_LABELS.INBOX], removesFromInbox: true };
    case "addLabel":
      return { addLabelIds: [action.labelId], removeLabelIds: [] };
    case "removeLabel":
      return { addLabelIds: [], removeLabelIds: [action.labelId] };
  }
}

function applyPatchToSummary(t: GmailThreadSummary, plan: PatchPlan): GmailThreadSummary {
  const next = new Set(t.labelIds);
  for (const lid of plan.removeLabelIds) next.delete(lid);
  for (const lid of plan.addLabelIds) next.add(lid);
  return {
    ...t,
    labelIds: Array.from(next),
    starred: next.has(SYSTEM_LABELS.STARRED),
    unread: next.has(SYSTEM_LABELS.UNREAD),
  };
}

interface Snapshot {
  key: QueryKey;
  data: ListThreadsResult | undefined;
}

/**
 * Apply a label patch to every cached thread list, dropping rows the action
 * removes from the view they're listed in. Shared by the optimistic write and by
 * the partial-failure path, which re-applies it for just the ids that succeeded.
 */
function patchThreadLists(
  qc: ReturnType<typeof useQueryClient>,
  ids: Iterable<string>,
  plan: PatchPlan,
) {
  const idSet = new Set(ids);
  if (idSet.size === 0) return;
  for (const [key, data] of qc.getQueriesData<ListThreadsResult>({ queryKey: ["gmail", "threads"] })) {
    if (!data) continue;
    const queryParams = key[2] as { labelIds?: GmailLabelId[] } | undefined;
    const scopedLabels = new Set(queryParams?.labelIds ?? []);
    const removesFromThisView = plan.removesFromInbox && scopedLabels.has(SYSTEM_LABELS.INBOX);

    const nextThreads = data.threads
      .map((t) => (idSet.has(t.id) ? applyPatchToSummary(t, plan) : t))
      .filter((t) => !(removesFromThisView && idSet.has(t.id)));

    qc.setQueryData<ListThreadsResult>(key, { ...data, threads: nextThreads });
  }
}

export function useGmailModify() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (action: ModifyAction) => {
      const plan = planFor(action);
      if (action.kind === "trash") {
        if (action.ids.length === 1) return trashThread(action.ids[0]);
        return batchTrashThreads(action.ids);
      }
      if (action.kind === "untrash") {
        // Untrash is per-thread; loop in parallel.
        await Promise.all(action.ids.map((id) => untrashThread(id)));
        // Also ensure INBOX is reapplied.
        await batchModifyThreads({
          ids: action.ids,
          addLabelIds: plan.addLabelIds,
          removeLabelIds: plan.removeLabelIds,
        });
        return;
      }
      if (action.ids.length === 1) {
        return modifyThread({
          id: action.ids[0],
          addLabelIds: plan.addLabelIds,
          removeLabelIds: plan.removeLabelIds,
        });
      }
      return batchModifyThreads({
        ids: action.ids,
        addLabelIds: plan.addLabelIds,
        removeLabelIds: plan.removeLabelIds,
      });
    },
    onMutate: async (action) => {
      const plan = planFor(action);

      // Cancel in-flight thread-list queries so they don't overwrite the patch.
      await qc.cancelQueries({ queryKey: ["gmail", "threads"] });

      const snapshots: Snapshot[] = [];
      for (const [key, data] of qc.getQueriesData<ListThreadsResult>({ queryKey: ["gmail", "threads"] })) {
        snapshots.push({ key, data });
      }
      patchThreadLists(qc, action.ids, plan);
      return { snapshots };
    },
    onError: (err, action, ctx) => {
      // Per-id failure isolation: the edge function reports each thread's outcome,
      // so a batch where 8 of 10 archived should leave those 8 archived. Roll the
      // cache back to the pre-mutation snapshot, then re-apply the patch for only
      // the ids that actually succeeded. Without per-id results (a transport-level
      // failure, where nothing is known to have landed) the rollback stands.
      for (const snap of ctx?.snapshots ?? []) {
        qc.setQueryData(snap.key, snap.data);
      }
      const results = err instanceof GmailApiError ? err.results : undefined;
      const failures = results?.filter((r) => !r.ok) ?? [];
      const succeeded = results?.filter((r) => r.ok).map((r) => r.id) ?? [];
      if (succeeded.length) {
        patchThreadLists(qc, succeeded, planFor(action));
      }

      const baseMsg = err instanceof Error ? err.message : "Action failed";
      const description = failures.length
        ? `${failures.length} of ${action.ids.length} failed${succeeded.length ? ` (${succeeded.length} went through)` : ""}:\n${failures
            .map((f) => `• ${f.id}: ${f.error ?? "unknown error"}`)
            .join("\n")}`
        : baseMsg;
      toast.error(`Could not ${action.kind} ${action.ids.length > 1 ? "threads" : "thread"}`, {
        description,
      });
    },
    onSettled: (_data, _err, action) => {
      qc.invalidateQueries({ queryKey: ["gmail", "threads"] });
      for (const id of action.ids) qc.invalidateQueries({ queryKey: gmailThreadQueryKey(id) });
    },
  });
}
