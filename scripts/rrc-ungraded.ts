/*
 * Every finished Read, Recall, Colour section that has no complete Report Card.
 *
 *   npx vite-node scripts/rrc-ungraded.ts            # list
 *   npx vite-node scripts/rrc-ungraded.ts -- --grade # list, then re-ask the grader for each
 *
 * The sweeper (`sweep-rrc-grading`) is deliberately scheduled nowhere (ADR
 * 0021), and a run the grader REFUSES -- no recording, a clock it cannot
 * place, a transcription outage -- produces nothing anywhere that Joshua would
 * see. On 2026-09-08 a student sat on "still being marked" for three and a
 * half hours before she messaged. This is the list she was on.
 *
 * Since 2026-09-09 the student side is no longer a dead end: the marking screen
 * says how long it has been, carries a Check again that restarts the polling
 * and the ask, and offers Joshua when she can reach Messages; the section
 * library says how many minutes a finished run has been marking and stops
 * telling her to wait once waiting is the wrong advice. None of that grades
 * anything. Until the sweeper is scheduled, this script is still the only
 * thing that finds a refused run, so run it daily.
 *
 * Reads as the admin account. Run it from the repo root.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabase } from "@/integrations/supabase/client";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** Younger than this and the grader is probably still running. */
const SETTLE_MS = 10 * 60 * 1000;

function readEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

async function main() {
  const env = { ...readEnv(path.resolve(REPO, "../../.env")), ...readEnv(path.join(REPO, ".env")) };
  const grade = process.argv.includes("--grade");
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: env.LSATPREP_ADMIN_EMAIL,
    password: env.LSATPREP_ADMIN_PASSWORD,
  });
  if (authErr) throw authErr;

  const { data: runs, error } = await supabase
    .from("activity_assignments")
    .select("id, student_id, title, source_section, status, started_at, completed_at")
    .eq("mode", "section")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  const ids = (runs ?? []).map((r) => r.id);
  const { data: grades, error: gErr } = await supabase
    .from("activity_section_grades")
    .select("assignment_id, attempt_no, graded_at, section")
    .in("assignment_id", ids.length ? ids : ["-"]);
  if (gErr) throw gErr;
  const { data: rows, error: rErr } = await supabase
    .from("activity_item_responses")
    .select("assignment_id, attempt_no")
    .in("assignment_id", ids.length ? ids : ["-"]);
  if (rErr) throw rErr;

  const latestAttempt = new Map<string, number>();
  for (const r of rows ?? []) {
    latestAttempt.set(r.assignment_id, Math.max(latestAttempt.get(r.assignment_id) ?? 0, r.attempt_no ?? 1));
  }
  const gradeFor = new Map<string, { complete: unknown; graded_at: string }>();
  for (const g of grades ?? []) {
    gradeFor.set(`${g.assignment_id}:${g.attempt_no}`, {
      complete: (g.section as Record<string, unknown> | null)?.complete,
      graded_at: g.graded_at,
    });
  }

  // Names come from the admin roster, the same way `student-work.ts` gets them:
  // `profiles` is not keyed by the auth id and is not readable this way.
  const who = new Map<string, string>();
  const { data: users } = await supabase.functions.invoke("admin-manage-users", { method: "GET" });
  for (const u of (users ?? []) as { class_id: string; display_name: string | null; email: string | null }[]) {
    who.set(u.class_id, u.display_name || u.email || u.class_id);
  }

  const now = Date.now();
  const stuck: { id: string; student: string; section: string; finished: string; reason: string; age: string }[] = [];
  for (const r of runs ?? []) {
    const attempt = latestAttempt.get(r.id) ?? 1;
    const g = gradeFor.get(`${r.id}:${attempt}`);
    const finishedAt = r.completed_at ?? r.started_at;
    const ageMs = finishedAt ? now - new Date(finishedAt).getTime() : 0;
    if (ageMs < SETTLE_MS) continue;
    let reason: string | null = null;
    if (!g) reason = latestAttempt.has(r.id) ? "never graded" : "no rows at all";
    else if (g.complete === false) reason = "graded partial";
    if (!reason) continue;
    stuck.push({
      id: r.id,
      student: who.get(r.student_id) ?? r.student_id,
      section: r.source_section ?? r.title ?? "?",
      finished: finishedAt ? finishedAt.slice(0, 16).replace("T", " ") : "?",
      reason,
      age: `${Math.round(ageMs / 3_600_000)}h`,
    });
  }

  if (!stuck.length) {
    console.log(`Every finished section older than ${SETTLE_MS / 60_000} minutes has a complete Report Card (${runs?.length ?? 0} checked).`);
    return;
  }
  console.log(`READ, RECALL, COLOUR — ${stuck.length} finished run(s) with no complete Report Card\n`);
  for (const s of stuck) {
    console.log(`  ${s.finished}Z  ${s.age.padStart(5)}  ${s.student.padEnd(22)} ${s.section.padEnd(10)} ${s.reason.padEnd(14)} ${s.id}`);
  }

  if (!grade) {
    console.log("\nRe-ask the grader for each with:  npx vite-node scripts/rrc-ungraded.ts -- --grade");
    return;
  }
  for (const s of stuck) {
    if (s.reason === "no rows at all") continue;
    const t0 = Date.now();
    const { data, error: fnErr } = await supabase.functions.invoke("grade-rrc-section", {
      body: { assignmentId: s.id },
    });
    let body = "";
    const ctx = (fnErr as { context?: { text?: () => Promise<string> } } | null)?.context;
    if (ctx && typeof ctx.text === "function") body = (await ctx.text()).slice(0, 300);
    console.log(
      `\n  ${s.student} ${s.section}: ${Math.round((Date.now() - t0) / 1000)}s → ${
        fnErr ? `${fnErr.message} ${body}` : JSON.stringify(data).slice(0, 300)
      }`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
