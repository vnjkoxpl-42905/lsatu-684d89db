import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Command,
  Menu,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import HubStudentList from "@/components/hub/HubStudentList";
import HubContextPanel, { type HubTab } from "@/components/hub/HubContextPanel";
import TAChatView from "@/components/ta/TAChatView";
import { useIsMobile } from "@/hooks/use-mobile";
import { track } from "@/lib/analytics";

const VALID_TABS: HubTab[] = ["overview", "notes", "library"];

function parseTab(raw: string | null): HubTab {
  return (VALID_TABS as string[]).includes(raw ?? "")
    ? (raw as HubTab)
    : "overview";
}

const LS_SELECTED_KEY = "ta-selected-student";
const LS_LEFT_COLLAPSED_KEY = "hub-left-collapsed";

// URL-sync debounce window. Below perception threshold for "URL feels
// in sync" with the UI, above the keystroke-burst interval for rapid
// arrow-key navigation through the student list.
const URL_SYNC_DEBOUNCE_MS = 150;

export default function StudentHub() {
  const navigate = useNavigate();
  const { is_admin, loading } = useUserPermissions();

  // URL is the source of truth for selection + active tab (bookmarkable,
  // shareable, survives refresh). localStorage stays as a fallback so a
  // cold load without params lands on the last selected student.
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStudent = searchParams.get("student");

  const [selected, setSelectedState] = useState<string | null>(() => {
    if (urlStudent) return urlStudent;
    try {
      return localStorage.getItem(LS_SELECTED_KEY);
    } catch {
      return null;
    }
  });
  const isMobile = useIsMobile();
  const [tab, setTabState] = useState<HubTab>(() =>
    parseTab(searchParams.get("tab"))
  );
  const [mobileSelectorOpen, setMobileSelectorOpen] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_LEFT_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleLeftCollapsed = useCallback(() => {
    setLeftCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(LS_LEFT_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      track("hub_panel_collapsed", { panel: "left", collapsed: next });
      return next;
    });
  }, []);

  // Ref to `setTab` so the keyboard handler can pick up the latest
  // callback without re-mounting the listener on every render. `setTab`
  // itself changes identity whenever setSearchParams does (which is
  // often), so a deps-based listener would churn.
  const setTabRef = useRef<((tab: HubTab) => void) | null>(null);

  // Per-field debounce timers for URL sync. UI state updates immediately
  // (snappy arrow-key nav), but setSearchParams fires only after the
  // user settles for URL_SYNC_DEBOUNCE_MS. Prevents history.replaceState
  // churn when scrubbing the student list.
  const selectedUrlTimer = useRef<number | null>(null);
  const tabUrlTimer = useRef<number | null>(null);

  // Clear any pending URL writes on unmount so React doesn't warn
  // about setState on an unmounted component.
  useEffect(() => {
    return () => {
      if (selectedUrlTimer.current !== null) {
        window.clearTimeout(selectedUrlTimer.current);
      }
      if (tabUrlTimer.current !== null) {
        window.clearTimeout(tabUrlTimer.current);
      }
    };
  }, []);

  // Global hub-wide keyboard shortcuts (desktop-focused; mobile gestures
  // handle their own surface):
  //   Cmd/Ctrl+[     — collapse/expand left panel
  //   Cmd/Ctrl+1..3  — switch right-panel tab (overview/notes/library)
  // Mobile breakpoint still honors these; there's no hotkey-to-tab-
  // switch conflict because the mobile sheet uses gestures.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "[") {
        e.preventDefault();
        toggleLeftCollapsed();
        return;
      }
      if (e.key === "1" || e.key === "2" || e.key === "3") {
        const tab: HubTab =
          e.key === "1" ? "overview" : e.key === "2" ? "notes" : "library";
        e.preventDefault();
        setTabRef.current?.(tab);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleLeftCollapsed]);

  // URL → state when the URL tab changes (back/forward navigation).
  useEffect(() => {
    const urlTab = parseTab(searchParams.get("tab"));
    if (urlTab !== tab) setTabState(urlTab);
    // Only react to URL, not to local state (setTab handles forward sync).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setTab = useCallback(
    (next: HubTab) => {
      setTabState(next);
      track("hub_tab_switched", { tab: next });
      if (tabUrlTimer.current !== null) {
        window.clearTimeout(tabUrlTimer.current);
      }
      tabUrlTimer.current = window.setTimeout(() => {
        setSearchParams(
          (prev) => {
            const copy = new URLSearchParams(prev);
            if (next === "overview") copy.delete("tab");
            else copy.set("tab", next);
            return copy;
          },
          { replace: true }
        );
      }, URL_SYNC_DEBOUNCE_MS);
    },
    [setSearchParams]
  );

  // Keep the keyboard-handler's ref pointed at the latest setTab.
  useEffect(() => {
    setTabRef.current = setTab;
  }, [setTab]);

  useEffect(() => {
    if (!loading && !is_admin) navigate("/foyer", { replace: true });
  }, [loading, is_admin, navigate]);

  // If the URL has a student param and it differs from state (e.g.
  // back/forward navigation), adopt the URL.
  useEffect(() => {
    if (urlStudent && urlStudent !== selected) {
      setSelectedState(urlStudent);
    }
  }, [urlStudent, selected]);

  // Mirror selection into URL + localStorage. `replace` keeps the
  // browser history clean; setSearchParams debounces so rapid arrow-key
  // scrubbing doesn't spam history.replaceState (see W#1 / Commit 3).
  const setSelected = useCallback(
    (next: string | null) => {
      setSelectedState(next);
      try {
        if (next) localStorage.setItem(LS_SELECTED_KEY, next);
      } catch {
        /* ignore quota errors */
      }
      if (next) track("hub_student_switched", { student_id: next });

      if (selectedUrlTimer.current !== null) {
        window.clearTimeout(selectedUrlTimer.current);
      }
      selectedUrlTimer.current = window.setTimeout(() => {
        setSearchParams(
          (prev) => {
            const copy = new URLSearchParams(prev);
            if (next) copy.set("student", next);
            else copy.delete("student");
            return copy;
          },
          { replace: true }
        );
      }, URL_SYNC_DEBOUNCE_MS);
    },
    [setSearchParams]
  );

  // Seed URL from localStorage-only state on first mount (no param yet).
  useEffect(() => {
    if (selected && !urlStudent) {
      setSearchParams(
        (prev) => {
          const copy = new URLSearchParams(prev);
          copy.set("student", selected);
          return copy;
        },
        { replace: true }
      );
    }
    // Intentionally only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The left panel already fetches everything we need via useHubStudents,
  // but this fallback lookup keeps the TA chat header responsive before
  // that larger query resolves (or if the current admin can't list all
  // users for some reason).
  const { data: selectedProfile } = useQuery<{ display_name: string | null } | null>({
    queryKey: ["hub-selected-name", selected],
    enabled: !!selected,
    queryFn: async () => {
      if (!selected) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("class_id", selected)
        .maybeSingle();
      return data ?? null;
    },
  });

  const selectedName = useMemo(
    () => selectedProfile?.display_name ?? null,
    [selectedProfile]
  );

  if (loading || !is_admin) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  const handleSelect = (id: string) => {
    setSelected(id);
    setMobileSelectorOpen(false);
  };

  return (
    <div className="min-h-screen h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800 shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin")}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          <div className="h-5 w-px bg-zinc-800" />
          <Command className="h-5 w-5 text-zinc-400" />
          <h1 className="text-lg font-semibold">Student Hub</h1>

          <div className="ml-auto md:hidden">
            <Sheet open={mobileSelectorOpen} onOpenChange={setMobileSelectorOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="border-zinc-800">
                  <Menu className="h-4 w-4 mr-1.5" />
                  Students
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 bg-zinc-950 border-zinc-800 text-zinc-100 w-[320px]"
              >
                <div className="h-full flex flex-col">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                    <Users className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium">Students</span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <HubStudentList selectedId={selected} onSelect={handleSelect} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto px-0 md:px-4 md:py-3 flex flex-col md:flex-row gap-0 md:gap-3">
        {/* Left panel */}
        {leftCollapsed ? (
          <aside
            className={cn(
              "hidden md:flex shrink-0 w-[36px] flex-col items-center",
              "border border-zinc-800 rounded-lg py-2 gap-2"
            )}
          >
            <button
              type="button"
              onClick={toggleLeftCollapsed}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
              aria-label="Expand student list (⌘[)"
              title="Expand (⌘[)"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <Users className="h-4 w-4 text-zinc-500" />
          </aside>
        ) : (
          <aside
            className={cn(
              "hidden md:flex shrink-0 w-[280px] flex-col",
              "border border-zinc-800 rounded-lg overflow-hidden"
            )}
          >
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-medium">Students</span>
              <button
                type="button"
                onClick={toggleLeftCollapsed}
                className="ml-auto p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-100"
                aria-label="Collapse student list (⌘[)"
                title="Collapse (⌘[)"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <HubStudentList selectedId={selected} onSelect={handleSelect} />
            </div>
          </aside>
        )}

        {/* Center panel: chat */}
        <section
          className={cn(
            "flex-1 min-w-0 min-h-0 flex flex-col",
            "border-t md:border border-zinc-800 md:rounded-lg overflow-hidden"
          )}
        >
          {selected ? (
            <TAChatView studentId={selected} studentName={selectedName} />
          ) : (
            <EmptyChatState />
          )}
        </section>

        {/* Right panel — mounted once; presentation swaps via matchMedia.
            Keeps TanStack Query + realtime subscriptions alive across
            viewport changes and halves the render cost on mobile. */}
        {isMobile ? (
          <div className="border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setMobileContextOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors"
            >
              <span className="text-sm font-medium">Context</span>
              {mobileContextOpen ? (
                <ChevronUp className="h-4 w-4 text-zinc-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              )}
            </button>
            {mobileContextOpen && (
              <div className="h-[60vh] border-t border-zinc-800">
                <HubContextPanel
                  studentId={selected}
                  studentName={selectedName}
                  tab={tab}
                  onTabChange={setTab}
                />
              </div>
            )}
          </div>
        ) : (
          <aside
            className={cn(
              "shrink-0 w-[360px] flex flex-col",
              "rounded-lg overflow-hidden",
              "backdrop-blur-xl bg-background/60 border border-border/40"
            )}
          >
            <HubContextPanel
              studentId={selected}
              studentName={selectedName}
              tab={tab}
              onTabChange={setTab}
            />
          </aside>
        )}
      </main>
    </div>
  );
}

function EmptyChatState() {
  return (
    <div className="flex-1 flex items-center justify-center text-center p-8">
      <div className="max-w-sm space-y-2">
        <Command className="h-8 w-8 text-zinc-600 mx-auto" />
        <div className="text-zinc-300 font-medium">Pick a student</div>
        <div className="text-sm text-zinc-500">
          Chat history is scoped per student. Select one from the list to
          start.
        </div>
      </div>
    </div>
  );
}
