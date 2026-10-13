import { invokeGmail } from "./gmailClient";

export interface GmailHistoryResult {
  /**
   * True when Gmail no longer holds history back to the supplied cursor (its
   * retention window is roughly a week). Not a failure — the caller reseeds
   * from the profile's current historyId and lists in full instead.
   */
  expired: boolean;
  /** The cursor to store for the next pull. Null only when `expired`. */
  historyId: string | null;
  /** Threads that gained a message since the cursor — the "N new" count. */
  addedThreadIds: string[];
  /** Threads touched in any way (new message, label flip, deletion). */
  changedThreadIds: string[];
}

export function listHistory(startHistoryId: string): Promise<GmailHistoryResult> {
  return invokeGmail<GmailHistoryResult & { ok: true }>({
    action: "history",
    startHistoryId,
  }).then((r) => ({
    expired: r.expired,
    historyId: r.historyId,
    addedThreadIds: r.addedThreadIds ?? [],
    changedThreadIds: r.changedThreadIds ?? [],
  }));
}
