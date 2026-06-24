import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useHubStudents } from "@/hooks/useHubStudents";
import {
  resolveStudentAuthIdFromRoster,
  type ResolveFailureReason,
} from "@/lib/resolveStudentAuthId";

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
      </div>
    </div>
  );
}
