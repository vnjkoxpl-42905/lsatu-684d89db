import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { invokeGmail, listHistory } from "../api";
import type { GmailProfile } from "./useGmailProfile";

/**
 * The Pull model (spec D5/D11).
 *
 * Gmail sync is an explicit user action, never background polling. This hook owns
 * the whole cursor lifecycle:
 *
 *   first pull  → read the mailbox's current historyId from the profile, store it,
 *                 and refetch the lists (the seed; nothing to diff against yet)
 *   later pulls → ask Gmail what changed since the stored cursor (mailbox-wide, so
 *                 inbox/sent/archive/labels are all covered), report how many
 *                 threads gained a message, store the new cursor, refetch
 *   expired     → the cursor fell out of Gmail's retention window; reseed silently
 *                 and fall back to a full refetch
 *
 * The cursor and last-pull time are persisted per user in localStorage. They are
 * not secrets (a historyId is an opaque mailbox revision number, useless without
 * the connector credentials that live in the edge function), and keeping them out
 * of the database means the Pull button works without a migration landing first.
 * The cost is that the cursor is per-browser: a pull from a second machine reseeds
 * rather than deltas, which is correct, just less efficient.
 */

export interface GmailPullState {
  /** Wall-clock of the last successful pull, or null if never pulled here. */
  lastPulledAt: string | null;
  /** Threads that gained a message on the most recent pull. Null before any delta. */
  newCount: number | null;
  isPulling: boolean;
  error: string | null;
  pull: () => Promise<void>;
}

interface StoredState {
  historyId: string | null;
  lastPulledAt: string | null;
}

const EMPTY: StoredState = { historyId: null, lastPulledAt: null };

export function gmailPullStorageKey(userId: string) {
  return `lsatu.gmail.pull.${userId}`;
}

function readStored(userId: string | null): StoredState {
  if (!userId || typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(gmailPullStorageKey(userId));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      historyId: typeof parsed.historyId === "string" ? parsed.historyId : null,
      lastPulledAt: typeof parsed.lastPulledAt === "string" ? parsed.lastPulledAt : null,
    };
  } catch {
    return EMPTY;
  }
}

function writeStored(userId: string | null, next: StoredState) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(gmailPullStorageKey(userId), JSON.stringify(next));
  } catch {
    /* storage full or blocked — the pull still worked, it just won't delta next time */
  }
}

/** The mailbox's current revision, read straight through so the cursor is never stale. */
async function currentHistoryId(): Promise<string | null> {
  const r = await invokeGmail<{ ok: true; profile: GmailProfile }>({ action: "profile" });
  return r.profile?.historyId ?? null;
}

export function useGmailPull(userId: string | null): GmailPullState {
  const qc = useQueryClient();
  const [stored, setStored] = useState<StoredState>(() => readStored(userId));
  const [newCount, setNewCount] = useState<number | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signing in as a different admin must not inherit the previous cursor.
  useEffect(() => {
    setStored(readStored(userId));
    setNewCount(null);
  }, [userId]);

  const pull = useCallback(async () => {
    if (isPulling) return;
    setIsPulling(true);
    setError(null);
    try {
      let added: number | null = null;
      let nextHistoryId = stored.historyId;

      if (stored.historyId) {
        const delta = await listHistory(stored.historyId);
        if (delta.expired) {
          nextHistoryId = await currentHistoryId();
        } else {
          added = delta.addedThreadIds.length;
          nextHistoryId = delta.historyId ?? stored.historyId;
        }
      } else {
        nextHistoryId = await currentHistoryId();
      }

      // Whatever the delta said, the lists themselves come from Gmail — refetch
      // rather than trying to patch rows in from history ids we have no metadata for.
      await qc.invalidateQueries({ queryKey: ["gmail", "threads"] });
      await qc.invalidateQueries({ queryKey: ["gmail", "labels"] });

      const next: StoredState = {
        historyId: nextHistoryId,
        lastPulledAt: new Date().toISOString(),
      };
      setStored(next);
      writeStored(userId, next);
      setNewCount(added);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Pull failed";
      setError(message);
      toast.error("Could not pull mail", { description: message });
    } finally {
      setIsPulling(false);
    }
  }, [isPulling, qc, stored.historyId, userId]);

  return {
    lastPulledAt: stored.lastPulledAt,
    newCount,
    isPulling,
    error,
    pull,
  };
}
