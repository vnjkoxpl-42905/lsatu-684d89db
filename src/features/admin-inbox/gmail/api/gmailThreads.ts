import { invokeGmail } from "./gmailClient";
import type {
  BatchModifyParams,
  GmailThreadFull,
  ListThreadsParams,
  ListThreadsResult,
  ModifyThreadParams,
} from "./types";

export function listThreads(params: ListThreadsParams = {}): Promise<ListThreadsResult> {
  return invokeGmail<ListThreadsResult & { ok: true }>({
    action: "listThreads",
    q: params.q,
    labelIds: params.labelIds,
    maxResults: params.maxResults,
    pageToken: params.pageToken,
  }).then((r) => ({ threads: r.threads, nextPageToken: r.nextPageToken }));
}

export function getThread(id: string, opts?: { markRead?: boolean }): Promise<GmailThreadFull> {
  return invokeGmail<GmailThreadFull & { ok: true }>({
    action: "getThread",
    id,
    markRead: opts?.markRead ?? true,
  }).then((r) => ({ threadId: r.threadId, historyId: r.historyId, messages: r.messages }));
}

export function modifyThread(params: ModifyThreadParams): Promise<void> {
  return invokeGmail<{ ok: true }>({
    action: "modifyThread",
    id: params.id,
    addLabelIds: params.addLabelIds ?? [],
    removeLabelIds: params.removeLabelIds ?? [],
  }).then(() => undefined);
}

export function trashThread(id: string): Promise<void> {
  return invokeGmail<{ ok: true }>({ action: "trashThread", id }).then(() => undefined);
}

export function untrashThread(id: string): Promise<void> {
  return invokeGmail<{ ok: true }>({ action: "untrashThread", id }).then(() => undefined);
}

export function batchModifyThreads(params: BatchModifyParams): Promise<void> {
  return invokeGmail<{ ok: true }>({
    action: "batchModify",
    ids: params.ids,
    addLabelIds: params.addLabelIds ?? [],
    removeLabelIds: params.removeLabelIds ?? [],
  }).then(() => undefined);
}

export function batchTrashThreads(ids: string[]): Promise<void> {
  return invokeGmail<{ ok: true }>({ action: "batchTrash", ids }).then(() => undefined);
}
