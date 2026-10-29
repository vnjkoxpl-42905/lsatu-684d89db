import type { ManagedUser } from "@/lib/adminUsers";
import type { PostSessionTask } from "./postSessionModel";
export interface DeskRegion<T> {
  state: "loading" | "ready" | "error" | "setup";
  data?: T;
  stale?: boolean;
  error?: string;
  retry?: () => void;
  retryBlocked?: boolean;
}
export interface DeskPage<T> {
  items: T[];
  total: number;
  next_cursor: string | null;
  student_counts?: TaskCount[];
}
export interface ManualTask {
  id: string;
  revision: number;
  title: string;
  student_id: string | null;
  student_name: string | null;
  blocker: string | null;
  kind: "manual" | "consultation";
  source_state?: "ended" | "rescheduled" | "cancelled" | "unavailable";
  handled_at: string | null;
  created_at: string;
}
export interface TaskCount {
  student_id: string;
  total: number;
  handled: number;
  blocked: number;
}
export interface AgendaEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  calendar_url: string;
  student_id: string | null;
  student_name: string | null;
  kind?: string;
}
export interface DeskEmail {
  id: string;
  subject: string;
  sender: string;
  snippet: string;
  received_at: string;
  url: string;
  kind: "student" | "enquiry";
}
export interface DeskPayment {
  id: string;
  student_id: string | null;
  payer_name: string | null;
  email: string | null;
  amount_cents: number;
  currency: string;
  paid_at: string;
  status: string;
  grant_state: string;
  match_state: string;
  source: string;
  granted_credits: number | null;
}
export interface DeskResult {
  id: string;
  student_id: string;
  student_name: string;
  title: string;
  score: string | number | null;
  completed_at: string;
  route?: string;
}
export interface ManualChange {
  action: "create" | "edit" | "handle" | "reopen";
  title?: string;
  studentId?: string | null;
  blocker?: string | null;
}
export type DeskActions = Pick<
  typeof import("@/lib/teacherHomeActions"),
  | "saveHomeAccess"
  | "loadHomeBooking"
  | "createHomeBooking"
  | "addHomeBookingCredits"
  | "revokeHomeBooking"
  | "prepareHomeTopUp"
  | "getPendingHomeTopUp"
  | "resolvePendingHomeTopUp"
  | "discardUnreadableHomeTopUp"
  | "reactivateHomeBooking"
>;
export interface TeachingDesk {
  schedulingServices?: import("@/lib/teacherSchedulingApi").TeacherSchedulingServices;
  actions?: DeskActions;
  actorId?: string;
  manual: DeskRegion<DeskPage<ManualTask> & { student_counts?: TaskCount[] }>;
  agenda: DeskRegion<{
    events: AgendaEvent[];
    next_cursor: string | null;
    fetched_at: string;
    time_zone?: string;
  }>;
  email: DeskRegion<{
    threads: DeskEmail[];
    count: number;
    count_is_lower_bound?: boolean;
    scan_limit?: number;
    fetched_at: string;
    enquiries_configured?: boolean;
  }>;
  payments: DeskRegion<{
    recent: DeskPayment[];
    attention: DeskPayment[];
    total: number;
    attention_total: number;
  }>;
  results: DeskRegion<DeskResult[]>;
  access: DeskRegion<ManagedUser[]>;
  pendingManual?: ManualChange;
  pendingManualError?: string;
  retryManualCreate?: () => Promise<void>;
  mutateManual?: (
    task: ManualTask | null,
    change: ManualChange,
  ) => Promise<void>;
  loadManual?: (
    handled: boolean,
    cursor: string | null,
    studentId: string | null,
    kind?: string | null,
  ) => Promise<DeskPage<ManualTask>>;
  loadSessions?: (
    handled: boolean,
    cursor: string | null,
    studentId: string | null,
  ) => Promise<DeskPage<PostSessionTask>>;
  refreshAccess?: () => void;
  refreshBooking?: () => void;
  classify?: (
    eventId: string,
    kind: "session" | "consultation",
  ) => Promise<void>;
}
export const EMPTY_DESK: TeachingDesk = {
  manual: { state: "setup" },
  agenda: { state: "setup" },
  email: { state: "setup" },
  payments: { state: "setup" },
  results: { state: "setup" },
  access: { state: "setup" },
};
export function paymentNeedsAction(payment: DeskPayment) {
  if (
    payment.match_state === "ignored" ||
    payment.grant_state === "dismissed" ||
    payment.grant_state === "granted" ||
    payment.status !== "succeeded" ||
    payment.source !== "webhook"
  )
    return false;
  return (
    payment.grant_state === "awaiting" || payment.match_state === "unmatched"
  );
}
export function paymentLabel(payment: DeskPayment) {
  return payment.grant_state === "granted"
    ? `${payment.granted_credits ?? ""} sessions credited`.trim()
    : paymentNeedsAction(payment)
      ? payment.match_state === "unmatched"
        ? "Match payer"
        : "Review package"
      : payment.status === "succeeded"
        ? "Paid"
        : payment.status;
}
export function deskMoney(payment: DeskPayment) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: payment.currency.toUpperCase(),
    }).format(payment.amount_cents / 100);
  } catch {
    return `${(payment.amount_cents / 100).toFixed(2)} ${payment.currency}`;
  }
}
export function safeGoogleLink(value: string, kind: "calendar" | "email") {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      u.hostname ===
        (kind === "calendar" ? "calendar.google.com" : "mail.google.com")
      ? u.href
      : null;
  } catch {
    return null;
  }
}
