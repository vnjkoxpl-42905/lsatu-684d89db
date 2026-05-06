import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useBlocker } from "react-router-dom";
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Plus,
  RotateCcw,
  Save,
  X,
  Loader2,
  Check,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useLayoutPrefs } from "@/hooks/useLayoutPrefs";
import {
  DOCK_CATALOG,
  ORBITAL_CATALOG,
  SIDEBAR_CATALOG,
  ORBITAL_MAX,
  ORBITAL_MIN,
  SIDEBAR_MIN,
  type CatalogItem,
} from "@/lib/layoutCatalog";
import {
  defaultLayout,
  detectPreset,
  getPreset,
  type LayoutPrefs,
  type PresetId,
} from "@/lib/layoutPresets";

type Surface = "orbital" | "dock" | "sidebar";

const SURFACE_TITLE: Record<Surface, string> = {
  orbital: "Orbital ring",
  dock: "Dock",
  sidebar: "Sidebar",
};

function catalogFor(surface: Surface): CatalogItem[] {
  return surface === "orbital" ? ORBITAL_CATALOG : surface === "dock" ? DOCK_CATALOG : SIDEBAR_CATALOG;
}

export default function SettingsLayout() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const perms = useUserPermissions();
  const { prefs: serverPrefs, loading, save, saving } = useLayoutPrefs();

  const [draft, setDraft] = useState<LayoutPrefs>(defaultLayout());
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate("/auth");
    }
  }, [user, authReady, navigate]);

  useEffect(() => {
    if (!loading) setDraft(serverPrefs);
  }, [loading, serverPrefs]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(serverPrefs),
    [draft, serverPrefs],
  );

  // ── Unsaved-changes guard #1: browser-level beforeunload (refresh, tab close) ──
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore the message; setting returnValue is what triggers
      // the confirm.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ── Unsaved-changes guard #2: in-app router blocker ──
  // useBlocker triggers when an in-app navigation is attempted while dirty;
  // we surface a confirm dialog rather than navigating directly.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  const detectedPreset = detectPreset(draft);

  const userHasAccess = (item: CatalogItem) => {
    if (item.adminOnly) return perms.is_admin;
    if (item.requires) return perms.is_admin || !!perms[item.requires as PermissionFlag];
    return true;
  };

  const move = (surface: Surface, idx: number, delta: -1 | 1) => {
    setDraft((d) => {
      const list = [...d[surface]];
      const j = idx + delta;
      if (j < 0 || j >= list.length) return d;
      [list[idx], list[j]] = [list[j], list[idx]];
      return { ...d, [surface]: list };
    });
  };

  const remove = (surface: Surface, idx: number) => {
    setDraft((d) => {
      if (surface === "orbital" && d.orbital.length <= ORBITAL_MIN) return d;
      if (surface === "sidebar" && d.sidebar.length <= SIDEBAR_MIN) return d;
      const list = d[surface].filter((_, i) => i !== idx);
      return { ...d, [surface]: list };
    });
  };

  const add = (surface: Surface, id: string) => {
    setDraft((d) => {
      if (d[surface].includes(id)) return d;
      if (surface === "orbital" && d.orbital.length >= ORBITAL_MAX) return d;
      return { ...d, [surface]: [...d[surface], id] };
    });
  };

  const applyPreset = (id: Exclude<PresetId, "custom">) => {
    setDraft(getPreset(id));
  };

  const onSave = async () => {
    try {
      await save(draft);
      toast.success("Layout saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error(msg);
    }
  };

  const onDiscard = () => {
    setDraft(serverPrefs);
  };

  const onRestoreDefault = () => {
    setDraft(getPreset("default"));
    setConfirmRestoreOpen(false);
  };

  if (!authReady || !user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/foyer")} aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-base font-semibold">Customize layout</h1>
              <p className="text-xs text-muted-foreground">Reorder and toggle items across the Foyer.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              disabled={!dirty || saving || loading}
              title="Revert unsaved edits to your last saved layout"
            >
              <Undo2 className="h-3.5 w-3.5 mr-1.5" /> Discard changes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmRestoreOpen(true)}
              disabled={saving || loading}
              title="Replace your current layout with the Default preset"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore default
            </Button>
            <Button size="sm" onClick={onSave} disabled={!dirty || saving || loading}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-6 space-y-6">
        <PresetRow active={detectedPreset} onPick={applyPreset} />

        {(["orbital", "dock", "sidebar"] as Surface[]).map((surface) => (
          <SurfaceEditor
            key={surface}
            surface={surface}
            ids={draft[surface]}
            userHasAccess={userHasAccess}
            onMove={(idx, d) => move(surface, idx, d)}
            onRemove={(idx) => remove(surface, idx)}
            onAdd={(id) => add(surface, id)}
          />
        ))}
      </main>

      {/* Restore default confirm */}
      <AlertDialog open={confirmRestoreOpen} onOpenChange={setConfirmRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore default layout?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces your current draft with the Default preset. Your saved
              layout is unchanged until you click Save.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onRestoreDefault}>Restore default</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved-changes router blocker confirm */}
      <AlertDialog open={blocker.state === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved layout edits. Leaving will discard them — your
              saved layout stays as it was.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Stay on this page</AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>
              Discard and leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PresetRow({
  active,
  onPick,
}: {
  active: PresetId;
  onPick: (id: Exclude<PresetId, "custom">) => void;
}) {
  const presets: { id: Exclude<PresetId, "custom">; label: string; desc: string }[] = [
    { id: "default", label: "Default", desc: "What you see on a fresh account." },
    { id: "minimal", label: "Minimal", desc: "Just the essentials." },
    { id: "power", label: "Power-user", desc: "Everything turned on." },
  ];
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
        Preset
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {presets.map((p) => {
          const isActive = active === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p.id)}
              className={
                "text-left rounded-lg border px-3 py-2.5 transition-colors " +
                (isActive
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-accent")
              }
            >
              <div className="flex items-center gap-1.5">
                {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                <span className="text-sm font-medium">{p.label}</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{p.desc}</div>
            </button>
          );
        })}
        {active === "custom" && (
          <div className="col-span-full text-[11px] text-muted-foreground italic px-1">
            You've made custom edits. Save to keep them, or pick a preset above to start over.
          </div>
        )}
      </div>
    </section>
  );
}

function SurfaceEditor({
  surface,
  ids,
  userHasAccess,
  onMove,
  onRemove,
  onAdd,
}: {
  surface: Surface;
  ids: string[];
  userHasAccess: (item: CatalogItem) => boolean;
  onMove: (idx: number, delta: -1 | 1) => void;
  onRemove: (idx: number) => void;
  onAdd: (id: string) => void;
}) {
  const catalog = catalogFor(surface);
  const byId = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);
  const visibleSet = new Set(ids);
  const addable = catalog.filter((c) => !visibleSet.has(c.id) && userHasAccess(c));

  const isOrbital = surface === "orbital";
  const isSidebar = surface === "sidebar";
  const atMax = isOrbital && ids.length >= ORBITAL_MAX;
  const atMinOrbital = isOrbital && ids.length <= ORBITAL_MIN;
  const atMinSidebar = isSidebar && ids.length <= SIDEBAR_MIN;
  const atMin = atMinOrbital || atMinSidebar;
  const minTooltip = atMinOrbital
    ? "Orbital ring needs at least one item"
    : atMinSidebar
    ? "Sidebar needs at least one item"
    : "Remove";

  // Cache the listRef so focus can return to the Add button after a remove
  // empties the list. (Phase C will expand on this with per-row refs.)
  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <div className="text-sm font-semibold">{SURFACE_TITLE[surface]}</div>
          {isOrbital && (
            <div className="text-[11px] text-muted-foreground">Up to {ORBITAL_MAX} items.</div>
          )}
          {isSidebar && (
            <div className="text-[11px] text-muted-foreground">At least {SIDEBAR_MIN} item.</div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button ref={addBtnRef} variant="outline" size="sm" disabled={atMax || addable.length === 0}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {addable.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">Nothing left to add.</div>
            ) : (
              addable.map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => onAdd(item.id)}>
                  <item.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                  {item.label}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ul className="divide-y divide-border">
        {ids.length === 0 && (
          <li className="px-4 py-6 text-sm text-muted-foreground text-center">
            Empty. Use Add to put something here.
          </li>
        )}
        {ids.map((id, i) => {
          const item = byId.get(id);
          if (!item) {
            return (
              <li
                key={id}
                className="px-4 py-2.5 flex items-center gap-3 text-sm text-muted-foreground italic"
              >
                Unknown item ({id})
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          }
          const accessible = userHasAccess(item);
          return (
            <li
              key={id}
              className={
                "px-4 py-2.5 flex items-center gap-3 " +
                (accessible ? "" : "opacity-60")
              }
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => onMove(i, -1)}
                  disabled={i === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Move up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(i, 1)}
                  disabled={i === ids.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Move down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">{item.label}</span>
              {!accessible && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  No access
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(i)}
                disabled={atMin}
                title={atMin ? minTooltip : "Remove"}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
