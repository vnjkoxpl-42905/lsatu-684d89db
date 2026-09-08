/**
 * What has a student actually done on LSAT U.
 *
 * The read half of the assign loop: `scripts/assign.ts` puts work into an
 * account, this reports back what came of it. Signs in as the admin and reads
 * under normal admin RLS — the same visibility the Teacher Desk has.
 *
 *   npx vite-node scripts/student-work.ts -- --student "Celia"
 *   npx vite-node scripts/student-work.ts -- --student "Steven Morris" --days 30
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabase } from "@/integrations/supabase/client";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
const env = {
  ...readEnv(path.resolve(REPO, "../../.env")),
  ...readEnv(path.join(REPO, ".env")),
};

function arg(n: string) {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const query = arg("student");
const days = Number(arg("days") ?? 30);
if (!query) {
  console.error('usage: vite-node scripts/student-work.ts -- --student <name|email> [--days 30]');
  process.exit(2);
}

const since = new Date(Date.now() - days * 86400_000).toISOString();
const d = (s: string | null) => (s ? s.slice(0, 10) : "—");

async function main() {
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: env.LSATPREP_ADMIN_EMAIL,
    password: env.LSATPREP_ADMIN_PASSWORD,
  });
  if (authErr) {
    console.error(`sign-in failed: ${authErr.message}`);
    process.exit(1);
  }

  const { data: users, error } = await supabase.functions.invoke("admin-manage-users", {
    method: "GET",
  });
  if (error) throw new Error(`admin-manage-users failed: ${error.message}`);

  const q = query!.trim().toLowerCase();
  const rows = (users ?? []) as { class_id: string; display_name: string | null; email: string | null }[];
  const exact = rows.filter((r) => r.email?.toLowerCase() === q || r.display_name?.toLowerCase() === q);
  const pool = exact.length
    ? exact
    : rows.filter((r) => r.display_name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q));

  if (pool.length !== 1) {
    console.error(pool.length ? `"${query}" is ambiguous:` : `no student matches "${query}".`);
    for (const r of pool) console.error(`  - ${r.display_name ?? "(no name)"} <${r.email ?? "?"}>`);
    process.exit(1);
  }
  const s = pool[0];
  const id = s.class_id;

  console.log(`\n${s.display_name ?? "(no name)"}  <${s.email ?? "?"}>`);
  console.log(`last ${days} days\n${"─".repeat(60)}`);

  // Activities
  const { data: acts } = await supabase
    .from("activity_assignments")
    .select("id,title,status,mode,created_at")
    .eq("student_id", id)
    .order("created_at", { ascending: false });
  console.log(`\nACTIVITIES (${acts?.length ?? 0})`);
  for (const a of acts ?? []) {
    console.log(`  ${d(a.created_at)}  ${String(a.status).padEnd(12)} ${a.title}`);
  }

  // Read, Recall, Colour grades
  // There is no carried_pct column: the coverage figure lives inside the
  // `section` JSON as mean_coverage. Naming a column that does not exist makes
  // PostgREST answer 400, which this client surfaces as data: null, which read
  // for a week as "she has no graded runs". Hence the explicit error print.
  const { data: grades, error: gradeErr } = await supabase
    .from("activity_section_grades")
    .select("source_section,attempt_no,section,graded_at,created_at")
    .eq("student_id", id)
    .order("created_at", { ascending: false });
  if (gradeErr) console.log(`\nREAD, RECALL, COLOUR — could not read grades: ${gradeErr.message}`);
  if (grades?.length) {
    console.log(`\nREAD, RECALL, COLOUR — graded runs (${grades.length})`);
    for (const g of grades) {
      const s = (g.section ?? {}) as Record<string, unknown>;
      const cov = s.mean_coverage;
      const pct = cov == null ? "  —" : `${String(Math.round(Number(cov))).padStart(3)}%`;
      const done = s.complete === false ? "  (partial)" : "";
      const mins = s.total_seconds == null ? "" : `  ${Math.round(Number(s.total_seconds) / 60)} min`;
      console.log(`  ${d(g.graded_at ?? g.created_at)}  ${pct} coverage   ${g.source_section ?? "?"}  attempt ${g.attempt_no ?? "?"}${mins}${done}`);
    }
  }

  // Guided drills
  // The title is not on the assignment row — it lives on guided_drills, and the
  // date column is assigned_at, not created_at. Reading the wrong names here
  // returns a silent zero, which reads as "she has been given nothing".
  const { data: drills, error: drillErr } = await supabase
    .from("guided_drill_assignments")
    .select("status,assigned_at,completed_at,guided_drills(title)")
    .eq("student_id", id)
    .order("assigned_at", { ascending: false })
    .limit(15);
  if (drillErr) {
    console.log(`\nGUIDED DRILLS — could not read: ${drillErr.message}`);
  } else {
    console.log(`\nGUIDED DRILLS (${drills?.length ?? 0} most recent)`);
    for (const g of drills ?? []) {
      const title = (g as { guided_drills?: { title?: string } }).guided_drills?.title ?? "(untitled)";
      console.log(`  ${d(g.assigned_at)}  ${String(g.status).padEnd(12)} ${title}`);
    }
  }

  // Question-bank work
  const { count: attempts } = await supabase
    .from("attempts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", id)
    .gte("created_at", since);
  const { count: correct } = await supabase
    .from("attempts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", id)
    .eq("is_correct", true)
    .gte("created_at", since);
  const pct = attempts ? Math.round((100 * (correct ?? 0)) / attempts) : null;
  console.log(
    `\nQUESTIONS (last ${days}d): ${attempts ?? 0} attempted` +
      (pct === null ? "" : `, ${correct} correct — ${pct}%`),
  );

  // Latest messages both ways
  const { data: convs } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", id);
  const cids = (convs ?? []).map((c) => c.conversation_id);
  if (cids.length) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("body,sender_id,created_at")
      .in("conversation_id", cids)
      .order("created_at", { ascending: false })
      .limit(4);
    if (msgs?.length) {
      console.log(`\nLAST MESSAGES`);
      for (const m of msgs.reverse()) {
        const who = m.sender_id === id ? "her" : "you";
        const line = String(m.body).replace(/\s+/g, " ").slice(0, 70);
        console.log(`  ${d(m.created_at)}  ${who.padEnd(4)} ${line}`);
      }
    }
  }
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
