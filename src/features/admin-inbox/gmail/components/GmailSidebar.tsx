import { useState } from "react";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Inbox,
  Mail,
  PencilLine,
  Send,
  ShieldAlert,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GmailFolder, GmailLabel } from "../api";

interface GmailSidebarProps {
  folder: GmailFolder;
  onFolderChange: (next: GmailFolder) => void;
  onCompose: () => void;
  labels: GmailLabel[];
  activeUserLabelId: string | null;
  onUserLabelChange: (id: string | null) => void;
}

interface FolderEntry {
  id: GmailFolder;
  label: string;
  Icon: typeof Inbox;
}

const FOLDERS: FolderEntry[] = [
  { id: "INBOX", label: "Inbox", Icon: Inbox },
  { id: "STARRED", label: "Starred", Icon: Star },
  { id: "SNOOZED", label: "Snoozed", Icon: Clock },
  { id: "SENT", label: "Sent", Icon: Send },
  { id: "DRAFT", label: "Drafts", Icon: FileText },
  { id: "ALL", label: "All Mail", Icon: Archive },
  { id: "SPAM", label: "Spam", Icon: ShieldAlert },
  { id: "TRASH", label: "Trash", Icon: Trash2 },
];

export function GmailSidebar({
  folder,
  onFolderChange,
  onCompose,
  labels,
  activeUserLabelId,
  onUserLabelChange,
}: GmailSidebarProps) {
  const [labelsOpen, setLabelsOpen] = useState(true);

  // Show user-created labels only (hide Gmail's category/system noise from the sidebar).
  const userLabels = labels.filter((l) => l.type === "user");

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-background flex flex-col h-full">
      <div className="px-3 pt-4 pb-2">
        <Button
          onClick={onCompose}
          className="w-full gap-2 shadow-sm h-11 rounded-2xl text-sm font-medium"
        >
          <PencilLine className="w-4 h-4" />
          Compose
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-1 pb-4 mt-2" aria-label="Gmail folders">
        {FOLDERS.map(({ id, label, Icon }) => {
          const active = folder === id && !activeUserLabelId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => { onUserLabelChange(null); onFolderChange(id); }}
              className={cn(
                "w-full flex items-center gap-3 pl-5 pr-3 py-1.5 text-sm rounded-r-full transition-colors text-left",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary/15 text-foreground font-semibold"
                  : "text-foreground/80 hover:bg-muted/60",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}

        {userLabels.length > 0 ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setLabelsOpen((v) => !v)}
              className="w-full flex items-center gap-2 pl-3 pr-2 py-1.5 text-xs uppercase tracking-wide font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={labelsOpen}
            >
              {labelsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Labels
            </button>
            {labelsOpen ? (
              <div className="mt-1">
                {userLabels.map((l) => {
                  const active = activeUserLabelId === l.id;
                  const dot = l.color?.backgroundColor;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => onUserLabelChange(active ? null : l.id)}
                      className={cn(
                        "w-full flex items-center gap-3 pl-5 pr-3 py-1.5 text-sm rounded-r-full transition-colors text-left",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-primary/15 text-foreground font-semibold"
                          : "text-foreground/80 hover:bg-muted/60",
                      )}
                    >
                      {dot ? (
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ background: dot }}
                          aria-hidden
                        />
                      ) : (
                        <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate" title={l.name}>{l.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>

      <div className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground flex items-center gap-2">
        <Mail className="w-3.5 h-3.5" />
        <span className="truncate">Joshua</span>
      </div>
    </aside>
  );
}
