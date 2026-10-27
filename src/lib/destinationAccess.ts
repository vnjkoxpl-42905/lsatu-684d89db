import type { PermissionFlag, UserPermissions } from "@/hooks/useUserPermissions";
import type { RailItemId } from "@/lib/railCatalog";

/**
 * The route matrix for the student destinations: every URL-backed tab, the
 * feature hints the tab row and rail use to draw a padlock. Route gates remain
 * authoritative: assignment-dependent routes must stay reachable because their
 * access cannot be determined from general feature flags alone.
 */

export type Destination = "my-work" | "practice" | "review" | "progress" | "library";

export interface DestinationTab {
  label: string;
  path: string;
  /** Any one of these opens the tab. */
  flags?: PermissionFlag[];
  /** The route is `ProtectedRoute allowSignedIn`: any signed-in account. */
  allowSignedIn?: boolean;
  /** Assignment-aware route gate must resolve access; keep its navigation reachable. */
  routeDeterminesAccess?: boolean;
  /** The route is `ProtectedRoute requireAdmin`. */
  admin?: boolean;
  /** A verified Reading Center grant opens its filtered assignment list. */
  readingCenterEligible?: boolean;
}

export interface DestinationConfig {
  title: string;
  introduction: string;
  path: string;
  tabs: DestinationTab[];
}

export const DESTINATIONS: Record<Destination, DestinationConfig> = {
  "my-work": {
    title: "My Work",
    introduction: "Your session notes and assigned work, together.",
    path: "/my-work",
    tabs: [
      { label: "Notes", path: "/my-work/notes", flags: ["has_classroom_access"] },
      { label: "Assigned work", path: "/my-work/to-do", flags: ["has_classroom_access"], readingCenterEligible: true },
      { label: "Completed", path: "/my-work/completed", flags: ["has_classroom_access"], readingCenterEligible: true },
    ],
  },
  practice: {
    title: "Practice",
    introduction: "Choose deliberate practice or a timed exam.",
    path: "/practice",
    tabs: [
      { label: "Drills", path: "/practice/drills", flags: ["has_drill_access"] },
      { label: "Practice Exams", path: "/practice/exams", allowSignedIn: true },
    ],
  },
  review: {
    title: "Review",
    introduction: "Return to questions that deserve another look.",
    path: "/review",
    tabs: [
      { label: "To review", path: "/review/to-review", allowSignedIn: true },
      { label: "Wrong answers", path: "/review/wrong", flags: ["has_journal_access"] },
      { label: "Flagged", path: "/review/flagged", flags: ["has_flagged_access"] },
    ],
  },
  progress: {
    title: "Progress",
    introduction: "See your practice record and where to focus next.",
    path: "/progress",
    tabs: [
      { label: "Overview", path: "/progress/overview", flags: ["has_analytics_access"] },
      { label: "History", path: "/progress/history", flags: ["has_analytics_access"] },
      { label: "Topics", path: "/progress/topics", flags: ["has_analytics_access"] },
    ],
  },
  library: {
    title: "Library",
    introduction: "Written lessons and exercises available to your account.",
    path: "/library",
    tabs: [
      { label: "Lessons", path: "/library/lessons", flags: ["has_activity_access", "has_bootcamp_access", "has_drill_access", "has_analytics_access"] },
      { label: "Activities", path: "/library/activities", flags: ["has_classroom_access"] },
      { label: "Bootcamps", path: "/library/bootcamps", flags: ["has_classroom_access"] },
      { label: "Admissions", path: "/library/admissions", admin: true },
    ],
  },
};

/**
 * Practice Exams has its own sub-row. Overview and All Exams sit behind
 * TestingCentreGate (practice access OR an owned assignment); Attempts is any
 * signed-in account. Keep the assignment-dependent tabs reachable so that gate
 * can resolve access without a duplicate, flag-only decision in the shell.
 */
export const EXAM_TABS: DestinationTab[] = [
  { label: "Overview", path: "/practice/exams", routeDeterminesAccess: true },
  { label: "All Exams", path: "/practice/exams/all", routeDeterminesAccess: true },
  { label: "Attempts", path: "/practice/exams/attempts", allowSignedIn: true },
];

type AccessView = Pick<UserPermissions, "loading" | "is_admin"> & Partial<Record<PermissionFlag, boolean>> & {
  readingCenterAssigned?: boolean;
  readingCenterChecking?: boolean;
};

/** Navigation state only: `checking` is unknown; `open` means the link is reachable.
 * Assignment-aware content access is resolved exclusively by its route gate. */
export type TabAccess = "checking" | "open" | "locked";

export function tabAccess(tab: DestinationTab, permissions: AccessView): TabAccess {
  if (permissions.loading) return "checking";
  if (tab.admin) return permissions.is_admin ? "open" : "locked";
  if (permissions.is_admin || tab.allowSignedIn) return "open";
  if (tab.flags?.some((flag) => permissions[flag])) return 'open';
  if (tab.readingCenterEligible) {
    if (permissions.readingCenterAssigned) return 'open';
    if (permissions.readingCenterChecking) return 'checking';
  }
  // AssignmentGate queries ownership only when Classroom access is enabled.
  if (tab.routeDeterminesAccess) return permissions.has_practice_access || permissions.has_classroom_access ? "open" : "locked";
  return "locked";
}

/**
 * Where a bare destination URL lands: the first tab this account can open, so
 * `/library` on a Classroom-only account opens Activities rather than a locked
 * Lessons page. A fully locked destination still lands on its first tab, whose
 * route explains the lock.
 */
export function destinationLandingPath(destination: Destination, permissions: AccessView): string {
  if (destination === "my-work") {
    return permissions.is_admin || permissions.has_classroom_access ? "/my-work/notes" : "/my-work/to-do";
  }
  const { tabs } = DESTINATIONS[destination];
  const path = (tabs.find((tab) => tabAccess(tab, permissions) === "open") ?? tabs[0]).path;
  return path === "/practice/exams" ? practiceExamLandingPath(permissions) : path;
}

/** Keep assigned-only accounts eligible for the route gate; others can still see Attempts. */
export function practiceExamLandingPath(permissions: AccessView): string {
  return tabAccess(EXAM_TABS[0], permissions) === "open" ? "/practice/exams" : "/practice/exams/attempts";
}

export type DestinationLock = "checking" | "open" | "partial" | "locked";

export function destinationLock(destination: Destination, permissions: AccessView): DestinationLock {
  if (permissions.loading) return "checking";
  // Admissions is staff-only by design, so it never counts against a student.
  const states = DESTINATIONS[destination].tabs.filter((tab) => !tab.admin).map((tab) => tabAccess(tab, permissions));
  if (states.includes('checking') && !states.includes('open')) return 'checking';
  if (states.every((state) => state === "locked")) return "locked";
  return states.some((state) => state === "locked") ? "partial" : "open";
}

const RAIL_DESTINATION: Partial<Record<RailItemId, Destination>> = {
  "my-work": "my-work",
  practice: "practice",
  review: "review",
  progress: "progress",
  library: "library",
};

/**
 * Every rail destination's own route admits any signed-in account (each tab
 * and deep route applies its own gate), so the rail never disables one: it
 * marks a destination whose every section is locked, and the destination page
 * says why.
 */
export function railItemLocked(id: RailItemId, permissions: AccessView): boolean {
  const destination = RAIL_DESTINATION[id];
  return destination ? destinationLock(destination, permissions) === "locked" : false;
}

/** Which tab in a row is current for this pathname. */
export function isTabActive(tab: DestinationTab, pathname: string, row: "primary" | "exams" = "primary"): boolean {
  if (pathname === tab.path) return true;
  if (row === "exams") {
    // Exam detail pages belong to All Exams; Overview owns only its own URL.
    return tab.path === "/practice/exams/all" && /^\/practice\/exams\/(?!all$|attempts$)[^/]+$/.test(pathname);
  }
  return pathname.startsWith(`${tab.path}/`);
}
