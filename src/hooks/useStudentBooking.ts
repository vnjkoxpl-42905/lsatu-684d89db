import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type StudentPass = {
  status: string;
  total_credits: number;
  used_credits: number;
  credits_remaining: number;
  session_length_minutes: number;
  expires_at: string | null;
} | null;

export type StudentBookingBase = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  meet_url: string | null;
  calendar_status?: string | null;
};

export type StudentRedemptionBooking = StudentBookingBase & {
  source: "redemption";
  reschedule_count: number;
  google_event_id: string | null;
  can_reschedule: boolean;
};

export type StudentSingleSessionBooking = StudentBookingBase & {
  source: "single_session";
  google_event_id: string | null;
  can_reschedule: false;
};

export type StudentBooking = StudentRedemptionBooking | StudentSingleSessionBooking;

export type StudentBookingOffer = {
  id: string;
  label: string;
  provider: string;
  url: string;
  credits: number;
};

export type StudentBookingInfo = {
  pass: StudentPass;
  bookings: StudentBooking[];
  /** The student's effective offer registry, used to pick the right booking link. */
  offers?: StudentBookingOffer[];
};

const callInfo = async (): Promise<StudentBookingInfo> => {
  // Firing before auth hydration sends the anon key as the bearer, and the
  // edge function rejects it ("missing sub claim") with a 401.
  const { waitForAccessToken } = await import("@/lib/waitForSession");
  const token = await waitForAccessToken();
  if (!token) throw new Error("not_signed_in");
  const { data, error } = await supabase.functions.invoke("student-booking", {
    body: { action: "info" },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as StudentBookingInfo) ?? { pass: null, bookings: [] };
};

/**
 * Single source of truth for the authenticated student's booking state.
 * Backed by the `get_student_booking` service RPC (safe DTO, never token_hash).
 * Feeds every student calendar surface (Today / month / week / day).
 */
export function useStudentBooking() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["student-booking", "info", user?.id],
    enabled: !!user,
    queryFn: callInfo,
    staleTime: 30_000,
    refetchOnMount: "always",
  });
}
