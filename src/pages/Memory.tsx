// Top-level /memory admin route — the Memory OS manager (D3/D7).
// A read/edit window over the memory_items table via the memory-admin Edge
// Function. Admin-only (gated by <ProtectedRoute requireAdmin> in App.tsx).
// Lets Joshua inspect, correct, pin, archive, and forget everything the
// assistants believe, resolve conflicts, and approve skill proposals.

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Brain,
  Pin,
  PinOff,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  AlertTriangle,
  Lightbulb,
  Check,
  X,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMemoryAdmin,
  type MemoryItem,
  type MemoryFilters,
  type MemoryOwnerType,
  type MemoryKind,
} from "@/hooks/useMemoryAdmin";

const OWNER_LABEL: Record<MemoryOwnerType, string> = {
  operator: "Me",
  student: "Students",
  activity: "Activities",
  global: "Global",
};

function ownerOf(item: MemoryItem): MemoryOwnerType | "—" {
  return item.memory_namespaces?.owner_type ?? "—";
}

function StatPill({ label, value, tone }: { label: string; value: number; tone?: "warn" | "info" }) {
  const ring =
    tone === "warn"
      ? "border-amber-500/40 text-amber-300"
      : tone === "info"
        ? "border-sky-500/40 text-sky-300"
        : "border-zinc-700 text-zinc-300";
  return (
    <div className={`rounded-lg border ${ring} bg-zinc-900/60 px-3 py-2`}>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}

function MemoryRow({
  item,
  onEdit,
  onPin,
  onArchive,
  onRestore,
  onForget,
}: {
  item: MemoryItem;
  onEdit: (item: MemoryItem) => void;
  onPin: (item: MemoryItem) => void;
  onArchive: (item: MemoryItem) => void;
  onRestore: (item: MemoryItem) => void;
  onForget: (item: MemoryItem) => void;
}) {
  const owner = ownerOf(item);
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {item.pinned && <Pin className="h-3.5 w-3.5 text-amber-300" />}
            <span className="truncate text-sm font-medium text-zinc-100">{item.title}</span>
            <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-400">
              {item.kind === "procedural" ? "skill" : "fact"}
            </Badge>
            {owner !== "—" && (
              <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-500">
                {OWNER_LABEL[owner]}
              </Badge>
            )}
            {item.needs_review && (
              <Badge className="bg-amber-500/15 text-[10px] text-amber-300 hover:bg-amber-500/15">review</Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{item.content}</p>
          <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-zinc-600">
            <span>used {item.use_count}×</span>
            <span>
              success {item.use_count > 0 ? Math.round((item.success_count / item.use_count) * 100) : 0}%
            </span>
            <span>importance {item.importance.toFixed(2)}</span>
            <span>authority {item.source_authority.replace(/_/g, " ")}</span>
            {item.status !== "active" && <span className="text-zinc-500">· {item.status}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => onPin(item)} title={item.pinned ? "Unpin" : "Pin"}>
            {item.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => onEdit(item)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          {item.status === "active" ? (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => onArchive(item)} title="Archive">
              <Archive className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => onRestore(item)} title="Restore">
              <ArchiveRestore className="h-4 w-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400/80 hover:text-red-400" onClick={() => onForget(item)} title="Forget (delete)">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Memory() {
  const m = useMemoryAdmin();
  const [editing, setEditing] = useState<MemoryItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const setFilter = (patch: Partial<MemoryFilters>) => m.setFilters({ ...m.filters, ...patch });

  const reviewItems = useMemo(() => m.items.filter((i) => i.needs_review), [m.items]);
  const proposals = useMemo(() => m.items.filter((i) => i.status === "proposed"), [m.items]);
  const mainList = useMemo(
    () => m.items.filter((i) => !i.needs_review && i.status !== "proposed"),
    [m.items],
  );

  const run = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
      toast.success(label);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  const openEdit = (item: MemoryItem) => {
    setEditing(item);
    setEditTitle(item.title);
    setEditContent(item.content);
  };
  const saveEdit = () =>
    run("Saved", async () => {
      if (!editing) return;
      await m.editMemory(editing.id, { title: editTitle.trim(), content: editContent.trim() });
      setEditing(null);
    });

  const confirmForget = (item: MemoryItem) => {
    if (!window.confirm(`Forget "${item.title}"? This permanently deletes the memory.`)) return;
    void run("Forgotten", () => m.forgetMemory(item.id));
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center gap-3">
          <Brain className="h-6 w-6 text-zinc-300" />
          <div>
            <h1 className="text-lg font-semibold">Memory</h1>
            <p className="text-sm text-zinc-500">What your assistants remember — inspect, correct, and curate.</p>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill label="Active" value={m.counts.active} />
          <StatPill label="Pinned" value={m.counts.pinned} />
          <StatPill label="Needs review" value={m.counts.needs_review} tone="warn" />
          <StatPill label="Proposals" value={m.counts.proposed} tone="info" />
        </div>

        <Tabs defaultValue="memories">
          <TabsList className="bg-zinc-900">
            <TabsTrigger value="memories">Memories</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="memories" className="mt-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={m.filters.owner_type ?? "all"}
                onValueChange={(v) => setFilter({ owner_type: v === "all" ? undefined : (v as MemoryOwnerType) })}
              >
                <SelectTrigger className="w-[140px] border-zinc-800 bg-zinc-900 text-sm"><SelectValue placeholder="Owner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All owners</SelectItem>
                  <SelectItem value="operator">Me</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="activity">Activities</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={m.filters.kind ?? "all"}
                onValueChange={(v) => setFilter({ kind: v === "all" ? undefined : (v as MemoryKind) })}
              >
                <SelectTrigger className="w-[120px] border-zinc-800 bg-zinc-900 text-sm"><SelectValue placeholder="Kind" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All kinds</SelectItem>
                  <SelectItem value="semantic">Facts</SelectItem>
                  <SelectItem value="procedural">Skills</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={m.filters.status ?? "active"}
                onValueChange={(v) => setFilter({ status: v as MemoryFilters["status"] })}
              >
                <SelectTrigger className="w-[130px] border-zinc-800 bg-zinc-900 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="superseded">Superseded</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-600" />
                <Input
                  className="border-zinc-800 bg-zinc-900 pl-8 text-sm"
                  placeholder="Search memories…"
                  defaultValue={m.filters.q ?? ""}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setFilter({ q: (e.target as HTMLInputElement).value.trim() || undefined });
                  }}
                />
              </div>
            </div>

            {m.error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{m.error}</div>
            )}

            {/* Skill proposals (Loop 2) */}
            {proposals.length > 0 && (
              <Card className="border-sky-500/30 bg-sky-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-sky-300">
                    <Lightbulb className="h-4 w-4" /> Skill proposals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {proposals.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900/50 p-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-zinc-100">{p.title}</div>
                        <div className="line-clamp-1 text-xs text-zinc-500">{p.content}</div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="outline" className="h-7 border-zinc-700" onClick={() => run("Skill saved", () => m.approveSkill(p.id))}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-zinc-400" onClick={() => run("Dismissed", () => m.archiveMemory(p.id))}>
                          <X className="mr-1 h-3.5 w-3.5" /> Not now
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Needs review / conflicts (D6) */}
            {reviewItems.length > 0 && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-amber-300">
                    <AlertTriangle className="h-4 w-4" /> Needs review
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reviewItems.map((r) => (
                    <div key={r.id} className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2.5">
                      <div className="text-sm text-zinc-100">{r.title}</div>
                      <div className="text-xs text-zinc-500">{r.content}</div>
                      <div className="mt-2 flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 border-zinc-700" onClick={() => run("Kept", () => m.resolveConflict(r.id, "approved"))}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Keep
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-zinc-400" onClick={() => run("Rejected", () => m.resolveConflict(r.id, "rejected"))}>
                          <X className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Main list */}
            <div className="space-y-2">
              {m.loading ? (
                <div className="py-12 text-center text-sm text-zinc-600">Loading…</div>
              ) : mainList.length === 0 ? (
                <div className="py-12 text-center text-sm text-zinc-600">No memories yet.</div>
              ) : (
                mainList.map((item) => (
                  <MemoryRow
                    key={item.id}
                    item={item}
                    onEdit={openEdit}
                    onPin={(it) => run(it.pinned ? "Unpinned" : "Pinned", () => m.setPinned(it.id, !it.pinned))}
                    onArchive={(it) => run("Archived", () => m.archiveMemory(it.id))}
                    onRestore={(it) => run("Restored", () => m.restoreMemory(it.id))}
                    onForget={confirmForget}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-300">What changed recently</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {m.audit.length === 0 ? (
                  <div className="py-6 text-center text-sm text-zinc-600">No activity yet.</div>
                ) : (
                  m.audit.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 border-b border-zinc-800/60 py-1.5 text-sm last:border-0">
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-400">{a.action}</Badge>
                        <span className="text-zinc-500">{a.actor ? "admin" : "system"}</span>
                      </span>
                      <span className="text-xs text-zinc-600">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Edit memory</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              className="border-zinc-800 bg-zinc-900"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title"
            />
            <Textarea
              className="min-h-[140px] border-zinc-800 bg-zinc-900"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Memory content"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-zinc-400" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={!editContent.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
