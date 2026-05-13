import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Facebook, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Conv {
  id: string;
  psid: string;
  user_name: string | null;
  profile_pic: string | null;
  last_message_text: string | null;
  last_message_at: string;
  unread_count: number;
}

interface Msg {
  id: string;
  direction: "inbound" | "outbound";
  text: string | null;
  attachments: any;
  created_at: string;
}

export function MessengerPanel() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const active = useMemo(() => convs.find((c) => c.id === activeId) ?? null, [convs, activeId]);

  // Load conversations + realtime
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("messenger_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (!alive) return;
      if (error) toast.error(error.message);
      else setConvs((data ?? []) as Conv[]);
      setLoading(false);
    })();

    const ch = supabase
      .channel("messenger_convs")
      .on("postgres_changes", { event: "*", schema: "public", table: "messenger_conversations" }, async () => {
        const { data } = await supabase
          .from("messenger_conversations").select("*").order("last_message_at", { ascending: false });
        setConvs((data ?? []) as Conv[]);
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);

  // Load messages for active conv + realtime
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("messenger_messages")
        .select("id, direction, text, attachments, created_at")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      if (!alive) return;
      if (error) toast.error(error.message);
      else setMessages((data ?? []) as Msg[]);

      // mark read
      await supabase.from("messenger_conversations")
        .update({ unread_count: 0 }).eq("id", activeId);
    })();

    const ch = supabase
      .channel(`messenger_msgs_${activeId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messenger_messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Msg]))
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [activeId]);

  async function send() {
    if (!activeId || !draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    try {
      const { data, error } = await supabase.functions.invoke("messenger-send", {
        body: { conversationId: activeId, text },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send");
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-[320px_1fr] border-t border-border">
      <aside className="border-r border-border overflow-y-auto">
        <div className="px-3 py-3 border-b border-border flex items-center gap-2">
          <Facebook className="w-4 h-4 text-[#0084ff]" />
          <span className="text-sm font-semibold">Messenger</span>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : convs.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No Messenger conversations yet. Send a test message to your Page from Facebook to see it appear here.
          </div>
        ) : (
          <ul>
            {convs.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "w-full text-left px-3 py-3 flex gap-3 items-center hover:bg-muted/50 border-b border-border/50",
                    activeId === c.id && "bg-muted",
                  )}
                >
                  <Avatar className="h-9 w-9">
                    {c.profile_pic && <AvatarImage src={c.profile_pic} alt={c.user_name ?? "User"} />}
                    <AvatarFallback>{(c.user_name ?? "?").slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{c.user_name ?? c.psid}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {c.last_message_text ?? ""}
                      </span>
                      {c.unread_count > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <main className="flex flex-col min-h-0">
        {active ? (
          <>
            <header className="px-4 py-3 border-b border-border flex items-center gap-3">
              <Avatar className="h-8 w-8">
                {active.profile_pic && <AvatarImage src={active.profile_pic} alt={active.user_name ?? "User"} />}
                <AvatarFallback>{(active.user_name ?? "?").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="text-sm font-semibold">{active.user_name ?? active.psid}</div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    m.direction === "outbound"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}>
                    {m.text ?? <span className="italic opacity-70">[attachment]</span>}
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8">No messages yet</div>
              )}
            </div>
            <div className="border-t border-border p-3 flex gap-2 items-end">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder="Reply as your Page…"
                className="min-h-[44px] max-h-32 resize-none text-sm"
              />
              <Button onClick={send} disabled={sending || !draft.trim()} size="icon">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground px-3 pb-2">
              Note: Meta's 24-hour messaging window applies to standard replies.
            </p>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Pick a conversation
          </div>
        )}
      </main>
    </div>
  );
}
