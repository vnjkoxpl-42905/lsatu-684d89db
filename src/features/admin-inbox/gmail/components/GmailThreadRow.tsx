import { Archive, MailOpen, Paperclip, Star, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GmailLabel, GmailThreadSummary } from "../api";
import { formatSenders } from "../utils/formatSenders";
import { formatThreadDate } from "../utils/formatDate";

interface GmailThreadRowProps {
  thread: GmailThreadSummary;
  isActive: boolean;
  isSelected: boolean;
  adminEmail: string | null;
  /** Kept on the prop signature for parity with the list; rendered chips were
   *  dropped to satisfy the merged single-truncated-run layout at 380px width. */
  labelsById: Map<string, GmailLabel>;
  onClick: () => void;
  onSelectChange: (checked: boolean) => void;
  onStarToggle: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onMarkRead: () => void;
  /** When viewing TRASH, the row's quick-action shows Restore instead of Archive. */
  showRestore?: boolean;
  onRestore?: () => void;
}

export function GmailThreadRow({
  thread,
  isActive,
  isSelected,
  adminEmail,
  onClick,
  onSelectChange,
  onStarToggle,
  onArchive,
  onTrash,
  onMarkRead,
  showRestore,
  onRestore,
}: GmailThreadRowProps) {
  const senders = formatSenders(thread.senders, thread.messageCount, adminEmail);
  const dateStr = formatThreadDate(thread.internalDate ?? thread.date);

  return (
    <div
      role="row"
      aria-selected={isActive}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
      }}
      tabIndex={0}
      className={cn(
        "group relative flex items-start gap-2 px-3 py-2.5 min-h-[60px] cursor-pointer",
        "border-b-[0.5px] border-border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isActive
          ? "bg-primary/10"
          : thread.unread
            ? "bg-background hover:bg-accent/40 hover:shadow-sm"
            : "bg-muted/20 hover:bg-accent/40 hover:shadow-sm",
      )}
    >
      {/* Left gutter: checkbox + star, top-aligned */}
      <div
        className="flex items-center gap-1 shrink-0 w-11 pt-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(v) => onSelectChange(!!v)}
          aria-label={`Select thread from ${senders}`}
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStarToggle(); }}
          className="p-0.5 -m-0.5 text-muted-foreground/50 hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          aria-label={thread.starred ? "Unstar" : "Star"}
          aria-pressed={thread.starred}
        >
          <Star
            className={cn("w-4 h-4", thread.starred && "fill-amber-400 text-amber-500")}
          />
        </button>
      </div>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {/* Line 1: sender ... (paperclip) date / hover actions */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span
            className={cn(
              "truncate text-[13px] min-w-0",
              thread.unread ? "font-semibold text-foreground" : "font-normal text-foreground/75",
            )}
            title={senders}
          >
            {senders}
          </span>

          <div className="shrink-0 flex items-center gap-1 relative">
            {thread.hasAttachments ? (
              <Paperclip className="w-3.5 h-3.5 text-muted-foreground group-hover:invisible" aria-hidden />
            ) : null}
            <span
              className={cn(
                "text-[11px] tabular-nums shrink-0 group-hover:invisible",
                thread.unread ? "font-semibold text-foreground" : "font-normal text-muted-foreground",
              )}
            >
              {dateStr}
            </span>
            <div
              className="absolute inset-0 hidden group-hover:flex items-center justify-end gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={showRestore && onRestore ? onRestore : onArchive}
                aria-label={showRestore ? "Restore to inbox" : "Archive"}
                title={showRestore ? "Restore to inbox" : "Archive"}
              >
                <Archive className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onTrash}
                aria-label="Move to trash"
                title="Move to trash"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onMarkRead}
                aria-label="Mark as read"
                title="Mark as read"
                disabled={!thread.unread}
              >
                <MailOpen className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Line 2: merged subject + snippet single truncated run */}
        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]">
          <span className={cn(thread.unread ? "font-semibold text-foreground" : "font-normal text-foreground")}>
            {thread.subject || "(no subject)"}
          </span>
          {thread.snippet ? (
            <span className="font-normal text-muted-foreground">{" — "}{thread.snippet}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
