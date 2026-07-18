import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Command,
  GraduationCap,
  Dumbbell,
  CalendarDays,
  CalendarClock,
  MessagesSquare,
  Flame,
  Archive,
  PencilRuler,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useLayoutPrefs } from "@/hooks/useLayoutPrefs";
import MainhubAccountButton from "@/components/mainhub/MainhubAccountButton";

export interface MainhubSidebarProps {
  displayName?: string | null;
  /** Fired after a nav item is chosen (used to close the mobile sheet). */
  onNavigate?: () => void;
}

type NavItem = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  flag?: PermissionFlag | readonly PermissionFlag[];
  adminOnly?: boolean;
  alwaysVisible?: boolean;
  activePrefixes?: readonly string[];
};

const NAV_ITEMS: readonly NavItem[] = [
  { to: "/teacher", label: "Teacher Workspace", Icon: Command, adminOnly: true, activePrefixes: ["/teacher"] },
  { to: "/teacher/reference-library", label: "Reference Library", Icon: Archive, adminOnly: true },
  { to: "/admin/board", label: "Whiteboard", Icon: PencilRuler, adminOnly: true },
  { to: "/classroom", label: "Classroom", Icon: GraduationCap, flag: "has_classroom_access", alwaysVisible: true },
  { to: "/bootcamps", label: "Bootcamps", Icon: Flame, flag: "has_bootcamp_access" },
  { to: "/inbox", label: "Messages", Icon: MessagesSquare, flag: "has_chat_access" },
  { to: "/practice", label: "Practice Hub", Icon: Dumbbell, flag: "has_practice_access" },
  { to: "/journal", label: "Wrong Answer Journal", Icon: NotebookPen, flag: ["has_journal_access", "has_waj_access"], alwaysVisible: true, activePrefixes: ["/journal", "/waj"] },
  { to: "/activities", label: "Activity Centre", Icon: Sparkles, flag: "has_activity_access" },
  { to: "/schedule", label: "Schedule", Icon: CalendarDays, flag: "has_schedule_access", alwaysVisible: true },
  { to: "/booking", label: "Booking", Icon: CalendarClock, alwaysVisible: true },
] as const;

export default function MainhubSidebar({ displayName, onNavigate }: MainhubSidebarProps) {
  const location = useLocation();
  const permissions = useUserPermissions();
  const { prefs } = useLayoutPrefs();
  const today = format(new Date(), "EEEE, MMMM d");

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

  // lexprep-style nav pill classes (filled rounded item, 13px, size-4.5 icon).
  const navItemBase =
    "flex w-full items-center gap-2 rounded-md py-2 pr-1 pl-[9px] text-left text-[0.8125rem] font-medium transition-colors active:scale-[0.99]";
  const navItemInactive = "text-muted-foreground hover:bg-accent/60 hover:text-foreground";
  const navItemActive = "bg-accent text-foreground";

  return (
    <aside className="flex h-full w-full flex-col bg-background">
      <div className="mb-4 flex items-center gap-2 pl-4 pr-2 pb-2 pt-4">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-foreground">
          <span className="font-medium text-background" style={{ fontSize: 10 }}>
            L
          </span>
        </div>
        <span
          className="font-medium uppercase text-foreground"
          style={{ fontSize: 12, letterSpacing: "0.2em" }}
        >
          LSAT U
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-1">
        <div className="mt-1 border-t border-border/60 pt-4">
          <div className="ml-2 mb-1 text-xs font-medium text-muted-foreground">{today}</div>
          <div className="ml-2 mb-1 text-xs font-medium text-muted-foreground">Workspace</div>

          <nav className="flex flex-col gap-0.5">
            {orderedNav.filter((item) => {
              if (item.adminOnly) return permissions.is_admin;
              if (item.alwaysVisible) return true;
              const flags = Array.isArray(item.flag) ? item.flag : item.flag ? [item.flag] : [];
              return permissions.is_admin || flags.some((flag) => permissions[flag]);
            }).map(({ to, label, Icon, activePrefixes }) => {
              const prefixActive = activePrefixes?.some((p) =>
                location.pathname === p.replace(/\/$/, "") ||
                location.pathname.startsWith(p),
              );
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => onNavigate?.()}
                  className={({ isActive }) => {
                    const active = isActive || prefixActive;
                    return [navItemBase, active ? navItemActive : navItemInactive].join(" ");
                  }}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mt-auto border-t border-border/60 p-2">
        <MainhubAccountButton
          displayName={displayName}
          variant="footer"
          secondaryLabel={permissions.is_admin ? "Admin" : "Student"}
        />
      </div>
    </aside>
  );
}
