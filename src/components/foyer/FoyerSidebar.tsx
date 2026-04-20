import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Dumbbell,
  Flame,
  BarChart3,
  CalendarDays,
  Settings,
  User as UserIcon,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
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

const NAV_ITEMS = [
  { to: "/classroom", label: "Classroom", Icon: GraduationCap },
  { to: "/practice", label: "Practice", Icon: Dumbbell },
  { to: "/bootcamps", label: "Bootcamps", Icon: Flame },
  { to: "/analytics", label: "Analytics", Icon: BarChart3 },
  { to: "/schedule", label: "Schedule", Icon: CalendarDays },
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
        {NAV_ITEMS.map(({ to, label, Icon }) => (
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
