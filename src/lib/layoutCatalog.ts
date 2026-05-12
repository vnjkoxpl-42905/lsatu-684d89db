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
  /** Short user-facing description (rendered as a tooltip on /settings/layout). */
  description?: string;
  requires?: PermissionFlag;
  adminOnly?: boolean;
  // Sidebar-only: navigation path
  to?: string;
}

// Mainhub GooeyDock — quick-launch shortcuts
export const DOCK_CATALOG: CatalogItem[] = [
  { id: "teacher", label: "Teacher Workspace", icon: Command, adminOnly: true, description: "Joshua's command center for assigning work." },
  { id: "whiteboard", label: "Whiteboard", icon: PencilRuler, adminOnly: true, description: "Open Excalidraw quickly from anywhere." },
  { id: "ask-joshua", label: "Ask Joshua", icon: GraduationCap, adminOnly: true, description: "Open the AI Teaching Assistant chat." },
  { id: "inbox", label: "Inbox", icon: Inbox, requires: "has_chat_access", description: "Read and reply to messages from Joshua." },
  { id: "schedule", label: "Schedule", icon: CalendarDays, requires: "has_schedule_access", description: "Open your study calendar." },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Open the notifications bell panel." },
  { id: "profile", label: "Profile", icon: UserIcon, description: "Open your profile page." },
  { id: "settings", label: "Customize layout", icon: Sliders, description: "Open this customization page." },
  { id: "help", label: "Help", icon: LifeBuoy, description: "Open the in-app help dialog." },
];

// Mainhub orbital ring — primary call-to-action nodes (max 3)
export const ORBITAL_CATALOG: CatalogItem[] = [
  { id: "smart-drill", label: "Smart Drill", icon: Zap, requires: "has_drill_access", description: "Adaptive drill tuned to your weakest question types." },
  { id: "resume", label: "Resume", icon: Play, description: "Open your highest-priority active assignment." },
  { id: "find", label: "Find", icon: Search, description: "Jump to any LSAT question by id." },
  { id: "mock-lsat", label: "Practice Hub", icon: BookOpen, requires: "has_practice_access", description: "Open the practice mode hub." },
  { id: "last-bootcamp", label: "Last Bootcamp", icon: Flame, requires: "has_bootcamp_access", description: "Resume your most recent assigned bootcamp module." },
];

// Mainhub sidebar nav items. The `id` is the route path so saved layouts survive
// refactors; consumers map id -> NAV_ITEM to render.
export const SIDEBAR_CATALOG: CatalogItem[] = [
  { id: "/classroom", label: "Classroom", icon: GraduationCap, to: "/classroom", requires: "has_classroom_access", description: "Assigned work, recaps, and announcements." },
  { id: "/inbox", label: "Messages", icon: MessagesSquare, to: "/inbox", requires: "has_chat_access", description: "1:1 message threads with Joshua." },
  { id: "/waj", label: "Wrong Answer Journal", icon: BookOpen, to: "/waj", requires: "has_waj_access", description: "Every mistake you've made, organized for review." },
  { id: "/flagged", label: "Flagged", icon: Flag, to: "/flagged", requires: "has_flagged_access", description: "Questions you marked for deeper review." },
  { id: "/practice", label: "Practice Hub", icon: Dumbbell, to: "/practice", requires: "has_practice_access", description: "Drill-launcher hub: full sections, smart builder, custom drills." },
  { id: "/bootcamps", label: "Bootcamps", icon: Flame, to: "/bootcamps", requires: "has_bootcamp_access", description: "Multi-week LR training paths." },
  { id: "/analytics", label: "Analytics", icon: BarChart3, to: "/analytics", requires: "has_analytics_access", description: "Performance trends and accuracy by question type." },
  { id: "/schedule", label: "Schedule", icon: CalendarDays, to: "/schedule", requires: "has_schedule_access", description: "Calendar of due dates and weekly plan items." },
  { id: "/admin/homework", label: "Homework", icon: BookOpen, to: "/admin/homework", adminOnly: true, description: "Admin: build and manage homework sets." },
  { id: "/teacher", label: "Teacher Workspace", icon: Command, to: "/teacher", adminOnly: true, description: "Admin command center." },
];

export const ORBITAL_MAX = 3;
export const ORBITAL_MIN = 1;
export const SIDEBAR_MIN = 1;

export function findCatalogItem(catalog: CatalogItem[], id: string): CatalogItem | undefined {
  return catalog.find((c) => c.id === id);
}
