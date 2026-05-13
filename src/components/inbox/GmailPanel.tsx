import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Mail, RefreshCw, Send, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface GmailThread {
  id: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
  internalDate?: string;
  messageCount: number;
  unread: boolean;
}

interface GmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  text: string;
  html: string;
  messageIdHeader: string;
  references: string;
  internalDate?: string;
  snippet?: string;
}

function parseAddress(s: string): { name: string; email: string } {
  const m = s.match(/^(.*?)\s*<(.+?)>\s*$/);
  if (m) return { name: m[1].replace(/(^"|"$)/g, "").trim(), email: m[2].trim() };
  return { name: s, email: s };
}

async function gmailCall(body: any) {
  const { data, error } = await supabase.functions.invoke("gmail", { body });
  if (error) throw error;
  if ((data as any)?.ok === false) throw new Error((data as any).error || "Gmail error");
  return data as any;
}

export function GmailPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [reply, setReply] = React.useState("");

  const list = useQuery({
    queryKey: ["gmail-threads"],
    queryFn: () => gmailCall({ action: "list", q: "in:inbox", max: 50 }),
    refetchInterval: 60_000,
  });

  const thread = useQuery({
    queryKey: ["gmail-thread", activeId],
    queryFn: () => gmailCall({ action: "thread", id: activeId }),
    enabled: !!activeId,
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!thread.data) return;
      const messages = thread.data.messages as GmailMessage[];
      const last = messages[messages.length - 1];
      const { email } = parseAddress(last.from);
      return gmailCall({
        action: "send",
        to: email,
        subject: last.subject?.startsWith("Re:") ? last.subject : `Re: ${last.subject ?? ""}`,
        text: reply,
        threadId: activeId,
        inReplyTo: last.messageIdHeader || undefined,
        references: last.references
          ? `${last.references} ${last.messageIdHeader}`.trim()
          : last.messageIdHeader || undefined,
      });
    },
    onSuccess: () => {
      setReply("");
      toast({ title: "Reply sent" });
      qc.invalidateQueries({ queryKey: ["gmail-thread", activeId] });
      qc.invalidateQueries({ queryKey: ["gmail-threads"] });
    },
    onError: (e: any) => toast({ title: "Send failed", description: e?.message, variant: "destructive" }),
  });

  if (activeId && thread.data) {
    const messages = thread.data.messages as GmailMessage[];
    const subject = messages[0]?.subject ?? "(no subject)";
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => { setActiveId(null); setReply(""); }}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{subject}</p>
            <p className="text-[11px] text-muted-foreground truncate">{messages.length} message{messages.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className="border border-border rounded-xl bg-card p-4">
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <p className="text-xs font-semibold truncate">{m.from}</p>
                <p className="text-[10px] text-muted-foreground shrink-0">{new Date(m.date || Number(m.internalDate ?? 0)).toLocaleString()}</p>
              </div>
              <pre className="whitespace-pre-wrap text-sm font-sans text-foreground/90">{m.text || m.snippet || ""}</pre>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-3 space-y-2 bg-background">
          <Textarea
            placeholder="Reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={() => send.mutate()} disabled={!reply.trim() || send.isPending} className="gap-2">
              {send.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send reply
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (activeId && thread.isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading thread…
      </div>
    );
  }

  const threads = (list.data?.threads ?? []) as GmailThread[];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Gmail Inbox</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => list.refetch()} disabled={list.isFetching} className="gap-1.5">
          {list.isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {list.isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
          </div>
        ) : list.error ? (
          <div className="px-4 py-8 text-sm text-destructive">{(list.error as Error).message}</div>
        ) : threads.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">Inbox empty.</div>
        ) : (
          <ul className="divide-y divide-border">
            {threads.map((t) => {
              const { name } = parseAddress(t.from);
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setActiveId(t.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-accent/40 transition-colors",
                      t.unread && "bg-primary/5",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("text-sm truncate", t.unread ? "font-semibold" : "font-medium")}>{name || "(unknown)"}</p>
                      <p className="text-[10px] text-muted-foreground shrink-0">
                        {t.internalDate ? new Date(Number(t.internalDate)).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <p className={cn("text-xs truncate mt-0.5", t.unread ? "text-foreground" : "text-muted-foreground")}>
                      {t.subject || "(no subject)"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{t.snippet}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
