import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Clock, Loader2, Plus, X } from "lucide-react";

type Range = { day_of_week: number; start_time: string; end_time: string };
type Availability = { timezone: string; ranges: Range[] };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// 15-min options as "HH:MM" for the selects.
const TIME_OPTIONS = (() => {
  const out: { value: string; label: string }[] = [];
  for (let m = 0; m < 24 * 60; m += 15) {
    const h = Math.floor(m / 60), mm = m % 60;
    const value = `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    const ampm = h < 12 ? "am" : "pm";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    out.push({ value, label: `${h12}:${String(mm).padStart(2, "0")}${ampm}` });
  }
  return out;
})();

const call = async (action: string, extra: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke("booking-pass-admin", { body: { action, ...extra } });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data;
};

export default function WeeklyHoursEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timezone, setTimezone] = useState("America/Toronto");
  // ranges grouped by day for editing
  const [byDay, setByDay] = useState<Record<number, { start: string; end: string }[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await call("get_availability")) as Availability;
      setTimezone(res.timezone || "America/Toronto");
      const grouped: Record<number, { start: string; end: string }[]> = {};
      for (const r of res.ranges ?? []) {
        (grouped[r.day_of_week] ??= []).push({ start: r.start_time, end: r.end_time });
      }
      setByDay(grouped);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load availability");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function toggleDay(dow: number, on: boolean) {
    setByDay((prev) => {
      const next = { ...prev };
      if (on) next[dow] = prev[dow]?.length ? prev[dow] : [{ start: "13:00", end: "18:00" }];
      else delete next[dow];
      return next;
    });
  }

  function updateRange(dow: number, i: number, field: "start" | "end", value: string) {
    setByDay((prev) => {
      const rows = [...(prev[dow] ?? [])];
      rows[i] = { ...rows[i], [field]: value };
      return { ...prev, [dow]: rows };
    });
  }

  function addRange(dow: number) {
    setByDay((prev) => ({ ...prev, [dow]: [...(prev[dow] ?? []), { start: "13:00", end: "18:00" }] }));
  }

  function removeRange(dow: number, i: number) {
    setByDay((prev) => {
      const rows = (prev[dow] ?? []).filter((_, j) => j !== i);
      const next = { ...prev };
      if (rows.length) next[dow] = rows; else delete next[dow];
      return next;
    });
  }

  async function save() {
    // Validate end > start per range.
    const ranges: Range[] = [];
    for (const dowStr of Object.keys(byDay)) {
      const dow = Number(dowStr);
      for (const r of byDay[dow]) {
        if (r.end <= r.start) { toast.error(`${DAYS[dow]}: end time must be after start time`); return; }
        ranges.push({ day_of_week: dow, start_time: r.start, end_time: r.end });
      }
    }
    setSaving(true);
    try {
      await call("set_availability", { timezone, ranges });
      toast.success("Availability saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/12 bg-white/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teacher-accent">
          <Clock className="h-4 w-4" /> Weekly hours
        </div>
        <Button size="sm" onClick={save} disabled={saving || loading}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Save
        </Button>
      </div>
      <p className="mt-1 text-xs text-black/45">
        Set the times you're available to be booked each day. Students only see open slots inside these
        windows, and any event already on your Google Calendar is automatically blocked out.
      </p>

      {loading ? (
        <div className="mt-4 flex items-center text-sm text-black/45">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="mt-4 divide-y divide-black/10">
          {DAYS.map((dayName, dow) => {
            const rows = byDay[dow] ?? [];
            const on = rows.length > 0;
            return (
              <div key={dow} className="flex flex-wrap items-start gap-3 py-3">
                <div className="flex w-40 shrink-0 items-center gap-3 pt-1">
                  <Switch checked={on} onCheckedChange={(v) => toggleDay(dow, v)} />
                  <span className="text-sm font-medium text-[#11181c]">{dayName}</span>
                </div>
                {!on ? (
                  <span className="pt-1.5 text-sm text-black/45">Unavailable</span>
                ) : (
                  <div className="space-y-2">
                    {rows.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <TimeSelect value={r.start} onChange={(v) => updateRange(dow, i, "start", v)} />
                        <span className="text-black/45">–</span>
                        <TimeSelect value={r.end} onChange={(v) => updateRange(dow, i, "end", v)} />
                        <button
                          onClick={() => removeRange(dow, i)}
                          className="rounded p-1 text-black/45 hover:text-red-400"
                          aria-label="Remove range"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {i === rows.length - 1 && (
                          <button
                            onClick={() => addRange(dow)}
                            className="rounded p-1 text-black/45 hover:text-teacher-accent"
                            aria-label="Add range"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-black/20 bg-transparent px-2 py-1.5 text-sm text-[#11181c] focus:border-teacher-accent focus:outline-none"
    >
      {TIME_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
