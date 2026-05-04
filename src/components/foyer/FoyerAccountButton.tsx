import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, User, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { formatParticipantName } from "@/lib/displayName";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function emailLocal(email: string | undefined): string {
  const local = email?.split("@")[0] ?? "";
  if (!local) return "";
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export interface FoyerAccountButtonProps {
  displayName?: string | null;
}

export default function FoyerAccountButton({ displayName }: FoyerAccountButtonProps) {
  const { user, signOut } = useAuth();
  const permissions = useUserPermissions();
  const navigate = useNavigate();
  const location = useLocation();

  const rawName =
    displayName?.trim() ||
    (user?.user_metadata?.display_name as string | undefined)?.trim() ||
    emailLocal(user?.email);
  const formatted = formatParticipantName(rawName, permissions.is_admin);
  const resolved = permissions.is_admin ? formatted : titleCase(formatted);
  const initial = resolved.charAt(0).toUpperCase() || "·";

  const insideAdmin = location.pathname.startsWith("/admin");
  const showAdminItem = permissions.is_admin && !insideAdmin;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-border/40 bg-background/70 pl-1 pr-1 shadow-sm shadow-black/5 backdrop-blur-md transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:pr-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
            <span className="font-medium" style={{ fontSize: 12 }}>
              {initial}
            </span>
          </span>
          <span className="hidden max-w-[140px] truncate text-sm font-medium text-foreground md:inline">
            {resolved || "Account"}
          </span>
          <ChevronDown
            className="hidden h-4 w-4 shrink-0 text-muted-foreground md:block"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className="w-60 p-1"
      >
        <div
          className="flex items-center gap-2.5 px-3 py-2 text-xs"
          aria-hidden
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
            <span className="font-medium" style={{ fontSize: 11 }}>
              {initial}
            </span>
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {resolved || "Account"}
          </span>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground"
        >
          <User className="h-4 w-4 text-muted-foreground" aria-hidden />
          Profile
        </DropdownMenuItem>

        {showAdminItem && (
          <DropdownMenuItem
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground"
          >
            <Shield className="h-4 w-4 text-muted-foreground" aria-hidden />
            Admin Dashboard
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-foreground">
          <span>Theme</span>
          <ThemeToggle />
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            navigate("/auth");
          }}
          className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground"
        >
          <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
