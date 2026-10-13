import { useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Forward,
  Loader2,
  Mail,
  MoreVertical,
  Reply,
  ReplyAll,
  Send,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { GmailLabel, GmailMessage } from "../api";
import { SYSTEM_LABELS, parseAddress } from "../api";
import { GmailMessageItem } from "./GmailMessageItem";
import { useGmailSend } from "../hooks";

type ReplyMode = "reply" | "replyAll" | "forward";

interface GmailReadingPaneProps {
  threadId: string;
  messages: GmailMessage[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  adminEmail: string | null;
  labels: GmailLabel[];
  /** Aggregated labelIds across the thread for the star toggle / label menu. */
  threadLabelIds: string[];
  onBack: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onMarkUnreadAndClose: () => void;
  onStarToggle: () => void;
  onAddLabel: (labelId: string) => void;
  onRemoveLabel: (labelId: string) => void;
  /** Visual hint: when reading in TRASH, show "Restore" instead of "Archive." */
  inTrash?: boolean;
  onRestore?: () => void;
}

function dedupAddresses(input: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (!raw) continue;
    const { email } = parseAddress(raw);
    const key = email.toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(raw);
    }
  }
  return out.join(", ");
}

export function GmailReadingPane(props: GmailReadingPaneProps) {
  const {
    threadId, messages, isLoading, isError, errorMessage,
    adminEmail, labels, threadLabelIds,
    onBack, onArchive, onTrash, onMarkUnreadAndClose, onStarToggle,
    onAddLabel, onRemoveLabel, inTrash, onRestore,
  } = props;

  const send = useGmailSend();
  const [mode, setMode] = useState<ReplyMode>("reply");
  const [body, setBody] = useState("");

  const last = messages[messages.length - 1];
  const subject = messages[0]?.subject ?? "(no subject)";
  const starred = threadLabelIds.includes(SYSTEM_LABELS.STARRED);

  const userLabels = useMemo(() => labels.filter((l) => l.type === "user"), [labels]);
  const labelIdSet = useMemo(() => new Set(threadLabelIds), [threadLabelIds]);

  const { to, cc, subjectLine } = useMemo(() => {
    if (!last) return { to: "", cc: "", subjectLine: "" };
    const subjectBase = last.subject ?? subject ?? "";
    const replySubject = subjectBase.toLowerCase().startsWith("re:") ? subjectBase : `Re: ${subjectBase}`;
    const fwdSubject = subjectBase.toLowerCase().startsWith("fwd:") ? subjectBase : `Fwd: ${subjectBase}`;
    if (mode === "forward") {
      return { to: "", cc: "", subjectLine: fwdSubject };
    }
    if (mode === "reply") {
      return { to: last.from, cc: "", subjectLine: replySubject };
    }
    // replyAll: To = sender, Cc = original To + Cc minus admin.
    const ccCandidates = [last.to, last.cc].filter(Boolean).join(", ").split(",").map((s) => s.trim()).filter(Boolean);
    const filtered = adminEmail
      ? ccCandidates.filter((r) => parseAddress(r).email.toLowerCase() !== adminEmail.toLowerCase())
      : ccCandidates;
    return { to: last.from, cc: dedupAddresses(filtered), subjectLine: replySubject };
  }, [last, mode, subject, adminEmail]);

  const canSend = !!last && body.trim().length > 0 && !send.isPending && (mode !== "forward" || to.trim().length > 0);

  // Allow forward-mode users to type recipients.
  const [forwardTo, setForwardTo] = useState("");

  function handleSend() {
    if (!last) return;
    const effectiveTo = mode === "forward" ? forwardTo.trim() : parseAddress(to).email || to;
    const refsHeader = last.references
      ? `${last.references} ${last.messageIdHeader}`.trim()
      : last.messageIdHeader || undefined;
    send.mutate(
      {
        to: effectiveTo,
        cc: mode === "replyAll" ? cc || undefined : undefined,
        subject: subjectLine,
        text: body,
        // Forward starts a new thread by omitting threadId.
        threadId: mode === "forward" ? undefined : threadId,
        inReplyTo: mode === "forward" ? undefined : (last.messageIdHeader || undefined),
        references: mode === "forward" ? undefined : refsHeader,
      },
      {
        onSuccess: () => { setBody(""); setForwardTo(""); setMode("reply"); },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading conversation…
      </div>
    );
  }

  if (isError || !messages.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <p className="text-sm text-destructive font-medium">Couldn't load this thread</p>
        {errorMessage ? (
          <p className="text-xs text-muted-foreground mt-1 max-w-md">{errorMessage}</p>
        ) : null}
        <Button variant="ghost" size="sm" className="mt-3" onClick={onBack}>Back to list</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 lg:hidden"
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={inTrash && onRestore ? onRestore : onArchive}
          aria-label={inTrash ? "Restore to inbox" : "Archive"}
          title={inTrash ? "Restore to inbox" : "Archive"}
        >
          <Archive className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={onTrash}
          aria-label="Move to trash"
          title="Move to trash"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={onMarkUnreadAndClose}
          aria-label="Mark as unread"
          title="Mark as unread"
        >
          <Mail className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onStarToggle}
          aria-label={starred ? "Unstar" : "Star"}
          aria-pressed={starred}
        >
          <Star className={cn("w-4 h-4", starred ? "fill-amber-400 text-amber-500" : "text-muted-foreground")} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              aria-label="Labels"
              disabled={!userLabels.length}
              title="Labels"
            >
              <Tag className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Apply labels</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {userLabels.map((l) => (
              <DropdownMenuCheckboxItem
                key={l.id}
                checked={labelIdSet.has(l.id)}
                onCheckedChange={(checked) => (checked ? onAddLabel(l.id) : onRemoveLabel(l.id))}
              >
                {l.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="More actions">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Coming soon</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Snooze, filter, print
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-6 pt-5 pb-3 border-b border-border bg-background">
        <h2 className="text-xl font-semibold leading-snug">{subject}</h2>
        <p className="text-[11px] text-muted-foreground mt-1">
          {messages.length} message{messages.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {messages.map((m, i) => (
          <GmailMessageItem
            key={m.id}
            message={m}
            isLatest={i === messages.length - 1}
            adminEmail={adminEmail}
          />
        ))}
      </div>

      <div className="border-t border-border bg-background">
        <div className="px-4 pt-2 pb-1 flex items-center gap-1">
          <ReplyModeButton current={mode} mode="reply" onClick={() => setMode("reply")} Icon={Reply} label="Reply" />
          <ReplyModeButton current={mode} mode="replyAll" onClick={() => setMode("replyAll")} Icon={ReplyAll} label="Reply all" />
          <ReplyModeButton current={mode} mode="forward" onClick={() => setMode("forward")} Icon={Forward} label="Forward" />
        </div>
        <div className="px-4 pb-3">
          <div className="rounded-2xl border border-border bg-background overflow-hidden">
            <div className="px-3 py-1.5 border-b border-border text-[11px] text-muted-foreground flex items-center gap-2">
              {mode === "forward" ? (
                <input
                  type="text"
                  value={forwardTo}
                  onChange={(e) => setForwardTo(e.target.value)}
                  placeholder="To: name@example.com"
                  className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-xs"
                />
              ) : (
                <>
                  <span>To:</span>
                  <span className="text-foreground truncate">{parseAddress(to).name || parseAddress(to).email}</span>
                  {mode === "replyAll" && cc ? (
                    <span className="truncate ml-2">Cc: <span className="text-foreground">{cc}</span></span>
                  ) : null}
                </>
              )}
            </div>
            <Textarea
              placeholder={mode === "forward" ? "Add a message…" : "Write a reply…"}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="border-0 rounded-none resize-none focus-visible:ring-0 text-sm min-h-[80px]"
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
              <span className="text-[11px] text-muted-foreground truncate">
                {subjectLine}
              </span>
              <div className="flex items-center gap-2">
                {body || (mode === "forward" && forwardTo) ? (
                  <Button variant="ghost" size="sm" onClick={() => { setBody(""); setForwardTo(""); }}>
                    Discard
                  </Button>
                ) : null}
                <Button size="sm" onClick={handleSend} disabled={!canSend} className="gap-1.5">
                  {send.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {mode === "forward" ? "Forward" : mode === "replyAll" ? "Reply all" : "Reply"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReplyModeButton({
  current, mode, onClick, Icon, label,
}: {
  current: ReplyMode;
  mode: ReplyMode;
  onClick: () => void;
  Icon: typeof Reply;
  label: string;
}) {
  const active = current === mode;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
