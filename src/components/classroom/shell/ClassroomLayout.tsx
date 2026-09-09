import * as React from "react";
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
import { resolveRailGroups, type RailItem } from "@/lib/railCatalog";
import { preloadDrillHub } from "@/lib/routePreload";
import { flagLabel } from "@/lib/flaggedService";
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
import "@/components/classroom/classroom.css";

type ClassroomSection = "notes" | "work" | "flagged" | "journal";

const SECTION_TITLES: Record<ClassroomSection, string> = {
  notes: "Notes and recaps",
  work: "Assigned work",
  flagged: "Flagged",
  journal: "Wrong answers",
};

type ClassroomLayoutContextValue = {
  displayName: string;
  setDisplayName: (name: string) => void;
  testDate: string | null;
  setTestDate: (date: string | null) => void;
  openSection: (section: ClassroomSection) => void;
};

const ClassroomLayoutContext =
  React.createContext<ClassroomLayoutContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useClassroomLayout() {
  const value = React.useContext(ClassroomLayoutContext);
  if (!value) {
    throw new Error("useClassroomLayout must be used inside ClassroomLayout");
  }
  return value;
}

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
  onSection,
  onHome,
  onNavigate,
}: {
  displayName: string;
  activeSection: ClassroomSection | null;
  onSection: (section: ClassroomSection) => void;
  onHome: () => void;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const permissions = useUserPermissions();
  const unreadMessages = useUnreadMessageCount();
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
  const canAccess = (item: Pick<RailItem, "flags" | "allowSignedIn">) =>
    permissions.loading ||
    permissions.is_admin ||
    item.flags.length === 0 ||
    (item.allowSignedIn && !!user) ||
    item.flags.some((flag) => permissions[flag]);

  // `onPrefetch` fires on hover and keyboard focus, not on click: the point is
  // to have the route's chunk parsed before the click lands, so the student
  // never sees the stage fallback at all.
  const navProps = (
    active: boolean,
    unlocked: boolean,
    onClick: () => void,
    onPrefetch?: () => void,
  ) => ({
    className: `${navClass(active && unlocked)}${unlocked ? "" : " classroom-nav-locked"}`,
    disabled: !unlocked,
    onClick: unlocked ? onClick : undefined,
    onMouseEnter: unlocked ? onPrefetch : undefined,
    onFocus: unlocked ? onPrefetch : undefined,
  });

  const railGroups = resolveRailGroups(railPrefs);

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
      case "notes":
        return { active: activeSection === "notes", onClick: () => onSection("notes") };
      case "work":
        return { active: activeSection === "work", onClick: () => onSection("work") };
      case "drill":
        return {
          active: location.pathname === "/classroom/drill",
          onClick: () => go("/classroom/drill"),
          onPrefetch: preloadDrillHub,
        };
      case "testing":
        return {
          active: location.pathname.startsWith("/testing"),
          onClick: () => go("/testing"),
        };
      case "bootcamps":
        return { active: false, onClick: () => go("/bootcamps") };
      case "activities":
        return { active: false, onClick: () => go("/activities") };
      case "journal":
        return { active: activeSection === "journal", onClick: () => go("/journal") };
      case "flagged":
        return { active: activeSection === "flagged", onClick: () => go("/flagged") };
      case "analytics":
        return {
          active: location.pathname.startsWith("/analytics"),
          onClick: () => go("/analytics"),
        };
      case "admissions":
        return {
          active: location.pathname === "/classroom/admissions",
          onClick: () => go("/classroom/admissions"),
        };
      case "history":
        return {
          active: location.pathname.startsWith("/history"),
          onClick: () => go("/history"),
        };
      case "messages":
        return {
          active:
            location.pathname === "/inbox" ||
            location.pathname.startsWith("/inbox/"),
          onClick: () => go("/inbox"),
        };
      case "schedule":
        // One entry, two stage tabs. /booking is the same shell with the Book
        // tab open, so it lights the same rail item. Teachers manage each
        // student's pass from their dossier — /booking redirects them there.
        return {
          active:
            location.pathname === "/schedule" ||
            location.pathname === "/booking" ||
            location.pathname.startsWith("/teacher/students"),
          onClick: () => go(permissions.is_admin ? "/teacher/students" : "/schedule"),
        };
    }
  };

  return (
    <div className="classroom-sidebar-card">
      <PanelWash />
      <div className="classroom-panel-inner">
        <button
          type="button"
          className="classroom-brand"
          onClick={() => go("/classroom")}
        >
          <i>LS</i>
          <span>LSAT U</span>
        </button>

        <nav aria-label="Classroom navigation">
          {railGroups.map((group) => (
            <div className="classroom-nav-group" key={group.id}>
              <b>{group.title}</b>
              {group.items.map((item) => {
                const { active, onClick, onPrefetch } = railBehavior(item);
                const unlocked = canAccess(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    {...navProps(active, unlocked, onClick, onPrefetch)}
                  >
                    {item.label}
                    {item.id === "messages" && unlocked && unreadMessages > 0 ? (
                      <span className="classroom-nav-badge">
                        {unreadMessages > 9 ? "9+" : unreadMessages}
                        <span className="sr-only"> unread messages</span>
                      </span>
                    ) : null}
                    {item.section && unlocked ? <em>›</em> : null}
                    {!unlocked ? (
                      <Lock className="classroom-nav-lock" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}

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
  const { pathname } = useLocation();
  const itemsQuery = useClassroomItems();
  const homeworkQuery = useStudentAssignments();
  const taQuery = useStudentTAAssignments();
  const flaggedQuery = useFlagged();
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
    navigate(route);
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
                  className={`classroom-panel-item${activeId === item.id ? " classroom-panel-item-active" : ""}`}
                  onClick={() => openRow(`/classroom/item/${encodeURIComponent(item.id)}`)}
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
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
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
  const drillHub = location.pathname === "/classroom/drill";
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
  const activeSection =
    drillHub || messagesStage || workspaceStage ? null : pathSection ?? selectedSection;

  // Modal semantics for the two overlays. Declared after `activeSection`
  // because the section drawer takes its accessible name from it.
  const closeMobileMenu = React.useCallback(() => setMobileMenuOpen(false), []);
  const closeSectionOverlay = React.useCallback(() => setSectionOverlayOpen(false), []);
  const mobileMenuDialog = useDialogOverlay({
    open: mobileMenuOpen,
    onClose: closeMobileMenu,
    label: "Classroom menu",
  });
  const sectionOverlayDialog = useDialogOverlay({
    open: Boolean(activeSection) && sectionOverlayOpen,
    onClose: closeSectionOverlay,
    label: activeSection ? SECTION_TITLES[activeSection] : "Section list",
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
    ? SECTION_TITLES[activeSection]
    : drillHub
      ? "Drill"
      : messagesStage
        ? "Messages"
        : workspaceStage
          ? "Teacher Workspace"
          : scheduleStage
            ? "Schedule"
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
            : homeStage
              ? "classroom-root classroom-root-home"
              : scheduleStage
                ? "classroom-root classroom-root-schedule"
                : "classroom-root";

  return (
    <ClassroomLayoutContext.Provider value={contextValue}>
      <div className={rootClass}>
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
            onSection={openSection}
            onHome={goHome}
          />
        </aside>

        {mobileMenuOpen ? (
          <div className="classroom-mobile-menu">
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
                onSection={(section) => {
                  setMobileMenuOpen(false);
                  openSection(section);
                }}
                onHome={goHome}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </aside>
          </div>
        ) : null}

        {activeSection ? (
          <aside className="classroom-section-list">
            <SectionList section={activeSection} activeId={activeId} />
          </aside>
        ) : null}

        {journalDetail ? (
          <React.Suspense fallback={<StageFallback />}>
            <Outlet context={contextValue} />
          </React.Suspense>
        ) : messagesStage ? (
          <main className="classroom-messages-stage">
            <React.Suspense fallback={<StageFallback />}>
              <Outlet context={contextValue} />
            </React.Suspense>
          </main>
        ) : workspaceStage ? (
          <main className="classroom-workspace-stage">
            <React.Suspense fallback={<StageFallback />}>
              <Outlet context={contextValue} />
            </React.Suspense>
          </main>
        ) : (
          <main className="classroom-stage">
            <div className="classroom-column">
              <React.Suspense fallback={<StageFallback />}>
                <Outlet context={contextValue} />
              </React.Suspense>
            </div>
          </main>
        )}

        {activeSection && sectionOverlayOpen ? (
          <div className="classroom-section-overlay">
            <button
              type="button"
              className="classroom-overlay-backdrop"
              onClick={() => setSectionOverlayOpen(false)}
              aria-label="Close section list"
              tabIndex={-1}
            />
            <aside {...sectionOverlayDialog}>
              <SectionList
                section={activeSection}
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
