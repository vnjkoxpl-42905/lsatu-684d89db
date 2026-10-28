import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bookingAdmin } from "../api";

type BookingHealth = {
  generated_at: string;
  overall_status: "green" | "amber" | "red";
  pending_calendar_actions: { total: number; over_5m: number; over_15m: number; oldest_at: string | null };
  failed_calendar_actions: { total: number };
  missing_google_event_ids: number;
  synced_missing_meet_urls: number;
  failed_submissions: number;
  staged_uploads_over_1h: number;
  calendar_sync: { last_synced_at: string | null; last_attempt_at: string | null } | null;
  alerts: { open_total: number; duplicate_events: number; mismatches: number; repair_items: number };
};

export default function BookingHealthSection() {
  const [health, setHealth] = useState<BookingHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setHealth(await bookingAdmin("get_booking_health") as BookingHealth);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Health check failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  if (loading && !health) return <div className="mb-4 flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking booking health…</div>;
  if (error) return <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700">{error}</div>;
  if (!health) return null;

  const Icon = health.overall_status === "green" ? CheckCircle2 : health.overall_status === "amber" ? AlertTriangle : XCircle;
  const tone = health.overall_status === "green"
    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
    : health.overall_status === "amber"
      ? "border-amber-500/30 bg-amber-500/5 text-amber-700"
      : "border-red-500/30 bg-red-500/5 text-red-700";
  const metrics = [
    ["Pending calendar", health.pending_calendar_actions.total],
    ["Failed calendar", health.failed_calendar_actions.total],
    ["Missing event IDs", health.missing_google_event_ids],
    ["Missing Meet links", health.synced_missing_meet_urls],
    ["Submission repairs", health.failed_submissions + health.alerts.repair_items],
    ["Staged uploads >1h", health.staged_uploads_over_1h],
    ["Calendar mismatches", health.alerts.mismatches],
    ["Duplicate events", health.alerts.duplicate_events],
  ] as const;

  return (
    <section className={`mb-5 rounded-2xl border p-4 ${tone}`} aria-label="Booking system health">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <div>
            <div className="text-sm font-semibold">Booking health: {health.overall_status}</div>
            <div className="text-xs opacity-75">Last checked {new Date(health.generated_at).toLocaleTimeString()}</div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={loading}>
          {loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-current/15 bg-background/60 px-3 py-2">
            <div className="text-lg font-semibold">{value}</div>
            <div className="text-[11px] opacity-75">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
