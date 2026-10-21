import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  isSameDay,
  isSameMonth,
  isToday,
  differenceInMinutes,
} from "date-fns";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ScheduleEvent {
  id: string;
  google_event_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  status: string;
  html_link: string | null;
  source: string;
  deleted_at: string | null;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string {
  return new Date(v).toISOString();
}

interface FormState {
  google_event_id?: string;
  title: string;
  description: string;
  location: string;
  start_at: string; // datetime-local
  end_at: string;
  all_day: boolean;
}

const blankForm = (seed?: Date): FormState => {
  const base = seed ? new Date(seed) : new Date(Date.now() + 60 * 60 * 1000);
  const start = new Date(base);
  if (!seed) start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    description: "",
    location: "",
    start_at: toLocalInput(start.toISOString()),
    end_at: toLocalInput(end.toISOString()),
    all_day: false,
  };
};

type CalView = "week" | "month";

// Week-view time-grid geometry.
const DAY_START_HOUR = 7; // 7 AM
const DAY_END_HOUR = 22; // 10 PM
const HOUR_PX = 56; // height of one hour row
const GRID_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_PX;

export default function GoogleCalendarPanel() {
  const { is_admin } = useUserPermissions();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(blankForm());
  const [view, setView] = React.useState<CalView>("week");
  const [anchor, setAnchor] = React.useState<Date>(() => startOfDay(new Date()));

  const eventsQuery = useQuery({
    queryKey: ["schedule_events"],
    queryFn: async () => {
      const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("schedule_events" as any)
        .select("*")
        .is("deleted_at", null)
        .gte("start_at", since)
        .order("start_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as ScheduleEvent[];
    },
  });

  React.useEffect(() => {
    const channel = supabase
      .channel("schedule_events_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_events" }, () => {
        qc.invalidateQueries({ queryKey: ["schedule_events"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const syncNow = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("gcal-sync-pull", { body: {} });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Synced with Google Calendar" });
      qc.invalidateQueries({ queryKey: ["schedule_events"] });
    },
    onError: (e: any) => toast({ title: "Sync failed", description: e?.message, variant: "destructive" }),
  });

  const writeEvent = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.functions.invoke("gcal-event-write", { body: payload });
      if (error) throw error;
      if ((data as any)?.ok === false) throw new Error((data as any).error || "Write failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule_events"] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
  });

  const openCreate = (seed?: Date) => { setForm(blankForm(seed)); setDialogOpen(true); };
  const openEdit = (ev: ScheduleEvent) => {
    setForm({
      google_event_id: ev.google_event_id ?? undefined,
      title: ev.title,
      description: ev.description ?? "",
      location: ev.location ?? "",
      start_at: toLocalInput(ev.start_at),
      end_at: toLocalInput(ev.end_at),
      all_day: ev.all_day,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    writeEvent.mutate({
      action: form.google_event_id ? "update" : "create",
      google_event_id: form.google_event_id,
      title: form.title.trim(),
      description: form.description || undefined,
      location: form.location || undefined,
      start_at: fromLocalInput(form.start_at),
      end_at: fromLocalInput(form.end_at),
      all_day: form.all_day,
    });
  };

  const handleDelete = (ev: ScheduleEvent) => {
    if (!ev.google_event_id) return;
    if (!confirm(`Delete "${ev.title}" from Google Calendar?`)) return;
    writeEvent.mutate({ action: "delete", google_event_id: ev.google_event_id });
  };

  const events = eventsQuery.data ?? [];

  // Navigation range for the current view.
  const { rangeStart, rangeEnd } = React.useMemo(() => {
    if (view === "week") {
      return { rangeStart: startOfWeek(anchor), rangeEnd: endOfWeek(anchor) };
    }
    return {
      rangeStart: startOfWeek(startOfMonth(anchor)),
      rangeEnd: endOfWeek(endOfMonth(anchor)),
    };
  }, [view, anchor]);

  const goToday = () => setAnchor(startOfDay(new Date()));
  const goPrev = () =>
    setAnchor((d) => (view === "week" ? addWeeks(d, -1) : addMonths(d, -1)));
  const goNext = () =>
    setAnchor((d) => (view === "week" ? addWeeks(d, 1) : addMonths(d, 1)));

  const heading =
    view === "week"
      ? `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`
      : format(anchor, "MMMM yyyy");

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-4 sm:p-6 lg:p-7">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarClock className="w-4 h-4 text-muted-foreground shrink-0" />
          <h2 className="text-base font-semibold tracking-tight">Calendar</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => syncNow.mutate()}
            disabled={syncNow.isPending}
            className="gap-2"
          >
            {syncNow.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Sync now</span>
          </Button>
          {is_admin && (
            <Button size="sm" onClick={() => openCreate()} className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New event</span>
            </Button>
          )}
        </div>
      </div>

      {/* Navigation row */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={goToday} className="h-8">Today</Button>
          <div className="flex items-center">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h3 className="text-sm font-semibold tabular-nums ml-1">{heading}</h3>
        </div>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as CalView)}
          className="border border-border rounded-lg p-0.5"
        >
          <ToggleGroupItem value="week" className="h-7 px-3 text-xs data-[state=on]:bg-accent">Week</ToggleGroupItem>
          <ToggleGroupItem value="month" className="h-7 px-3 text-xs data-[state=on]:bg-accent">Month</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {eventsQuery.isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading events…
        </div>
      ) : view === "week" ? (
        <WeekGrid
          rangeStart={rangeStart}
          events={events}
          isAdmin={is_admin}
          onCreate={openCreate}
          onEdit={openEdit}
        />
      ) : (
        <MonthGrid
          rangeStart={rangeStart}
          anchor={anchor}
          events={events}
          isAdmin={is_admin}
          onCreate={openCreate}
          onEdit={openEdit}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.google_event_id ? "Edit event" : "New event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-title">Title</Label>
              <Input id="ev-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="ev-start">Start</Label>
                <Input id="ev-start" type="datetime-local"
                  value={form.start_at}
                  onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-end">End</Label>
                <Input id="ev-end" type="datetime-local"
                  value={form.end_at}
                  onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.all_day}
                onChange={(e) => setForm({ ...form, all_day: e.target.checked })} />
              All day
            </label>
            <div className="space-y-1.5">
              <Label htmlFor="ev-loc">Location</Label>
              <Input id="ev-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-desc">Description</Label>
              <Textarea id="ev-desc" rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={writeEvent.isPending}>
              {writeEvent.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Save to Google
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Week view — hours × 7 days time-grid with positioned event blocks  */
/* ------------------------------------------------------------------ */

interface GridProps {
  rangeStart: Date;
  events: ScheduleEvent[];
  isAdmin: boolean;
  onCreate: (seed?: Date) => void;
  onEdit: (ev: ScheduleEvent) => void;
}

function WeekGrid({ rangeStart, events, isAdmin, onCreate, onEdit }: GridProps) {
  const days = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i)),
    [rangeStart],
  );
  const hours = React.useMemo(
    () => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i),
    [],
  );

  const eventsForDay = (day: Date) =>
    events.filter((e) => !e.all_day && isSameDay(new Date(e.start_at), day));

  const blockGeometry = (ev: ScheduleEvent) => {
    const start = new Date(ev.start_at);
    const end = new Date(ev.end_at);
    const dayTop = new Date(start);
    dayTop.setHours(DAY_START_HOUR, 0, 0, 0);
    const top = (differenceInMinutes(start, dayTop) / 60) * HOUR_PX;
    const rawH = (differenceInMinutes(end, start) / 60) * HOUR_PX;
    return { top: Math.max(top, 0), height: Math.max(rawH, 22) };
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Day header row */}
      <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-border bg-muted/30">
        <div className="border-r border-border" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="px-2 py-2 text-center border-r border-border last:border-r-0"
          >
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {format(day, "EEE")}
            </div>
            <div
              className={cn(
                "mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground",
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable time grid */}
      <div className="max-h-[560px] overflow-y-auto">
        <div
          className="grid grid-cols-[48px_repeat(7,1fr)] relative"
          style={{ height: GRID_HEIGHT }}
        >
          {/* Hour labels */}
          <div className="relative border-r border-border">
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums"
                style={{ top: i * HOUR_PX }}
              >
                {i === 0 ? "" : format(new Date(0, 0, 0, h), "h a")}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="relative border-r border-border last:border-r-0"
            >
              {/* Hour lines + click-to-create slots */}
              {hours.map((h, i) => (
                <div
                  key={h}
                  className={cn(
                    "absolute left-0 right-0 border-t border-border/60",
                    isAdmin && "cursor-pointer hover:bg-accent/30",
                  )}
                  style={{ top: i * HOUR_PX, height: HOUR_PX }}
                  onClick={
                    isAdmin
                      ? () => {
                          const seed = new Date(day);
                          seed.setHours(h, 0, 0, 0);
                          onCreate(seed);
                        }
                      : undefined
                  }
                />
              ))}

              {/* Event blocks */}
              {eventsForDay(day).map((ev) => {
                const { top, height } = blockGeometry(ev);
                const start = new Date(ev.start_at);
                const end = new Date(ev.end_at);
                return (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEdit(ev); }}
                    style={{ top, height }}
                    className="absolute left-1 right-1 z-10 overflow-hidden rounded-md border border-blue-300/60 bg-blue-500/90 px-1.5 py-1 text-left text-white shadow-sm transition hover:bg-blue-500 hover:shadow-md"
                  >
                    <div className="truncate text-[11px] font-semibold leading-tight">{ev.title}</div>
                    {height > 30 && (
                      <div className="truncate text-[10px] leading-tight text-blue-50/90">
                        {format(start, "h:mm")} – {format(end, "h:mm a")}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Month view — 6×7 day cells with event chips                        */
/* ------------------------------------------------------------------ */

function MonthGrid({
  rangeStart,
  anchor,
  events,
  isAdmin,
  onCreate,
  onEdit,
}: GridProps & { anchor: Date }) {
  const weeks = React.useMemo(() => {
    const totalDays = 42; // 6 weeks
    const cells = Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));
    const out: Date[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [rangeStart]);

  const eventsForDay = (day: Date) =>
    events
      .filter((e) => isSameDay(new Date(e.start_at), day))
      .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {weekdayLabels.map((w) => (
          <div
            key={w}
            className="px-2 py-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground border-r border-border last:border-r-0"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-rows-6">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((day) => {
              const dayEvents = eventsForDay(day);
              const inMonth = isSameMonth(day, anchor);
              const visible = dayEvents.slice(0, 3);
              const overflow = dayEvents.length - visible.length;
              return (
                <div
                  key={day.toISOString()}
                  onClick={isAdmin ? () => {
                    const seed = new Date(day);
                    seed.setHours(9, 0, 0, 0);
                    onCreate(seed);
                  } : undefined}
                  className={cn(
                    "min-h-[96px] border-r border-border last:border-r-0 p-1.5 align-top",
                    !inMonth && "bg-muted/20",
                    isAdmin && "cursor-pointer hover:bg-accent/20",
                  )}
                >
                  <div
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                      isToday(day)
                        ? "bg-primary text-primary-foreground"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/60",
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="mt-1 space-y-1">
                    {visible.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); onEdit(ev); }}
                        className="block w-full truncate rounded-[5px] border border-blue-300/50 bg-blue-500/90 px-1.5 py-0.5 text-left text-[10px] font-medium leading-tight text-white hover:bg-blue-500"
                        title={ev.title}
                      >
                        {!ev.all_day && (
                          <span className="mr-1 text-blue-50/90 tabular-nums">
                            {format(new Date(ev.start_at), "h:mm")}
                          </span>
                        )}
                        {ev.title}
                      </button>
                    ))}
                    {overflow > 0 && (
                      <div className="px-1 text-[10px] font-medium text-muted-foreground">
                        +{overflow} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
