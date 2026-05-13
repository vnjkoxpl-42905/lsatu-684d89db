import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarClock, ExternalLink, Loader2, Plus, RefreshCw, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Button } from "@/components/ui/button";
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

const blankForm = (): FormState => {
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
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

export default function GoogleCalendarPanel() {
  const { is_admin } = useUserPermissions();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(blankForm());

  const eventsQuery = useQuery({
    queryKey: ["schedule_events"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("schedule_events" as any)
        .select("*")
        .is("deleted_at", null)
        .gte("start_at", since)
        .order("start_at", { ascending: true })
        .limit(100);
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

  const openCreate = () => { setForm(blankForm()); setDialogOpen(true); };
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
  const upcoming = events.filter((e) => new Date(e.end_at) >= new Date()).slice(0, 12);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-6 lg:p-8">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-base font-semibold tracking-tight">Google Calendar</h2>
          <span className="text-xs text-muted-foreground">· Two-way sync</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => syncNow.mutate()}
            disabled={syncNow.isPending}
            className="gap-2"
          >
            {syncNow.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sync now
          </Button>
          {is_admin && (
            <Button size="sm" onClick={openCreate} className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              New event
            </Button>
          )}
        </div>
      </div>

      {eventsQuery.isLoading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading events…
        </div>
      ) : upcoming.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No upcoming events on the connected Google Calendar.</p>
          {is_admin && <p className="text-xs text-muted-foreground mt-1">Click "New event" to create one.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.map((ev) => {
            const start = new Date(ev.start_at);
            const end = new Date(ev.end_at);
            return (
              <div
                key={ev.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 rounded-xl border bg-background/50 hover:bg-accent/40 transition-colors",
                )}
              >
                <div className="flex flex-col items-center w-12 shrink-0 pt-0.5">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{format(start, "MMM")}</span>
                  <span className="text-lg font-semibold tabular-nums leading-tight">{format(start, "d")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ev.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {ev.all_day
                      ? "All day"
                      : `${format(start, "EEE, h:mm a")} – ${format(end, "h:mm a")}`}
                    {ev.location ? ` · ${ev.location}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {ev.html_link && (
                    <a
                      href={ev.html_link} target="_blank" rel="noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Open in Google Calendar"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {is_admin && (
                    <>
                      <button
                        onClick={() => openEdit(ev)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ev)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
