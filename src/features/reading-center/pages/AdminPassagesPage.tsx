import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PassageEditor } from "../components/PassageEditor";
import {
  useDeletePassage,
  usePassages,
  useReorderPassages,
  useUpsertPassage,
} from "../hooks/useReadingCenterData";
import { rcDb } from "../lib/db";
import { RC_LIBRARY_PATH } from "../lib/routes";
import type { Passage } from "../lib/types";

function DeletePassageDialog({
  passage,
  onClose,
}: {
  passage: Passage | null;
  onClose: () => void;
}): React.ReactElement {
  const del = useDeletePassage(true);
  const [count, setCount] = useState<number | null>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    setCount(null);
    setTyped("");
    if (!passage) return;
    let cancelled = false;
    rcDb("reading_center_progress")
      .select("user_id", { count: "exact", head: true })
      .eq("passage_id", passage.id)
      .then(({ count: c, error }: { count: number | null; error: { message: string } | null }) => {
        if (cancelled) return;
        if (error) { toast.error(`Could not check progress: ${error.message}`); return; }
        setCount(c ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [passage]);

  const needsTyping = (count ?? 0) > 0;
  const canDelete = !!passage && count !== null && (!needsTyping || typed === passage.title) && !del.isPending;

  return (
    <AlertDialog open={!!passage} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{passage?.title}"?</AlertDialogTitle>
          <AlertDialogDescription>
            {count === null
              ? "Checking reading progress..."
              : needsTyping
                ? `${count} ${count === 1 ? "student has" : "students have"} progress on this passage. Type the title to confirm.`
                : "Nobody has started this passage. This cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {needsTyping && <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={passage?.title} />}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!canDelete}
            onClick={() =>
              passage &&
              del.mutate(passage.id, {
                onSuccess: () => {
                  toast.success("Passage deleted");
                  onClose();
                },
                onError: (e) => toast.error(e.message),
              })
            }
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AdminPassagesPage(): React.ReactElement {
  const passagesQuery = usePassages(true);
  const reorder = useReorderPassages();
  const upsert = useUpsertPassage();
  const [editing, setEditing] = useState<Passage | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Passage | null>(null);

  const passages = useMemo(
    () => [...(passagesQuery.data ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [passagesQuery.data],
  );
  const nextSortOrder = passages.reduce((m, p) => Math.max(m, p.sort_order), 0) + 1;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= passages.length) return;
    const next = [...passages];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    reorder.mutate(next.map((p, i) => ({ id: p.id, sort_order: i + 1 })), {
      onError: (e) => toast.error(`Could not reorder: ${e.message}`),
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-6">
      <Link to={RC_LIBRARY_PATH} className="inline-flex items-center gap-1.5 text-sm text-black/55 hover:text-black">
        <ArrowLeft className="h-4 w-4" /> Reading Center
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <h1 className="font-display text-2xl tracking-tight">Reading Center passages</h1>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="ml-auto inline-flex h-9 items-center gap-1.5 border border-black bg-black px-3 text-sm font-medium text-white hover:bg-black/85"
        >
          <Plus className="h-4 w-4" /> New passage
        </button>
      </div>

      {passagesQuery.isLoading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-black/55">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading
        </div>
      ) : passagesQuery.error ? (
        <p className="mt-8 text-sm text-red-700">Could not load passages: {passagesQuery.error.message}</p>
      ) : passages.length === 0 ? (
        <p className="mt-8 text-sm text-black/55">No passages yet.</p>
      ) : (
        <table className="mt-6 w-full border border-black/12 bg-white/25 text-sm">
          <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-black/45">
            <tr className="border-b border-black/10">
              <th className="w-20 px-3 py-2 font-medium">Order</th>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="w-24 px-3 py-2 font-medium">Words</th>
              <th className="w-24 px-3 py-2 font-medium">Published</th>
              <th className="w-24 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {passages.map((p, i) => (
              <tr key={p.id} className="border-b border-black/8 last:border-0">
                <td className="px-3 py-1.5">
                  <div className="flex">
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Move ${p.title} up`} disabled={i === 0 || reorder.isPending} onClick={() => move(i, i - 1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Move ${p.title} down`} disabled={i === passages.length - 1 || reorder.isPending} onClick={() => move(i, i + 1)}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
                <td className="px-3 py-1.5 font-medium">{p.title}</td>
                <td className="px-3 py-1.5 tabular-nums text-black/60">{p.word_count}</td>
                <td className="px-3 py-1.5">
                  <Switch
                    checked={p.is_published}
                    aria-label={`Published: ${p.title}`}
                    onCheckedChange={(v) =>
                      upsert.mutate(
                        { id: p.id, slug: p.slug, title: p.title, body: p.body, owner_id: p.owner_id ?? null, is_published: v },
                        { onError: (e) => toast.error(e.message) },
                      )
                    }
                  />
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${p.title}`} onClick={() => setEditing(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Delete ${p.title}`} onClick={() => setDeleting(p)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <PassageEditor
        open={editing !== undefined}
        onOpenChange={(o) => !o && setEditing(undefined)}
        passage={editing ?? null}
        nextSortOrder={nextSortOrder}
      />
      <DeletePassageDialog passage={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
