import * as React from "react";
import {
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

type ClassroomSection = "notes" | "work";

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
  onNavigate,
}: {
  displayName: string;
  activeSection: ClassroomSection | null;
  onSection: (section: ClassroomSection) => void;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

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
              onClick={() => go("/classroom")}
            >
              Your room
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
            <button type="button" className="classroom-nav" onClick={() => go("/journal")}>Wrong answers</button>
            <button type="button" className="classroom-nav" onClick={() => go("/flagged")}>Flagged</button>
            <button type="button" className="classroom-nav" onClick={() => go("/analytics")}>Analytics</button>
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
  const loading =
    section === "notes"
      ? itemsQuery.isLoading
      : itemsQuery.isLoading || homeworkQuery.loading || taQuery.loading;
  const error =
    section === "notes"
      ? itemsQuery.error
      : itemsQuery.error || homeworkQuery.error || taQuery.error;

  const retry = () => {
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
          <h2>{section === "notes" ? "Notes and recaps" : "Assigned work"}</h2>
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Close section list">
              <X size={16} />
            </button>
          ) : null}
        </div>

        {loading && (section === "notes" ? noteRows.length === 0 : workRows.length === 0) ? (
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
            : workRows.map((row: ClassroomWorkRow) => (
                <button
                  type="button"
                  key={row.key}
                  className={`classroom-panel-item${activeId === row.sourceId ? " classroom-panel-item-active" : ""}`}
                  onClick={() => openRow(row.route)}
                >
                  <h3>{row.title}</h3>
                  <time>{row.status.replace("_", " ")}</time>
                </button>
              ))}
        </div>
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

  const openSection = React.useCallback((section: ClassroomSection) => {
    setSelectedSection(section);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      setSectionOverlayOpen(true);
    }
  }, []);

  if (!authReady || !user || !profileReady) return null;

  const activeId = params.itemId ?? params.assignmentId;
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
                {activeSection === "notes" ? "Notes and recaps" : "Assigned work"}
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
