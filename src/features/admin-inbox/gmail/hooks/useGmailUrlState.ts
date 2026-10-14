import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { GmailCategory, GmailFolder } from "../api";

const VALID_FOLDERS: readonly GmailFolder[] = [
  "INBOX", "STARRED", "SNOOZED", "SENT", "DRAFT", "ALL", "SPAM", "TRASH",
];
const VALID_CATEGORIES: readonly GmailCategory[] = ["primary", "social", "promotions", "updates"];

export interface GmailUrlState {
  folder: GmailFolder;
  category: GmailCategory | null;
  query: string;
  threadId: string | null;
}

export interface GmailUrlStateActions {
  setFolder: (f: GmailFolder) => void;
  setCategory: (c: GmailCategory | null) => void;
  setQuery: (q: string) => void;
  openThread: (id: string | null) => void;
  /** Push a fresh state — used by sidebar clicks that should clear thread + search. */
  navigateTo: (next: Partial<GmailUrlState>) => void;
}

export function useGmailUrlState(): [GmailUrlState, GmailUrlStateActions] {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo<GmailUrlState>(() => {
    const rawFolder = searchParams.get("label") ?? "INBOX";
    const folder = (VALID_FOLDERS as readonly string[]).includes(rawFolder)
      ? (rawFolder as GmailFolder)
      : "INBOX";
    const rawCat = searchParams.get("cat");
    const category = rawCat && (VALID_CATEGORIES as readonly string[]).includes(rawCat)
      ? (rawCat as GmailCategory)
      : null;
    return {
      folder,
      category,
      query: searchParams.get("q") ?? "",
      threadId: searchParams.get("t"),
    };
  }, [searchParams]);

  const mutate = useCallback((mutator: (next: URLSearchParams) => void) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      mutator(next);
      return next;
    });
  }, [setSearchParams]);

  const setFolder: GmailUrlStateActions["setFolder"] = useCallback((f) => {
    mutate((next) => {
      if (f === "INBOX") next.delete("label");
      else next.set("label", f);
      next.delete("t");
      if (f !== "INBOX") next.delete("cat");
    });
  }, [mutate]);

  const setCategory: GmailUrlStateActions["setCategory"] = useCallback((c) => {
    mutate((next) => {
      if (!c || c === "primary") next.delete("cat");
      else next.set("cat", c);
      next.delete("t");
    });
  }, [mutate]);

  const setQuery: GmailUrlStateActions["setQuery"] = useCallback((q) => {
    mutate((next) => {
      if (q) next.set("q", q);
      else next.delete("q");
      next.delete("t");
    });
  }, [mutate]);

  const openThread: GmailUrlStateActions["openThread"] = useCallback((id) => {
    mutate((next) => {
      if (id) next.set("t", id);
      else next.delete("t");
    });
  }, [mutate]);

  const navigateTo: GmailUrlStateActions["navigateTo"] = useCallback((nextState) => {
    mutate((next) => {
      if (nextState.folder !== undefined) {
        if (nextState.folder === "INBOX") next.delete("label");
        else next.set("label", nextState.folder);
      }
      if (nextState.category !== undefined) {
        if (!nextState.category || nextState.category === "primary") next.delete("cat");
        else next.set("cat", nextState.category);
      }
      if (nextState.query !== undefined) {
        if (nextState.query) next.set("q", nextState.query);
        else next.delete("q");
      }
      if (nextState.threadId !== undefined) {
        if (nextState.threadId) next.set("t", nextState.threadId);
        else next.delete("t");
      }
    });
  }, [mutate]);

  return [state, { setFolder, setCategory, setQuery, openThread, navigateTo }];
}

/** Map a sidebar folder to the Gmail label ids that should constrain the listThreads call. */
export function folderToLabelIds(folder: GmailFolder): string[] {
  switch (folder) {
    case "INBOX": return ["INBOX"];
    case "STARRED": return ["STARRED"];
    case "SNOOZED": return ["SNOOZED"];
    case "SENT": return ["SENT"];
    case "DRAFT": return ["DRAFT"];
    case "SPAM": return ["SPAM"];
    case "TRASH": return ["TRASH"];
    case "ALL": return []; // All Mail = no label constraint.
  }
}

export function categoryToLabelId(category: GmailCategory | null): string | null {
  switch (category) {
    case "primary": return "CATEGORY_PERSONAL";
    case "social": return "CATEGORY_SOCIAL";
    case "promotions": return "CATEGORY_PROMOTIONS";
    case "updates": return "CATEGORY_UPDATES";
    default: return null;
  }
}
