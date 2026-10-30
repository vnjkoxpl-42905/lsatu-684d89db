import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface CorpusRow {
  id: string;
  qid: string;
  kind: "preview" | "explanation";
  picked_answer: string | null;
  qtype: string | null;
  content_markdown: string | null;
  admin_markdown: string | null;
  rating: number | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  updated_at: string;
}

type KindFilter = "" | "preview" | "explanation";
type RatedFilter = "" | "ungraded" | "graded";

export default function TutorCorpus() {
  const [rows, setRows] = React.useState<CorpusRow[]>([]);
  const [qtypes, setQtypes] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [kind, setKind] = React.useState<KindFilter>("");
  const [qtype, setQtype] = React.useState("");
  const [rated, setRated] = React.useState<RatedFilter>("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-tutor-corpus", {
        body: { action: "list", kind: kind || undefined, qtype: qtype || undefined, rated: rated || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRows(data.rows ?? []);
      if (data.qtypes) setQtypes(data.qtypes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load corpus");
    } finally {
      setLoading(false);
    }
  }, [kind, qtype, rated]);

  React.useEffect(() => { load(); }, [load]);

  const gradedCount = rows.filter((r) => r.rating != null).length;

  const patchRow = (id: string, patch: Partial<CorpusRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link to="/teacher/students" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-zinc-200 mb-5">
          <ArrowLeft className="h-4 w-4" /> Admin
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight">Tutor corpus</h1>
        <p className="mt-1 text-[14px] text-zinc-400">
          Every reusable breakdown and explanation the tutor has generated. Grade each 1-5, edit the
          text (your edit becomes the canonical answer), and 4-5 rated answers steer the tutor's tone on new questions.
        </p>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <FilterSelect value={kind} onChange={(v) => setKind(v as KindFilter)} options={[
            { value: "", label: "All kinds" },
            { value: "preview", label: "Breakdowns" },
            { value: "explanation", label: "Explanations" },
          ]} />
          <FilterSelect value={rated} onChange={(v) => setRated(v as RatedFilter)} options={[
            { value: "", label: "All" },
            { value: "ungraded", label: "Ungraded" },
            { value: "graded", label: "Graded" },
          ]} />
          <FilterSelect value={qtype} onChange={setQtype} options={[
            { value: "", label: "All types" },
            ...qtypes.map((q) => ({ value: q, label: q })),
          ]} />
          <span className="ml-auto text-[12px] text-zinc-500 tabular-nums">
            {rows.length} shown · {gradedCount} graded
          </span>
        </div>

        {/* List */}
        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-[14px] py-12 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading corpus…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-zinc-500 text-[14px] py-12 text-center">
              No entries yet. They accumulate as students use the tutor.
            </p>
          ) : (
            rows.map((row) => <CorpusCard key={row.id} row={row} onPatch={patchRow} />)
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[13px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function CorpusCard({ row, onPatch }: { row: CorpusRow; onPatch: (id: string, p: Partial<CorpusRow>) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(row.admin_markdown ?? row.content_markdown ?? "");
  const [notes, setNotes] = React.useState(row.admin_notes ?? "");
  const [saving, setSaving] = React.useState(false);

  const served = row.admin_markdown || row.content_markdown || "";
  const dirty = editing && (draft !== (row.admin_markdown ?? row.content_markdown ?? "") || notes !== (row.admin_notes ?? ""));

  const save = async (patch: { rating?: number | null; admin_markdown?: string; admin_notes?: string }) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-tutor-corpus", {
        body: { action: "update", id: row.id, ...patch },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onPatch(row.id, data.row);
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      {/* Meta row */}
      <div className="flex items-center gap-2 text-[11px] text-zinc-500 mb-3">
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-medium text-zinc-300">
          {row.kind === "preview" ? "Breakdown" : "Explanation"}
        </span>
        <span className="tabular-nums">{row.qid}</span>
        {row.qtype && <span>· {row.qtype}</span>}
        {row.kind === "explanation" && row.picked_answer && <span>· picked ({row.picked_answer})</span>}
        {/* Rating */}
        <div className="ml-auto flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              disabled={saving}
              onClick={() => save({ rating: row.rating === n ? null : n })}
              className={cn(
                "h-6 w-6 rounded text-[12px] font-semibold transition-colors",
                row.rating != null && n <= row.rating
                  ? "bg-amber-400 text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-[13.5px] text-zinc-100 leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-600"
        />
      ) : (
        <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-strong:text-white text-[13.5px] text-zinc-200">
          <ReactMarkdown>{served || "_(empty)_"}</ReactMarkdown>
        </div>
      )}

      {row.admin_markdown && !editing && (
        <p className="mt-2 text-[11px] text-amber-400/80">Edited by you · this version is served to students</p>
      )}

      {/* Notes (only while editing) */}
      {editing && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Private notes (what's good / what to fix)…"
          className="mt-2 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[12.5px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700"
        />
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        {editing ? (
          <>
            <button
              disabled={saving || !dirty}
              onClick={async () => { await save({ admin_markdown: draft, admin_notes: notes }); setEditing(false); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-[12.5px] font-semibold text-zinc-900 disabled:opacity-40 hover:bg-amber-300 transition-colors"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </button>
            <button
              onClick={() => { setDraft(row.admin_markdown ?? row.content_markdown ?? ""); setNotes(row.admin_notes ?? ""); setEditing(false); }}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-[12.5px] text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-[12.5px] text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Edit
          </button>
        )}
        {row.admin_notes && !editing && (
          <span className="text-[11px] text-zinc-500 truncate">Note: {row.admin_notes}</span>
        )}
      </div>
    </div>
  );
}
