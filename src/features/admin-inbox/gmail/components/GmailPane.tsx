// Top-level Gmail tab surface for the admin Inbox. Composes sidebar + thread list +
// reading pane + compose. Gating (is_admin) happens upstream in src/pages/Inbox.tsx;
// see the TODO there about migrating to a granular admin-inbox access flag.
import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useGmailContacts, useGmailLabels, useGmailModify, useGmailProfile, useGmailThread, useGmailThreads } from "../hooks";
import type { ModifyAction } from "../hooks";
import { categoryToLabelId, folderToLabelIds, useGmailUrlState } from "../hooks/useGmailUrlState";
import { SYSTEM_LABELS, type GmailCategory, type GmailLabel } from "../api";
import { GmailSidebar } from "./GmailSidebar";
import { GmailSearchBar } from "./GmailSearchBar";
import { GmailCategoryTabs } from "./GmailCategoryTabs";
import { GmailToolbar } from "./GmailToolbar";
import { GmailThreadList } from "./GmailThreadList";
import { GmailReadingPane } from "./GmailReadingPane";
import { GmailCompose } from "./GmailCompose";

export function GmailPane() {
  const [{ folder, category, query, threadId }, urlActions] = useGmailUrlState();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [userLabelId, setUserLabelId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const labelsQuery = useGmailLabels();
  const profileQuery = useGmailProfile();
  const contactsQuery = useGmailContacts({ enabled: true });
  const adminEmail = profileQuery.data?.emailAddress ?? null;

  const labelsList = useMemo(() => labelsQuery.data ?? [], [labelsQuery.data]);
  const labelsById = useMemo(() => {
    const m = new Map<string, GmailLabel>();
    for (const l of labelsList) m.set(l.id, l);
    return m;
  }, [labelsList]);

  const folderLabelIds = useMemo(() => folderToLabelIds(folder), [folder]);
  const categoryLabelId = useMemo(() => categoryToLabelId(category ?? "primary"), [category]);
  const effectiveLabelIds = useMemo(() => {
    const base = userLabelId ? [userLabelId] : [...folderLabelIds];
    return base;
  }, [folderLabelIds, userLabelId]);

  // Inbox category constraint only applies in INBOX, when no user label is overriding.
  const categoryLabelIds = folder === "INBOX" && !userLabelId && category
    ? [categoryLabelId as string]
    : [];

  const threadsQuery = useGmailThreads({
    labelIds: effectiveLabelIds,
    categoryLabelIds,
    q: query,
    maxResults: 50,
  });

  const threads = useMemo(() => threadsQuery.data?.threads ?? [], [threadsQuery.data]);

  const threadQuery = useGmailThread(threadId, { markRead: true });
  const messages = useMemo(() => threadQuery.data?.messages ?? [], [threadQuery.data]);
  const threadLabelIds = useMemo(() => {
    const set = new Set<string>();
    for (const m of messages) for (const lid of m.labelIds) set.add(lid);
    return Array.from(set);
  }, [messages]);

  const modify = useGmailModify();

  const fireModify = useCallback((action: ModifyAction) => {
    modify.mutate(action);
  }, [modify]);

  // Selection helpers --------------------------------------------------------
  const visibleIds = useMemo(() => threads.map((t) => t.id), [threads]);
  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);
  const toggleAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(visibleIds) : new Set());
  }, [visibleIds]);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Folder + category + label navigation ------------------------------------
  const handleFolderChange = useCallback((next: typeof folder) => {
    clearSelection();
    // A user label overrides the folder in `effectiveLabelIds`, so leaving it set
    // while picking a system folder listed the label's threads under a highlighted
    // Sent/Trash — the list and the highlight disagreed. Picking a folder clears
    // the label; picking a label (below) is what sets it.
    setUserLabelId(null);
    urlActions.setFolder(next);
  }, [clearSelection, urlActions]);

  const handleCategoryChange = useCallback((next: GmailCategory) => {
    clearSelection();
    urlActions.setCategory(next);
  }, [clearSelection, urlActions]);

  const handleSearch = useCallback((q: string) => {
    clearSelection();
    urlActions.setQuery(q);
  }, [clearSelection, urlActions]);

  const openThread = useCallback((id: string) => {
    urlActions.openThread(id);
  }, [urlActions]);

  const closeThread = useCallback(() => urlActions.openThread(null), [urlActions]);

  // Row + bulk actions -------------------------------------------------------
  const rowStar = useCallback((id: string, currentlyStarred: boolean) => {
    fireModify({ kind: currentlyStarred ? "unstar" : "star", ids: [id] });
  }, [fireModify]);

  const rowArchive = useCallback((id: string) => {
    fireModify({ kind: "archive", ids: [id] });
  }, [fireModify]);

  const rowTrash = useCallback((id: string) => {
    fireModify({ kind: "trash", ids: [id] });
  }, [fireModify]);

  const rowRestore = useCallback((id: string) => {
    fireModify({ kind: "untrash", ids: [id] });
  }, [fireModify]);

  const rowMarkRead = useCallback((id: string) => {
    fireModify({ kind: "markRead", ids: [id] });
  }, [fireModify]);

  const bulkIds = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const bulk = useCallback((kind: Exclude<ModifyAction["kind"], "addLabel" | "removeLabel">) => {
    if (!bulkIds.length) return;
    fireModify({ kind, ids: bulkIds } as ModifyAction);
    clearSelection();
  }, [bulkIds, clearSelection, fireModify]);

  // Reading-pane actions -----------------------------------------------------
  const readingStar = useCallback(() => {
    if (!threadId) return;
    const starred = threadLabelIds.includes(SYSTEM_LABELS.STARRED);
    fireModify({ kind: starred ? "unstar" : "star", ids: [threadId] });
  }, [threadId, threadLabelIds, fireModify]);

  const readingArchive = useCallback(() => {
    if (!threadId) return;
    fireModify({ kind: "archive", ids: [threadId] });
    closeThread();
  }, [threadId, fireModify, closeThread]);

  const readingTrash = useCallback(() => {
    if (!threadId) return;
    fireModify({ kind: "trash", ids: [threadId] });
    closeThread();
  }, [threadId, fireModify, closeThread]);

  const readingRestore = useCallback(() => {
    if (!threadId) return;
    fireModify({ kind: "untrash", ids: [threadId] });
    closeThread();
  }, [threadId, fireModify, closeThread]);

  const readingMarkUnread = useCallback(() => {
    if (!threadId) return;
    fireModify({ kind: "markUnread", ids: [threadId] });
    closeThread();
  }, [threadId, fireModify, closeThread]);

  const readingAddLabel = useCallback((labelId: string) => {
    if (!threadId) return;
    fireModify({ kind: "addLabel", ids: [threadId], labelId });
  }, [threadId, fireModify]);

  const readingRemoveLabel = useCallback((labelId: string) => {
    if (!threadId) return;
    fireModify({ kind: "removeLabel", ids: [threadId], labelId });
  }, [threadId, fireModify]);

  const inTrash = folder === "TRASH";
  const emptyTitle = emptyTitleFor(folder, !!query, !!userLabelId);
  const showCategoryTabs = folder === "INBOX" && !userLabelId;

  return (
    <div className="grid h-full w-full grid-cols-[240px_minmax(360px,420px)_1fr]">
      <GmailSidebar
        folder={folder}
        onFolderChange={handleFolderChange}
        onCompose={() => setComposeOpen(true)}
        labels={labelsList}
        activeUserLabelId={userLabelId}
        onUserLabelChange={(id) => { clearSelection(); setUserLabelId(id); }}
      />

      <section className={cn(
        "flex flex-col h-full min-w-0 border-r border-border bg-background",
        threadId ? "hidden lg:flex" : "flex",
      )}>
        <div className="px-3 py-2 border-b border-border bg-background">
          <GmailSearchBar
            value={query}
            onChange={handleSearch}
            isLoading={threadsQuery.isFetching}
            contacts={contactsQuery.data ?? []}
          />
        </div>
        {showCategoryTabs ? (
          <GmailCategoryTabs value={category ?? "primary"} onChange={handleCategoryChange} />
        ) : null}
        <GmailToolbar
          totalVisible={threads.length}
          selectedCount={selectedIds.size}
          onToggleAll={toggleAll}
          onRefresh={() => { void threadsQuery.refetch(); }}
          isRefreshing={threadsQuery.isFetching}
          onBulkMarkRead={() => bulk("markRead")}
          onBulkMarkUnread={() => bulk("markUnread")}
          onBulkArchive={() => bulk("archive")}
          onBulkTrash={() => bulk("trash")}
          inTrash={inTrash}
          onBulkRestore={inTrash ? () => bulk("untrash") : undefined}
        />
        <div className="flex-1 min-h-0">
          <GmailThreadList
            threads={threads}
            isLoading={threadsQuery.isLoading}
            isFetching={threadsQuery.isFetching && !threadsQuery.isLoading}
            activeThreadId={threadId}
            selectedIds={selectedIds}
            adminEmail={adminEmail}
            labelsById={labelsById}
            emptyTitle={emptyTitle.title}
            emptyDescription={emptyTitle.description}
            onOpen={openThread}
            onToggleSelect={toggleSelect}
            onStarToggle={rowStar}
            onArchive={rowArchive}
            onTrash={rowTrash}
            onMarkRead={rowMarkRead}
            showRestore={inTrash}
            onRestore={inTrash ? rowRestore : undefined}
          />
        </div>
      </section>

      <section className={cn(
        "min-w-0 h-full bg-background",
        threadId ? "block" : "hidden lg:block",
      )}>
        {threadId ? (
          <GmailReadingPane
            threadId={threadId}
            messages={messages}
            isLoading={threadQuery.isLoading}
            isError={threadQuery.isError}
            errorMessage={threadQuery.error instanceof Error ? threadQuery.error.message : undefined}
            adminEmail={adminEmail}
            labels={labelsList}
            threadLabelIds={threadLabelIds}
            onBack={closeThread}
            onArchive={readingArchive}
            onTrash={readingTrash}
            onMarkUnreadAndClose={readingMarkUnread}
            onStarToggle={readingStar}
            onAddLabel={readingAddLabel}
            onRemoveLabel={readingRemoveLabel}
            inTrash={inTrash}
            onRestore={inTrash ? readingRestore : undefined}
          />
        ) : (
          <div className="hidden lg:flex h-full items-center justify-center text-sm text-muted-foreground">
            Pick a thread to open
          </div>
        )}
      </section>

      <GmailCompose open={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  );
}

function emptyTitleFor(folder: string, hasQuery: boolean, hasUserLabel: boolean): { title: string; description?: string } {
  if (hasQuery) return { title: "No matching threads", description: "Try different keywords or operators." };
  if (hasUserLabel) return { title: "Nothing in this label" };
  switch (folder) {
    case "INBOX": return { title: "Your inbox is empty" };
    case "STARRED": return { title: "No starred threads" };
    case "SNOOZED": return { title: "No snoozed threads" };
    case "SENT": return { title: "No sent messages yet" };
    case "DRAFT": return { title: "No drafts" };
    case "ALL": return { title: "No messages" };
    case "SPAM": return { title: "Spam is empty" };
    case "TRASH": return { title: "Trash is empty" };
    default: return { title: "Empty" };
  }
}
