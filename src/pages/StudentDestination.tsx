import { useRef } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import {
  DESTINATIONS,
  EXAM_TABS,
  destinationLandingPath,
  practiceExamLandingPath,
  isTabActive,
  tabAccess,
  type Destination,
  type DestinationTab,
} from "@/lib/destinationAccess";
import { preserveRedirectLocation } from "@/lib/preserveRedirectLocation";
import { DestinationHeadingContext } from "@/contexts/DestinationHeadingContext";
import { useReadingCenterAccess } from '@/hooks/useReadingCenterAccess';
import { useClassroomMotion } from '@/hooks/useClassroomMotion';
import { parseProgressWindow } from '@/hooks/useProgressWindow';

function useDestinationPermissions(destination: Destination) {
  const permissions = useUserPermissions();
  const readingCenter = useReadingCenterAccess(destination === 'my-work' && !permissions.is_admin);
  return { ...permissions,
    readingCenterAssigned: destination === 'my-work' && !permissions.is_admin && readingCenter.allowed,
    readingCenterChecking: destination === 'my-work' && !permissions.is_admin && readingCenter.isPending,
  };
}

export function StudentDestination({ destination }: { destination: Destination }) {
  const { pathname, search } = useLocation();
  const headingRef = useRef<HTMLElement>(null);
  // Progress tabs carry only a valid window; no other URL state follows a tab link.
  const progressWindow = destination === "progress" ? parseProgressWindow(new URLSearchParams(search).get("window")) : null;
  const tabTarget = (path: string) => progressWindow ? `${path}?window=${progressWindow}` : path;
  useClassroomMotion(headingRef, `destination:${destination}`);
  const permissions = useDestinationPermissions(destination);
  const config = DESTINATIONS[destination];
  const showExamTabs = destination === "practice" && pathname.startsWith("/practice/exams");
  const visibleTabs = showExamTabs ? [...config.tabs, ...EXAM_TABS] : config.tabs;
  // Admissions is staff-only by design; its padlock needs no plan explanation.
  const hasPlanLock = visibleTabs.some((tab) => !tab.admin && tabAccess(tab, permissions) === "locked");
  const noteId = `${destination}-locked-note`;

  const renderTabs = (tabs: DestinationTab[], row: "primary" | "exams") => tabs.map((tab) => {
    const access = tabAccess(tab, permissions);
    const active = isTabActive(tab, pathname, row);
    if (access === "open") {
      return (
        <Link
          key={tab.path}
          to={row === "primary" && tab.path === "/practice/exams" ? practiceExamLandingPath(permissions) : tabTarget(tab.path)}
          className={active ? "student-destination-tab student-destination-tab-active" : "student-destination-tab"}
          aria-current={active ? "page" : undefined}
        >
          {tab.label}
        </Link>
      );
    }
    const reason = access === "checking"
      ? "Checking access"
      : tab.admin ? `${tab.label} is open to Joshua only` : `${tab.label} is locked for your account`;
    return (
      <span
        key={tab.path}
        className={`student-destination-tab student-destination-tab-locked${active ? " student-destination-tab-active" : ""}`}
        aria-disabled="true"
        aria-current={active ? "page" : undefined}
        aria-describedby={access === "locked" && !tab.admin ? noteId : undefined}
        title={reason}
      >
        {tab.label}
        {access === "locked" ? <><Lock size={13} aria-hidden="true" /><span className="sr-only"> (locked)</span></> : null}
      </span>
    );
  });

  return (
    <div className="student-destination">
      <header ref={headingRef} data-motion-enter data-motion-group className="student-destination-heading classroom-motion-local">
        <div>
          <h1 data-motion-item>{config.title}</h1>
          <p data-motion-item>{config.introduction}</p>
        </div>
      </header>
      <nav data-motion-skip className="student-destination-tabs" aria-label={`${config.title} sections`} aria-busy={permissions.loading || (permissions.readingCenterChecking && !permissions.has_classroom_access)}>
        {renderTabs(config.tabs, "primary")}
      </nav>
      {showExamTabs ? (
        <nav data-motion-skip className="student-destination-subtabs" aria-label="Practice Exams pages" aria-busy={permissions.loading}>
          {renderTabs(EXAM_TABS, "exams")}
        </nav>
      ) : null}
      {hasPlanLock ? (
        <p id={noteId} className="student-destination-locked-note">
          <Lock size={13} aria-hidden="true" />
          Sections with a lock aren't available to your account.
          {permissions.has_chat_access || permissions.is_admin ? " If that looks wrong, message Joshua." : null}
        </p>
      ) : null}
      <div data-motion-policy={destination === 'my-work' ? 'list-only' : undefined} data-motion-enter={destination === 'my-work' || pathname === "/practice/drills" || (destination === "progress" && pathname.endsWith("/overview")) ? undefined : ""} className="student-destination-content">
        <DestinationHeadingContext.Provider value>
          <Outlet />
        </DestinationHeadingContext.Provider>
      </div>
    </div>
  );
}

/**
 * The index route of a destination. Waits for permissions (the parent route
 * already holds until they resolve), then opens the first tab this account can
 * use, carrying any query and hash from the incoming link.
 */
export function DestinationIndex({ destination }: { destination: Destination }) {
  const { search, hash } = useLocation();
  const permissions = useDestinationPermissions(destination);
  if (permissions.loading || (permissions.readingCenterChecking && !permissions.has_classroom_access)) return null;
  return <Navigate to={preserveRedirectLocation(destinationLandingPath(destination, permissions), search, hash)} replace />;
}

export function DestinationLinks({
  heading,
  description,
  links,
}: {
  heading: string;
  description: string;
  links: { label: string; description: string; path: string; flag?: PermissionFlag }[];
}) {
  const permissions = useUserPermissions();
  return (
    <section className="student-destination-links">
      <h2>{heading}</h2>
      <p>{description}</p>
      <div className="student-destination-link-grid">
        {links.map((link) => {
          const available = !link.flag || (!permissions.loading && (permissions.is_admin || permissions[link.flag]));
          const content = <><strong>{link.label}</strong><span>{link.description}</span><span aria-hidden="true">{available ? "Open ↗" : "Locked"}</span></>;
          return available
            ? <Link to={link.path} key={link.path} className="student-destination-link-card">{content}</Link>
            : <div key={link.path} className="student-destination-link-card student-destination-link-locked" aria-disabled="true">{content}</div>;
        })}
      </div>
    </section>
  );
}
