import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Dumbbell,
  Flame,
  BarChart3,
  CalendarDays,
  MessagesSquare,
  Flag,
  Settings,
  User as UserIcon,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { formatParticipantName } from "@/lib/displayName";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";

export interface FoyerSidebarProps {
  displayName?: string | null;
}

type NavItem = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  flag: PermissionFlag;
};

const NAV_ITEMS: readonly NavItem[] = [
  { to: "/classroom", label: "Classroom", Icon: GraduationCap, flag: "has_classroom_access" },
  { to: "/waj", label: "Ask Joshua", Icon: MessagesSquare, flag: "has_waj_access" },
  { to: "/flagged", label: "Flagged", Icon: Flag, flag: "has_flagged_access" },
  { to: "/practice", label: "Practice", Icon: Dumbbell, flag: "has_practice_access" },
  { to: "/bootcamps", label: "Bootcamps", Icon: Flame, flag: "has_bootcamp_access" },
  { to: "/analytics", label: "Analytics", Icon: BarChart3, flag: "has_analytics_access" },
  { to: "/schedule", label: "Schedule", Icon: CalendarDays, flag: "has_schedule_access" },
] as const;

function emailFallback(email: string | undefined): string {
  const local = email?.split("@")[0] ?? "";
  if (!local) return "";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default function FoyerSidebar({ displayName }: FoyerSidebarProps) {
  const { user } = useAuth();
  const permissions = useUserPermissions();
  const navigate = useNavigate();

  const rawName =
    displayName?.trim() ||
    (user?.user_metadata?.display_name as string | undefined)?.trim() ||
    emailFallback(user?.email);

  const resolved = formatParticipantName(rawName, permissions.is_admin);
  const initial = resolved.charAt(0).toUpperCase() || "·";
  const today = format(new Date(), "EEEE, MMMM d");

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
        {NAV_ITEMS.filter((item) => permissions.is_admin || permissions[item.flag]).map(({ to, label, Icon }) => (
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

      <div className="flex items-center gap-3 border-t border-border p-6">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-[10px] font-medium">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {resolved || "—"}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button
              aria-label="Settings"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="top"
            className="w-48 p-1"
          >
            <button
              onClick={() => navigate("/profile")}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              <UserIcon className="h-4 w-4" />
              Profile
            </button>
            {permissions.is_admin && (
              <button
                onClick={() => navigate("/admin")}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-accent"
              >
                <Shield className="h-4 w-4" />
                Admin
              </button>
            )}
            <div className="my-1 border-t border-border" />
            <div className="flex items-center gap-1 px-1">
              <ThemeToggle className="flex-1 justify-start" />
              <LogoutButton />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  );
}
