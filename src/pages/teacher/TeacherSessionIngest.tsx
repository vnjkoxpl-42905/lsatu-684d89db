import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, FileDown, RefreshCw, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useHubStudents, type HubStudentRow } from "@/hooks/useHubStudents";
import {
  resolveStudentAuthIdFromRoster,
  type ResolveFailureReason,
} from "@/lib/resolveStudentAuthId";
import {
  useSessionIngestions,
  useScanSessionNotes,
  useResolveIngestion,
  useDiscardIngestion,
  type SessionIngestion,
} from "@/hooks/useSessionIngestions";

// Phase 1A — minimal manual ingest form. Admin pastes a Google Doc id (the
// Gemini Notes doc) and picks a student; the ingest-session-note edge function
// stores the transcript and writes a ledger row. ZERO synthesis, ZERO
// student-facing output. This is an internal admin tool, not student-visible.

const FAILURE_COPY: Record<ResolveFailureReason, string> = {
  missing_class_id: "Pick a student first.",
  malformed_uuid: "That student id is not a valid UUID.",
  not_in_roster: "That student is not on the roster.",
  not_a_student: "That account is an admin, not a student.",
  no_classroom_access: "That student does not have classroom access yet.",
  orphan_auth_id: "That profile has no linked auth account (orphan).",
};

// Accepts a raw Doc id or a full Docs URL and extracts the id.
function parseDocId(input: string): string {
  const trimmed = input.trim();
  const m = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : trimmed;
}

interface IngestResult {
  ok: boolean;
  already_ingested?: boolean;
  ingestion_id?: string;
  status?: string;
  transcript_context_id?: string;
  session_id?: string;
  inline_text?: boolean;
  byte_length?: number;
  error?: string;
  reason?: string;
}

export default function TeacherSessionIngest() {
  const { rows, loading: rosterLoading } = useHubStudents();
  const [docInput, setDocInput] = React.useState("");
  const [gmailMessageId, setGmailMessageId] = React.useState("");
  const [studentId, setStudentId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<IngestResult | null>(null);

  const sortedRoster = React.useMemo(
    () =>
      [...rows].sort((a, b) =>
        (a.display_name ?? a.email ?? "").localeCompare(b.display_name ?? b.email ?? ""),
      ),
    [rows],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    const docId = parseDocId(docInput);
    if (!docId) {
      toast.error("Paste a Google Doc id or URL.");
      return;
    }

    // Client-side fail-closed guard before we ever hit the function. The edge
    // function repeats the authoritative auth.users check.
    const resolved = resolveStudentAuthIdFromRoster(studentId, rows);
    if (!resolved.ok || !("authId" in resolved)) {
      const reason = "reason" in resolved ? resolved.reason : "missing_class_id";
      toast.error(FAILURE_COPY[reason]);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke<IngestResult>(
        "ingest-session-note",
        {
          body: {
            gdrive_doc_id: docId,
            student_class_id: resolved.authId,
            gmail_message_id: gmailMessageId.trim() || undefined,
          },
        },
      );
      if (error) throw error;
      if (data && !data.ok) {
        throw new Error(data.error || data.reason || "Ingest failed");
      }
      setResult(data ?? null);
      if (data?.already_ingested) {
        toast.info("Already ingested — no duplicate created.");
      } else {
        toast.success("Transcript ingested and stored.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ingest failed";
      setResult({ ok: false, error: msg });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          to="/teacher"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" /> Teacher Desk
        </Link>

        <header className="mt-4 mb-6">
          <h1 className="text-xl font-semibold">Ingest session notes</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Phase 1A manual ingest. Paste a Gemini Notes Google Doc id and pick the
            student. The transcript is stored admin-side only — nothing is sent to
            the student.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Google Doc id or URL
            </label>
            <input
              value={docInput}
              onChange={(e) => setDocInput(e.target.value)}
              placeholder="1AbC… or https://docs.google.com/document/d/1AbC…/edit"
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300">Student</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={rosterLoading}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50"
            >
              <option value="">{rosterLoading ? "Loading roster…" : "Select a student…"}</option>
              {sortedRoster.map((s) => (
                <option key={s.class_id} value={s.class_id}>
                  {s.display_name ?? "(no name)"}
                  {s.email ? ` — ${s.email}` : ""}
                  {!s.has_classroom_access ? " · no classroom access" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Gmail message id <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              value={gmailMessageId}
              onChange={(e) => setGmailMessageId(e.target.value)}
              placeholder="Used for dedup if you have it"
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !docInput.trim() || !studentId}
            className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {submitting ? "Ingesting…" : "Ingest transcript"}
          </button>
        </form>

        {result && (
          <div
            className={`mt-6 rounded-md border p-4 text-sm ${
              result.ok
                ? "border-emerald-800 bg-emerald-950/40 text-emerald-200"
                : "border-red-800 bg-red-950/40 text-red-200"
            }`}
          >
            {result.ok ? (
              <>
                <p className="font-medium">
                  {result.already_ingested
                    ? "Already ingested (no duplicate created)."
                    : "Stored."}
                </p>
                <ul className="mt-2 space-y-0.5 text-xs text-zinc-300">
                  <li>Ingestion id: {result.ingestion_id}</li>
                  <li>Status: {result.status}</li>
                  <li>Transcript context: {result.transcript_context_id}</li>
                  <li>Session: {result.session_id}</li>
                  {typeof result.byte_length === "number" && (
                    <li>
                      Size: {(result.byte_length / 1024).toFixed(1)} KB ·{" "}
                      {result.inline_text ? "inline + bucket" : "bucket only"}
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <p className="font-medium">Failed: {result.error}</p>
            )}
          </div>
        )}

        <ResolutionQueue roster={sortedRoster} />
      </div>
    </div>
  );
}

// Phase 1B — scan + resolution queue. Lists needs_match items detected by the
// scan-session-notes function; admin confirms the student (reusing the same
// fail-closed resolver) or discards.
function ResolutionQueue({ roster }: { roster: HubStudentRow[] }) {
  const { data: items, isLoading } = useSessionIngestions();
  const scan = useScanSessionNotes();
  const resolve = useResolveIngestion();
  const discard = useDiscardIngestion();
  const [picks, setPicks] = React.useState<Record<string, string>>({});

  const queue = (items ?? []).filter((i) => i.status === "needs_match");
  const recent = (items ?? []).filter((i) => i.status !== "needs_match").slice(0, 8);

  async function handleScan() {
    try {
      const res = await scan.mutateAsync(undefined);
      toast.success(
        `Scanned ${res.scanned}: ${res.queued} queued, ${res.skipped_existing} already seen, ${res.skipped_no_doc} no doc.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    }
  }

  async function handleResolve(item: SessionIngestion) {
    const classId = picks[item.id];
    if (!classId) {
      toast.error("Pick a student for this item first.");
      return;
    }
    const guard = resolveStudentAuthIdFromRoster(classId, roster);
    if (!guard.ok || !("authId" in guard)) {
      toast.error("That student can't receive a transcript (fail closed).");
      return;
    }
    try {
      await resolve.mutateAsync({ ledgerId: item.id, studentClassId: classId });
      toast.success("Resolved and stored.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resolve failed");
    }
  }

  async function handleDiscard(item: SessionIngestion) {
    try {
      await discard.mutateAsync({ ledgerId: item.id, reason: "not_a_real_session" });
      toast.success("Discarded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Discard failed");
    }
  }

  return (
    <section className="mt-10 border-t border-zinc-800 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Resolution queue</h2>
          <p className="text-xs text-zinc-500">
            Detected Gemini Notes awaiting a student match. Scan never auto-attaches.
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={scan.isPending}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-50"
        >
          {scan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Scan for new session notes
        </button>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading queue…</p>
      ) : queue.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Nothing waiting. Run a scan to detect new notes.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {queue.map((item) => {
            const meta = (item.raw_meta ?? {}) as Record<string, unknown>;
            return (
              <li key={item.id} className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.raw_subject ?? "(no subject)"}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {meta.parsed_name ? `Parsed name: ${String(meta.parsed_name)}` : "No name parsed"}
                      {item.calendar_event_id ? " · calendar window hit" : ""}
                      {` · confidence ${item.match_confidence ?? "low"}`}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    value={picks[item.id] ?? ""}
                    onChange={(e) => setPicks((p) => ({ ...p, [item.id]: e.target.value }))}
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm outline-none focus:border-zinc-500"
                  >
                    <option value="">Select student…</option>
                    {roster.map((s) => (
                      <option key={s.class_id} value={s.class_id}>
                        {s.display_name ?? "(no name)"}{s.email ? ` — ${s.email}` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleResolve(item)}
                    disabled={resolve.isPending}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Resolve
                  </button>
                  <button
                    onClick={() => handleDiscard(item)}
                    disabled={discard.isPending}
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Discard
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {recent.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Recent</h3>
          <ul className="mt-2 space-y-1 text-xs text-zinc-400">
            {recent.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="truncate">{item.raw_subject ?? item.gdrive_doc_id ?? item.id}</span>
                <span className="shrink-0 text-zinc-500">{item.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
