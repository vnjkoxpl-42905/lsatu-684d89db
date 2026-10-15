import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Copy, ExternalLink, Loader2, Pencil, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { exclusiveIsoToValidThroughDate } from "@/lib/bookingExpiry";
import { bookingAdmin, durationLabel, passDisplayName, passUrl, type Booking, type Pass } from "../api";
import { StatusChip, EditPassDialog } from "./PassesSection";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// Per-student view: pass state, private link, their sessions, and a LIVE
// preview of the exact page the student sees when they open their link
// (the real /book/:slug page in an iframe — not a mock).
export default function StudentDetail() {
  const { passId = "" } = useParams();
  const [pass, setPass] = useState<Pass | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [listRes, bookingsRes] = await Promise.all([
        bookingAdmin("list") as Promise<{ passes: Pass[] }>,
        bookingAdmin("history", { pass_id: passId }) as Promise<{ redemptions: Booking[] }>,
      ]);
      setPass(listRes.passes.find(p => p.id === passId) ?? null);
      setBookings(bookingsRes.redemptions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load student");
    } finally { setLoading(false); }
  }, [passId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const url = useMemo(() => (pass ? passUrl(pass) : null), [pass]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!pass) {
    return (
      <div className="px-8 py-12 text-sm text-muted-foreground">
        Pass not found. <Link to="/booking/admin/students" className="text-primary underline">Back to students</Link>
      </div>
    );
  }

  const left = Math.max(0, pass.total_credits - pass.used_credits);

  return (
    <div>
      <header className="border-b border-border px-8 py-6">
        <Link to="/booking/admin/students" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Students
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{passDisplayName(pass)}</h1>
          <StatusChip status={pass.status} />
          <span className="text-sm text-muted-foreground">
            {left}/{pass.total_credits} sessions left · {durationLabel(pass.session_length_minutes)} · {pass.expires_at ? `valid through ${exclusiveIsoToValidThroughDate(pass.expires_at)}` : "no expiry"}
          </span>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1.5 h-4 w-4" /> Edit / refill</Button>
        </div>
        {pass.student_email && <p className="mt-1 text-sm text-muted-foreground">{pass.student_email}</p>}
      </header>

      <div className="grid grid-cols-1 gap-6 px-8 py-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <div className="space-y-6">
          {/* Private link */}
          <section className="booking-shadow rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Private link</h2>
            {url ? (
              <>
                <div className="mt-2 break-all rounded-md bg-muted p-3 font-mono text-xs">{url}</div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="holo-surface border-0" onClick={async () => { await navigator.clipboard.writeText(url); toast.success("Link copied"); }}>
                    <Copy className="mr-1.5 h-4 w-4" /> Copy
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(url, "_blank")}>
                    <ExternalLink className="mr-1.5 h-4 w-4" /> Open
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                This pass does not have a current public link. Rotate it from the Passes list to create one.
              </p>
            )}
          </section>

          {/* Sessions */}
          <section className="booking-shadow rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Sessions</h2>
            {bookings.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing booked yet.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {bookings.map(b => (
                  <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                    <span className="flex-1">{fmt(b.start_at)}</span>
                    <span className={cn(
                      "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      b.status === "booked" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-muted text-muted-foreground border-border",
                    )}>{b.status === "no_show" ? "no-show" : b.status}</span>
                    {b.meet_url && b.status === "booked" && (
                      <a href={b.meet_url} target="_blank" rel="noreferrer" className="text-primary"><Video className="h-4 w-4" /></a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Live student view */}
        <section className="booking-shadow overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">What {pass.student_name?.split(" ")[0] || "the student"} sees</h2>
            {url && <span className="text-xs text-muted-foreground">live page — this is the real link, not a mock</span>}
          </div>
          {url ? (
            <iframe title="Student booking page preview" src={url} className="h-[640px] w-full bg-background" />
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No previewable page. Rotate the pass link to create a public URL.
            </div>
          )}
        </section>
      </div>

      {editing && <EditPassDialog pass={pass} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); void refresh(); }} />}
    </div>
  );
}
