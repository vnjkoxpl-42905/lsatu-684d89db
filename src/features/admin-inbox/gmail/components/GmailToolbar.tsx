import { useEffect, useRef } from "react";
import { Archive, Loader2, MailOpen, MoreVertical, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GmailToolbarProps {
  totalVisible: number;
  selectedCount: number;
  onToggleAll: (checked: boolean) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onBulkMarkRead: () => void;
  onBulkMarkUnread: () => void;
  onBulkArchive: () => void;
  onBulkTrash: () => void;
  /** When current folder is TRASH, archive is replaced by "restore." */
  inTrash?: boolean;
  onBulkRestore?: () => void;
}

export function GmailToolbar({
  totalVisible,
  selectedCount,
  onToggleAll,
  onRefresh,
  isRefreshing,
  onBulkMarkRead,
  onBulkMarkUnread,
  onBulkArchive,
  onBulkTrash,
  inTrash,
  onBulkRestore,
}: GmailToolbarProps) {
  const allSelected = totalVisible > 0 && selectedCount === totalVisible;
  const partial = selectedCount > 0 && selectedCount < totalVisible;

  // Surface tri-state visually on the underlying checkbox (Radix supports it).
  const checkboxRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const el = checkboxRef.current;
    if (!el) return;
    el.dataset.state = allSelected ? "checked" : partial ? "indeterminate" : "unchecked";
    el.setAttribute("aria-checked", partial ? "mixed" : allSelected ? "true" : "false");
  }, [allSelected, partial]);

  const hasSelection = selectedCount > 0;

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-background sticky top-0 z-10">
      <Checkbox
        ref={checkboxRef as never}
        checked={allSelected}
        onCheckedChange={(v) => onToggleAll(!!v)}
        aria-label={allSelected ? "Deselect all" : "Select all"}
        className="ml-1"
      />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh"
      >
        {isRefreshing
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <RefreshCw className="w-3.5 h-3.5" />}
      </Button>

      {hasSelection ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={inTrash && onBulkRestore ? onBulkRestore : onBulkArchive}
            aria-label={inTrash ? "Restore to inbox" : "Archive"}
            title={inTrash ? "Restore to inbox" : "Archive"}
          >
            <Archive className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={onBulkTrash}
            aria-label="Move to trash"
            title="Move to trash"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={onBulkMarkRead}
            aria-label="Mark as read"
            title="Mark as read"
          >
            <MailOpen className="w-3.5 h-3.5" />
          </Button>
        </>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            disabled={!hasSelection}
            aria-label="More bulk actions"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem onClick={onBulkMarkRead}>Mark as read</DropdownMenuItem>
          <DropdownMenuItem onClick={onBulkMarkUnread}>Mark as unread</DropdownMenuItem>
          <DropdownMenuSeparator />
          {inTrash && onBulkRestore ? (
            <DropdownMenuItem onClick={onBulkRestore}>Restore to inbox</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onBulkArchive}>Archive</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onBulkTrash} className="text-destructive focus:text-destructive">
            Move to trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto text-xs text-muted-foreground tabular-nums">
        {selectedCount > 0 ? `${selectedCount} selected` : `${totalVisible} thread${totalVisible === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}
