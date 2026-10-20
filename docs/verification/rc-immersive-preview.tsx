/** DEV-ONLY verification: real runner and hardware microphone; in-memory backend. */
import React, { Suspense, lazy, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import "../../src/features/reading-center/reading-center.css";
import type { RcPassage } from "../../src/features/rc/lib/rcTypes";
import type { AttemptRow } from "../../src/features/reading-center/rc-recall/lib/attempts";
import type { Checkpoint } from "../../src/features/reading-center/rc-recall/lib/checkpoint";

if (!import.meta.env.DEV || !["localhost", "127.0.0.1"].includes(location.hostname)) throw new Error("Local development verification only.");

const query = new URLSearchParams(location.search);
const scenario = query.get("scenario") ?? "normal";
const studentId = "00000000-0000-4000-8000-000000000001";
const attemptId = crypto.randomUUID();
const first = "Millions of people worldwide play multiplayer online games. They each pick, say, a medieval character to play, such as a warrior. Then they might band together in quests to slay magical beasts; their avatars appear as tiny characters striding across a Tolkienesque land.";
const second = "These shared worlds have attracted the attention of researchers who study cooperation. Players must decide how to divide responsibilities, share resources, and respond when another member of the group fails to do what was promised.";
const texts = [first, second];
const longText = `${first} ${second} ${first} ${second} ${first}`;
const passages = Array.from({ length: query.has("multi") ? 2 : 1 }, (_, i) => ({ passageId: 900001 + i, preptest: 1, section: 3, setNumber: i + 1, title: null, topic: null, format: null, frameworks: [], difficulty: null, text: `${query.has("long") ? longText : texts[i]}\n\n${texts[1 - i]}`, summaries: {}, questions: [] } as RcPassage));
const segmented = passages.map(p => ({ comparative: false, paragraphs: p.text.split("\n\n").map((text, index) => ({ index, text, labels: [], sub: null })) }));
const attempt: AttemptRow = { id: attemptId, student_id: studentId, mode: "rc_recall", preptest: 1, section: 3, passage_ids: passages.map(p => p.passageId), confirmation_scope: "all_read", started_at: new Date().toISOString(), finished_at: null, elapsed_seconds: null, completed: false, segmentation_version: 2 };
type Row = Record<string, any>;
const tables: Record<string, Row[]> = { rc_recall_attempts: [attempt], rc_recall_captures: [], rc_recall_recaps: [], rc_recall_passage_progress: [] };
const recordings = new Map<string, Blob>();
const requests: string[] = [];
let uploadFailed = false;
let saveFailed = false;
let feedbackReads = 0;
const nativeFetch = window.fetch.bind(window);
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const matches = (row: Row, url: URL) => [...url.searchParams].every(([key, value]) => {
  if (["select", "order", "limit", "offset", "on_conflict"].includes(key)) return true;
  if (value.startsWith("eq.")) return String(row[key]) === value.slice(3);
  if (value.startsWith("neq.")) return String(row[key]) !== value.slice(4);
  if (value === "is.null") return row[key] == null;
  if (value.startsWith("in.(")) return value.slice(4, -1).split(",").includes(String(row[key]));
  return false;
});

// Install before dynamically importing the real runner/Supabase client. No remote request escapes.
window.fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url, location.href);
  if (url.origin === location.origin) return nativeFetch(input, init);
  requests.push(`${request.method} ${url.pathname}`);
  if (request.method !== "GET") await new Promise(resolve => window.setTimeout(resolve, Math.max(0, Number(query.get("latency") ?? 250))));
  const body = request.method === "GET" || request.method === "HEAD" ? null : await request.clone().text();
  const parsed = () => body ? JSON.parse(body) : {};
  if (url.pathname.includes("/rest/v1/rpc/save_rc_recall_passage_progress")) {
    const data = parsed();
    const row = { student_id: studentId, attempt_id: data.p_attempt_id, passage_id: data.p_passage_id, passage_position: data.p_passage_position, active_ms: data.p_active_ms, completed: data.p_completed, completed_at: data.p_completed ? new Date().toISOString() : null };
    const previous = tables.rc_recall_passage_progress.find(r => r.passage_position === row.passage_position);
    if (previous) Object.assign(previous, row); else tables.rc_recall_passage_progress.push(row);
    return json([previous ?? row]);
  }
  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.split("/").pop()!;
    const rows = tables[table];
    if (!rows) return json({ message: "Verification denied unexpected table", code: "42501" }, 403);
    if (request.method === "POST") {
      const data = parsed();
      const inserted = (Array.isArray(data) ? data : [data]).map(row => ({ object_path: null, duration_ms: null, ...row }));
      rows.push(...inserted);
      return json(request.headers.get("accept")?.includes("vnd.pgrst.object") ? inserted[0] : inserted, 201);
    }
    let selected = rows.filter(row => matches(row, url));
    if (request.method === "PATCH") {
      if (scenario === "save-failure" && table === "rc_recall_attempts" && !saveFailed) { saveFailed = true; return json({ message: "Deliberate local save failure" }, 503); }
      selected.forEach(row => Object.assign(row, parsed()));
      if (table === "rc_recall_captures") selected.forEach(capture => tables.rc_recall_recaps.filter(r => r.capture_id === capture.id).forEach(r => Object.assign(r, { recording_state: capture.recording_state })));
    }
    return json(request.headers.get("accept")?.includes("vnd.pgrst.object") ? selected[0] ?? null : selected);
  }
  if (url.pathname.startsWith("/storage/v1/object/list/")) {
    const { prefix = "", search = "" } = parsed();
    return json([...recordings].filter(([path]) => path.startsWith(`${prefix}/`) && path.split("/").pop()!.includes(search)).map(([path, blob]) => ({ id: path, name: path.split("/").pop(), metadata: { size: blob.size } })));
  }
  if (url.pathname.startsWith("/storage/v1/object/sign/")) {
    return json({ message: "Remote signed playback is intentionally unavailable in local verification. Recorded blobs remain in rcVerification.recordings." }, 403);
  }
  if (url.pathname.startsWith("/storage/v1/object/rc-recall-recordings/")) {
    if (scenario === "upload-failure" && !uploadFailed) { uploadFailed = true; return json({ message: "Deliberate local upload failure" }, 503); }
    const path = decodeURIComponent(url.pathname.split("/rc-recall-recordings/")[1]);
    recordings.set(path, await request.blob());
    return json({ Key: `rc-recall-recordings/${path}` });
  }
  if (url.pathname === "/functions/v1/rc-recall-grade") {
    const data = parsed();
    feedbackReads++;
    const status = scenario === "processing" && feedbackReads < 4 ? "processing" : "ready";
    return json({ attemptId: data.attemptId, items: tables.rc_recall_recaps.map((r, i) => ({ recapId: r.id, label: `Paragraph ${i + 1}`, status, ...(status === "ready" ? { grade: { version: 2, transcript: "Local fixture feedback, not a transcription of your microphone.", sourceText: texts[i % 2], sourceHash: "fixture", audioHash: "fixture", model: "LOCAL FIXTURE", asrEngine: "LOCAL FIXTURE", assessment: { summary: "Verification fixture: feedback presentation only.", details: [], relationships: [], nextStep: "Check the relationships between the ideas.", coverage: { earned: 3, possible: 4, percent: 75, label: "Fixture" } } } } : {}) })) });
  }
  return json({ message: "Local verification blocked this remote request." }, 403);
};

// Debug readback contains local fixture rows only, never application credentials.
Object.assign(window, { rcVerification: { tables, recordings, requests, scenario } });
const Runner = lazy(() => import("../../src/features/reading-center/rc-recall/ContinuousRcRecallRunner"));
const resume: Checkpoint | null = scenario === "resume" ? { version: 1, captureWorkflow: true, studentId, attemptId, attempt, contentKey: "local-verification", scope: "all_read", stepIndex: 2, stepId: "p1-para2-read", recaps: [{ key: "p1-para1-recall", voice: "spoken", state: "saved", rowId: crypto.randomUUID(), label: "Paragraph 1" }], sectionMs: 75000, passageMs: 75000, passageTimesMs: [75000], completedPassagePositions: [], pendingPassageProgress: null, showElapsedTimer: true, savedAt: Date.now(), pending: null } : null;

function Preview() {
  const [exited, setExited] = useState(false);
  return <><aside style={{ position: "fixed", bottom: 2, left: 8, zIndex: 100, font: "10px system-ui", color: "#7b8190", pointerEvents: "none" }}>LOCAL VERIFICATION · in-memory saves and fixture feedback · actual microphone</aside><div id="reading-center-root" className="rc-root" data-rc-theme="light"><Suspense fallback={<p>Loading exercise…</p>}>{exited ? <main style={{ padding: 48 }}><h1>Exercise left</h1><p>Only local verification data was saved.</p></main> : <Runner mode="rc_recall" scope="all_read" passages={passages} segmented={segmented} attempt={attempt} studentId={studentId} onExit={() => setExited(true)} resume={resume} contentKey="local-verification" />}</Suspense></div></>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
