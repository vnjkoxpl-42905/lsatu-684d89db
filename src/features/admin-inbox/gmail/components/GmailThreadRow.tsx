import { Archive, MailOpen, Paperclip, Star, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GmailLabel, GmailThreadSummary } from "../api";
import { SYSTEM_LABELS } from "../api";
import { formatSenders } from "../utils/formatSenders";
import { formatThreadDate } from "../utils/formatDate";

const HIDDEN_LABEL_IDS = new Set<string>([
  SYSTEM_LABELS.INBOX,
  SYSTEM_LABELS.SENT,
  SYSTEM_LABELS.UNREAD,
  SYSTEM_LABELS.STARRED,
  SYSTEM_LABELS.IMPORTANT,
  SYSTEM_LABELS.DRAFT,
  SYSTEM_LABELS.TRASH,
  SYSTEM_LABELS.SPAM,
  SYSTEM_LABELS.SNOOZED,
  SYSTEM_LABELS.CATEGORY_PERSONAL,
  SYSTEM_LABELS.CATEGORY_SOCIAL,
  SYSTEM_LABELS.CATEGORY_PROMOTIONS,
  SYSTEM_LABELS.CATEGORY_UPDATES,
  SYSTEM_LABELS.CATEGORY_FORUMS,
]);

interface GmailThreadRowProps {
  thread: GmailThreadSummary;
  isActive: boolean;
  isSelected: boolean;
  adminEmail: string | null;
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
  labelsById,
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

  // Resolve user labels for chips (system + category labels suppressed).
  const chips = thread.labelIds
    .filter((id) => !HIDDEN_LABEL_IDS.has(id))
    .map((id) => labelsById.get(id))
    .filter((l): l is GmailLabel => !!l);
  const visibleChips = chips.slice(0, 2);
  const overflow = chips.length - visibleChips.length;

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
        "group relative flex items-center gap-2 pl-2 pr-3 h-11 cursor-pointer border-b border-border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isActive
          ? "bg-primary/10"
          : thread.unread
            ? "bg-background hover:bg-accent/40 hover:shadow-sm"
            : "bg-muted/20 hover:bg-accent/40 hover:shadow-sm",
      )}
    >
      <div
        className="flex items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(v) => onSelectChange(!!v)}
          aria-label={`Select thread from ${senders}`}
          className="ml-1"
        />
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onStarToggle(); }}
        className="p-1 -m-1 text-muted-foreground/50 hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        aria-label={thread.starred ? "Unstar" : "Star"}
        aria-pressed={thread.starred}
      >
        <Star
          className={cn("w-4 h-4", thread.starred && "fill-amber-400 text-amber-500")}
        />
      </button>

      <span
        className={cn(
          "shrink-0 truncate w-[170px] text-sm",
          thread.unread ? "font-semibold text-foreground" : "font-normal text-foreground/75",
        )}
        title={senders}
      >
        {senders}
      </span>

      <span className="flex-1 min-w-0 truncate text-sm flex items-center gap-2">
        {visibleChips.map((l) => {
          const bg = l.color?.backgroundColor ?? "hsl(var(--muted))";
          const fg = l.color?.textColor ?? "hsl(var(--foreground))";
          return (
            <span
              key={l.id}
              className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border border-border/50"
              style={{ background: bg, color: fg }}
            >
              {l.name}
            </span>
          );
        })}
        {overflow > 0 ? (
          <span className="shrink-0 text-[10px] font-medium text-muted-foreground px-1">+{overflow}</span>
        ) : null}
        <span className={cn("truncate", thread.unread ? "font-semibold text-foreground" : "text-foreground/75")}>
          {thread.subject || "(no subject)"}
        </span>
        {thread.snippet ? (
          <span className="text-muted-foreground truncate">— {thread.snippet}</span>
        ) : null}
      </span>

      <div className="shrink-0 flex items-center gap-1">
        {thread.hasAttachments ? (
          <Paperclip className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
        ) : null}

        {/* Hover quick-actions replace the timestamp on hover. */}
        <div className="relative">
          <span
            className={cn(
              "text-xs tabular-nums shrink-0",
              thread.unread ? "font-semibold text-foreground" : "text-muted-foreground",
              "group-hover:invisible",
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
              className="h-7 w-7"
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
              className="h-7 w-7"
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
              className="h-7 w-7"
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
    </div>
  );
}
