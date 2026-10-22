import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useReadingCenterAccess } from "@/hooks/useReadingCenterAccess";
import { useDeleteTag, usePreferences, useSaveTag, useTags } from "../hooks/useReadingCenterData";
import { RC_HOME_PATH, RC_LIBRARY_PATH, RC_PROFILE_PATH, RC_RECALL_PATH, RC_RRC_PATH, RC_TAGS_PATH, rcTagPath } from "../lib/routes";
import type { ReaderTheme, UserTag } from "../lib/types";
import { Icon, MIcon, type IconName } from "./Icon";
import { ConfirmDialog, PopMenu, TAG_COLORS, TagColorPicker, TagEditDialog, TagGlyph } from "./Tags";
import { AddTextScreen } from "./AddText";
import { ReadingExerciseLayout } from "./ReadingExerciseLayout";
import { useClassroomMotion } from "@/hooks/useClassroomMotion";
import "@/styles/classroom-motion.css";
import { useRouteView } from "../hooks/useRouteView";

/** The activity workspace stays light; the immersive reader keeps saved appearance. */
export function useAppTheme(reader = false): void {
  const theme: ReaderTheme = usePreferences().data?.theme ?? "system";
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "high_contrast" ? theme : !reader ? "light"
        : theme === "system" ? (mq.matches ? "dark" : "light") : theme;
      const root = document.getElementById("reading-center-root");
      if (root) root.dataset.rcTheme = resolved;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, reader]);
}

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: RC_HOME_PATH, label: "Dashboard", icon: "apps", end: true },
  { to: RC_RRC_PATH, label: "LR Training", icon: "create", end: true },
  { to: RC_RECALL_PATH, label: "RC Training", icon: "documentText", end: true },
  { to: RC_LIBRARY_PATH, label: "Speed Reading", icon: "book", end: true },
  { to: RC_TAGS_PATH, label: "Tags", icon: "pricetag" },
  { to: RC_PROFILE_PATH, label: "Reading Progress", icon: "statsChart" },
];

const TAGS_RETURN_KEY = "rc-tags-return";
const inTags = (path: string) => path === RC_TAGS_PATH || path.startsWith(RC_TAGS_PATH + "/");

/** The main destination a path belongs to, so a return link can name it. */
export function navDestinationFor(path: string): { to: string; label: string } {
  const clean = path.split(/[?#]/)[0];
  const match = NAV.find((n) => n.to !== RC_HOME_PATH && n.to !== RC_TAGS_PATH && (clean === n.to || clean.startsWith(n.to + "/")))
    ?? (clean === RC_HOME_PATH ? NAV[0] : undefined);
  return match ? { to: match.to, label: match.label } : { to: RC_LIBRARY_PATH, label: "Speed Reading" };
}

/** Where Tags was entered from, kept for the session so a reload or tag switch still names it. */
function useTagsReturn(pathname: string): { to: string; label: string } {
  const read = () => { try { return window.sessionStorage.getItem(TAGS_RETURN_KEY); } catch { return null; } };
  const [from, setFrom] = useState<string | null>(read);
  const previous = useRef(pathname);
  useEffect(() => {
    if (inTags(pathname) && !inTags(previous.current)) {
      try { window.sessionStorage.setItem(TAGS_RETURN_KEY, previous.current); } catch { /* the default return is used */ }
      setFrom(previous.current);
    }
    previous.current = pathname;
  }, [pathname]);
  return navDestinationFor(from && !inTags(from) ? from : RC_LIBRARY_PATH);
}

export function AppShell({ rrcOnly = false }: { rrcOnly?: boolean }): React.ReactElement {
  const [exerciseActive, setExerciseActive] = useState(false);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 768);
  const [navOpen, setNavOpen] = useState(() => window.innerWidth >= 768);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const change = () => { setNarrow(media.matches); setNavOpen(!media.matches); };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const [addOpen, setAddOpen] = useState(false);
  const [addMenuTop, setAddMenuTop] = useState(180);
  const [screen, setScreen] = useState<"paste" | "import" | null>(null);
  const [creatingTag, setCreatingTag] = useState(false);
  const { is_admin } = useUserPermissions();
  const { user, authReady } = useAuth();
  const signedIn = authReady && !!user;
  // One shell for every destination. Access is checked here only to decide which links to show;
  // each page keeps its own gate, so sharing the shell grants nothing.
  const access = useReadingCenterAccess(!is_admin);
  // A failed grant read is unknown, not a revoked grant. Keep destinations reachable;
  // their page gates still decide whether the content may be shown.
  const accessUnknown = signedIn && !is_admin && (!!access.isPending || !!access.isError);
  const fullAccess = signedIn && (is_admin || access.allowed);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activePath = useRef(pathname);
  activePath.current = pathname;
  const onTags = inTags(pathname);
  const onLr = pathname === RC_RRC_PATH || pathname.startsWith(RC_RRC_PATH + "/");
  const showLr = signedIn && (fullAccess || accessUnknown || rrcOnly || onLr);
  const tagsReturn = useTagsReturn(pathname);
  const content = useRef<HTMLDivElement>(null);
  const { remember } = useRouteView(content);
  // Exercises keep their own focus, timers and full-screen geometry.
  const motionKey = exerciseActive || /\/(?:read|attempt)\//.test(pathname) ? '' : `reading-room:${pathname}`;
  useClassroomMotion(content, motionKey);
  useEffect(() => { if (narrow) setNavOpen(false); }, [pathname, narrow]);
  useEffect(() => {
    if (exerciseActive || !narrow || !navOpen) return;
    const openedOnPath = pathname;
    const controls = () => Array.from(drawer.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])') ?? []);
    controls()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setNavOpen(false); }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      // Dismissal returns to the trigger. Navigation leaves focus on the new heading.
      if (activePath.current === openedOnPath) menuButton.current?.focus();
    };
  }, [narrow, navOpen, exerciseActive]);
  // Small screens give the activity the full stage; navigation opens over it.
  const rail = !narrow && !navOpen;

  return (
    <ReadingExerciseLayout.Provider value={setExerciseActive}>
    <div className="relative flex min-h-screen flex-col md:flex-row" style={{ background: "var(--rc-page)", color: "var(--rc-text)" }}>
      {!exerciseActive && narrow && <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b px-3" style={{ background: "var(--rc-sidenav)", color: "var(--rc-nav-text)" }}>
        <button ref={menuButton} type="button" aria-label="Open Reading Center menu" aria-expanded={navOpen} aria-controls="reading-center-navigation" onClick={() => setNavOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-[var(--rc-nav-hover)]">
          <Icon name="menu" size={24} />
        </button>
        <span className="text-base font-semibold">Reading Center</span>
      </header>}
      {!exerciseActive && narrow && navOpen && <button type="button" aria-label="Close menu" onClick={() => setNavOpen(false)} className="fixed inset-0 z-30 bg-black/40" />}
      {!exerciseActive && (!narrow || navOpen) && <aside
        ref={drawer}
        id="reading-center-navigation"
        role={narrow ? 'dialog' : undefined}
        aria-modal={narrow ? true : undefined}
        aria-label={narrow ? 'Reading Center navigation' : undefined}
        onClickCapture={(event) => { if ((event.target as HTMLElement).closest("a, button")) remember(); }}
        className={`${narrow && navOpen ? "fixed left-0 z-40" : "sticky"} top-0 h-screen shrink-0 overflow-y-auto transition-[width] duration-200`}
        style={{ width: rail ? 90 : 230, background: "var(--rc-sidenav)", borderRight: "0.8px solid rgba(128,128,128,.15)" }}
      >
        <NavLink to={is_admin ? "/teacher/tools" : "/classroom"} aria-label={is_admin ? "Teacher Workspace" : "LSAT U Home"} title={is_admin ? "Teacher Workspace" : "LSAT U Home"} className="mx-4 mt-3 flex min-h-11 items-center justify-center rounded-lg border border-current/20 px-2 py-3 text-center text-xs font-medium hover:bg-[var(--rc-nav-hover)]" style={{ color: "var(--rc-nav-text)" }}>
          <span>{rail ? "LSAT U" : is_admin ? "Teacher Workspace" : "LSAT U Home"}</span>
        </NavLink>
        <div className="flex h-[60px] items-center">
          {narrow && <button type="button" aria-label={rail ? "Show menu" : "Hide menu"} onClick={() => setNavOpen((o) => !o)} className="ml-[15px] flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-[rgba(158,158,158,.2)]" style={{ color: "var(--rc-nav-text)" }}>
            <Icon name="menu" size={24} />
          </button>}
          <NavLink to={fullAccess || accessUnknown ? RC_HOME_PATH : RC_RRC_PATH} aria-label="Reading Center home" title="Reading Center home" onClick={() => { if (narrow) setNavOpen(false); }} className={`${narrow ? "ml-2.5" : "px-5"} flex min-h-11 items-center text-[19px] font-semibold leading-tight tracking-tight`} style={{ color: "var(--rc-nav-text)" }}>
            {rail ? <Icon name="book" size={24} /> : "Reading Center"}
          </NavLink>
        </div>
        {fullAccess && <div className="relative px-5 pt-[10px]">
              <button
                type="button"
                aria-label="Add Text"
                onClick={(e) => { setAddMenuTop(e.currentTarget.getBoundingClientRect().bottom + 4); setAddOpen((o) => !o); }}
                className="flex h-[55px] items-center rounded-xl text-sm font-medium"
                style={{ width: rail ? 49 : 189, background: "var(--rc-addtext-bg)", color: "var(--rc-addtext-fg)" }}
              >
                <Icon name="addCircle" size={22} className={rail ? "mx-auto" : "ml-[16px]"} />
                {!rail && <span className="ml-[30px] leading-8">Add Text</span>}
              </button>
              {addOpen && (
                <AddTextMenu
                  top={addMenuTop}
                  onClose={() => setAddOpen(false)}
                  onPick={(s) => {
                    setAddOpen(false);
                    setScreen(s);
                  }}
                />
              )}
            </div>}
            <nav aria-label="Main" className="mt-[22px] space-y-1 px-5">
              {NAV.filter((n) => (n.to === RC_RRC_PATH ? showLr : fullAccess || accessUnknown)).map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  title={rail ? n.label : undefined}
                  aria-label={n.label}
                  className="relative flex h-[52px] items-center rounded-lg text-sm font-medium transition-colors hover:bg-[var(--rc-nav-hover)]"
                  style={({ isActive }) => ({
                    width: rail ? 49 : 189,
                    background: isActive ? "var(--rc-nav-active-bg)" : undefined,
                    color: isActive ? "var(--rc-nav-active-fg)" : "var(--rc-nav-text)",
                  })}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute inset-y-0 left-0 w-1 rounded-l-lg" style={{ background: "var(--rc-nav-active-fg)" }} />}
                      <Icon name={n.icon} size={18} className={rail ? "mx-auto" : "ml-[16px]"} />
                      {!rail && <span className="ml-[17px]" style={{ color: isActive ? "var(--rc-nav-text)" : undefined }}>{n.label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
        {onTags && fullAccess && <TagsNav rail={rail} back={tagsReturn} onBack={() => navigate(tagsReturn.to)} onCreate={() => setCreatingTag(true)} />}
      </aside>}
      <div ref={content} className="classroom-motion-root classroom-motion-local min-w-0 flex-1">
        <Outlet />
      </div>
      {screen && <AddTextScreen mode={screen} onClose={() => setScreen(null)} onSaved={(slug) => { setScreen(null); navigate(RC_LIBRARY_PATH); void slug; }} />}
      {creatingTag && <TagEditDialog onClose={() => setCreatingTag(false)} onSaved={(t) => navigate(rcTagPath(t.name))} />}
    </div>
    </ReadingExerciseLayout.Provider>
  );
}

/** Tags group, below the main destinations: a named return, Create New Tag, then one row per tag with a menu. */
function TagsNav({ rail, back, onBack, onCreate }: { rail: boolean; back: { to: string; label: string }; onBack: () => void; onCreate: () => void }): React.ReactElement {
  const tags = useTags().data ?? [];
  const saveTag = useSaveTag();
  const deleteTag = useDeleteTag();
  const navigate = useNavigate();
  const current = useTagParam();
  const [menu, setMenu] = useState<{ tag: UserTag; x: number; y: number; colours: boolean } | null>(null);
  const [editing, setEditing] = useState<UserTag | null>(null);
  const [deleting, setDeleting] = useState<UserTag | null>(null);
  const pill = "flex h-[55px] items-center rounded-xl text-sm font-medium";
  const swatch = TAG_COLORS[menu?.tag.color || 1];
  return (
    <div className="mt-3 border-t px-5 pt-3" style={{ borderColor: "rgba(128,128,128,.25)" }} role="group" aria-label="Tags">
      <button type="button" aria-label={`Back to ${back.label}`} title={`Back to ${back.label}`} onClick={onBack} className={pill} style={{ width: rail ? 49 : 189, background: "var(--rc-nav-active-bg)", color: "var(--rc-nav-text)" }}>
        <MIcon name="arrow_circle_left" size={22} className={rail ? "mx-auto" : "ml-[14px]"} style={{ color: "var(--rc-nav-active-fg)" }} />
        {!rail && <span className="ml-[16px] truncate pr-2">Back to {back.label}</span>}
      </button>
      <button type="button" aria-label="Create New Tag" onClick={onCreate} className={`${pill} mt-[11px]`} style={{ width: rail ? 49 : 189, background: "var(--rc-addtext-bg)", color: "var(--rc-addtext-fg)" }}>
        <Icon name="addCircle" size={22} className={rail ? "mx-auto" : "ml-[14px]"} />
        {!rail && <span className="ml-[8px]">Create New Tag</span>}
      </button>
      <ul className="mt-2">
        {tags.map((t) => {
          const active = t.name === current;
          return (
            <li key={t.name} className="group relative flex h-14 items-center" title={rail ? t.name : undefined}>
              <span
                aria-hidden
                className="invisible absolute inset-x-0 top-1/2 h-12 -translate-y-1/2 overflow-hidden rounded-lg group-hover:visible"
                style={{ visibility: active ? "visible" : undefined, background: active ? "var(--rc-nav-active-bg)" : "var(--rc-nav-hover)" }}
              >
                {active && <span className="block h-full w-1" style={{ background: "#3aab1f" }} />}
              </span>
              <button type="button" onClick={() => navigate(rcTagPath(t.name))} className="relative z-[1] flex h-full flex-1 items-center pl-4 text-left text-sm font-medium" style={{ color: active ? "#3aab1f" : "var(--rc-nav-text)" }}>
                <TagGlyph color={t.color} />
                {!rail && <span className="ml-[5px] w-[110px] truncate">{t.name}</span>}
              </button>
              {!rail && (
                <button
                  type="button"
                  aria-label={`Options for ${t.name}`}
                  className="relative z-[1] mr-1 flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ color: "var(--rc-nav-text)" }}
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setMenu({ tag: t, x: r.left, y: r.bottom, colours: false });
                  }}
                >
                  <MIcon name="more_vert" size={20} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {menu && (
        <PopMenu x={menu.x} y={menu.y} width={menu.colours ? 260 : 200} onClose={() => setMenu(null)}>
          {menu.colours ? (
            <TagColorPicker
              selected={menu.tag.color || 1}
              onPick={(c) => { saveTag.mutate({ oldName: menu.tag.name, name: menu.tag.name, color: c }); setMenu(null); }}
              onRemove={() => { saveTag.mutate({ oldName: menu.tag.name, name: menu.tag.name, color: 0 }); setMenu(null); }}
            />
          ) : (
            <>
              <button type="button" role="menuitem" className="rc-menu-item" onClick={() => setMenu({ ...menu, colours: true })}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs" style={{ background: swatch[1], color: swatch[0], fontFamily: "Roboto, sans-serif" }}>a</span>
                <span className="ml-[3px] flex-1">Tag Color</span>
                <MIcon name="arrow_right" />
              </button>
              <button type="button" role="menuitem" className="rc-menu-item" onClick={() => { setEditing(menu.tag); setMenu(null); }}>Edit Tag</button>
              <button type="button" role="menuitem" className="rc-menu-item" onClick={() => { setDeleting(menu.tag); setMenu(null); }}>Delete Tag</button>
            </>
          )}
        </PopMenu>
      )}
      {editing && (
        <TagEditDialog
          tag={editing}
          onClose={() => setEditing(null)}
          onSaved={(t) => { if (current === editing.name) navigate(rcTagPath(t.name), { replace: true }); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}`}
          message={`This will delete the tag ${deleting.name}. Are you sure you want to continue?`}
          onNo={() => setDeleting(null)}
          onYes={() => {
            const name = deleting.name;
            setDeleting(null);
            deleteTag.mutate(name, { onSuccess: () => { if (current === name) navigate(RC_TAGS_PATH, { replace: true }); } });
          }}
        />
      )}
    </div>
  );
}

/** The shell sits above the routed page, so read the tag from the path itself. */
function useTagParam(): string | undefined {
  const path = useLocation().pathname;
  const rest = path.startsWith(RC_TAGS_PATH + "/") ? path.slice(RC_TAGS_PATH.length + 1) : "";
  return rest ? decodeURIComponent(rest) : undefined;
}

function AddTextMenu({ top, onClose, onPick }: { top: number; onClose: () => void; onPick: (s: "paste" | "import") => void }): React.ReactElement {
  useEffect(() => {
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest("[data-rc-addmenu]") && onClose();
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [onClose]);
  const item = (icon: IconName, label: string, onClick?: () => void, title?: string) => (
    <button type="button" className="rc-menu-item h-12 text-sm font-normal disabled:opacity-40" onClick={onClick} disabled={!onClick} title={title}>
      <Icon name={icon} size={24} /> {label}
    </button>
  );
  return createPortal(
    <div data-rc-addmenu className="rc-menu fixed left-[18px] z-50 w-[192px] py-2" style={{ top }}>
      {item("copy", "Paste Text", () => onPick("paste"))}
      {item("documentText", "Import Document", () => onPick("import"))}
      {/* AI Book Summary and AI Generate are left out until LSAT U integration (Joshua, 2026-10-13). */}
    </div>,
    document.getElementById("reading-center-root") ?? document.body,
  );
}

/** Spreeder top-right bar: book search box and account button. */
export function TopBar({ query, onQuery, placeholder }: { query?: string; onQuery?: (q: string) => void; placeholder?: string }): React.ReactElement {
  const navigate = useNavigate();
  return (
    <div className="flex h-[50px] min-w-0 items-center justify-end gap-2 px-3 md:gap-3 md:pr-[44px]">
      {onQuery && (
        <label className="flex h-8 min-w-0 flex-1 items-center rounded-lg px-3 text-[13px] md:max-w-[232px]" style={{ background: "var(--rc-searchbox)", border: "0.8px solid rgba(128,128,128,.35)" }}>
          <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder ?? "Search text"} aria-label="Search text" className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-[var(--rc-text)]" style={{ color: "var(--rc-text)" }} />
          <Icon name="search" size={18} />
        </label>
      )}
      <button type="button" aria-label="LSAT U Profile" title="LSAT U Profile" onClick={() => navigate("/classroom/account")} className="flex items-center" style={{ color: "var(--rc-text)" }}>
        <Icon name="personCircle" size={34} />
      </button>
    </div>
  );
}
