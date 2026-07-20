import { supabase } from "@/integrations/supabase/client";

// Shared client for the booking-pass-admin edge function.
export const bookingAdmin = async (action: string, extra: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke("booking-pass-admin", {
    body: { action, ...extra },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data;
};

export type Pass = {
  id: string;
  student_id: string | null;
  student_name: string | null;
  student_email: string | null;
  booking_slug: string | null;
  total_credits: number;
  used_credits: number;
  session_length_minutes: number;
  status: "active" | "paused" | "exhausted" | "expired" | "revoked";
  expires_at: string | null;
  created_at: string;
};

export type Booking = {
  id: string;
  booking_pass_id: string;
  start_at: string;
  end_at: string;
  status: string;
  meet_url: string | null;
  student_name_snapshot: string | null;
  student_email_snapshot: string | null;
  student_note: string | null;
  calendar_action?: "create" | "update" | "delete" | "none";
  calendar_status?: "pending" | "processing" | "synced" | "failed";
  calendar_error?: string | null;
  submission_status?: "none" | "staged" | "linked" | "failed";
  upload_count?: number;
  booking_passes?: {
    id: string;
    student_name: string | null;
    student_email: string | null;
    student_id: string | null;
    session_length_minutes: number;
  } | null;
};

export type BookingUpload = {
  id: string;
  file_name: string;
  file_type: string | null;
  created_at: string;
  url: string | null;
};

// Student-facing links always use the canonical domain, never the current
// origin (which can be a Lovable preview host).
const APP_ORIGIN = "https://lsatprep.study";

export function passUrl(p: Pass): string | null {
  return p.booking_slug ? `${APP_ORIGIN}/book/${p.booking_slug}` : null;
}

export function durationLabel(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function passDisplayName(p: Pass) {
  return p.student_name || p.student_email || "(unnamed student)";
}

// Admin-side defaults for new passes (device-local, prefill only).
const DEFAULTS_KEY = "lsatu_booking_defaults";
export type BookingDefaults = { credits: number; sessionLen: number; expiryDays: number | null };

export function loadDefaults(): BookingDefaults {
  try {
    const raw = localStorage.getItem(DEFAULTS_KEY);
    if (raw) return { credits: 5, sessionLen: 70, expiryDays: null, ...JSON.parse(raw) };
  } catch { /* fall through */ }
  return { credits: 5, sessionLen: 70, expiryDays: null };
}

export function saveDefaults(d: BookingDefaults) {
  localStorage.setItem(DEFAULTS_KEY, JSON.stringify(d));
}
