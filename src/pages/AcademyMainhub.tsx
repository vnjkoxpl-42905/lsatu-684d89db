"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Menu, MessageCircle, Send, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MainhubSidebar from "@/components/mainhub/MainhubSidebar";
import MainhubDock from "@/components/mainhub/MainhubDock";
import MainhubAccountButton from "@/components/mainhub/MainhubAccountButton";
import SmartLRTrainingCard from "@/components/mainhub/SmartLRTrainingCard";
import RadialOrbitalTimeline, { type TimelineItem } from "@/components/ui/radial-orbital-timeline";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { hasSeenTour, startTour } from "@/components/mainhub/GuidedTour";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useClassroomItems } from "@/hooks/useClassroomItems";
import { useOrbitalActive } from "@/contexts/OrbitalActiveContext";
import { useLastActivity } from "@/hooks/useLastActivity";
import { useConversationMessages } from "@/hooks/useInbox";
import { resolveResumeTarget } from "@/lib/lastActivity";
import { nextActionFor, resolveItemRoute } from "@/lib/classroomItems";
import { startJoshuaConversation } from "@/lib/joshuaThread";
import {
  ORBITAL_CATALOG,
  findCatalogItem,
  type CatalogItem,
} from "@/lib/layoutCatalog";

const REQUIRED_ORBITAL_IDS = ["resume", "analytics", "waj"] as const;

interface OrbitalRenderInfo {
  date: string;
  content: string;
  category: string;
  status: TimelineItem["status"];
  energy: number;
}

const ORBITAL_RENDER: Record<string, OrbitalRenderInfo> = {
  resume: {
    date: "Last assignment",
    content: "Open the next thing on your plate.",
    category: "Classroom",
    status: "pending",
    energy: 60,
  },
  analytics: {
    date: "Trends",
    content: "Review your performance trends and accuracy by question type.",
    category: "Progress",
    status: "in-progress",
    energy: 72,
  },
  waj: {
    date: "Review",
    content: "Open your Wrong Answer Journal.",
    category: "Journal",
    status: "pending",
    energy: 68,
  },
};

export default function AcademyMainhub() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const perms = useUserPermissions();
  const { data: classroomItems = [] } = useClassroomItems();
  const { data: lastActivity } = useLastActivity();
  const { setActive: setOrbitalActive } = useOrbitalActive();
  const [displayName, setDisplayName] = React.useState<string | null>(null);
  const [helpOpen, setHelpOpen] = React.useState(false);
  

  React.useEffect(() => {
    if (displayName && !hasSeenTour()) {
      const t = setTimeout(() => startTour(), 600);
      return () => clearTimeout(t);
    }
  }, [displayName]);

  React.useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("class_id", user.id)
        .maybeSingle();
      if (!profile?.display_name) {
        navigate("/onboarding", { replace: true });
        return;
      }
      setDisplayName(profile.display_name);
    })();
  }, [user, authReady, navigate]);

  const userHasAccess = React.useCallback(
    (item: CatalogItem) => {
      // Optimistic during perm load: useUserPermissions refetches per mount,
      // taking 1-3s. The orbital is a nav surface; ProtectedRoute gates the
      // actual route. Optimism here keeps the mainhub from staying blank.
      if (perms.loading) return true;
      if (item.adminOnly) return perms.is_admin;
      if (item.requires) return perms.is_admin || !!perms[item.requires as PermissionFlag];
      return true;
    },
    [perms],
  );

  const mainhubNodes: TimelineItem[] = React.useMemo(() => {
    const visibleIds = REQUIRED_ORBITAL_IDS.filter((id) => {
      const cat = findCatalogItem(ORBITAL_CATALOG, id);
      return cat ? userHasAccess(cat) : false;
    });
    return visibleIds
      .map((id) => {
        const cat = findCatalogItem(ORBITAL_CATALOG, id);
        const r = ORBITAL_RENDER[id];
        if (!cat || !r || !userHasAccess(cat)) return null;
        // Stable id: position in ORBITAL_CATALOG. Survives permissions-driven
        // filter changes so React's key tracks the same DOM element.
        const stableId = ORBITAL_CATALOG.findIndex((c) => c.id === id) + 1;
        const node: TimelineItem = {
          id: stableId,
          title: cat.label,
          date: r.date,
          content: r.content,
          category: r.category,
          icon: cat.icon,
          relatedIds: [],
          status: r.status,
          energy: r.energy,
        };
        return node;
      })
      .filter((n): n is TimelineItem => n !== null);
  }, [userHasAccess]);

  const onOrbitalActivate = React.useCallback(
    (nodeId: number | null) => {
      // Push orbital-active state for shared mainhub overlay gates.
      setOrbitalActive(nodeId !== null);
      if (nodeId === null) return;
      // nodeId is ORBITAL_CATALOG position + 1, so look up the catalog id directly.
      const itemId = ORBITAL_CATALOG[nodeId - 1]?.id;
      if (itemId === "resume") {
        // Primary source: user_last_activity (true "where I left off").
        // Fallbacks: next assigned classroom item → Smart Drill.
        if (lastActivity) {
          const { path, state } = resolveResumeTarget(lastActivity.state_snapshot);
          navigate(path, { state });
        } else {
          const next = nextActionFor(classroomItems);
          const route = next ? resolveItemRoute(next) : null;
          navigate(route ?? "/drill", route ? undefined : { state: { mode: "adaptive" } });
        }
      } else if (itemId === "analytics") {
        navigate("/analytics");
      } else if (itemId === "waj") {
        navigate("/waj");
      }
    },
    [navigate, classroomItems, setOrbitalActive, lastActivity],
  );

  React.useEffect(() => {
    // If user navigates away while a node is expanded, clear orbital-active
    // so the chat widget reappears on the next route.
    return () => setOrbitalActive(false);
  }, [setOrbitalActive]);

  if (!authReady || !user) return null;

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <aside
        data-tour="mainhub-sidebar"
        className="hidden shrink-0 border-r border-border md:flex"
        style={{ width: "min(320px, 30vw)", minWidth: 280 }}
      >
        <MainhubSidebar displayName={displayName} />
      </aside>

      <Sheet>
        <SheetTrigger
          aria-label="Open menu"
          className="absolute left-4 top-4 z-20 rounded-md p-2 text-muted-foreground transition hover:text-foreground active:opacity-70 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[320px] p-0">
          <MainhubSidebar displayName={displayName} />
        </SheetContent>
      </Sheet>

      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-8 pb-24 md:px-6">
        <div className="pointer-events-none absolute right-8 top-7 z-10">
          <div data-tour="mainhub-dock" className="pointer-events-auto flex items-center gap-2">
            <MainhubDock />
            <MainhubAccountButton displayName={displayName} />
          </div>
        </div>

        <div className="relative flex h-full w-full max-w-[1060px] items-center justify-center gap-3 2xl:max-w-[1100px] 2xl:gap-4">
          <div className="hidden w-[400px] shrink-0 xl:flex 2xl:w-[440px]">
            <SmartLRTrainingCard />
          </div>

          <section
            aria-label="Mainhub orbital workspace"
            className="relative flex h-full min-h-[560px] min-w-0 flex-1 items-center justify-center"
          >
            <div
              data-tour="mainhub-orbital"
              className="absolute left-1/2 top-1/2 h-[500px] w-[460px] max-w-full -translate-x-1/2 -translate-y-1/2"
            >
              <RadialOrbitalTimeline
                timelineData={mainhubNodes}
                onActivate={onOrbitalActivate}
              />
            </div>
          </section>
        </div>
      </main>

      <MainhubHelpControl
        open={helpOpen}
        onOpenChange={setHelpOpen}
      />
    </div>
  );
}

function MainhubHelpControl({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [threadError, setThreadError] = React.useState<string | null>(null);
  const [openingThread, setOpeningThread] = React.useState(false);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { messages, loading, refresh } = useConversationMessages(conversationId);

  React.useEffect(() => {
    if (!open || conversationId) return;
    let cancelled = false;
    setOpeningThread(true);
    setThreadError(null);

    startJoshuaConversation()
      .then((id) => {
        if (!cancelled) setConversationId(id);
      })
      .catch((error) => {
        if (!cancelled) {
          setThreadError(error instanceof Error ? error.message : "Could not open your thread.");
        }
      })
      .finally(() => {
        if (!cancelled) setOpeningThread(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, open]);

  React.useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, open]);

  const sendMessage = async () => {
    const text = body.trim();
    if (!user || !conversationId || !text || sending) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: user.id, body: text });
      if (error) throw error;
      setBody("");
      await refresh();
    } catch (error) {
      setThreadError(error instanceof Error ? error.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-label="Get help from Joshua"
        title="Get help from Joshua"
        data-help-overlay
        className="fixed bottom-5 left-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-[#141414] text-white shadow-[0_14px_35px_rgba(15,23,42,0.18)] transition hover:bg-[#242424] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <MessageCircle className="h-5 w-5" strokeWidth={1.8} aria-hidden />
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="LSAT U support chat"
          data-help-overlay
          className="fixed bottom-20 left-5 z-50 flex h-[min(560px,calc(100dvh-7rem))] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-[#fbfcff] text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
        >
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[13px] font-semibold text-white shadow-sm"
              aria-hidden
            >
              J
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900">LSAT U Support</div>
              <div className="truncate text-[11px] text-slate-500">Joshua and your study thread</div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Minimize support chat"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-5"
          >
            {threadError ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                {threadError}
              </div>
            ) : openingThread || loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Opening your thread...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-start justify-center pt-5 text-center">
                <p className="text-[22px] font-medium tracking-normal text-slate-500">
                  Need some help?
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                        message.sender_id === user?.id
                          ? "rounded-br-md bg-slate-950 text-white"
                          : "rounded-bl-md bg-slate-100 text-slate-800"
                      }`}
                    >
                      {message.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200/80 bg-[#fbfcff] px-3 py-3">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-slate-300/60">
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={!conversationId || sending}
                placeholder="Message..."
                rows={2}
                className="min-h-[56px] w-full resize-none rounded-t-2xl border-0 bg-transparent px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-default disabled:opacity-60"
              />
              <div className="flex items-center justify-end border-t border-slate-100 px-2 py-1.5">
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!conversationId || !body.trim() || sending}
                  aria-label="Send message"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
