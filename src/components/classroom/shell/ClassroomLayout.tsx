import { reviewRailLanding } from '@/lib/railCatalog';
import { notesArchiveOrigin, notesDetailRoute, validateNotesReturnTo } from "@/lib/myWorkNotesNavigation";
import * as React from "react";
import { useMotionValue } from "framer-motion";
import NotificationBell from "@/components/notifications/NotificationBell";
import {
  ChevronsUpDown,
  Lock,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { useClassroomItems } from "@/hooks/useClassroomItems";
import { useFlagged } from "@/hooks/useFlagged";
import { useJournalEntries } from "@/hooks/useJournalEntries";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { useNotifications } from "@/hooks/useNotifications";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useRailPrefs } from "@/hooks/useRailPrefs";
import { useClassroomRailMotion } from "@/hooks/useClassroomRailMotion";
import { useClassroomOverlayMotion } from "@/hooks/useClassroomOverlayMotion";
import { resolveRailGroups, type RailItem } from "@/lib/railCatalog";
import { destinationLandingPath, railItemLocked } from "@/lib/destinationAccess";
import { preloadDrillHub } from "@/lib/routePreload";
import { flagLabel } from "@/lib/flaggedService";
import { reviewReturnTo } from "@/components/review/ReviewReturnLink";
import {
  useStudentAssignments,
  useStudentTAAssignments,
} from "@/hooks/useStudentAssignments";
import {
  groupNotes,
  isNoteUnread,
  type ClassroomWorkRow,
} from "@/components/classroom/classroomData";
import {
  useAssignedTodoFeed,
  routeWithReturnTo,
} from "@/hooks/useAssignedTodoFeed";
import { useDialogOverlay } from "@/components/classroom/shell/useDialogOverlay";
import AssignedReadingCenterLink from '@/components/classroom/AssignedReadingCenterLink';
import { useReadingCenterAccess } from '@/hooks/useReadingCenterAccess';
import "@/components/classroom/classroom.css";
import "@/styles/classroom-motion.css";
import "@/styles/classroom-rail-motion.css";
import { ClassroomMotionContent } from "./ClassroomMotionContent";
import { useNoteReaderTransition } from '@/hooks/useNoteReaderTransition';
import { ClassroomLayoutContext, type ClassroomSection } from "./classroomLayoutContext";

const SECTION_TITLES: Record<ClassroomSection, string> = {
  notes: "Notes and recaps",
  work: "Assigned work",
  flagged: "Flagged",
  journal: "Wrong answers",
};

function useRetainedValue<T>(value: T, canReplace: boolean) {
  const ref = React.useRef(value);
  if (canReplace) ref.current = value;
  return ref.current;
}

function sectionFromPath(pathname: string): ClassroomSection | null {
  if (pathname === "/journal" || pathname.startsWith("/journal/")) {
    return "journal";
  }
  // Flagged lives outside the /classroom path but inside the same frame.
  if (pathname === "/flagged" || pathname.startsWith("/flagged/")) {
    return "flagged";
  }
  if (
    pathname === "/classroom/recaps" ||
    pathname.startsWith("/classroom/item/")
  ) {
    return "notes";
  }
  if (
    pathname.startsWith("/classroom/ta/") ||
    (/^\/classroom\/[^/]+$/.test(pathname) &&
      pathname !== "/classroom/drill" &&
      pathname !== "/classroom/uploads" &&
      pathname !== "/classroom/account" &&
      pathname !== "/classroom/admissions" &&
      pathname !== "/classroom/recaps")
  ) {
    return "work";
  }
  return null;
}

function PanelWash() {
  return (
    <div className="classroom-panel-wash" aria-hidden="true">
      <i className="classroom-panel-wash-light" />
      <i className="classroom-panel-wash-dark" />
    </div>
  );
}

function ClassroomSidebar({
  displayName,
  activeSection,
  onHome,
  onNavigate,
}: {
  displayName: string;
  activeSection: ClassroomSection | null;
  onHome: () => void;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const permissions = useUserPermissions();
  const readingCenter = useReadingCenterAccess(!permissions.is_admin);
  const readingCenterAssigned = !permissions.loading && !permissions.is_admin && readingCenter.allowed;
  const destinationPermissions = { ...permissions, readingCenterAssigned,
    readingCenterChecking: !permissions.is_admin && readingCenter.isPending };
  const unreadMessages = useUnreadMessageCount();
  const workFeed = useAssignedTodoFeed();
  const sidebarNotes = useClassroomItems();
  const unreadWork = workFeed.loading || workFeed.failed ? 0 : workFeed.rows.filter(row => row.status !== "completed" && row.isUnread && (row.sourceTable === "reading_center" ? readingCenterAssigned : permissions.is_admin || permissions.has_classroom_access)).length;
  const unreadTeachingNotes = sidebarNotes.isLoading || sidebarNotes.isError || !(permissions.is_admin || permissions.has_classroom_access) ? 0 : groupNotes(sidebarNotes.data ?? []).unread.length;
  const unreadMyWork = unreadWork + unreadTeachingNotes;
  const bellMouseX = useMotionValue(Infinity);
  const { notifications, markSignupNotificationsRead } = useNotifications();
  const unreadStudentSignups = React.useMemo(
    () =>
      notifications.filter(
        (notification) => notification.type === "signup" && !notification.read
      ).length,
    [notifications],
  );
  const { prefs: railPrefs } = useRailPrefs();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const navigationRef = React.useRef<HTMLElement>(null);
  useClassroomRailMotion(navigationRef, `${location.pathname}|${activeSection ?? ""}`);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const go = (path: string) => {
    onNavigate?.();
    navigate(path);
  };

  const handleSignOut = () => {
    onNavigate?.();
    void signOut({ keepSavedEmail: true }).then(({ error }) => {
      if (error) toast.error("Sign out failed. Please try again.");
    });
  };

  const openStudents = () => {
    go("/teacher/students");
  };

  React.useEffect(() => {
    if (
      location.pathname.startsWith("/teacher/students") &&
      unreadStudentSignups > 0
    ) {
      void markSignupNotificationsRead();
    }
  }, [
    location.pathname,
    markSignupNotificationsRead,
    unreadStudentSignups,
  ]);

  const navClass = (active: boolean) =>
    `classroom-nav${active ? " classroom-nav-active" : ""}`;

  // One predicate, matching what ProtectedRoute actually enforces. Anything
  // else and the rail draws a padlock the route does not honour (or the
  // reverse), which the student discovers by typing the URL.
  //
  // `loading` is "unknown", never "denied": every flag reads false until the
  // permission fetch lands, so treating that as denial padlocks the whole rail
  // for a beat on every cold load.
  //
  // Rail destinations do not use this: their routes admit any signed-in
  // account and explain locked sections themselves (see railItemLocked).
  const canAccess = (item: Pick<RailItem, "flags" | "allowSignedIn" | "requireAdmin">) =>
    item.requireAdmin
      ? permissions.is_admin
      : permissions.loading ||
        permissions.is_admin ||
        item.flags.length === 0 ||
        (item.allowSignedIn && !!user) ||
        item.flags.some((flag) => permissions[flag]);

  // `onPrefetch` (below) fires on hover and keyboard focus, not on click: the
  // point is to have the route's chunk parsed before the click lands, so the
  // student never sees the stage fallback at all.

  // An assigned tool belongs beside My Work. Preserve all other customized
  // entries; this temporarily restores its parent destination without saving prefs.
  const displayedRailPrefs = readingCenterAssigned
    ? { ...railPrefs, hidden: railPrefs.hidden.filter((id) => id !== 'my-work') }
    : railPrefs;
  const railGroups = resolveRailGroups(displayedRailPrefs).map((group) => ({
    ...group,
    items: group.items.filter((item) => (item.id !== "schedule" && item.id !== "my-work") || !permissions.is_admin),
  }));

  // Behavior stays here (it needs closures over routing + section state); the
  // catalog owns what the rail contains and in what order.
  const railBehavior = (
    item: RailItem,
  ): { active: boolean; onClick: () => void; onPrefetch?: () => void } => {
    switch (item.id) {
      case "home":
        return {
          active: location.pathname === "/classroom" && !activeSection,
          onClick: () => {
            onNavigate?.();
            onHome();
          },
        };
      case "my-work":
        return {
          active: location.pathname.startsWith("/my-work") || activeSection === "notes" || activeSection === "work",
          onClick: () => go(permissions.loading ? "/my-work" : destinationLandingPath("my-work", destinationPermissions)),
        };
      case "practice":
        return {
          active: location.pathname.startsWith("/practice") || location.pathname === "/classroom/drill" || location.pathname.startsWith("/testing") || location.pathname === "/sets",
          onClick: () => go(permissions.loading ? "/practice" : destinationLandingPath("practice", permissions)),
          onPrefetch: preloadDrillHub,
        };
      case "review":
        return {
          active: location.pathname.startsWith("/review") || location.pathname.startsWith("/progress") || location.pathname === "/analytics" || location.pathname === "/history" || activeSection === "journal" || activeSection === "flagged",
          onClick: () => go(permissions.loading ? "/review" : reviewRailLanding(railPrefs, permissions.is_admin || permissions.has_analytics_access)),
        };
      case "progress":
        return {
          active: location.pathname.startsWith("/progress") || location.pathname.startsWith("/analytics") || location.pathname.startsWith("/history"),
          onClick: () => go(permissions.loading ? "/progress" : destinationLandingPath("progress", permissions)),
        };
      case "library":
        return {
          active: location.pathname.startsWith("/library") || location.pathname.startsWith("/bootcamps") || location.pathname.startsWith("/activities") || location.pathname === "/classroom/admissions",
          onClick: () => go(permissions.loading ? "/library" : destinationLandingPath("library", permissions)),
        };
      case "schedule":
        // The student Schedule and Book tabs share this rail destination.
        // Teachers reach each student's schedule through the Students dossier.
        return {
          active: location.pathname === "/schedule" || location.pathname === "/booking",
          onClick: () => go("/schedule"),
        };
    }
  };

  return (
    <div className="classroom-sidebar-card">
      <PanelWash />
      <div className="classroom-panel-inner">
        <div className="classroom-brand-row">
        <button
          type="button"
          className="classroom-brand"
          onClick={() => { onNavigate?.(); onHome(); }}
        >
          <i>LS</i>
          <span>LSAT U</span>
        </button>
        <NotificationBell mouseX={bellMouseX} quiet />
        </div>

        <nav aria-label="Classroom navigation" className="classroom-rail-motion" ref={navigationRef}>
          <span className="classroom-rail-marker" data-rail-marker aria-hidden="true" />
          {railGroups.map((group) => (
            <div className="classroom-nav-group" key={group.id}>
              <b>{group.title}</b>
              {group.items.map((item) => {
                const { active, onClick, onPrefetch } = railBehavior(item);
                // Every destination route admits a signed-in account and
                // explains its own locked sections, so the rail never disables
                // one. A padlock marks a destination with nothing open yet;
                // clicking it still leads to the page that says why.
                const locked = railItemLocked(item.id, destinationPermissions);
                return (
                  <React.Fragment key={item.id}>
                  <button
                    type="button"
                    className={`${navClass(active)}${locked ? " classroom-nav-dimmed" : ""}`}
                    onClick={onClick}
                    onMouseEnter={onPrefetch}
                    onFocus={onPrefetch}
                    aria-current={active ? "page" : undefined}
                    title={locked ? `${item.label} is locked for your account` : undefined}
                  >
                    {item.label}
                    {item.id === "my-work" && !locked && unreadMyWork > 0 ? <span className="classroom-nav-badge">{unreadMyWork > 99 ? "99+" : unreadMyWork}<span className="sr-only"> unread notes and assignments</span></span> : null}
                    {locked ? (
                      <>
                        <Lock className="classroom-nav-lock" aria-hidden="true" />
                        <span className="sr-only"> (locked)</span>
                      </>
                    ) : null}
                  </button>
                  {item.id === 'my-work' && readingCenterAssigned ? <AssignedReadingCenterLink onNavigate={onNavigate} /> : null}
                  </React.Fragment>
                );
              })}
            </div>
          ))}

          {!permissions.loading && permissions.is_admin ? (
            <div className="classroom-nav-group">
              <button
                type="button"
                className={navClass(location.pathname.startsWith('/reading-center'))}
                aria-current={location.pathname.startsWith('/reading-center') ? 'page' : undefined}
                onClick={() => go('/reading-center')}
              >Reading Center</button>
            </div>
          ) : null}

          <div className="classroom-nav-group classroom-nav-shortcuts">
            <b>Quick access</b>
            {/* aria-disabled rather than disabled: a disabled button drops out
                of the tab order, so a keyboard student never reaches the
                explanation of why it is locked. */}
            {[
              { label: "Messages", path: "/inbox", flag: "has_chat_access" as const, active: location.pathname.startsWith("/inbox"), badge: unreadMessages },
            ].map((shortcut) => {
              const open = canAccess({ flags: [shortcut.flag] });
              return (
                <button
                  key={shortcut.path}
                  type="button"
                  className={`${navClass(shortcut.active && open)}${open ? "" : " classroom-nav-locked"}`}
                  aria-disabled={open ? undefined : true}
                  aria-current={shortcut.active && open ? "page" : undefined}
                  title={open ? undefined : `${shortcut.label} is locked for your account`}
                  onClick={open ? () => go(shortcut.path) : undefined}
                >
                  {shortcut.label}
                  {open && shortcut.badge > 0 ? <span className="classroom-nav-badge">{shortcut.badge > 9 ? "9+" : shortcut.badge}<span className="sr-only"> unread messages</span></span> : null}
                  {!open ? (
                    <>
                      <Lock className="classroom-nav-lock" aria-hidden="true" />
                      <span className="sr-only"> (locked for your account)</span>
                    </>
                  ) : null}
                </button>
              );
            })}
            {!permissions.loading && (!canAccess({ flags: ["has_chat_access"] }) || !canAccess({ flags: ["has_drill_access"] })) ? (
              <p className="classroom-rail-shortcut-note">
                Locked shortcuts aren't available to your account.
                {permissions.has_chat_access || permissions.is_admin ? " Message Joshua about access." : null}
              </p>
            ) : null}
          </div>

          {permissions.is_admin ? (
            <div className="classroom-nav-group">
              <b>Teaching</b>
              <button
                type="button"
                className={`classroom-nav${
                  location.pathname.startsWith("/teacher/") &&
                  !location.pathname.startsWith("/teacher/students") &&
                  !location.pathname.startsWith("/teacher/whiteboard")
                    ? " classroom-nav-active-white"
                    : ""
                }`}
                onClick={() => go("/teacher/today")}
              >
                Teacher Workspace
              </button>
              <button
                type="button"
                className={`classroom-nav${
                  location.pathname.startsWith("/teacher/students")
                    ? " classroom-nav-active-white"
                    : ""
                }`}
                onClick={openStudents}
              >
                Students
                {unreadStudentSignups > 0 ? (
                  <span className="classroom-nav-badge">
                    {unreadStudentSignups > 9 ? "9+" : unreadStudentSignups}
                    <span className="sr-only"> new student signups</span>
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className={`classroom-nav${
                  location.pathname.startsWith("/teacher/whiteboard")
                    ? " classroom-nav-active-white"
                    : ""
                }`}
                onClick={() => go("/teacher/whiteboard")}
              >
                Whiteboard
              </button>
              <button
                type="button"
                className={`classroom-nav${
                  location.pathname.startsWith("/teacher/analytics") || /^\/teacher\/students\/[^/]+\/analytics/.test(location.pathname)
                    ? " classroom-nav-active-white"
                    : ""
                }`}
                onClick={() => go("/teacher/analytics")}
              >
                Student Analytics
              </button>
            </div>
          ) : null}
        </nav>

        <div className="classroom-profile" ref={profileRef}>
          {menuOpen ? (
            <div
              className="classroom-profile-menu"
              role="menu"
              aria-label="Account menu"
            >
              <div className="classroom-profile-menu-header">
                <span>{displayName}</span>
                {user?.email ? <small>{user.email}</small> : null}
              </div>
              <button
                type="button"
                role="menuitem"
                className="classroom-profile-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  go("/classroom/account");
                }}
              >
                <UserRound size={14} aria-hidden="true" />
                Account
              </button>
              <button
                type="button"
                role="menuitem"
                className="classroom-profile-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  go("/classroom/account?section=layout");
                }}
              >
                <Settings size={14} aria-hidden="true" />
                Customize layout
              </button>
              <div className="classroom-profile-menu-appearance">
                <span>Appearance</span>
                <div
                  className="classroom-profile-menu-segment"
                  role="group"
                  aria-label="Appearance"
                >
                  <button
                    type="button"
                    className={theme === "light" ? "classroom-segment-active" : ""}
                    aria-pressed={theme === "light"}
                    onClick={() => setTheme("light")}
                  >
                    <Sun size={13} aria-hidden="true" />
                    Light
                  </button>
                  <button
                    type="button"
                    className={theme === "dark" ? "classroom-segment-active" : ""}
                    aria-pressed={theme === "dark"}
                    onClick={() => setTheme("dark")}
                  >
                    <Moon size={13} aria-hidden="true" />
                    Dark
                  </button>
                </div>
              </div>
              <button
                type="button"
                role="menuitem"
                className="classroom-profile-menu-item classroom-profile-menu-signout"
                onClick={() => {
                  setMenuOpen(false);
                  handleSignOut();
                }}
              >
                <LogOut size={14} aria-hidden="true" />
                Log Out
              </button>
            </div>
          ) : null}
          <button
            type="button"
            ref={triggerRef}
            className="classroom-profile-trigger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="classroom-avatar" aria-hidden="true">
              {displayName.trim().charAt(0).toUpperCase()}
            </div>
            <div className="classroom-profile-copy">
              <span>{displayName}</span>
              <small>{permissions.is_admin ? "Teacher" : "Student"}</small>
            </div>
            <ChevronsUpDown
              className="classroom-profile-chevron"
              size={14}
              aria-hidden="true"
            />
          </button>
          <button type="button" className="classroom-signout" onClick={handleSignOut}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

function StateSkeleton() {
  return (
    <div className="classroom-list-state" aria-label="Loading">
      <span />
      <span />
      <span />
    </div>
  );
}

function StandardSectionList({
  section,
  activeId,
  onClose,
}: {
  section: Exclude<ClassroomSection, "journal">;
  activeId: string | undefined;
  onClose?: () => void;
}) {
  const navigate = useNavigate();
  const { pathname, search, state: navigationState } = useLocation();
  const itemsQuery = useClassroomItems();
  const homeworkQuery = useStudentAssignments();
  const taQuery = useStudentTAAssignments();
  const flaggedPermissions = useUserPermissions();
  const flaggedQuery = useFlagged({ enabled: !flaggedPermissions.loading && (flaggedPermissions.is_admin || flaggedPermissions.has_flagged_access) });
  const [flagFilter, setFlagFilter] = React.useState("");

  const retainedItems = useRetainedValue(
    itemsQuery.data ?? [],
    !itemsQuery.error,
  );
  const retainedHomework = useRetainedValue(
    homeworkQuery.assignments,
    !homeworkQuery.error,
  );
  const retainedTa = useRetainedValue(
    taQuery.assignments,
    !taQuery.error,
  );

  // Unread first, then read, each newest first. Same ordering as the Notes and
  // recaps page, so the panel and the page never disagree about what is next.
  const noteRows = React.useMemo(() => {
    const { unread, read } = groupNotes(retainedItems);
    return [...unread, ...read];
  }, [retainedItems]);
  const unreadNotes = React.useMemo(
    () => noteRows.filter(isNoteUnread).length,
    [noteRows],
  );
  // Assigned work reads the same feed Classroom Home does. It used to build its
  // own rows from classroom_items + homework + TA, which left the two lists
  // disjoint: Home showed guided drills and activities this panel never had,
  // and this panel showed bootcamp modules Home never had.
  const { rows: feedRows } = useAssignedTodoFeed();
  const workRows = React.useMemo<ClassroomWorkRow[]>(
    () =>
      feedRows.map((row) => ({
        key: row.key,
        sourceTable: row.sourceTable,
        sourceId: row.refId,
        title: row.title,
        status: row.status,
        date: row.dueAt ?? row.createdAt,
        route: routeWithReturnTo(row.route, pathname),
      })),
    [feedRows, pathname],
  );
  const flagRows = React.useMemo(() => {
    const rows = flaggedQuery.data ?? [];
    const needle = flagFilter.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        flagLabel(row).toLowerCase().includes(needle) ||
        row.qid.toLowerCase().includes(needle),
    );
  }, [flagFilter, flaggedQuery.data]);

  const loading =
    section === "notes"
      ? itemsQuery.isLoading
      : section === "flagged"
        ? flaggedQuery.isLoading
        : itemsQuery.isLoading || homeworkQuery.loading || taQuery.loading;
  const error =
    section === "notes"
      ? itemsQuery.error
      : section === "flagged"
        ? flaggedQuery.error
        : itemsQuery.error || homeworkQuery.error || taQuery.error;

  const retry = () => {
    if (section === "flagged") {
      void flaggedQuery.refetch();
      return;
    }
    void itemsQuery.refetch();
    if (section === "work") {
      void homeworkQuery.refresh();
      void taQuery.refresh();
    }
  };

  const openRow = (route: string) => {
    onClose?.();
    const returnTo = validateNotesReturnTo(new URLSearchParams(search).get('returnTo'));
    const origin = section === 'notes' ? notesArchiveOrigin(navigationState, returnTo) : null;
    navigate(route, { state: origin ? { notesArchiveOrigin: origin } : null });
  };

  return (
    <div className="classroom-section-card">
      <PanelWash />
      <div className="classroom-panel-inner">
        <div className="classroom-section-heading">
          <h2>
            {SECTION_TITLES[section]}
            {section === "notes" && unreadNotes > 0 ? (
              <span className="classroom-unread-count">{unreadNotes}</span>
            ) : null}
          </h2>
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Close section list">
              <X size={16} />
            </button>
          ) : null}
        </div>

        {section === "flagged" && !error ? (
          <input
            type="search"
            className="classroom-panel-search"
            value={flagFilter}
            onChange={(event) => setFlagFilter(event.target.value)}
            placeholder="Search by question"
            aria-label="Search flagged questions"
          />
        ) : null}

        {loading &&
        (section === "notes"
          ? noteRows.length === 0
          : section === "flagged"
            ? flagRows.length === 0
            : workRows.length === 0) ? (
          <StateSkeleton />
        ) : null}

        {error ? (
          <div className="classroom-list-error">
            <p>Could not load this list.</p>
            <button type="button" className="classroom-button" onClick={retry}>
              Try again
            </button>
          </div>
        ) : null}

        <div className="classroom-panel-list">
          {section === "notes"
            ? noteRows.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  data-note-target-id={item.id}
                  className={`classroom-panel-item${activeId === item.id ? " classroom-panel-item-active" : ""}`}
                  onClick={() => openRow(notesDetailRoute(item.id, validateNotesReturnTo(new URLSearchParams(search).get("returnTo"))))}
                >
                  <h3>
                    {isNoteUnread(item) ? (
                      <span className="classroom-unread-dot" aria-hidden="true" />
                    ) : null}
                    {item.title}
                    {isNoteUnread(item) ? <span className="sr-only"> (unread)</span> : null}
                  </h3>
                  <time>{new Date(item.created_at).toLocaleDateString("en-CA", { day: "2-digit", month: "short", year: "numeric" })}</time>
                </button>
              ))
            : null}

          {section === "work"
            ? workRows.map((row: ClassroomWorkRow) => (
                <button
                  type="button"
                  key={row.key}
                  className={`classroom-panel-item${activeId === row.sourceId ? " classroom-panel-item-active" : ""}`}
                  onClick={() => openRow(row.route)}
                >
                  <h3>{row.title}</h3>
                  <time>{row.status.replace("_", " ")}</time>
                </button>
              ))
            : null}

          {section === "flagged"
            ? flagRows.map((row) => (
                <button
                  type="button"
                  key={row.id}
                  className={`classroom-panel-item${activeId === row.qid ? " classroom-panel-item-active" : ""}`}
                  onClick={() => openRow(`/flagged/${encodeURIComponent(row.qid)}`)}
                >
                  <h3>{flagLabel(row)}</h3>
                  <time>
                    {row.flagged_at
                      ? new Date(row.flagged_at).toLocaleDateString("en-CA", { day: "2-digit", month: "short", year: "numeric" })
                      : row.qtype}
                  </time>
                </button>
              ))
            : null}

        </div>

        {/* Every section owes an empty state. Flagged and the journal had one;
            notes and work did not, so a student with nothing yet saw a heading
            over blank space in the rail and the same in the stage beside it. */}
        {section === "notes" && !loading && !error && noteRows.length === 0 ? (
          <p className="classroom-panel-empty">
            Notes and recaps from your sessions with Joshua will show up here.
          </p>
        ) : null}

        {section === "work" && !loading && !error && workRows.length === 0 ? (
          <p className="classroom-panel-empty">
            Nothing assigned yet.
          </p>
        ) : null}

        {section === "flagged" &&
        !loading &&
        !error &&
        flagRows.length === 0 ? (
          <p className="classroom-panel-empty">
            {flagFilter.trim()
              ? "No flagged question matches that."
              : "Nothing flagged yet. Flag a question while you are drilling when you want to come back to it."}
          </p>
        ) : null}

      </div>
    </div>
  );
}

function JournalSectionList({
  activeId,
  onClose,
}: {
  activeId: string | undefined;
  onClose?: () => void;
}) {
  const navigate = useNavigate();
  const query = useJournalEntries();
  const [filter, setFilter] = React.useState("");
  const rows = React.useMemo(() => {
    const source = query.data ?? [];
    const needle = filter.trim().toLowerCase();
    if (!needle) return source;
    return source.filter(
      (row) =>
        row.label.toLowerCase().includes(needle) ||
        row.qid.toLowerCase().includes(needle),
    );
  }, [filter, query.data]);

  const openRow = (qid: string) => {
    onClose?.();
    navigate(`/journal/${encodeURIComponent(qid)}`);
  };

  return (
    <div className="classroom-section-card">
      <PanelWash />
      <div className="classroom-panel-inner">
        <div className="classroom-section-heading">
          <h2>{SECTION_TITLES.journal}</h2>
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Close section list">
              <X size={16} />
            </button>
          ) : null}
        </div>

        {!query.error ? (
          <input
            type="search"
            className="classroom-panel-search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by question ID"
            aria-label="Filter wrong answers"
          />
        ) : null}

        {query.isLoading && rows.length === 0 ? <StateSkeleton /> : null}

        {query.error ? (
          <div className="classroom-list-error">
            <p>Could not load this list.</p>
            <button
              type="button"
              className="classroom-button"
              onClick={() => void query.refetch()}
            >
              Try again
            </button>
          </div>
        ) : null}

        <div className="classroom-panel-list">
          {rows.map((row) => (
            <button
              type="button"
              key={row.qid}
              className={`classroom-panel-item${activeId === row.qid ? " classroom-panel-item-active" : ""}`}
              onClick={() => openRow(row.qid)}
            >
              <h3>{row.note?.title?.trim() || row.label}</h3>
              <time>
                {row.first_missed
                  ? new Date(row.first_missed).toLocaleDateString("en-CA", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : row.qtype}
              </time>
            </button>
          ))}
        </div>

        {!query.isLoading && !query.error && rows.length === 0 ? (
          <p className="classroom-panel-empty">
            {filter.trim()
              ? "No wrong answer matches that."
              : "You have no wrong answers yet."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SectionList({
  section,
  activeId,
  onClose,
}: {
  section: ClassroomSection;
  activeId: string | undefined;
  onClose?: () => void;
}) {
  if (section === "journal") {
    return <JournalSectionList activeId={activeId} onClose={onClose} />;
  }
  return (
    <StandardSectionList
      section={section}
      activeId={activeId}
      onClose={onClose}
    />
  );
}

// The canonical Review tabs need their own list in the stage. The legacy
// index pages expected the old secondary rail, which disappears on the new
// routes and at narrower widths.
// eslint-disable-next-line react-refresh/only-export-components
export function ReviewIndexList({ section }: { section: "journal" | "flagged" }) {
  return <div className="student-destination-review-list"><SectionList section={section} activeId={undefined} /></div>;
}

/**
 * Holds the stage open while a code-split route resolves.
 *
 * The boundary this belongs to sits INSIDE the shell, so the rail, brand, nav
 * and section list all stay mounted while the chunk lands. Before this, the
 * only Suspense boundary was the one above <Routes> in App.tsx, which meant
 * clicking a lazy rail item (Drill) blanked the entire page and then remounted
 * the whole shell — the choppiness that Home, a static import, never had.
 *
 * Deliberately empty: it reserves the stage's height so nothing collapses, and
 * a hovered rail item has usually already prefetched the chunk, so this renders
 * for a frame or not at all. A skeleton here would flash more than it soothes.
 */
function StageFallback() {
  return <div className="classroom-stage-pending" aria-hidden />;
}

export default function ClassroomLayout() {
  const { user, authReady } = useAuth();
  const permissions = useUserPermissions();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const transitionRoot = React.useRef<HTMLDivElement>(null);
  useNoteReaderTransition(transitionRoot, location.pathname, location.key);
  const params = useParams();
  const [profileReady, setProfileReady] = React.useState(false);
  const [displayName, setDisplayName] = React.useState("");
  const [testDate, setTestDate] = React.useState<string | null>(null);
  const [selectedSection, setSelectedSection] =
    React.useState<ClassroomSection | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [sectionOverlayOpen, setSectionOverlayOpen] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [theme]);

  React.useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("class_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      // A brand-new signup has no profile row and no name yet: they land here
      // anyway and pick the name up as step one of the orientation card. The
      // sidebar falls back to their email until the card writes a real name.
      const profileWithTestDate = profile as typeof profile & {
        test_date?: string | null;
      };
      setDisplayName(profile?.display_name ?? "");
      setTestDate(profileWithTestDate?.test_date ?? null);
      setProfileReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, navigate, user]);

  const pathSection = sectionFromPath(location.pathname);
  const drillHub = location.pathname === "/classroom/drill" || location.pathname === "/practice/drills";
  const destinationName = location.pathname.startsWith("/my-work") ? "My Work"
    : location.pathname.startsWith("/practice") ? "Practice"
    : location.pathname.startsWith("/review") ? "Review"
    : location.pathname.startsWith("/progress") ? "Review"
    : location.pathname.startsWith("/library") ? "Library"
    : null;
  // Messages owns the whole stage beside the rail: no section list, and none of
  // the reading-column padding. Like the drill hub it also has to suppress a
  // remembered section, or arriving from Notes would leave that list open.
  const messagesStage =
    location.pathname === "/inbox" || location.pathname.startsWith("/inbox/");
  // The teacher workspace is a room the rail opens INTO, not a page it leaves
  // for: it draws its own room rail and surfaces inside this stage while the
  // classroom rail stays mounted beside it. Same deal as Messages — full height,
  // no reading column, no section list.
  const workspaceStage =
    location.pathname === "/teacher" || location.pathname.startsWith("/teacher/");
  const requestedSection =
    drillHub || destinationName || messagesStage || workspaceStage ? null : pathSection ?? selectedSection;
  const activeSection = requestedSection &&
    (requestedSection !== 'work' && requestedSection !== 'notes' ||
      (!permissions.loading && (permissions.is_admin || permissions.has_classroom_access)))
    ? requestedSection : null;

  // Modal semantics for the two overlays. Declared after `activeSection`
  // because the section drawer takes its accessible name from it.
  const closeMobileMenu = React.useCallback(() => setMobileMenuOpen(false), []);
  const closeSectionOverlay = React.useCallback(() => setSectionOverlayOpen(false), []);
  const mobileMenuMotion = useClassroomOverlayMotion(mobileMenuOpen, "left");
  const sectionOverlayMotion = useClassroomOverlayMotion(Boolean(activeSection) && sectionOverlayOpen, "right");
  const overlaySection = useRetainedValue(activeSection, Boolean(activeSection));
  const mobileMenuDialog = useDialogOverlay({
    open: mobileMenuMotion.present,
    onClose: closeMobileMenu,
    label: "Classroom menu",
  });
  const sectionOverlayDialog = useDialogOverlay({
    open: sectionOverlayMotion.present,
    onClose: closeSectionOverlay,
    label: overlaySection ? SECTION_TITLES[overlaySection] : "Section list",
  });

  React.useEffect(() => {
    if (pathSection) setSelectedSection(pathSection);
    // The drill hub used to clear the remembered section here. `activeSection`
    // above already derives to null whenever `drillHub` is true, so the write
    // changed nothing on screen and only bought a second render pass at the
    // worst possible moment — mid-navigation. Clearing it also meant Notes →
    // Drill → Notes forgot where the student had been.
    if (location.pathname === "/classroom") {
      setSectionOverlayOpen(false);
    }
  }, [location.pathname, pathSection]);

  // Keyboard and touch students never hover, so they would pay the chunk fetch
  // on click. Warming it once the classroom is idle costs nothing visible and
  // makes the first Drill click as immediate as a hovered one.
  React.useEffect(() => {
    const idle = window.requestIdleCallback?.bind(window);
    if (!idle) {
      const timer = window.setTimeout(preloadDrillHub, 1500);
      return () => window.clearTimeout(timer);
    }
    const handle = idle(() => preloadDrillHub());
    return () => window.cancelIdleCallback?.(handle);
  }, []);

  // "Home" has to clear the remembered section as well as navigate — on
  // /classroom the path carries no section, so without this the third column
  // stays open and Home can never become the active item.
  const goHome = React.useCallback(() => {
    setSelectedSection(null);
    setSectionOverlayOpen(false);
    if (location.pathname !== "/classroom") navigate("/classroom");
  }, [location.pathname, navigate]);

  const openSection = React.useCallback((section: ClassroomSection) => {
    setSelectedSection(section);
    const breakpoint =
      section === "journal" ? "(max-width: 1399px)" : "(max-width: 1279px)";
    if (window.matchMedia(breakpoint).matches) {
      setSectionOverlayOpen(true);
    }
  }, []);

  if (!authReady || !user || !profileReady) return null;

  const activeId = params.itemId ?? params.assignmentId ?? params.qid;
  const contextValue = {
    displayName,
    setDisplayName,
    testDate,
    setTestDate,
    openSection,
  };
  // Until the orientation card captures a name, the sidebar shows the address
  // they signed up with rather than an empty row and a blank avatar.
  const sidebarName = displayName || user.email || "";
  const journalDetail = /^\/journal\/[^/]+$/.test(location.pathname);
  const reviewFromQueue = /^\/(?:journal|flagged)\/[^/]+$/.test(location.pathname) && !!reviewReturnTo(location.search);
  // Home is a dashboard, not a reading column: it needs the whole stage beside
  // the rail rather than the 720px measure every other reading surface uses.
  const homeStage = location.pathname === "/classroom";
  const scheduleStage = location.pathname === "/schedule";
  // The menu button used to be position: fixed, so on a phone it rode over the
  // page once the student scrolled: at 375 it sat on top of "Build targeted
  // set" on the drill hub. It now lives in a sticky bar that takes its own
  // space in the flow, with the name of the room beside it so the button is
  // not a lone glyph floating on the page.
  const mobileBarLabel = activeSection
    ? activeSection === "journal" || activeSection === "flagged"
      ? "Review"
      : SECTION_TITLES[activeSection]
    : drillHub
      ? "Drill"
      : messagesStage
        ? "Messages"
        : workspaceStage
          ? "Teacher Workspace"
          : scheduleStage
            ? "Schedule"
            : destinationName
              ? destinationName
            : homeStage
              ? "Home"
              : "Classroom";

  const rootClass =
    activeSection === "journal"
      ? `classroom-root classroom-root-journal${
          journalDetail ? " classroom-root-journal-detail" : ""
        }`
      : drillHub
        ? "classroom-root classroom-root-drill"
        : messagesStage
          ? "classroom-root classroom-root-messages"
        : workspaceStage
            ? "classroom-root classroom-root-workspace"
            : destinationName
              ? "classroom-root classroom-root-destination"
            : homeStage
              ? "classroom-root classroom-root-home"
              : scheduleStage
                ? "classroom-root classroom-root-schedule"
                : "classroom-root";

  return (
    <ClassroomLayoutContext.Provider value={contextValue}>
      <div ref={transitionRoot} data-note-transition-mode={location.pathname.startsWith('/classroom/item/') ? 'reader' : location.pathname === '/my-work/notes' ? 'archive' : undefined} className={`${rootClass}${reviewFromQueue ? " classroom-root-review-return" : ""}`}>
        <div className="classroom-mobile-bar">
          <button
            type="button"
            className="classroom-mobile-menu-button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open classroom menu"
            aria-haspopup="dialog"
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={19} />
          </button>
          {/* On a detail route the bar's own label IS the way back to the
              list. It already prints the section's real name, and the bar is
              sticky, so the control stays reachable through a long note
              instead of scrolling away like the old in-column trigger did.
              Two controls that both read as "the notes thing" collapse into
              one that says the room and one that says what is in it.

              An index route keeps the plain label: the list is already on the
              page, and a button that opens a copy of what is on screen is the
              no-op this shell has removed once before. `activeId` is the
              detail/index signal the router already carries. */}
          {activeSection && activeId ? (
            <button
              type="button"
              className="classroom-mobile-bar-trigger"
              onClick={() => setSectionOverlayOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={sectionOverlayOpen}
            >
              <span>{mobileBarLabel}</span>
              <em aria-hidden="true">›</em>
            </button>
          ) : (
            <span className="classroom-mobile-bar-label">{mobileBarLabel}</span>
          )}
        </div>

        <aside className="classroom-sidebar">
          <ClassroomSidebar
            displayName={sidebarName}
            activeSection={activeSection}
            onHome={goHome}
          />
        </aside>

        {mobileMenuMotion.present ? (
          <div className="classroom-mobile-menu" ref={mobileMenuMotion.ref} style={{ overflow: "hidden" }}>
            <button
              type="button"
              className="classroom-overlay-backdrop"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close classroom menu"
              tabIndex={-1}
            />
            <aside {...mobileMenuDialog}>
              <button
                type="button"
                className="classroom-overlay-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close classroom menu"
              >
                <X size={18} />
              </button>
              <ClassroomSidebar
                displayName={sidebarName}
                activeSection={activeSection}
                onHome={goHome}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </aside>
          </div>
        ) : null}

        {activeSection && !reviewFromQueue ? (
          <aside data-note-transition-rail className="classroom-section-list">
            <SectionList section={activeSection} activeId={activeId} />
          </aside>
        ) : null}

        {journalDetail ? (
          <React.Suspense fallback={<StageFallback />}>
            <ClassroomMotionContent><Outlet context={contextValue} /></ClassroomMotionContent>
          </React.Suspense>
        ) : messagesStage ? (
          <main className="classroom-messages-stage">
            <React.Suspense fallback={<StageFallback />}>
              <ClassroomMotionContent><Outlet context={contextValue} /></ClassroomMotionContent>
            </React.Suspense>
          </main>
        ) : workspaceStage ? (
          <main className="classroom-workspace-stage">
            <React.Suspense fallback={<StageFallback />}>
              <ClassroomMotionContent><Outlet context={contextValue} /></ClassroomMotionContent>
            </React.Suspense>
          </main>
        ) : (
          <main data-note-transition-stage className="classroom-stage">
            <div className="classroom-column">
              <React.Suspense fallback={<StageFallback />}>
                <ClassroomMotionContent><Outlet context={contextValue} /></ClassroomMotionContent>
              </React.Suspense>
            </div>
          </main>
        )}

        {overlaySection && sectionOverlayMotion.present ? (
          <div className="classroom-section-overlay" ref={sectionOverlayMotion.ref} style={{ overflow: "hidden" }}>
            <button
              type="button"
              className="classroom-overlay-backdrop"
              onClick={() => setSectionOverlayOpen(false)}
              aria-label="Close section list"
              tabIndex={-1}
            />
            <aside {...sectionOverlayDialog}>
              <SectionList
                section={overlaySection}
                activeId={activeId}
                onClose={() => setSectionOverlayOpen(false)}
              />
            </aside>
          </div>
        ) : null}
      </div>
    </ClassroomLayoutContext.Provider>
  );
}

export { SectionList as ClassroomSectionList };
