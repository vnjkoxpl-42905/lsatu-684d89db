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

export type StudentRedemption = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  meet_url: string | null;
  reschedule_count: number;
  google_event_id: string | null;
  calendar_status?: string | null;
  can_reschedule: boolean;
};

export type StudentBookingInfo = {
  pass: StudentPass;
  redemptions: StudentRedemption[];
};

const callInfo = async (): Promise<StudentBookingInfo> => {
  const { data, error } = await supabase.functions.invoke("student-booking", {
    body: { action: "info" },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as StudentBookingInfo) ?? { pass: null, redemptions: [] };
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
