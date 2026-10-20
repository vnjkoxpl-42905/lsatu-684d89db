/** Actual picker, mocked identity/static bank/persistence only; denies remote requests. */
import React, { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import "../../src/index.css";
import "../../src/features/reading-center/reading-center.css";
if (!import.meta.env.DEV || location.hostname !== "127.0.0.1" || location.port !== "8095") throw new Error("Local picker verification only.");
const scenario = new URLSearchParams(location.search).get("scenario") ?? "normal";
const user = "00000000-0000-4000-8000-000000009995";
const ids = { progress: "00000000-0000-4000-8000-000000000101", other: "00000000-0000-4000-8000-000000000104", complete: "00000000-0000-4000-8000-000000000103" };
const titles = ["Progress passage", "Ready passage", "Completed passage", "Other unfinished passage"];
const paragraphs = ["A paragraph can introduce a question without answering it. Readers should keep the question in mind as they continue.", "The next paragraph may offer an explanation. Its examples help establish what that explanation is meant to account for.", "An objection can challenge part of the explanation while leaving the rest intact. The reader must distinguish the objection from the author's own view.", "The conclusion returns to the original question. Its force depends on how the explanation responds to the objection."];
const preptests = [141, 142].map((preptest, test) => ({ preptest, passageCount: 4, questionCount: 0, passages: titles.map((title, i) => ({ passageId: 90101 + test * 100 + i, preptest, section: 4, setNumber: i + 1, title: test ? `Second test ${title.toLowerCase()}` : title, topic: null, format: null, frameworks: [], difficulty: null, questionCount: 0, explainedCount: 0, questionIds: [], firstWords: paragraphs[0], text: paragraphs.join("\n\n"), questions: [], summaries: {} })) }));
type Row = Record<string, any>;
const makeAttempt = (id: string, passage: number, started: string, completed = false): Row => ({ id, student_id: user, mode: "rc_recall", preptest: 141, section: 4, passage_ids: [passage], confirmation_scope: "all_read", segmentation_version: 2, started_at: started, finished_at: completed ? "2026-10-19T17:00:00Z" : null, completed, elapsed_seconds: completed ? 120 : null });
const attempts = [makeAttempt(ids.progress, 90101, "2026-10-20T12:00:00Z"), makeAttempt(ids.other, 90104, "2026-10-20T11:00:00Z"), makeAttempt(ids.complete, 90103, "2026-10-19T16:00:00Z", true)];
const recaps = [1, 2].map((i) => ({ id: `00000000-0000-4000-8000-00000000020${i}`, student_id: user, attempt_id: ids.progress, recap_key: `p1-para${i}-recall`, passage_position: 1, kind: "recall", voice: "spoken", recording_state: "saved", object_path: `${user}/local-fixture-${i}.webm`, mime_type: "audio/webm", duration_ms: 5000 }));
const progress = [{ student_id: user, attempt_id: ids.complete, passage_id: 90103, passage_position: 1, active_ms: 120000, completed: true, completed_at: "2026-10-19T17:00:00Z" }];
const tables: Record<string, Row[]> = { rc_recall_attempts: attempts, rc_recall_recaps: recaps, rc_recall_passage_progress: progress, rc_recall_captures: [] };
const prefix = "rc-training:checkpoint:v1:";
const checkpoints = attempts.filter(a => !a.finished_at).map(a => ({ version: 1, captureWorkflow: true, studentId: user, attemptId: a.id, attempt: a, contentKey: `pt141-s4:${a.passage_ids.join(",")}:v2`, scope: "all_read", stepIndex: a.id === ids.progress ? 4 : 0, stepId: a.id === ids.progress ? "p1-para3-read" : "p1-para1-read", recaps: a.id === ids.progress ? recaps.map(r => ({ key: r.recap_key, voice: r.voice, state: r.recording_state, rowId: r.id, label: "Paragraph recall" })) : [], sectionMs: a.id === ids.progress ? 75000 : 0, passageMs: a.id === ids.progress ? 75000 : 0, passageTimesMs: [a.id === ids.progress ? 75000 : 0], completedPassagePositions: [], pendingPassageProgress: null, showElapsedTimer: true, savedAt: Date.now(), pending: null }));
// Reset this fixture's checkpoints only when initializing its isolated localhost origin.
for (const c of checkpoints) localStorage.setItem(`${prefix}${user}:${c.attemptId}`, JSON.stringify(c));
const requests: Array<{ method: string; path: string; body: unknown }> = [];
const observations = { micRequests: 0, runnerMounts: 0, resetRequestedAtScrollY: null as number | null };
// Transparent instrumentation delegates unchanged to the actual browser API.
// No permission, media stream, recording, or microphone response is fabricated.
if (navigator.mediaDevices?.getUserMedia) {
  const actualGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = (...args) => { observations.micRequests++; return actualGetUserMedia(...args); };
}
document.addEventListener("click", event => {
  const label = (event.target as Element).closest("button")?.textContent?.trim();
  if (label && /^(Reset passage|Reset section|Reset)$/.test(label)) observations.resetRequestedAtScrollY = window.scrollY;
}, true);
let runnerVisible = false;
new MutationObserver(() => {
  const visible = !!document.querySelector('[data-testid="rc-recall-runner"]');
  if (visible && !runnerVisible) observations.runnerMounts++;
  runnerVisible = visible;
}).observe(document.documentElement, { childList: true, subtree: true });
let failed = false;
const nativeFetch = window.fetch.bind(window);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const matches = (row: Row, url: URL) => [...url.searchParams].every(([key, value]) => {
  if (["select", "order", "limit", "offset"].includes(key)) return true;
  if (value.startsWith("eq.")) return String(row[key]) === value.slice(3);
  if (value.startsWith("neq.")) return String(row[key]) !== value.slice(4);
  if (value === "is.null") return row[key] == null;
  if (value.startsWith("in.(")) return value.slice(4, -1).split(",").includes(String(row[key]));
  return false;
});
window.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
  const request = new Request(url, init);
  if (url.pathname === "/data/rc/rc-index.json") return json({ preptests });
  const pt = /\/data\/rc\/RC-PT(\d+)\.json$/.exec(url.pathname);
  if (pt) return json(preptests.find(p => p.preptest === Number(pt[1])));
  if (url.origin === location.origin) return nativeFetch(input, init);
  const body = request.method === "GET" ? null : await request.clone().json().catch(() => null);
  requests.push({ method: request.method, path: `${url.pathname}${url.search}`, body });
  if (url.pathname.startsWith("/storage/v1/object/list/")) return json([]);
  if (!url.pathname.startsWith("/rest/v1/")) return json({ message: "Remote request denied by local fixture." }, 403);
  const table = url.pathname.split("/").pop()!;
  const rows = tables[table];
  if (!rows) return json({ message: "Unknown fixture table denied." }, 403);
  if (request.method === "POST") return json({ message: "Attempt creation is deliberately denied in reset verification." }, 403);
  let selected = rows.filter(r => matches(r, url));
  const order = url.searchParams.get("order") ?? "";
  if (order.includes("started_at")) selected = [...selected].sort((a,b) => b.started_at.localeCompare(a.started_at));
  const offset = Number(url.searchParams.get("offset") ?? 0), limit = Number(url.searchParams.get("limit") ?? selected.length);
  selected = selected.slice(offset, offset + limit);
  if (request.method === "PATCH") {
    await new Promise(resolve => setTimeout(resolve, 350));
    if (scenario === "error" && !failed) { failed = true; return json({ message: "Deliberate local reset failure" }, 503); }
    selected.forEach(r => Object.assign(r, body));
  }
  return json(request.headers.get("accept")?.includes("vnd.pgrst.object") ? selected[0] ?? null : selected);
};
const Page = lazy(() => import("../../src/features/reading-center/rc-recall/RcRecallPage"));
const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
Object.assign(window, { rcPickerVerification: { ids, tables, requests, checkpoints, scenario, observations } });
function Diagnostics() {
  const [, tick] = useState(0);
  useEffect(() => { const id = window.setInterval(() => tick(v => v + 1), 250); return () => clearInterval(id); }, []);
  const localKeys = Object.keys(localStorage).filter(key => key.startsWith(`${prefix}${user}:`)).map(key => key.split(":").pop());
  return <details data-testid="picker-verification-diagnostics" style={{ position: "fixed", zIndex: 1000, left: 6, bottom: 4, maxWidth: "calc(100vw - 12px)", maxHeight: "40vh", overflow: "auto", background: "#fff", color: "#172333", border: "1px solid #ddd", padding: 6, font: "10px monospace" }}><summary>Local verification diagnostics</summary><pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify({ scenario, ...observations, scrollY: window.scrollY, attemptCreates: requests.filter(r => r.method === "POST" && r.path.startsWith("/rest/v1/rc_recall_attempts")).length, posts: requests.filter(r => r.method === "POST").map(r => r.path), patches: requests.filter(r => r.method === "PATCH"), checkpointIds: localKeys, attempts: attempts.map(({ id, passage_ids, finished_at, completed }) => ({ id, passage_ids, finished_at, completed })), recapCount: recaps.length, completedPassageRows: progress.length }, null, 2)}</pre></details>;
}
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/reading-center/rc-recall"]}><aside style={{ font: "10px system-ui", color: "#7b8190", padding: "3px 8px" }}>LOCAL PICKER VERIFICATION · fixture identity, passages and backend · no production requests</aside><div id="reading-center-root" className="rc-root" data-rc-theme="light"><Suspense fallback={<p>Loading picker…</p>}><Page /></Suspense></div><Diagnostics /></MemoryRouter></QueryClientProvider>);
