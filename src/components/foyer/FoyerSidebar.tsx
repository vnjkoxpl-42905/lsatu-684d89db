import * as React from "react";
import { NavLink } from "react-router-dom";
import {
  ClipboardList,
  Layers,
  BarChart3,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import InboxPreviewCard from "./InboxPreviewCard";
import { useAuth } from "@/contexts/AuthContext";
import type { Conversation } from "@/hooks/useInbox";

export interface FoyerSidebarProps {
  conversations: Conversation[];
  unreadCount: number;
  displayName?: string | null;
}

// Drill + Inbox removed from the nav: Drill is the hero-ring Smart Drill + the
// in-ring focus card CTA; Inbox surfaces above via the three-row preview list.
// Homework has no route and stays out.
const NAV_ITEMS: Array<{ to: string; label: string; icon: React.ReactNode }> = [
  { to: "/classroom", label: "Classroom", icon: <BookOpen size={12} strokeWidth={1.6} /> },
  { to: "/practice", label: "Practice", icon: <ClipboardList size={12} strokeWidth={1.6} /> },
  { to: "/bootcamps", label: "Bootcamps", icon: <Layers size={12} strokeWidth={1.6} /> },
  { to: "/analytics", label: "Analytics", icon: <BarChart3 size={12} strokeWidth={1.6} /> },
  { to: "/schedule", label: "Schedule", icon: <CalendarDays size={12} strokeWidth={1.6} /> },
];

function emailFallback(email: string | undefined): string {
  const local = email?.split("@")[0] ?? "";
  if (!local) return "";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default function FoyerSidebar({ conversations, unreadCount, displayName }: FoyerSidebarProps) {
  const { user } = useAuth();
  const resolvedName =
    displayName?.trim() ||
    (user?.user_metadata?.display_name as string | undefined)?.trim() ||
    emailFallback(user?.email);
  const initial = resolvedName.trim().charAt(0).toUpperCase() || "·";

  return (
    <aside className="w-[280px] h-full flex flex-col border border-border/60 rounded-xl bg-card p-4 gap-3 overflow-hidden">
      {/* Brand strip */}
      <div className="flex items-center gap-2">
        <div className="h-[18px] w-[18px] rounded-md bg-foreground/90 flex items-center justify-center">
          <span className="text-background font-medium" style={{ fontSize: 9 }}>
            L
          </span>
        </div>
        <span
          className="uppercase font-medium text-foreground"
          style={{ fontSize: 11, letterSpacing: "0.22em" }}
        >
          LSAT U
        </span>
      </div>

      <div className="h-px bg-border/40" />

      {/* Inbox — three most recent threads with section header + View all */}
      <InboxPreviewCard conversations={conversations} unreadCount={unreadCount} />

      <div className="h-px bg-border/40" />

      {/* Workspace nav */}
      <nav className="flex-1 overflow-y-auto -mx-1">
        <div
          className="px-2 pb-1.5 uppercase text-muted-foreground"
          style={{ fontSize: 10, letterSpacing: "0.18em" }}
        >
          Workspace
        </div>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2 rounded px-2 py-[6px] text-foreground/80 hover:bg-muted/50",
                    isActive ? "bg-muted font-medium text-foreground" : "",
                  ].join(" ")
                }
                style={{ fontSize: 12 }}
              >
                <span className="inline-flex items-center justify-center w-3">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="h-px bg-border/40" />

      {/* Footer */}
      <div className="flex items-center gap-2">
        <div
          className="h-[22px] w-[22px] rounded-full bg-muted flex items-center justify-center text-foreground font-medium"
          style={{ fontSize: 10 }}
        >
          {initial}
        </div>
        <div className="leading-tight min-w-0 flex-1">
          <div
            className="font-medium text-foreground truncate"
            style={{ fontSize: 12 }}
          >
            {resolvedName || "—"}
          </div>
        </div>
      </div>
    </aside>
  );
}
