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
  GripVertical,
} from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import LayoutPreview from "@/components/settings/LayoutPreview";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  defaultForSurface,
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
  const [justSaved, setJustSaved] = useState(false);
  const justSavedTimerRef = useRef<number | null>(null);
  const [pendingPreset, setPendingPreset] = useState<Exclude<PresetId, "custom"> | null>(null);

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

  const reorder = (surface: Surface, nextIds: string[]) => {
    setDraft((d) => ({ ...d, [surface]: nextIds }));
  };

  const resetSurface = (surface: Surface) => {
    setDraft((d) => ({ ...d, [surface]: defaultForSurface(surface) }));
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
    // Confirm preset switch when there are unsaved edits, so a careless
    // click doesn't blow away in-progress work.
    if (dirty) {
      setPendingPreset(id);
      return;
    }
    setDraft(getPreset(id));
  };

  const confirmPresetSwitch = () => {
    if (pendingPreset) setDraft(getPreset(pendingPreset));
    setPendingPreset(null);
  };

  const onSave = async () => {
    try {
      await save(draft);
      toast.success("Layout saved");
      // Brief on-button confirmation that times out and reverts.
      setJustSaved(true);
      if (justSavedTimerRef.current) window.clearTimeout(justSavedTimerRef.current);
      justSavedTimerRef.current = window.setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error(msg);
    }
  };

  useEffect(() => {
    return () => {
      if (justSavedTimerRef.current) window.clearTimeout(justSavedTimerRef.current);
    };
  }, []);

  const onDiscard = () => {
    setDraft(serverPrefs);
  };

  const onRestoreDefault = () => {
    setDraft(getPreset("default"));
    setConfirmRestoreOpen(false);
  };

  if (!authReady || !user) return null;

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/foyer")} aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-base font-semibold">Customize layout</h1>
              <p className="text-xs text-muted-foreground">Reorder and toggle items across the Main Hub.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:flex sm:items-center gap-2">
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
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : justSaved ? (
                <Check className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              {justSaved ? "Saved" : "Save"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-6 space-y-6">
        <LayoutPreview prefs={draft} userHasAccess={userHasAccess} />
        <PresetRow active={detectedPreset} onPick={applyPreset} />

        {(["orbital", "dock", "sidebar"] as Surface[]).map((surface) => (
          <SurfaceEditor
            key={surface}
            surface={surface}
            ids={draft[surface]}
            userHasAccess={userHasAccess}
            onMove={(idx, d) => move(surface, idx, d)}
            onReorder={(next) => reorder(surface, next)}
            onRemove={(idx) => remove(surface, idx)}
            onAdd={(id) => add(surface, id)}
            onResetSurface={() => resetSurface(surface)}
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

      {/* Preset-switch-while-dirty confirm */}
      <AlertDialog open={!!pendingPreset} onOpenChange={(open) => { if (!open) setPendingPreset(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch preset and lose unsaved edits?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching to a preset replaces your current draft. Your saved
              layout is unchanged until you click Save.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPresetSwitch}>
              Replace draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
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
  const activeLabel =
    active === "custom"
      ? "Custom"
      : presets.find((p) => p.id === active)?.label ?? "Default";
  const isCustom = active === "custom";
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          Preset
        </div>
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium " +
            (isCustom
              ? "bg-amber-500/10 text-amber-600 border border-amber-500/30"
              : "bg-primary/10 text-primary border border-primary/20")
          }
          aria-live="polite"
        >
          <span
            className={
              "h-1.5 w-1.5 rounded-full " + (isCustom ? "bg-amber-500" : "bg-primary")
            }
            aria-hidden
          />
          Active: {activeLabel}
        </span>
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
                  : "border-border/80 hover:border-border hover:bg-accent")
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
      </div>
    </section>
  );
}

function SurfaceEditor({
  surface,
  ids,
  userHasAccess,
  onMove,
  onReorder,
  onRemove,
  onAdd,
  onResetSurface,
}: {
  surface: Surface;
  ids: string[];
  userHasAccess: (item: CatalogItem) => boolean;
  onMove: (idx: number, delta: -1 | 1) => void;
  onReorder: (next: string[]) => void;
  onRemove: (idx: number) => void;
  onAdd: (id: string) => void;
  onResetSurface: () => void;
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

  const surfaceDefault = useMemo(() => defaultForSurface(surface), [surface]);
  const matchesDefault = useMemo(
    () =>
      ids.length === surfaceDefault.length &&
      ids.every((id, i) => surfaceDefault[i] === id),
    [ids, surfaceDefault],
  );

  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold">{SURFACE_TITLE[surface]}</h2>
          {isOrbital && (
            <div className="text-[11px] text-muted-foreground">Up to {ORBITAL_MAX} items.</div>
          )}
          {isSidebar && (
            <div className="text-[11px] text-muted-foreground">At least {SIDEBAR_MIN} item.</div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {!matchesDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetSurface}
              title={`Restore ${SURFACE_TITLE[surface].toLowerCase()} to default`}
              className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
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
      </div>

      {ids.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground text-center">
          Empty. Use Add to put something here.
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={ids}
          onReorder={onReorder}
          className="divide-y divide-border"
          as="ul"
        >
          {ids.map((id, i) => {
            const item = byId.get(id);
            if (!item) {
              return (
                <Reorder.Item
                  key={id}
                  value={id}
                  layout
                  dragListener={false}
                  className="px-4 py-2.5 flex items-center gap-3 text-sm text-muted-foreground italic bg-card"
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
                </Reorder.Item>
              );
            }
            return (
              <SurfaceRow
                key={id}
                id={id}
                item={item}
                idx={i}
                total={ids.length}
                accessible={userHasAccess(item)}
                atMin={atMin}
                minTooltip={minTooltip}
                onMove={onMove}
                onRemove={onRemove}
              />
            );
          })}
        </Reorder.Group>
      )}
    </section>
  );
}

function SurfaceRow({
  id,
  item,
  idx,
  total,
  accessible,
  atMin,
  minTooltip,
  onMove,
  onRemove,
}: {
  id: string;
  item: CatalogItem;
  idx: number;
  total: number;
  accessible: boolean;
  atMin: boolean;
  minTooltip: string;
  onMove: (idx: number, delta: -1 | 1) => void;
  onRemove: (idx: number) => void;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={id}
      layout
      dragListener={false}
      dragControls={dragControls}
      className={
        "px-4 py-2.5 flex items-center gap-3 bg-card " +
        (accessible ? "" : "opacity-60")
      }
    >
      <button
        type="button"
        onPointerDown={(e) => dragControls.start(e)}
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onMove(idx, -1)}
          disabled={idx === 0}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(idx, 1)}
          disabled={idx === total - 1}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <item.icon className="h-4 w-4 text-muted-foreground" />
      {item.description ? (
        <Tooltip delayDuration={400}>
          <TooltipTrigger asChild>
            <span className="text-sm flex-1 cursor-help">{item.label}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px]">
            {item.description}
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className="text-sm flex-1">{item.label}</span>
      )}
      {!accessible && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          No access
        </span>
      )}
      <button
        type="button"
        onClick={() => onRemove(idx)}
        disabled={atMin}
        title={atMin ? minTooltip : "Remove"}
        className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Remove"
      >
        <X className="h-4 w-4" />
      </button>
    </Reorder.Item>
  );
}
