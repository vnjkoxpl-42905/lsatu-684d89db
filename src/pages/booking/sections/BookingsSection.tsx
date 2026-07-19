import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CalendarX2, Loader2, MoreHorizontal, UserX, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "../BookingWorkspace";
import { bookingAdmin, durationLabel, type Booking } from "../api";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function BookingStatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    booked: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    cancelled: "bg-muted text-muted-foreground border-border",
    failed: "bg-red-500/10 text-red-700 border-red-500/30",
    no_show: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  };
  return (
    <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", map[status] ?? map.booked)}>
      {status === "no_show" ? "no-show" : status}
    </span>
  );
}

export default function BookingsSection() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const refresh = useCallback(async () => {
    try {
      const res = await bookingAdmin("list_bookings") as { bookings: Booking[] };
      setBookings(res.bookings);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load bookings");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const rows = useMemo(() => {
    const now = Date.now();
    const list = bookings.filter(b =>
      tab === "upcoming"
        ? b.status === "booked" && new Date(b.start_at).getTime() >= now
        : !(b.status === "booked" && new Date(b.start_at).getTime() >= now));
    return tab === "upcoming" ? [...list].reverse() : list; // upcoming soonest-first
  }, [bookings, tab]);

  async function cancel(b: Booking) {
    if (!confirm(`Cancel this session (${fmt(b.start_at)})? The credit is refunded to the student.`)) return;
    try {
      await bookingAdmin("cancel_booking", { redemption_id: b.id });
      toast.success("Session cancelled and credit refunded");
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Cancel failed"); }
  }

  async function noShow(b: Booking) {
    if (!confirm("Mark this session as a no-show? The credit stays used.")) return;
    try {
      await bookingAdmin("mark_no_show", { redemption_id: b.id });
      toast.success("Marked as no-show");
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div>
      <SectionHeader title="Bookings" subtitle="Every session booked through a pass, across all students.">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "upcoming" | "past")}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
        </Tabs>
      </SectionHeader>

      <div className="px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="booking-shadow rounded-2xl border border-border bg-card p-14 text-center">
            <CalendarX2 className="mx-auto h-8 w-8 text-primary/50" />
            <p className="mt-3 text-sm font-medium">No {tab} sessions.</p>
          </div>
        ) : (
          <div className="booking-shadow overflow-hidden rounded-2xl border border-border bg-card">
            {rows.map((b, i) => {
              const student = b.booking_passes?.student_name || b.student_name_snapshot || b.booking_passes?.student_email || b.student_email_snapshot || "Student";
              const mins = b.booking_passes?.session_length_minutes
                ?? Math.round((new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 60_000);
              const isUpcomingBooked = b.status === "booked" && new Date(b.start_at).getTime() >= Date.now();
              return (
                <div key={b.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4", i > 0 && "border-t border-border")}>
                  <div className="min-w-[180px] flex-1">
                    <div className="font-semibold">{student}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{fmt(b.start_at)} · {durationLabel(mins)}</div>
                  </div>
                  <BookingStatusChip status={b.status} />
                  {b.meet_url && b.status === "booked" && (
                    <a href={b.meet_url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline"><Video className="mr-1.5 h-4 w-4" /> Meet</Button>
                    </a>
                  )}
                  {b.status === "booked" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isUpcomingBooked && (
                          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => void cancel(b)}>
                            <CalendarX2 className="mr-2 h-4 w-4" /> Cancel & refund credit
                          </DropdownMenuItem>
                        )}
                        {!isUpcomingBooked && (
                          <DropdownMenuItem onClick={() => void noShow(b)}>
                            <UserX className="mr-2 h-4 w-4" /> Mark no-show
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
