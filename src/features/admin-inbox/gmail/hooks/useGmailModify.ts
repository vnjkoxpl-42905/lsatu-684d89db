import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  batchModifyThreads,
  batchTrashThreads,
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
      const idSet = new Set(action.ids);

      // Cancel in-flight thread-list queries so they don't overwrite the patch.
      await qc.cancelQueries({ queryKey: ["gmail", "threads"] });

      const snapshots: Snapshot[] = [];
      const lists = qc.getQueriesData<ListThreadsResult>({ queryKey: ["gmail", "threads"] });
      for (const [key, data] of lists) {
        snapshots.push({ key, data });
        if (!data) continue;
        // Determine if this query is scoped to a folder the action removes the row from.
        const queryParams = key[2] as { labelIds?: GmailLabelId[] } | undefined;
        const scopedLabels = new Set(queryParams?.labelIds ?? []);
        const removesFromThisView =
          plan.removesFromInbox && scopedLabels.has(SYSTEM_LABELS.INBOX);

        const nextThreads = data.threads
          .map((t) => (idSet.has(t.id) ? applyPatchToSummary(t, plan) : t))
          .filter((t) => !(removesFromThisView && idSet.has(t.id)));

        qc.setQueryData<ListThreadsResult>(key, { ...data, threads: nextThreads });
      }
      return { snapshots };
    },
    onError: (err, action, ctx) => {
      for (const snap of ctx?.snapshots ?? []) {
        qc.setQueryData(snap.key, snap.data);
      }
      const msg = err instanceof Error ? err.message : "Action failed";
      toast.error(`Could not ${action.kind} ${action.ids.length > 1 ? "threads" : "thread"}`, {
        description: msg,
      });
    },
    onSettled: (_data, _err, action) => {
      qc.invalidateQueries({ queryKey: ["gmail", "threads"] });
      for (const id of action.ids) qc.invalidateQueries({ queryKey: gmailThreadQueryKey(id) });
    },
  });
}
