import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Loader2, Pencil, Plus, Ticket, Trash2, RotateCcw } from "lucide-react";

type Pass = {
  id: string;
  booking_slug: string | null;
  student_name: string | null;
  student_email: string | null;
  total_credits: number;
  used_credits: number;
  session_length_minutes: number;
  status: "active" | "exhausted" | "expired" | "revoked";
  expires_at: string | null;
  created_at: string;
};

const call = async (action: string, extra: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke("booking-pass-admin", {
    body: { action, ...extra },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data;
};

export default function BookingPasses() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [rotatedFor, setRotatedFor] = useState<string | null>(null);

  const [editPass, setEditPass] = useState<Pass | null>(null);
  const [editCredits, setEditCredits] = useState("");
  const [editSessionLen, setEditSessionLen] = useState("70");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [credits, setCredits] = useState("5");
  const [creditsCustom, setCreditsCustom] = useState("");
  const [sessionLen, setSessionLen] = useState("70");
  const [expiresAt, setExpiresAt] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await call("list") as { passes: Pass[] };
      setPasses(res.passes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load passes");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function create() {
    const total = credits === "custom" ? Number(creditsCustom) : Number(credits);
    if (!total || total < 1) { toast.error("Enter a valid credit amount"); return; }
    if (!studentName.trim() && !studentEmail.trim()) { toast.error("Add a student name or email"); return; }
    setCreating(true);
    try {
      const res = await call("create", {
        student_name: studentName.trim() || null,
        student_email: studentEmail.trim() || null,
        total_credits: total,
        session_length_minutes: Number(sessionLen) || 70,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      }) as { pass: Pass; booking_url: string };
      setCreatedLink(res.booking_url);
      setShowCreate(false);
      resetForm();
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally { setCreating(false); }
  }

  function resetForm() {
    setStudentName(""); setStudentEmail(""); setCredits("5"); setCreditsCustom("");
    setSessionLen("60"); setExpiresAt("");
  }

  async function deleteLink(pass: Pass) {
    if (!confirm(`Delete the booking link for ${pass.student_name || pass.student_email}? It will stop working immediately and cannot be restored.`)) return;
    try {
      await call("revoke", { pass_id: pass.id });
      toast.success("Booking link deleted");
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not delete booking link"); }
  }

  async function rotate(pass: Pass) {
    if (!confirm("Rotate the link? The old URL will stop working and a new one will be shown once.")) return;
    try {
      const res = await call("rotate", { pass_id: pass.id }) as { booking_url: string };
      setCreatedLink(res.booking_url);
      setRotatedFor(pass.id);
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Rotate failed"); }
  }

  function openEdit(pass: Pass) {
    setEditPass(pass);
    setEditCredits(String(pass.total_credits));
    setEditSessionLen(String(pass.session_length_minutes));
    setEditExpiresAt(pass.expires_at ? pass.expires_at.slice(0, 10) : "");
  }

  async function saveEdit() {
    if (!editPass) return;
    const total = Number(editCredits);
    if (!total || total < 1) { toast.error("Enter a valid credit amount"); return; }
    setSaving(true);
    try {
      await call("update", {
        pass_id: editPass.id,
        total_credits: total,
        session_length_minutes: Number(editSessionLen) || 70,
        expires_at: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
      });
      toast.success("Pass updated");
      setEditPass(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally { setSaving(false); }
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  const rows = useMemo(() => passes, [passes]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-xs uppercase tracking-wider font-medium">
            <Ticket className="h-4 w-4" /> Booking passes
          </div>
          <h1 className="mt-1 text-2xl font-semibold">Private booking links</h1>
          <p className="text-sm text-muted-foreground">Give a student a private link that lets them book a limited number of sessions with you.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New pass
        </Button>
      </header>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No booking passes yet. Create one above.</Card>
      ) : (
        <div className="space-y-3">
          {rows.map(p => (
            <Card key={p.id} className="p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium">{p.student_name || p.student_email || "(unnamed student)"}</div>
                {p.student_email && p.student_name && <div className="text-xs text-muted-foreground">{p.student_email}</div>}
              </div>
              <div className="text-sm">
                <div className="font-semibold">{p.total_credits - p.used_credits} <span className="text-muted-foreground font-normal">/ {p.total_credits} left</span></div>
                <div className="text-xs text-muted-foreground">{p.session_length_minutes} min · {p.expires_at ? `exp ${new Date(p.expires_at).toLocaleDateString()}` : "no expiry"}</div>
              </div>
              <StatusBadge status={p.status} />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => rotate(p)}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Rotate link
                </Button>
                {p.status !== "revoked" && (
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => deleteLink(p)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete link
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New booking pass</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Student name</Label>
              <Input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="e.g. Alex Kim" />
            </div>
            <div>
              <Label>Student email (optional)</Label>
              <Input type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="alex@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total credits</Label>
                <Select value={credits} onValueChange={setCredits}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 session</SelectItem>
                    <SelectItem value="5">5 sessions</SelectItem>
                    <SelectItem value="10">10 sessions</SelectItem>
                    <SelectItem value="custom">Custom…</SelectItem>
                  </SelectContent>
                </Select>
                {credits === "custom" && (
                  <Input type="number" min={1} max={50} className="mt-2" value={creditsCustom} onChange={e => setCreditsCustom(e.target.value)} placeholder="e.g. 3" />
                )}
              </div>
              <div>
                <Label>Session length</Label>
                <Select value={sessionLen} onValueChange={setSessionLen}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="70">70 min (1 hr 10 min)</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                    <SelectItem value="120">120 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Expiration (optional)</Label>
              <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={create} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create pass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit pass dialog */}
      <Dialog open={!!editPass} onOpenChange={(o) => { if (!o) setEditPass(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit pass{editPass?.student_name ? ` — ${editPass.student_name}` : ""}</DialogTitle>
          </DialogHeader>
          {editPass && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {editPass.used_credits} of {editPass.total_credits} credits used. Raising total credits refills the pass; an exhausted or expired pass reactivates automatically.
              </div>
              <div>
                <Label>Total credits</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" min={Math.max(1, editPass.used_credits)} max={50} value={editCredits} onChange={e => setEditCredits(e.target.value)} />
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditCredits(String((Number(editCredits) || 0) + 1))}>+1</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditCredits(String((Number(editCredits) || 0) + 5))}>+5</Button>
                </div>
              </div>
              <div>
                <Label>Session length</Label>
                <Select value={editSessionLen} onValueChange={setEditSessionLen}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="70">70 min (1 hr 10 min)</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                    <SelectItem value="120">120 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expiration (optional)</Label>
                <Input type="date" value={editExpiresAt} onChange={e => setEditExpiresAt(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditPass(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show generated link (once) */}
      <Dialog open={!!createdLink} onOpenChange={(o) => { if (!o) { setCreatedLink(null); setRotatedFor(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{rotatedFor ? "New link" : "Pass created"}</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground mb-2">
            Copy this private link now — it will only be shown once. If you lose it, rotate the link to generate a new one.
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md break-all font-mono text-xs">
            {createdLink}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatedLink(null)}>Close</Button>
            <Button onClick={() => createdLink && copy(createdLink)}>
              <Copy className="h-4 w-4 mr-2" /> Copy link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: Pass["status"] }) {
  const map: Record<Pass["status"], string> = {
    active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    exhausted: "bg-zinc-500/15 text-zinc-600 border-zinc-500/30",
    expired: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    revoked: "bg-red-500/15 text-red-600 border-red-500/30",
  };
  return (
    <span className={`px-2 py-1 rounded-md text-xs uppercase tracking-wider border ${map[status]}`}>
      {status}
    </span>
  );
}
