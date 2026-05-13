import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";
import type { GmailLabel, GmailThreadSummary } from "../api";
import { GmailThreadRow } from "./GmailThreadRow";
import { EmptyState } from "./EmptyState";

interface GmailThreadListProps {
  threads: GmailThreadSummary[];
  isLoading: boolean;
  isFetching: boolean;
  activeThreadId: string | null;
  selectedIds: Set<string>;
  adminEmail: string | null;
  labelsById: Map<string, GmailLabel>;
  emptyTitle: string;
  emptyDescription?: string;
  onOpen: (id: string) => void;
  onToggleSelect: (id: string, checked: boolean) => void;
  onStarToggle: (id: string, currentlyStarred: boolean) => void;
  onArchive: (id: string) => void;
  onTrash: (id: string) => void;
  onMarkRead: (id: string) => void;
  showRestore?: boolean;
  onRestore?: (id: string) => void;
}

export function GmailThreadList(props: GmailThreadListProps) {
  const {
    threads, isLoading, isFetching, activeThreadId, selectedIds,
    adminEmail, labelsById, emptyTitle, emptyDescription,
    onOpen, onToggleSelect, onStarToggle, onArchive, onTrash, onMarkRead,
    showRestore, onRestore,
  } = props;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 60,
    overscan: 8,
  });

  if (isLoading) {
    return (
      <div className="divide-y divide-border" aria-busy>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-start gap-2 px-3 py-2.5 min-h-[60px] animate-pulse">
            <div className="flex items-center gap-1 shrink-0 w-11 pt-0.5">
              <div className="w-4 h-4 rounded bg-muted" />
              <div className="w-4 h-4 rounded bg-muted" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="w-32 h-3 rounded bg-muted" />
                <div className="w-10 h-3 rounded bg-muted" />
              </div>
              <div className="w-full h-3 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!threads.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto">
      {isFetching ? (
        <div className="absolute top-1.5 right-3 z-10 text-muted-foreground" aria-label="Refreshing">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </div>
      ) : null}
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((item) => {
          const t = threads[item.index];
          return (
            <div
              key={t.id}
              data-index={item.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <GmailThreadRow
                thread={t}
                isActive={t.id === activeThreadId}
                isSelected={selectedIds.has(t.id)}
                adminEmail={adminEmail}
                labelsById={labelsById}
                onClick={() => onOpen(t.id)}
                onSelectChange={(v) => onToggleSelect(t.id, v)}
                onStarToggle={() => onStarToggle(t.id, t.starred)}
                onArchive={() => onArchive(t.id)}
                onTrash={() => onTrash(t.id)}
                onMarkRead={() => onMarkRead(t.id)}
                showRestore={showRestore}
                onRestore={onRestore ? () => onRestore(t.id) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
