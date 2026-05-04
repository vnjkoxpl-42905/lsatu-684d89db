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
  BookOpen,
  ChevronUp,
  User as UserIcon,
  Shield,
  LogOut,
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
  { to: "/waj", label: "Ask Joshua", Icon: MessagesSquare, flag: "has_waj_access" },
  { to: "/flagged", label: "Flagged", Icon: Flag, flag: "has_flagged_access" },
  { to: "/practice", label: "Practice", Icon: Dumbbell, flag: "has_practice_access" },
  { to: "/bootcamps", label: "Bootcamps", Icon: Flame, flag: "has_bootcamp_access" },
  { to: "/analytics", label: "Analytics", Icon: BarChart3, flag: "has_analytics_access" },
  { to: "/schedule", label: "Schedule", Icon: CalendarDays, flag: "has_schedule_access" },
  { to: "/admin/homework", label: "Homework", Icon: BookOpen, adminOnly: true },
] as const;

function emailFallback(email: string | undefined): string {
  const local = email?.split("@")[0] ?? "";
  if (!local) return "";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export default function FoyerSidebar({ displayName }: FoyerSidebarProps) {
  const { user, signOut } = useAuth();
  const permissions = useUserPermissions();
  const navigate = useNavigate();

  const rawName =
    displayName?.trim() ||
    (user?.user_metadata?.display_name as string | undefined)?.trim() ||
    emailFallback(user?.email);

  const formatted = formatParticipantName(rawName, permissions.is_admin);
  const resolved = permissions.is_admin ? formatted : titleCase(formatted);
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
        {NAV_ITEMS.filter((item) => {
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

      <AccountMenu
        initial={initial}
        resolved={resolved}
        isAdmin={permissions.is_admin}
        onProfile={() => navigate("/profile")}
        onAdmin={() => navigate("/admin")}
        onSignOut={async () => {
          await signOut();
          navigate("/auth");
        }}
      />
    </aside>
  );
}

interface AccountMenuProps {
  initial: string;
  resolved: string;
  isAdmin: boolean;
  onProfile: () => void;
  onAdmin: () => void;
  onSignOut: () => void;
}

function AccountMenu({
  initial,
  resolved,
  isAdmin,
  onProfile,
  onAdmin,
  onSignOut,
}: AccountMenuProps) {
  const [open, setOpen] = React.useState(false);

  const close = () => setOpen(false);
  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  return (
    <div className="border-t border-border p-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[11px] font-medium">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {resolved || "—"}
            </span>
            <ChevronUp
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "" : "rotate-180"}`}
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          collisionPadding={12}
          className="w-[var(--radix-popover-trigger-width)] min-w-56 p-1"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={run(onProfile)}
            className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
          >
            <UserIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Profile
          </button>
          {isAdmin && (
            <button
              type="button"
              role="menuitem"
              onClick={run(onAdmin)}
              className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Admin
            </button>
          )}
          <div className="flex items-center justify-between gap-2 rounded px-3 py-1.5 text-sm text-foreground">
            <span className="text-muted-foreground">Preferences</span>
            <ThemeToggle />
          </div>
          <div className="my-1 h-px bg-border" role="separator" />
          <button
            type="button"
            role="menuitem"
            onClick={run(onSignOut)}
            className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Sign out
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
