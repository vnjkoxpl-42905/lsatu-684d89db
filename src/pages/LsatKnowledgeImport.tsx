import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Navigate } from "react-router-dom";
// Vite ?raw imports pin the repo artifacts at build time — no runtime fetch,
// no public/ exposure, no service-role credentials on the client.
// deno-lint-ignore-file
// @ts-ignore
import canonicalMarkdown from "../../content/lsat/logical-reasoning/logical-reasoning-guide.md?raw";
// @ts-ignore
import ingestionJsonl from "../../content/lsat/logical-reasoning/logical-reasoning-guide.ingestion.jsonl?raw";
// @ts-ignore
import manifestJson from "../../content/lsat/logical-reasoning/logical-reasoning-guide.manifest.json";

type IngestResult = {
  ok: boolean;
  slug?: string;
  version?: string;
  counts?: { processed: number; upserted: number; failed: number; obsolete: number; total: number };
  failures?: Array<{ record_id: string; reason: string }>;
  error?: string;
  detail?: string;
  previously_active_version?: string | null;
};

export default function LsatKnowledgeImport() {
  const { isAdmin, loading } = useUserPermissions();
  const [confirming, setConfirming] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<IngestResult | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const manifest = manifestJson as any;
  const expectedCount = manifest.record_count;
  const version = manifest.source_version;

  if (loading) return <div className="min-h-screen bg-background p-8 text-sm">Loading…</div>;
  if (!isAdmin) return <Navigate to="/mainhub" replace />;

  const run = async () => {
    setRunning(true);
    setErr(null);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-lsat-knowledge", {
        body: {
          canonical_markdown: canonicalMarkdown,
          ingestion_jsonl: ingestionJsonl,
          manifest,
        },
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
            Admin-only. Ingests the pinned Logical Reasoning canonical guide into the shared
            knowledge layer. The repository artifact is embedded at build time — no service-role
            key ever reaches the browser; the ingestion function validates + writes server-side.
          </p>
        </header>

        <section className="rounded-lg border bg-card p-4 text-sm space-y-1">
          <div><span className="text-muted-foreground">Source slug:</span> <code>{manifest.source_slug}</code></div>
          <div><span className="text-muted-foreground">Source version:</span> <code>{version}</code></div>
          <div><span className="text-muted-foreground">Expected records:</span> <code>{expectedCount}</code></div>
          <div><span className="text-muted-foreground">Markdown SHA-256:</span> <code className="text-xs break-all">{manifest.canonical_markdown_sha256}</code></div>
          <div><span className="text-muted-foreground">JSONL SHA-256:</span> <code className="text-xs break-all">{manifest.ingestion_jsonl_sha256}</code></div>
        </section>

        {!confirming && !result && (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Prepare import…
          </button>
        )}

        {confirming && !result && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
            <p className="text-sm">
              This will write <strong>{expectedCount}</strong> records under kind{" "}
              <code>lsat_methodology</code>. The source row becomes <code>active</code> only after
              full success. A previously-active version stays intact if this import fails.
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
                <li>upserted: {result.counts.upserted}</li>
                <li>failed: {result.counts.failed}</li>
                <li>obsolete removed: {result.counts.obsolete}</li>
                <li>total in payload: {result.counts.total}</li>
              </ul>
            )}
            {result.previously_active_version && (
              <div>Previously active version preserved: <code>{result.previously_active_version}</code></div>
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
