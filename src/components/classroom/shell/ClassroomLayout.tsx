import * as React from "react";
import {
  ChevronsUpDown,
  Lock,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
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
import {
  useUserPermissions,
  type PermissionFlag,
} from "@/hooks/useUserPermissions";
import { flagLabel } from "@/lib/flaggedService";
import {
  useStudentAssignments,
  useStudentTAAssignments,
} from "@/hooks/useStudentAssignments";
import {
  buildWorkRows,
  classroomNotes,
  type ClassroomWorkRow,
} from "@/components/classroom/classroomData";
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
  testDate: string | null;
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

  const navClass = (active: boolean) =>
    `classroom-nav${active ? " classroom-nav-active" : ""}`;

  const canAccess = (...flags: PermissionFlag[]) =>
    permissions.is_admin ||
    flags.length === 0 ||
    flags.some((flag) => permissions[flag]);

  const navProps = (
    active: boolean,
    unlocked: boolean,
    onClick: () => void,
  ) => ({
    className: `${navClass(active && unlocked)}${unlocked ? "" : " classroom-nav-locked"}`,
    disabled: !unlocked,
    onClick: unlocked ? onClick : undefined,
  });

  const classroomUnlocked = canAccess("has_classroom_access");
  const drillUnlocked = canAccess("has_drill_access");
  const bootcampsUnlocked = canAccess("has_bootcamp_access");
  const activitiesUnlocked = canAccess("has_activity_access");
  const journalUnlocked = canAccess("has_journal_access", "has_waj_access");
  const flaggedUnlocked = canAccess("has_flagged_access");
  const analyticsUnlocked = canAccess("has_analytics_access");
  const messagesUnlocked = canAccess("has_chat_access");
  const scheduleUnlocked = canAccess("has_schedule_access");

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
          <div className="classroom-nav-group">
            <b>Classroom</b>
            <button
              type="button"
              {...navProps(
                location.pathname === "/classroom" && !activeSection,
                classroomUnlocked,
                () => {
                  onNavigate?.();
                  onHome();
                },
              )}
            >
              Home
              {!classroomUnlocked ? (
                <Lock className="classroom-nav-lock" aria-hidden="true" />
              ) : null}
            </button>
            <button
              type="button"
              {...navProps(
                activeSection === "notes",
                classroomUnlocked,
                () => onSection("notes"),
              )}
            >
              Notes and recaps
              {classroomUnlocked ? (
                <em>›</em>
              ) : (
                <Lock className="classroom-nav-lock" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              {...navProps(
                activeSection === "work",
                classroomUnlocked,
                () => onSection("work"),
              )}
            >
              Assigned work
              {classroomUnlocked ? (
                <em>›</em>
              ) : (
                <Lock className="classroom-nav-lock" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="classroom-nav-group">
            <b>Study</b>
            <button
              type="button"
              {...navProps(
                location.pathname === "/classroom/drill",
                drillUnlocked,
                () => go("/classroom/drill"),
              )}
            >
              Drill
              {!drillUnlocked ? (
                <Lock className="classroom-nav-lock" aria-hidden="true" />
              ) : null}
            </button>
            <button
              type="button"
              {...navProps(false, bootcampsUnlocked, () => go("/bootcamps"))}
            >
              Bootcamps
              {!bootcampsUnlocked ? (
                <Lock className="classroom-nav-lock" aria-hidden="true" />
              ) : null}
            </button>
            <button
              type="button"
              {...navProps(false, activitiesUnlocked, () => go("/activities"))}
            >
              Activities
              {!activitiesUnlocked ? (
                <Lock className="classroom-nav-lock" aria-hidden="true" />
              ) : null}
            </button>
          </div>

          <div className="classroom-nav-group">
            <b>Review</b>
            <button
              type="button"
              {...navProps(
                activeSection === "journal",
                journalUnlocked,
                () => go("/journal"),
              )}
            >
              Wrong answers
              {journalUnlocked ? (
                <em>›</em>
              ) : (
                <Lock className="classroom-nav-lock" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              {...navProps(activeSection === "flagged", flaggedUnlocked, () => go("/flagged"))}
            >
              Flagged
              {flaggedUnlocked ? (
                <em>›</em>
              ) : (
                <Lock className="classroom-nav-lock" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              {...navProps(
                location.pathname.startsWith("/analytics"),
                analyticsUnlocked,
                () => go("/analytics"),
              )}
            >
              Analytics
              {!analyticsUnlocked ? (
                <Lock className="classroom-nav-lock" aria-hidden="true" />
              ) : null}
            </button>
          </div>

          <div className="classroom-nav-group">
            <b>Support</b>
            <button
              type="button"
              {...navProps(
                location.pathname === "/inbox" ||
                  location.pathname.startsWith("/inbox/"),
                messagesUnlocked,
                () => go("/inbox"),
              )}
            >
              Messages
              {messagesUnlocked && unreadMessages > 0 ? (
                <span className="classroom-nav-badge">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                  <span className="sr-only"> unread messages</span>
                </span>
              ) : null}
              {!messagesUnlocked ? (
                <Lock className="classroom-nav-lock" aria-hidden="true" />
              ) : null}
            </button>
            <button
              type="button"
              {...navProps(false, scheduleUnlocked, () => go("/schedule"))}
            >
              Schedule
              {!scheduleUnlocked ? (
                <Lock className="classroom-nav-lock" aria-hidden="true" />
              ) : null}
            </button>
            <button
              type="button"
              {...navProps(false, true, () => go("/booking"))}
            >
              Booking
            </button>
          </div>

          {permissions.is_admin ? (
            <div className="classroom-nav-group">
              <b>Teaching</b>
              <button
                type="button"
                className="classroom-nav"
                onClick={() => go("/teacher")}
              >
                Teacher Workspace
              </button>
              <button
                type="button"
                className="classroom-nav"
                onClick={() => go("/teacher/reference-library")}
              >
                Reference Library
              </button>
              <button
                type="button"
                className="classroom-nav"
                onClick={() => go("/admin/board")}
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
          <button
            type="button"
            className="classroom-icon-button"
            onClick={() => {
              onNavigate?.();
              void signOut({ keepSavedEmail: true }).then(({ error }) => {
                if (error) toast.error("Sign out failed. Please try again.");
              });
            }}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={15} />
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

  const noteRows = React.useMemo(
    () => classroomNotes(retainedItems),
    [retainedItems],
  );
  const workRows = React.useMemo(
    () => buildWorkRows(retainedItems, retainedHomework, retainedTa),
    [retainedHomework, retainedItems, retainedTa],
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
          <h2>{SECTION_TITLES[section]}</h2>
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
                  <h3>{item.title}</h3>
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
      if (!profile?.display_name) {
        navigate("/onboarding", { replace: true });
        return;
      }
      const profileWithTestDate = profile as typeof profile & {
        test_date?: string | null;
      };
      setDisplayName(profile.display_name);
      setTestDate(profileWithTestDate.test_date ?? null);
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
  const activeSection =
    drillHub || messagesStage ? null : pathSection ?? selectedSection;

  React.useEffect(() => {
    if (pathSection) setSelectedSection(pathSection);
    if (location.pathname === "/classroom/drill") {
      setSelectedSection(null);
      setSectionOverlayOpen(false);
    }
    if (location.pathname === "/classroom") {
      setSectionOverlayOpen(false);
    }
  }, [location.pathname, pathSection]);

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
  const contextValue = { displayName, testDate, openSection };
  const journalDetail = /^\/journal\/[^/]+$/.test(location.pathname);
  const rootClass =
    activeSection === "journal"
      ? `classroom-root classroom-root-journal${
          journalDetail ? " classroom-root-journal-detail" : ""
        }`
      : drillHub
        ? "classroom-root classroom-root-drill"
        : messagesStage
          ? "classroom-root classroom-root-messages"
          : "classroom-root";

  return (
    <ClassroomLayoutContext.Provider value={contextValue}>
      <div className={rootClass}>
        <button
          type="button"
          className="classroom-mobile-menu-button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open classroom menu"
        >
          <Menu size={19} />
        </button>

        <aside className="classroom-sidebar">
          <ClassroomSidebar
            displayName={displayName}
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
            />
            <aside>
              <button
                type="button"
                className="classroom-overlay-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close classroom menu"
              >
                <X size={18} />
              </button>
              <ClassroomSidebar
                displayName={displayName}
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
          <Outlet context={contextValue} />
        ) : messagesStage ? (
          <main className="classroom-messages-stage">
            <Outlet context={contextValue} />
          </main>
        ) : (
          <main className="classroom-stage">
            <div className="classroom-column">
              {activeSection ? (
                <button
                  type="button"
                  className="classroom-section-trigger"
                  onClick={() => setSectionOverlayOpen(true)}
                >
                  {SECTION_TITLES[activeSection]}
                  <PanelLeftClose size={17} />
                </button>
              ) : null}
              <Outlet context={contextValue} />
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
            />
            <aside>
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
