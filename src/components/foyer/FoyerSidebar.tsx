import * as React from "react";
import { NavLink } from "react-router-dom";
import {
  GraduationCap,
  Dumbbell,
  Flame,
  BarChart3,
  CalendarDays,
  MessagesSquare,
  Flag,
  BookOpen,
} from "lucide-react";
import { format } from "date-fns";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useLayoutPrefs } from "@/hooks/useLayoutPrefs";

export interface FoyerSidebarProps {
  displayName?: string | null;
}

type NavItem = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  flag?: PermissionFlag;
  adminOnly?: boolean;
};

const NAV_ITEMS: readonly NavItem[] = [
  { to: "/classroom", label: "Classroom", Icon: GraduationCap, flag: "has_classroom_access" },
  { to: "/inbox", label: "Messages", Icon: MessagesSquare, flag: "has_chat_access" },
  { to: "/waj", label: "Wrong Answer Journal", Icon: BookOpen, flag: "has_waj_access" },
  { to: "/flagged", label: "Flagged", Icon: Flag, flag: "has_flagged_access" },
  { to: "/practice", label: "Practice", Icon: Dumbbell, flag: "has_practice_access" },
  { to: "/bootcamps", label: "Bootcamps", Icon: Flame, flag: "has_bootcamp_access" },
  { to: "/analytics", label: "Analytics", Icon: BarChart3, flag: "has_analytics_access" },
  { to: "/schedule", label: "Schedule", Icon: CalendarDays, flag: "has_schedule_access" },
  { to: "/admin/homework", label: "Homework", Icon: BookOpen, adminOnly: true },
] as const;

const today = format(new Date(), "EEEE, MMMM d");

export default function FoyerSidebar(_props: FoyerSidebarProps) {
  const permissions = useUserPermissions();
  const { prefs } = useLayoutPrefs();

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

      <div
        className="px-6 pb-2 pt-6 text-xs uppercase text-muted-foreground"
        style={{ letterSpacing: "0.2em" }}
      >
        Workspace
      </div>

      <nav className="flex flex-col">
        {orderedNav.filter((item) => {
          if (item.adminOnly) return permissions.is_admin;
          return permissions.is_admin || (item.flag ? permissions[item.flag] : false);
        }).map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 border-l-2 px-6 py-3 text-sm transition-colors",
                isActive
                  ? "border-primary bg-accent/60 text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />
    </aside>
  );
}
