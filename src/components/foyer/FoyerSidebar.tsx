import * as React from "react";
import { NavLink } from "react-router-dom";
import {
  ClipboardList,
  Zap,
  Layers,
  BarChart3,
  CalendarDays,
  Inbox as InboxIcon,
  BookOpen,
  Bell,
  Clock,
} from "lucide-react";
import InboxPreviewCard from "./InboxPreviewCard";
import StateBlockMini from "./StateBlockMini";

export type FoyerSidebarProps = Record<string, never>;

const NAV_ITEMS: Array<{ to: string; label: string; icon: React.ReactNode }> = [
  { to: "/classroom", label: "Classroom", icon: <BookOpen size={12} strokeWidth={1.6} /> },
  { to: "/practice", label: "Practice", icon: <ClipboardList size={12} strokeWidth={1.6} /> },
  { to: "/drill", label: "Drill", icon: <Zap size={12} strokeWidth={1.6} /> },
  { to: "/bootcamps", label: "Bootcamps", icon: <Layers size={12} strokeWidth={1.6} /> },
  { to: "/analytics", label: "Analytics", icon: <BarChart3 size={12} strokeWidth={1.6} /> },
  { to: "/schedule", label: "Schedule", icon: <CalendarDays size={12} strokeWidth={1.6} /> },
  { to: "/inbox", label: "Inbox", icon: <InboxIcon size={12} strokeWidth={1.6} /> },
];

export default function FoyerSidebar(_props: FoyerSidebarProps) {
  return (
    <aside className="w-[240px] h-full flex flex-col border border-border/60 rounded-md bg-card overflow-hidden">
      {/* Brand strip */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
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
        <span className="text-muted-foreground" style={{ fontSize: 10 }} title="Coming soon">
          {/* TODO: wire ⌘K once a command palette exists */}
          ⌘K
        </span>
      </div>

      {/* Bento state blocks */}
      <div className="p-3 space-y-2">
        <InboxPreviewCard />
        <div className="grid grid-cols-2 gap-2">
          <StateBlockMini label="Alerts" icon={<Bell size={10} strokeWidth={1.6} />} value="--" />
          <StateBlockMini label="Streak" icon={<Clock size={10} strokeWidth={1.6} />} value="--" />
        </div>
      </div>

      <div className="h-px bg-border/60" />

      {/* Workspace nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div
          className="px-1.5 pb-1.5 uppercase text-muted-foreground"
          style={{ fontSize: 9, letterSpacing: "0.2em" }}
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
                    "flex items-center gap-2 rounded px-1.5 py-[5px] text-foreground/80 hover:bg-muted/50",
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

      {/* Footer */}
      <div className="mt-auto border-t border-border/60 px-3 py-2.5 flex items-center gap-2">
        <div className="relative">
          <div className="h-[22px] w-[22px] rounded-full bg-muted flex items-center justify-center text-foreground font-medium" style={{ fontSize: 10 }}>
            {/* Push-2 fills in initial from auth user */}
            ·
          </div>
        </div>
        <div className="leading-tight">
          <div className="font-medium text-foreground" style={{ fontSize: 11 }}>
            --
          </div>
        </div>
      </div>
    </aside>
  );
}
