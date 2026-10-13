import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight, GraduationCap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "../BookingWorkspace";
import { bookingAdmin, durationLabel, passDisplayName, type Pass } from "../api";
import { StatusChip } from "./PassesSection";

// One row per pass-holding student (a pass IS the student's booking identity).
export default function StudentsSection() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await bookingAdmin("list") as { passes: Pass[] };
      setPasses(res.passes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load students");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div>
      <SectionHeader title="Students" subtitle="Everyone who has (or had) a booking pass. Open a student to see their link, sessions, and exactly what they see." />
      <div className="px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : passes.length === 0 ? (
          <div className="booking-shadow rounded-2xl border border-border bg-card p-14 text-center">
            <GraduationCap className="mx-auto h-8 w-8 text-primary/50" />
            <p className="mt-3 text-sm font-medium">No students yet — create a pass first.</p>
          </div>
        ) : (
          <div className="booking-shadow overflow-hidden rounded-2xl border border-border bg-card">
            {passes.map((p, i) => (
              <Link
                key={p.id}
                to={`/booking/admin/students/${p.id}`}
                className={cn("flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60", i > 0 && "border-t border-border")}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {passDisplayName(p).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-[160px] flex-1">
                  <div className="font-semibold">{passDisplayName(p)}</div>
                  {p.student_email && p.student_name && <div className="text-xs text-muted-foreground">{p.student_email}</div>}
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.max(0, p.total_credits - p.used_credits)}/{p.total_credits} left · {durationLabel(p.session_length_minutes)}
                </span>
                <StatusChip status={p.status} />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
