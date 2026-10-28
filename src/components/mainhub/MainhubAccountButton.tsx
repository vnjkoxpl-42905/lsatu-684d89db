import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronsUpDown, User, Sliders, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { formatParticipantName } from "@/lib/displayName";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuroraButton } from "@/components/ui/aurora-button";
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

export interface MainhubAccountButtonProps {
  displayName?: string | null;
  variant?: "pill" | "footer";
  secondaryLabel?: string;
}

export default function MainhubAccountButton({
  displayName,
  variant = "pill",
  secondaryLabel,
}: MainhubAccountButtonProps) {
  const { user, signOut } = useAuth();
  const permissions = useUserPermissions();
  const navigate = useNavigate();

  const rawName =
    displayName?.trim() ||
    (user?.user_metadata?.display_name as string | undefined)?.trim() ||
    emailLocal(user?.email);
  const formatted = formatParticipantName(rawName, permissions.is_admin);
  const resolved = permissions.is_admin ? formatted : titleCase(formatted);
  const initial = resolved.charAt(0).toUpperCase() || "·";
  const computedSecondary =
    secondaryLabel ?? (permissions.is_admin ? "Admin" : undefined);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "footer" ? (
          <button
            type="button"
            aria-label="Account menu"
            className="flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              <span className="font-medium" style={{ fontSize: 12 }}>
                {initial}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {resolved || "Account"}
              </span>
              {computedSecondary && (
                <span className="block truncate text-xs text-muted-foreground">
                  {computedSecondary}
                </span>
              )}
            </span>
            <ChevronsUpDown
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              strokeWidth={1.8}
              aria-hidden
            />
          </button>
        ) : (
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
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={variant === "footer" ? "start" : "end"}
        side={variant === "footer" ? "top" : "bottom"}
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

        <DropdownMenuItem
          onClick={() => navigate("/settings/layout")}
          className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground"
        >
          <Sliders className="h-4 w-4 text-muted-foreground" aria-hidden />
          Customize layout
        </DropdownMenuItem>

        {(permissions.is_admin || permissions.has_analytics_access) && (
          <DropdownMenuItem
            onClick={() => navigate("/review/progress")}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground"
          >
            <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />
            Progress
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-foreground">
          <span>Theme</span>
          <ThemeToggle />
        </div>

        <DropdownMenuSeparator />

        <div className="px-3 py-2">
          <AuroraButton
            type="button"
            className="w-full rounded-full px-5 py-3 text-base font-medium"
            glowClassName="rounded-full"
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
          >
            Sign out
          </AuroraButton>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
