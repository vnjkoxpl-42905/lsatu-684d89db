import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Notice = {
  kind: "expiration" | "restored" | "announcement";
  pause_at: string | null;
  message: string;
  revision: string;
  acknowledged_at: string | null;
};

export function StudentAccessNoticeGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [acknowledged, setAcknowledged] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const noticeQuery = useQuery({
    queryKey: ["student-access-notice", user?.id],
    enabled: Boolean(user),
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_student_access_notice" as never);
      if (error) throw error;
      return data as { paused: boolean; server_time: string; notice: Notice | null };
    },
  });
  const notice = noticeQuery.data?.notice;
  const remaining = notice?.pause_at && noticeQuery.data
    ? Date.parse(notice.pause_at) - Date.parse(noticeQuery.data.server_time)
    : Infinity;
  const { refetch } = noticeQuery;
  useEffect(() => {
    if (remaining <= 0 || !Number.isFinite(remaining)) return;
    const timeout = window.setTimeout(() => void refetch(), Math.min(remaining, 2_147_483_647));
    return () => window.clearTimeout(timeout);
  }, [remaining, refetch]);
  const allowed = pathname === "/booking" || pathname === "/schedule" ||
    pathname === "/inbox" || pathname.startsWith("/inbox/");
  if (user && !allowed && noticeQuery.isPending) return <p role="status">Checking access…</p>;
  // Only block when we never got an answer; a failed background refresh keeps the last known state.
  if (user && !allowed && noticeQuery.isError && !noticeQuery.data) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20 text-center">
        <p role="alert">We couldn’t check your access. Please try again.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => void refetch()} disabled={noticeQuery.isFetching}>Try again</Button>
          <Button asChild variant="outline"><Link to="/inbox">Messages</Link></Button>
          <Button asChild variant="outline"><Link to="/booking">Book a session</Link></Button>
        </div>
      </main>
    );
  }
  if (noticeQuery.data?.paused && !allowed) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">Your LSAT U access is paused</h1>
        <p className="mt-3">You can still send messages and book a session.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild><Link to="/inbox">Messages</Link></Button>
          <Button asChild variant="outline"><Link to="/booking">Book a session</Link></Button>
        </div>
      </main>
    );
  }

  const open = Boolean(notice && !notice.acknowledged_at && acknowledged !== notice.revision &&
    remaining > 0 && (pathname === "/classroom" || pathname === "/classroom/"));
  const title = notice?.kind === "expiration"
    ? remaining <= 86_400_000 ? "24-hour access expiration notice" : "Your LSAT U access is expiring"
    : notice?.kind === "restored" ? "Your LSAT U access is restored" : "Notice from Joshua";

  async function acknowledge() {
    if (!notice) return;
    setSaving(true);
    setError(false);
    try {
      const result = await supabase.rpc("acknowledge_student_access_notice" as never,
        { notice_revision: notice.revision } as never);
      if (result.error) throw result.error;
      if (result.data) setAcknowledged(notice.revision);
      await noticeQuery.refetch();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className={open ? "blur-sm" : undefined}>{children}</div>
      <AlertDialog open={open}>
        <AlertDialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap break-words">
            {notice?.pause_at && (
              <span className="mb-2 block">
                {remaining <= 86_400_000 && "You have 1 day left on your subscription. "}
                Your access will pause on {new Date(notice.pause_at).toLocaleString([], {
                  dateStyle: "medium", timeStyle: "short",
                })} (your local time). You can still send messages and book a session.
              </span>
            )}
            {notice?.message}
          </AlertDialogDescription>
          {error && <p role="alert">Couldn’t save your acknowledgment. Try again.</p>}
          <AlertDialogFooter>
            <Button disabled={saving} onClick={acknowledge}>Got it</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
