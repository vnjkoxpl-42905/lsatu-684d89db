import React from "react";
import { supabase } from "@/integrations/supabase/client";

type IngestResult = {
  ok: boolean;
  slug?: string;
  version?: string;
  counts?: { processed: number; staged: number; failed: number; promoted: number; obsolete: number; total: number };
  failures?: Array<{ record_id: string; reason: string }>;
  error?: string;
  detail?: string;
  previously_active_version?: string | null;
};

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// This page is admin-gated at the route level via <ProtectedRoute requireAdmin>.
// The Edge Function performs its own server-side admin verification as well.
//
// The canonical guide is NEVER bundled into browser assets. The admin uploads
// the three files at runtime; their contents are streamed straight to the
// admin-only ingest Edge Function.
export default function LsatKnowledgeImport() {
  const [mdFile, setMdFile] = React.useState<File | null>(null);
  const [jsonlFile, setJsonlFile] = React.useState<File | null>(null);
  const [manifestFile, setManifestFile] = React.useState<File | null>(null);

  const [mdText, setMdText] = React.useState<string>("");
  const [jsonlText, setJsonlText] = React.useState<string>("");
  const [manifest, setManifest] = React.useState<any>(null);

  const [mdSha, setMdSha] = React.useState<string>("");
  const [jsonlSha, setJsonlSha] = React.useState<string>("");

  const [confirming, setConfirming] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<IngestResult | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const readFile = async (f: File) => await f.text();

  React.useEffect(() => {
    (async () => {
      if (!mdFile) { setMdText(""); setMdSha(""); return; }
      const t = await readFile(mdFile);
      setMdText(t);
      setMdSha(await sha256Hex(t));
    })();
  }, [mdFile]);
  React.useEffect(() => {
    (async () => {
      if (!jsonlFile) { setJsonlText(""); setJsonlSha(""); return; }
      const t = await readFile(jsonlFile);
      setJsonlText(t);
      setJsonlSha(await sha256Hex(t));
    })();
  }, [jsonlFile]);
  React.useEffect(() => {
    (async () => {
      if (!manifestFile) { setManifest(null); return; }
      try {
        const t = await readFile(manifestFile);
        setManifest(JSON.parse(t));
      } catch (e) {
        setManifest(null);
        setErr(`Manifest is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
  }, [manifestFile]);

  const filesReady = !!mdText && !!jsonlText && !!manifest;
  const expectedCount = manifest?.record_count;
  const version = manifest?.source_version;
  const mdShaMatches = manifest && mdSha && manifest.canonical_markdown_sha256 === mdSha;
  const jsonlShaMatches = manifest && jsonlSha && manifest.ingestion_jsonl_sha256 === jsonlSha;

  const run = async () => {
    setRunning(true);
    setErr(null);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-lsat-knowledge", {
        body: { canonical_markdown: mdText, ingestion_jsonl: jsonlText, manifest },
      });
      if (error) throw new Error(error.message);
      setResult(data as IngestResult);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">LSAT Knowledge Import</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Admin-only. Select the three artifacts locally; their contents are sent to the admin-only
            ingest function and never bundled into browser assets. A new version imports into a
            staging area first and only replaces the active version after every record passes
            validation and promotes atomically. A failed import leaves the current active version
            and its records unchanged.
          </p>
        </header>

        <section className="rounded-lg border bg-card p-4 space-y-3 text-sm">
          <div>
            <label className="block font-medium mb-1">Canonical Markdown (.md)</label>
            <input type="file" accept=".md,text/markdown,text/plain" onChange={(e) => setMdFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label className="block font-medium mb-1">Ingestion JSONL (.jsonl)</label>
            <input type="file" accept=".jsonl,application/x-ndjson,text/plain" onChange={(e) => setJsonlFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label className="block font-medium mb-1">Manifest (.json)</label>
            <input type="file" accept=".json,application/json" onChange={(e) => setManifestFile(e.target.files?.[0] ?? null)} />
          </div>
        </section>

        {filesReady && (
          <section className="rounded-lg border bg-card p-4 text-sm space-y-1">
            <div><span className="text-muted-foreground">Source slug:</span> <code>{manifest.source_slug}</code></div>
            <div><span className="text-muted-foreground">Source version:</span> <code>{version}</code></div>
            <div><span className="text-muted-foreground">Expected records:</span> <code>{expectedCount}</code></div>
            <div>
              <span className="text-muted-foreground">Markdown SHA-256:</span>{" "}
              <code className="text-xs break-all">{mdSha}</code>{" "}
              <span className={mdShaMatches ? "text-emerald-600" : "text-destructive"}>
                {mdShaMatches ? "✓ matches manifest" : "✗ does not match manifest"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">JSONL SHA-256:</span>{" "}
              <code className="text-xs break-all">{jsonlSha}</code>{" "}
              <span className={jsonlShaMatches ? "text-emerald-600" : "text-destructive"}>
                {jsonlShaMatches ? "✓ matches manifest" : "✗ does not match manifest"}
              </span>
            </div>
          </section>
        )}

        {filesReady && !confirming && !result && (
          <button
            onClick={() => setConfirming(true)}
            disabled={!mdShaMatches || !jsonlShaMatches}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Prepare import…
          </button>
        )}

        {confirming && !result && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
            <p className="text-sm">
              This will stage <strong>{expectedCount}</strong> records for version{" "}
              <code>{version}</code> under kind <code>lsat_methodology</code>. Nothing changes for
              retrieval until every record passes validation and the atomic promotion succeeds.
            </p>
            <div className="flex gap-2">
              <button
                onClick={run}
                disabled={running}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {running ? "Importing…" : "Confirm and run import"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={running}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {err && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
            <div className="font-medium">Import failed</div>
            <div className="mt-1 whitespace-pre-wrap">{err}</div>
          </div>
        )}

        {result && (
          <div className={`rounded-lg border p-4 text-sm space-y-2 ${result.ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/50 bg-destructive/5"}`}>
            <div className="font-medium">{result.ok ? "Import succeeded" : "Import failed"}</div>
            {result.version && <div>Version: <code>{result.version}</code></div>}
            {result.counts && (
              <ul className="list-disc pl-5">
                <li>processed: {result.counts.processed}</li>
                <li>staged: {result.counts.staged}</li>
                <li>promoted: {result.counts.promoted}</li>
                <li>failed: {result.counts.failed}</li>
                <li>obsolete removed: {result.counts.obsolete}</li>
                <li>total in payload: {result.counts.total}</li>
              </ul>
            )}
            {result.previously_active_version !== undefined && (
              <div>Previously active version: <code>{String(result.previously_active_version ?? "none")}</code></div>
            )}
            {result.error && <div>Error: {result.error}</div>}
            {result.detail && <div className="text-xs text-muted-foreground">{result.detail}</div>}
            {result.failures && result.failures.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer">Failure details ({result.failures.length})</summary>
                <pre className="mt-2 max-h-64 overflow-auto text-xs">{JSON.stringify(result.failures, null, 2)}</pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
