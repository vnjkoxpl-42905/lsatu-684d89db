import * as React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Dumbbell,
  CalendarDays,
  MessagesSquare,
  Play,
  Flame,
} from "lucide-react";
import { format } from "date-fns";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useLayoutPrefs } from "@/hooks/useLayoutPrefs";
import { useLastActivity } from "@/hooks/useLastActivity";
import { resolveResumeTarget, labelFor } from "@/lib/lastActivity";

export interface MainhubSidebarProps {
  displayName?: string | null;
}

type NavItem = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  flag?: PermissionFlag;
  adminOnly?: boolean;
  /**
   * Additional pathname prefixes that should light up this nav entry.
   * Useful when the destination route has cousins under a different prefix
   * (Bootcamps owns both /bootcamps and /bootcamp/* and /topics/*).
   */
  activePrefixes?: readonly string[];
};

const NAV_ITEMS: readonly NavItem[] = [
  { to: "/classroom", label: "Classroom", Icon: GraduationCap, flag: "has_classroom_access" },
  { to: "/inbox", label: "Messages", Icon: MessagesSquare, flag: "has_chat_access" },
  { to: "/practice", label: "Practice Hub", Icon: Dumbbell, flag: "has_practice_access" },
  {
    to: "/bootcamps",
    label: "Bootcamps",
    Icon: Flame,
    flag: "has_bootcamp_access",
    activePrefixes: ["/bootcamps", "/bootcamp/", "/topics/"],
  },
  { to: "/schedule", label: "Schedule", Icon: CalendarDays, flag: "has_schedule_access" },
  { to: "/admin/homework", label: "Homework", Icon: GraduationCap, adminOnly: true },
] as const;

const today = format(new Date(), "EEEE, MMMM d");

export default function MainhubSidebar(_props: MainhubSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const permissions = useUserPermissions();
  const { prefs } = useLayoutPrefs();
  const { data: lastActivity } = useLastActivity();

  const handleResume = () => {
    if (lastActivity) {
      const { path, state } = resolveResumeTarget(lastActivity.state_snapshot);
      navigate(path, { state });
    } else {
      // No prior activity → route to Smart Drill, per spec.
      navigate("/drill", { state: { mode: "adaptive" } });
    }
  };
  const resumeLabel = lastActivity
    ? `Resume: ${labelFor(lastActivity.state_snapshot)}`
    : "Start Smart Drill";

  const navByTo = new Map(NAV_ITEMS.map((n) => [n.to, n]));
  const orderedNav: NavItem[] = [];
  const seen = new Set<string>();
  for (const id of prefs.sidebar) {
    const item = navByTo.get(id);
    if (item) {
      orderedNav.push(item);
      seen.add(id);
    }
  }
  // Append any nav items missing from prefs (e.g. catalog gained a new entry)
  for (const item of NAV_ITEMS) if (!seen.has(item.to)) orderedNav.push(item);

  return (
    <aside className="flex h-full w-full flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border p-6">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground">
          <span
            className="font-medium text-background"
            style={{ fontSize: 11 }}
          >
            L
          </span>
        </div>
        <span
          className="font-medium uppercase text-foreground"
          style={{ fontSize: 12, letterSpacing: "0.22em" }}
        >
          LSAT U
        </span>
      </div>

      <div className="px-6 py-4 text-sm tracking-wide text-muted-foreground">
        {today}
      </div>

      <div className="px-6 pb-4">
        <button
          type="button"
          onClick={handleResume}
          data-tour="mainhub-resume"
          className="group flex w-full items-center gap-3 rounded-lg border border-border bg-accent/40 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={resumeLabel}
        >
          <Play className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">
            {resumeLabel}
          </span>
        </button>
      </div>

      <div
        className="px-6 pb-2 pt-2 text-xs uppercase text-muted-foreground"
        style={{ letterSpacing: "0.2em" }}
      >
        Workspace
      </div>

      <nav className="flex flex-col">
        {orderedNav.filter((item) => {
          if (item.adminOnly) return permissions.is_admin;
          return permissions.is_admin || (item.flag ? permissions[item.flag] : false);
        }).map(({ to, label, Icon, activePrefixes }) => {
          const prefixActive = activePrefixes?.some((p) =>
            location.pathname === p.replace(/\/$/, "") ||
            location.pathname.startsWith(p),
          );
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => {
                const active = isActive || prefixActive;
                return [
                  "flex items-center gap-3 border-l-2 px-6 py-3 text-sm transition-colors active:opacity-75",
                  active
                    ? "border-primary bg-accent/60 text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                ].join(" ");
              }}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="flex-1" />
    </aside>
  );
}
