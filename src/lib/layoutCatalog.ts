import {
  Bell,
  BookOpen,
  CalendarDays,
  Command,
  Dumbbell,
  Flag,
  Flame,
  GraduationCap,
  Inbox,
  LifeBuoy,
  MessagesSquare,
  PencilRuler,
  Play,
  Search,
  Sliders,
  User as UserIcon,
  Zap,
  type LucideIcon,
  BarChart3,
} from "lucide-react";
import type { PermissionFlag } from "@/hooks/useUserPermissions";

export interface CatalogItem {
  id: string;
  label: string;
  icon: LucideIcon;
  requires?: PermissionFlag;
  adminOnly?: boolean;
  // Sidebar-only: navigation path
  to?: string;
}

// Foyer GooeyDock — quick-launch shortcuts
export const DOCK_CATALOG: CatalogItem[] = [
  { id: "teacher", label: "Teacher Workspace", icon: Command, adminOnly: true },
  { id: "whiteboard", label: "Whiteboard", icon: PencilRuler, adminOnly: true },
  { id: "ask-joshua", label: "Ask Joshua", icon: GraduationCap, adminOnly: true },
  { id: "inbox", label: "Inbox", icon: Inbox, requires: "has_chat_access" },
  { id: "schedule", label: "Schedule", icon: CalendarDays, requires: "has_schedule_access" },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "settings", label: "Customize layout", icon: Sliders },
  { id: "help", label: "Help", icon: LifeBuoy },
];

// Foyer orbital ring — primary call-to-action nodes (max 3)
export const ORBITAL_CATALOG: CatalogItem[] = [
  { id: "smart-drill", label: "Smart Drill", icon: Zap, requires: "has_drill_access" },
  { id: "resume", label: "Resume", icon: Play },
  { id: "find", label: "Find", icon: Search },
  { id: "mock-lsat", label: "Practice", icon: BookOpen, requires: "has_practice_access" },
  { id: "last-bootcamp", label: "Last Bootcamp", icon: Flame, requires: "has_bootcamp_access" },
];

// Foyer sidebar nav items. The `id` is the route path so saved layouts survive
// refactors; consumers map id -> NAV_ITEM to render.
export const SIDEBAR_CATALOG: CatalogItem[] = [
  { id: "/classroom", label: "Classroom", icon: GraduationCap, to: "/classroom", requires: "has_classroom_access" },
  { id: "/inbox", label: "Messages", icon: MessagesSquare, to: "/inbox", requires: "has_chat_access" },
  { id: "/waj", label: "Wrong Answer Journal", icon: BookOpen, to: "/waj", requires: "has_waj_access" },
  { id: "/flagged", label: "Flagged", icon: Flag, to: "/flagged", requires: "has_flagged_access" },
  { id: "/practice", label: "Practice", icon: Dumbbell, to: "/practice", requires: "has_practice_access" },
  { id: "/bootcamps", label: "Bootcamps", icon: Flame, to: "/bootcamps", requires: "has_bootcamp_access" },
  { id: "/analytics", label: "Analytics", icon: BarChart3, to: "/analytics", requires: "has_analytics_access" },
  { id: "/schedule", label: "Schedule", icon: CalendarDays, to: "/schedule", requires: "has_schedule_access" },
  { id: "/admin/homework", label: "Homework", icon: BookOpen, to: "/admin/homework", adminOnly: true },
  { id: "/teacher", label: "Teacher Workspace", icon: Command, to: "/teacher", adminOnly: true },
];

export const ORBITAL_MAX = 3;
export const ORBITAL_MIN = 1;
export const SIDEBAR_MIN = 1;

export function findCatalogItem(catalog: CatalogItem[], id: string): CatalogItem | undefined {
  return catalog.find((c) => c.id === id);
}
