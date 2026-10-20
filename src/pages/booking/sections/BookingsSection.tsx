import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CalendarX2, ChevronDown, Download, Loader2, MoreHorizontal, Paperclip, UserX, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "../BookingWorkspace";
import { bookingAdmin, durationLabel, type Booking, type BookingUpload } from "../api";
import BookingHealthSection from "./BookingHealthSection";

type SingleSessionAdminBooking = {
  source: "single_session";
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  meet_url: string | null;
  name?: string | null;
  email?: string | null;
  user_id?: string | null;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function BookingStatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    booked: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    cancelled: "bg-muted text-muted-foreground border-border",
    draft: "bg-primary/10 text-primary border-primary/30",
    checkout_open: "bg-primary/10 text-primary border-primary/30",
    expired: "bg-muted text-muted-foreground border-border",
    abandoned: "bg-muted text-muted-foreground border-border",
    refund_pending: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    refunded: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    refund_failed: "bg-destructive/10 text-destructive border-destructive/30",
    failed: "bg-red-500/10 text-red-700 border-red-500/30",
    no_show: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  };
  return (
    <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", map[status] ?? map.booked)}>
      {status === "no_show" ? "no-show" : status.replace(/_/g, " ")}
    </span>
  );
}

export default function BookingsSection() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [singleSessions, setSingleSessions] = useState<SingleSessionAdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Record<string, BookingUpload[] | "loading">>({});

  const toggleExpand = useCallback(async (b: Booking) => {
    const next = expanded === b.id ? null : b.id;
    setExpanded(next);
    if (next && (b.upload_count ?? 0) > 0 && !uploads[b.id]) {
      setUploads((u) => ({ ...u, [b.id]: "loading" }));
      try {
        const res = await bookingAdmin("get_booking_uploads", { redemption_id: b.id }) as { uploads: BookingUpload[] };
        setUploads((u) => ({ ...u, [b.id]: res.uploads }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load files");
        setUploads((u) => { const c = { ...u }; delete c[b.id]; return c; });
      }
    }
  }, [expanded, uploads]);

  const refresh = useCallback(async () => {
    try {
      const [packageResult, singleResult] = await Promise.all([
        bookingAdmin("list_bookings") as Promise<{ bookings: Booking[] }>,
        bookingAdmin("single_sessions_global") as Promise<{ bookings: SingleSessionAdminBooking[] }>,
      ]);
      setBookings(packageResult.bookings);
      setSingleSessions(singleResult.bookings ?? []);
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
      const result = await bookingAdmin("cancel_booking", { redemption_id: b.id }) as { redemption?: Booking };
      if (result.redemption?.calendar_status === "pending") {
        toast.warning("Session cancelled and credit refunded. Google cancellation is queued.");
      } else {
        toast.success("Session cancelled, Google event removed, and credit refunded");
      }
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
        <BookingHealthSection />
        <section className="booking-shadow mb-6 overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="single-session-admin-heading">
          <div className="border-b border-border px-5 py-4">
            <h2 id="single-session-admin-heading" className="font-semibold">Single Sessions</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Every native Single Session, including guest-owned and unmatched bookings.</p>
          </div>
          {loading ? <div className="flex items-center px-5 py-6 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />Loading Single Sessions…</div>
            : singleSessions.length === 0 ? <p className="px-5 py-6 text-sm text-muted-foreground">No Single Sessions yet.</p> : <div>
            {singleSessions.map((booking, index) => <div key={booking.id} className={cn("flex flex-wrap items-center gap-3 px-5 py-3", index > 0 && "border-t border-border")}>
              <div className="min-w-48 flex-1"><div className="text-sm font-medium">{booking.name || booking.email || "Guest booker"}</div><div className="mt-0.5 text-xs text-muted-foreground">{fmt(booking.start_at)} · {durationLabel(Math.round((new Date(booking.end_at).getTime() - new Date(booking.start_at).getTime()) / 60_000))}</div></div>
              <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{booking.user_id ? "verified account" : "guest-owned"}</span>
              <BookingStatusChip status={booking.status} />
              {booking.meet_url && booking.status === "booked" ? <Button asChild size="sm" variant="outline"><a href={booking.meet_url} target="_blank" rel="noreferrer"><Video className="mr-1.5 h-4 w-4" />Meet</a></Button> : null}
            </div>)}
          </div>}
        </section>
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
              const submissionCount = (b.upload_count ?? 0) + (b.student_note ? 1 : 0);
              const hasSubmission = submissionCount > 0;
              const isOpen = expanded === b.id;
              const rowUploads = uploads[b.id];
              return (
                <div key={b.id} className={cn(i > 0 && "border-t border-border")}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                  <div className="min-w-[180px] flex-1">
                    <div className="font-semibold">{student}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{fmt(b.start_at)} · {durationLabel(mins)}</div>
                  </div>
                  {hasSubmission && (
                    <button
                      onClick={() => void toggleExpand(b)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/10"
                      title="Student attached work or a note"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {b.upload_count ? b.upload_count : ""}{b.upload_count && b.student_note ? " + note" : b.student_note ? "note" : ""}
                      <ChevronDown className={cn("h-3.5 w-3.5 transition", isOpen && "rotate-180")} />
                    </button>
                  )}
                  <BookingStatusChip status={b.status} />
                  {b.calendar_status && b.calendar_status !== "synced" && (
                    <span className={cn(
                      "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      b.calendar_status === "failed"
                        ? "border-red-500/30 bg-red-500/10 text-red-700"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-700",
                    )} title={b.calendar_error || undefined}>
                      calendar {b.calendar_status}
                    </span>
                  )}
                  {b.submission_status === "failed" && (
                    <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-700">
                      submission repair
                    </span>
                  )}
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

                {hasSubmission && isOpen && (
                  <div className="border-t border-dashed border-border bg-muted/20 px-5 py-4">
                    {b.student_note && (
                      <div className="mb-3">
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Student's note</div>
                        <p className="whitespace-pre-wrap text-sm text-foreground">{b.student_note}</p>
                      </div>
                    )}
                    {(b.upload_count ?? 0) > 0 && (
                      <div>
                        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Attached files</div>
                        {rowUploads === "loading" || rowUploads === undefined ? (
                          <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading files…</div>
                        ) : rowUploads.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No files.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {rowUploads.map((f) => (
                              <li key={f.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
                                <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="flex-1 truncate">{f.file_name}</span>
                                {f.url ? (
                                  <a href={f.url} target="_blank" rel="noreferrer" download>
                                    <Button size="sm" variant="ghost" className="h-7 text-primary"><Download className="mr-1 h-3.5 w-3.5" /> Download</Button>
                                  </a>
                                ) : <span className="text-xs text-muted-foreground">unavailable</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
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
