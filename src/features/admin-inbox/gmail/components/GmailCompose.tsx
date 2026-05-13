import { useState } from "react";
import { Loader2, Minus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useGmailContacts, useGmailSend } from "../hooks";
import { GmailRecipientInput } from "./GmailRecipientInput";

interface GmailComposeProps {
  open: boolean;
  onClose: () => void;
  /** Optional prefill (e.g. from a "compose to student" entry point). */
  prefill?: { to?: string; subject?: string; body?: string };
}

export function GmailCompose({ open, onClose, prefill }: GmailComposeProps) {
  const [to, setTo] = useState(prefill?.to ?? "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(prefill?.subject ?? "");
  const [body, setBody] = useState(prefill?.body ?? "");
  const [minimized, setMinimized] = useState(false);

  const send = useGmailSend();
  const contactsQuery = useGmailContacts({ enabled: open });
  const contacts = contactsQuery.data ?? [];

  if (!open) return null;

  const canSend = to.trim().length > 0 && body.trim().length > 0 && !send.isPending;

  function reset() {
    setTo(""); setCc(""); setBcc(""); setSubject(""); setBody("");
    setShowCc(false); setShowBcc(false);
  }

  function handleSend() {
    send.mutate(
      { to: to.trim(), cc: cc.trim() || undefined, bcc: bcc.trim() || undefined, subject: subject.trim(), text: body },
      { onSuccess: () => { reset(); onClose(); } },
    );
  }

  function handleDiscard() {
    reset();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-label="New message"
      className={cn(
        "fixed bottom-0 right-6 z-40 w-[540px] max-w-[calc(100vw-32px)] shadow-2xl",
        "rounded-t-lg border border-border border-b-0 bg-background overflow-hidden",
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-foreground text-background select-none cursor-grab">
        <span className="text-xs font-medium truncate">{subject || "New message"}</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-background hover:bg-white/15 hover:text-background"
            onClick={() => setMinimized((v) => !v)}
            aria-label={minimized ? "Expand" : "Minimize"}
          >
            <Minus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-background hover:bg-white/15 hover:text-background"
            onClick={handleDiscard}
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {!minimized ? (
        <div className="flex flex-col">
          <ComposeRow>
            <label className="w-12 text-xs text-muted-foreground">To</label>
            <GmailRecipientInput
              value={to}
              onChange={setTo}
              placeholder="recipient@example.com"
              contacts={contacts}
            />
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground pr-2">
              {!showCc ? (
                <button type="button" className="hover:text-foreground" onClick={() => setShowCc(true)}>Cc</button>
              ) : null}
              {!showBcc ? (
                <button type="button" className="hover:text-foreground" onClick={() => setShowBcc(true)}>Bcc</button>
              ) : null}
            </div>
          </ComposeRow>
          {showCc ? (
            <ComposeRow>
              <label className="w-12 text-xs text-muted-foreground">Cc</label>
              <GmailRecipientInput
                value={cc}
                onChange={setCc}
                placeholder="cc@example.com"
                contacts={contacts}
              />
            </ComposeRow>
          ) : null}
          {showBcc ? (
            <ComposeRow>
              <label className="w-12 text-xs text-muted-foreground">Bcc</label>
              <GmailRecipientInput
                value={bcc}
                onChange={setBcc}
                placeholder="bcc@example.com"
                contacts={contacts}
              />
            </ComposeRow>
          ) : null}
          <ComposeRow>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="border-0 focus-visible:ring-0 h-8 text-sm shadow-none px-3"
            />
          </ComposeRow>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={9}
            className="border-0 focus-visible:ring-0 resize-none text-sm min-h-[200px] px-3 py-2"
          />
          <div className="flex items-center justify-between px-3 py-2 border-t border-border">
            <Button onClick={handleSend} disabled={!canSend} className="gap-1.5" size="sm">
              {send.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDiscard}>Discard</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ComposeRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3">{children}</div>
  );
}
