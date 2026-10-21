import { Link, Outlet, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";

type Destination = "my-work" | "practice" | "review" | "progress" | "library";
type Tab = { label: string; path: string; flags?: PermissionFlag[]; allowSignedIn?: boolean; admin?: boolean };

const DESTINATIONS: Record<Destination, { title: string; introduction: string; tabs: Tab[] }> = {
  "my-work": {
    title: "My Work",
    introduction: "Assignments and notes from your work with Joshua.",
    tabs: [
      { label: "To do", path: "/my-work/to-do", flags: ["has_classroom_access"] },
      { label: "Completed", path: "/my-work/completed", flags: ["has_classroom_access"] },
      { label: "Notes & recaps", path: "/my-work/notes", flags: ["has_classroom_access"] },
    ],
  },
  practice: {
    title: "Practice",
    introduction: "Choose deliberate practice or a timed exam.",
    tabs: [
      { label: "Drills", path: "/practice/drills", flags: ["has_drill_access"] },
      { label: "Practice Exams", path: "/practice/exams", allowSignedIn: true },
    ],
  },
  review: {
    title: "Review",
    introduction: "Return to questions that deserve another look.",
    tabs: [
      { label: "To review", path: "/review/to-review", allowSignedIn: true },
      { label: "Wrong answers", path: "/review/wrong", flags: ["has_journal_access"] },
      { label: "Flagged", path: "/review/flagged", flags: ["has_flagged_access"] },
    ],
  },
  progress: {
    title: "Progress",
    introduction: "See your practice record and where to focus next.",
    tabs: [
      { label: "Overview", path: "/progress/overview", flags: ["has_analytics_access"] },
      { label: "History", path: "/progress/history", flags: ["has_analytics_access"] },
      { label: "Topics", path: "/progress/topics", flags: ["has_analytics_access"] },
    ],
  },
  library: {
    title: "Library",
    introduction: "Written lessons and exercises available to your account.",
    tabs: [
      { label: "Lessons", path: "/library/lessons", flags: ["has_bootcamp_access", "has_activity_access", "has_drill_access", "has_analytics_access"] },
      { label: "Activities", path: "/library/activities", flags: ["has_activity_access"] },
      { label: "Bootcamps", path: "/library/bootcamps", flags: ["has_bootcamp_access"] },
      { label: "Admissions", path: "/library/admissions", admin: true },
    ],
  },
};

const EXAM_TABS: Tab[] = [
  { label: "Overview", path: "/practice/exams", flags: ["has_practice_access"] },
  { label: "All Exams", path: "/practice/exams/all", flags: ["has_practice_access"] },
  { label: "Attempts", path: "/practice/exams/attempts", allowSignedIn: true },
];

export function StudentDestination({ destination }: { destination: Destination }) {
  const { pathname } = useLocation();
  const permissions = useUserPermissions();
  const config = DESTINATIONS[destination];
  const canOpen = (tab: Tab) => !permissions.loading && (tab.admin ? permissions.is_admin
    : permissions.is_admin || tab.allowSignedIn || !!tab.flags?.some((flag) => permissions[flag]));
  const renderTabs = (tabs: Tab[], secondary = false) => tabs.map((tab) => {
    const active = secondary ? pathname === tab.path : destination === "practice"
      ? pathname === tab.path || pathname.startsWith(`${tab.path}/`)
      : pathname === tab.path;
    return canOpen(tab) ? (
      <Link
        key={tab.path}
        to={tab.path}
        className={active ? "student-destination-tab student-destination-tab-active" : "student-destination-tab"}
        aria-current={active ? "page" : undefined}
      >
        {tab.label}
      </Link>
    ) : (
      <span key={tab.path} className="student-destination-tab student-destination-tab-locked" aria-disabled="true" title={permissions.loading ? "Checking access" : `${tab.label} is locked for your account`}>
        {tab.label}{permissions.loading ? null : <Lock size={13} aria-hidden="true" />}
      </span>
    );
  });

  return (
    <div className="student-destination">
      <header className="student-destination-heading">
        <div>
          <h1>{config.title}</h1>
          <p>{config.introduction}</p>
        </div>
      </header>
      <nav className="student-destination-tabs" aria-label={`${config.title} sections`} aria-busy={permissions.loading}>
        {renderTabs(config.tabs)}
      </nav>
      {destination === "practice" && pathname.startsWith("/practice/exams") ? (
        <nav className="student-destination-subtabs" aria-label="Practice Exams pages" aria-busy={permissions.loading}>
          {renderTabs(EXAM_TABS, true)}
        </nav>
      ) : null}
      <div className="student-destination-content"><Outlet /></div>
    </div>
  );
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
