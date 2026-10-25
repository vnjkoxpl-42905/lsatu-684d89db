import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Clock, Copy, ExternalLink, Link2, Loader2, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Ticket, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exclusiveIsoToValidThroughDate, validThroughDateToExclusiveIso } from "@/lib/bookingExpiry";
import { SectionHeader } from "../BookingWorkspace";
import { bookingAdmin, durationLabel, loadDefaults, passDisplayName, passUrl, type Pass } from "../api";

const SESSION_LENGTHS = ["30", "45", "60", "70", "90", "120"];

export function StatusChip({ status }: { status: Pass["status"] }) {
  const map: Record<Pass["status"], string> = {
    active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    paused: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    exhausted: "bg-muted text-muted-foreground border-border",
    expired: "bg-orange-500/10 text-orange-700 border-orange-500/30",
    revoked: "bg-red-500/10 text-red-700 border-red-500/30",
  };
  return (
    <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", map[status])}>
      {status}
    </span>
  );
}

export default function PassesSection() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editPass, setEditPass] = useState<Pass | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await bookingAdmin("list") as { passes: Pass[] };
      setPasses(res.passes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load passes");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const rows = useMemo(() => {
    const live = passes.filter(p => p.status !== "revoked");
    const q = query.trim().toLowerCase();
    if (!q) return live;
    return live.filter(p =>
      (p.student_name ?? "").toLowerCase().includes(q) ||
      (p.student_email ?? "").toLowerCase().includes(q) ||
      (p.booking_slug ?? "").toLowerCase().includes(q));
  }, [passes, query]);

  async function togglePause(p: Pass) {
    const pausing = p.status === "active";
    try {
      await bookingAdmin("set_paused", { pass_id: p.id, paused: pausing });
      toast.success(pausing ? "Booking paused" : "Booking resumed");
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  async function rotate(p: Pass) {
    if (!confirm("Rotate the link? The old URL stops working and a new one is shown once.")) return;
    try {
      const res = await bookingAdmin("rotate", { pass_id: p.id }) as { booking_url: string };
      setCreatedLink(res.booking_url);
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Rotate failed"); }
  }

  async function deleteLink(p: Pass) {
    if (!confirm(`Delete ${passDisplayName(p)}'s booking link? It will stop working immediately and cannot be restored.`)) return;
    try {
      await bookingAdmin("revoke", { pass_id: p.id });
      toast.success("Booking link deleted");
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not delete booking link"); }
  }

  async function copyLink(p: Pass) {
    const url = passUrl(p);
    if (!url) { toast.error("This pass needs a booking link. Rotate it to create one."); return; }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  return (
    <div>
      <SectionHeader title="Passes" subtitle="Private booking links — each gives one student a set number of sessions.">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search passes" className="w-56 pl-9" />
        </div>
        <Button className="holo-surface border-0" onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> New pass
        </Button>
      </SectionHeader>

      <div className="px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="booking-shadow rounded-2xl border border-border bg-card p-14 text-center">
            <Ticket className="mx-auto h-8 w-8 text-primary/50" />
            <p className="mt-3 text-sm font-medium">{query ? "No passes match your search." : "No booking passes yet."}</p>
            {!query && <p className="mt-1 text-xs text-muted-foreground">Create one to give a student a private scheduling link.</p>}
          </div>
        ) : (
          <div className="booking-shadow overflow-hidden rounded-2xl border border-border bg-card">
            {rows.map((p, i) => {
              const left = Math.max(0, p.total_credits - p.used_credits);
              const url = passUrl(p);
              return (
                <div key={p.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4", i > 0 && "border-t border-border")}>
                  <div className="min-w-[180px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{passDisplayName(p)}</span>
                      {p.booking_slug && (
                        <span className="text-xs text-muted-foreground">
                          /book/{p.booking_slug.length > 18 ? `${p.booking_slug.slice(0, 18)}…` : p.booking_slug}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {durationLabel(p.session_length_minutes)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        <Ticket className="h-3 w-3" /> {left}/{p.total_credits} left
                      </span>
                      <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {p.expires_at ? `valid through ${exclusiveIsoToValidThroughDate(p.expires_at)}` : "no expiry"}
                      </span>
                    </div>
                  </div>
                  <StatusChip status={p.status} />
                  {(p.status === "active" || p.status === "paused") && (
                    <Switch checked={p.status === "active"} onCheckedChange={() => void togglePause(p)} aria-label="Pause or resume booking" />
                  )}
                  <div className="flex items-center gap-1">
                    {url && (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Open student page" onClick={() => window.open(url, "_blank")}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Copy link" onClick={() => void copyLink(p)}>
                          <Link2 className="h-4 w-4" />
                        </Button>
                        {p.status !== "revoked" && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete booking link" onClick={() => void deleteLink(p)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete booking link</span>
                          </Button>
                        )}
                      </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditPass(p)}><Pencil className="mr-2 h-4 w-4" /> Edit / refill</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void rotate(p)}><RotateCcw className="mr-2 h-4 w-4" /> Rotate link</DropdownMenuItem>
                        {p.status !== "revoked" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void deleteLink(p)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete link
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreatePassDialog open={showCreate} onOpenChange={setShowCreate} onCreated={(link) => { setCreatedLink(link); void refresh(); }} />
      {editPass && <EditPassDialog pass={editPass} onClose={() => setEditPass(null)} onSaved={() => { setEditPass(null); void refresh(); }} />}

      {/* Strong public links are saved on the pass and can be copied again. */}
      <Dialog open={!!createdLink} onOpenChange={(o) => { if (!o) setCreatedLink(null); }}>
        <DialogContent className="booking-holo sm:max-w-lg">
          <DialogHeader><DialogTitle>Booking link</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This link is saved on the pass. You can copy it again from the pass row.
          </p>
          <div className="break-all rounded-md bg-muted p-3 font-mono text-xs">{createdLink}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatedLink(null)}>Close</Button>
            <Button className="holo-surface border-0" onClick={async () => { if (createdLink) { await navigator.clipboard.writeText(createdLink); toast.success("Link copied"); } }}>
              <Copy className="mr-2 h-4 w-4" /> Copy link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type StudentOption = { id: string; name: string | null; email: string | null };

function CreatePassDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; onCreated: (link: string) => void;
}) {
  const defaults = loadDefaults();
  const [students, setStudents] = useState<StudentOption[] | null>(null);
  const [studentId, setStudentId] = useState<string>("manual");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!open || students !== null) return;
    bookingAdmin("list_students")
      .then((res) => setStudents((res as { students: StudentOption[] }).students))
      .catch(() => setStudents([]));
  }, [open, students]);

  const picked = studentId !== "manual" ? students?.find(s => s.id === studentId) ?? null : null;
  const [credits, setCredits] = useState(String(defaults.credits));
  const [sessionLen, setSessionLen] = useState(String(defaults.sessionLen));
  const [expiresAt, setExpiresAt] = useState(() => {
    if (!defaults.expiryDays) return "";
    return new Date(Date.now() + defaults.expiryDays * 86_400_000).toISOString().slice(0, 10);
  });
  const [creating, setCreating] = useState(false);

  async function create() {
    const total = Number(credits);
    if (!total || total < 1) { toast.error("Enter a valid credit amount"); return; }
    if (!picked && !name.trim() && !email.trim()) { toast.error("Pick a student or add a name/email"); return; }
    setCreating(true);
    try {
      const res = await bookingAdmin("create", {
        student_id: picked?.id ?? null,
        student_name: picked ? (picked.name ?? null) : (name.trim() || null),
        student_email: picked ? (picked.email ?? null) : (email.trim() || null),
        total_credits: total,
        session_length_minutes: Number(sessionLen) || 70,
        expires_at: expiresAt ? validThroughDateToExclusiveIso(expiresAt) : null,
      }) as { booking_url: string };
      onCreated(res.booking_url);
      onOpenChange(false);
      setName(""); setEmail(""); setStudentId("manual");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally { setCreating(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="booking-holo sm:max-w-md">
        <DialogHeader><DialogTitle>New booking pass</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder={students === null ? "Loading students…" : "Choose a student"} />
              </SelectTrigger>
              <SelectContent className="booking-holo max-h-72">
                <SelectItem value="manual">Manual entry (name/email only)</SelectItem>
                {(students ?? []).map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name || s.email || s.id}{s.name && s.email ? ` — ${s.email}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Picking an enrolled student links the pass to their account and gets them a friendly /book link.
            </p>
          </div>
          {!picked && (
            <>
              <div>
                <Label>Student name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex Kim" />
              </div>
              <div>
                <Label>Student email (optional)</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="alex@example.com" />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Credits</Label>
              <Input type="number" min={1} max={50} value={credits} onChange={e => setCredits(e.target.value)} />
            </div>
            <div>
              <Label>Session length</Label>
              <Select value={sessionLen} onValueChange={setSessionLen}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="booking-holo">
                  {SESSION_LENGTHS.map(v => <SelectItem key={v} value={v}>{durationLabel(Number(v))}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Valid through (optional)</Label>
            <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="holo-surface border-0" onClick={() => void create()} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create pass
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditPassDialog({ pass, onClose, onSaved }: {
  pass: Pass; onClose: () => void; onSaved: () => void;
}) {
  const [credits, setCredits] = useState(String(Math.max(0, pass.total_credits - pass.used_credits)));
  const [sessionLen, setSessionLen] = useState(String(pass.session_length_minutes));
  const [expiresAt, setExpiresAt] = useState(pass.expires_at ? exclusiveIsoToValidThroughDate(pass.expires_at) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const total = Number(credits);
    if (!Number.isInteger(total) || total < 0) { toast.error("Enter a valid remaining-session amount"); return; }
    if (!confirm(`Set remaining sessions to ${total}? The booking link and history will stay the same.`)) return;
    setSaving(true);
    try {
      await bookingAdmin("update", {
        pass_id: pass.id,
        total_credits: pass.used_credits + total,
        session_length_minutes: Number(sessionLen) || 70,
        expires_at: expiresAt ? validThroughDateToExclusiveIso(expiresAt) : null,
      });
      toast.success("Pass updated");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="booking-holo sm:max-w-md">
        <DialogHeader><DialogTitle>Edit pass — {passDisplayName(pass)}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {pass.used_credits} sessions have been used. This changes only the number remaining and keeps the booking link and history.
          </p>
          <div>
            <Label>Remaining sessions</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min={pass.used_credits === 0 ? 1 : 0} max={Math.max(0, 50 - pass.used_credits)} value={credits} onChange={e => setCredits(e.target.value)} />
              <Button type="button" size="sm" variant="outline" onClick={() => setCredits(String((Number(credits) || 0) + 1))}>+1</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setCredits(String((Number(credits) || 0) + 5))}>+5</Button>
            </div>
          </div>
          <div>
            <Label>Session length</Label>
            <Select value={sessionLen} onValueChange={setSessionLen}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="booking-holo">
                {SESSION_LENGTHS.map(v => <SelectItem key={v} value={v}>{durationLabel(Number(v))}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valid through (optional)</Label>
            <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button className="holo-surface border-0" onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
