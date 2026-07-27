import * as React from "react";
import {
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  Sun,
  X,
} from "lucide-react";
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

type ClassroomSection = "notes" | "work" | "flagged";

const SECTION_TITLES: Record<ClassroomSection, string> = {
  notes: "Notes and recaps",
  work: "Assigned work",
  flagged: "Flagged",
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
      pathname !== "/classroom/uploads" &&
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
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  const go = (path: string) => {
    onNavigate?.();
    navigate(path);
  };

  const navClass = (active: boolean) =>
    `classroom-nav${active ? " classroom-nav-active" : ""}`;

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
              className={navClass(
                location.pathname === "/classroom" && !activeSection,
              )}
              onClick={() => {
                onNavigate?.();
                onHome();
              }}
            >
              Home
            </button>
            <button
              type="button"
              className={navClass(activeSection === "notes")}
              onClick={() => onSection("notes")}
            >
              Notes and recaps <em>›</em>
            </button>
            <button
              type="button"
              className={navClass(activeSection === "work")}
              onClick={() => onSection("work")}
            >
              Assigned work <em>›</em>
            </button>
          </div>

          <div className="classroom-nav-group">
            <b>Study</b>
            <button type="button" className="classroom-nav" onClick={() => go("/drill")}>Drill</button>
            <button type="button" className="classroom-nav" onClick={() => go("/practice")}>Practice</button>
            <button type="button" className="classroom-nav" onClick={() => go("/bootcamps")}>Bootcamps</button>
            <button type="button" className="classroom-nav" onClick={() => go("/activities")}>Activities</button>
          </div>

          <div className="classroom-nav-group">
            <b>Review</b>
            <button
              type="button"
              className={navClass(location.pathname.startsWith("/journal"))}
              onClick={() => go("/journal")}
            >
              Wrong answers
            </button>
            <button
              type="button"
              className={navClass(activeSection === "flagged")}
              onClick={() => go("/flagged")}
            >
              Flagged <em>›</em>
            </button>
            <button
              type="button"
              className={navClass(location.pathname.startsWith("/analytics"))}
              onClick={() => go("/analytics")}
            >
              Analytics
            </button>
          </div>

          <div className="classroom-nav-group">
            <b>Admin</b>
            <button type="button" className="classroom-nav" onClick={() => go("/inbox")}>Messages</button>
            <button type="button" className="classroom-nav" onClick={() => go("/schedule")}>Schedule</button>
            <button type="button" className="classroom-nav" onClick={() => go("/booking")}>Booking</button>
          </div>
        </nav>

        <div className="classroom-profile">
          <div className="classroom-avatar">
            {displayName.trim().charAt(0).toUpperCase()}
          </div>
          <div className="classroom-profile-copy">
            <span>{displayName}</span>
            <small>Student</small>
          </div>
          <button
            type="button"
            className="classroom-icon-button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            type="button"
            className="classroom-icon-button"
            onClick={() => {
              onNavigate?.();
              void signOut();
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

function SectionList({
  section,
  activeId,
  onClose,
}: {
  section: ClassroomSection;
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
  const activeSection = pathSection ?? selectedSection;

  React.useEffect(() => {
    if (pathSection) setSelectedSection(pathSection);
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
    if (window.matchMedia("(max-width: 1279px)").matches) {
      setSectionOverlayOpen(true);
    }
  }, []);

  if (!authReady || !user || !profileReady) return null;

  const activeId = params.itemId ?? params.assignmentId ?? params.qid;
  const contextValue = { displayName, testDate, openSection };

  return (
    <ClassroomLayoutContext.Provider value={contextValue}>
      <div className="classroom-root">
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
