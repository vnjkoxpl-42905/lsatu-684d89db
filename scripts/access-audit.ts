/**
 * Who has been assigned work they cannot open.
 *
 * Run with vite-node so `@/` resolves:
 *   npx vite-node scripts/access-audit.ts
 *
 * A missing feature flag does not look like a locked door from the student's
 * side. Classroom's feed drops rows the student cannot open, so the work is
 * simply not there, and the direct link answers "Not open yet. This part of the
 * classroom isn't in your plan right now."
 *
 * Ivory Johnson lost a day to that on 2026-09-08: three Read, Recall, Colour
 * sections assigned, `has_activity_access` off, one mail on the Monday saying
 * the portal was empty and another on the Tuesday with a screenshot of the
 * gate. Nothing in the product noticed, because nothing was looking.
 *
 * `scripts/assign.ts` now turns the flag on as it assigns, so this should stay
 * empty. It exists for the rows that predate that guard, and for the work that
 * arrives by other paths: the admin UI, a Lovable-side write, a hand-run SQL.
 * Read-only. It names what is wrong and never fixes it, because opening a
 * feature on a student's account is Joshua's call.
 */
import fs from "node:fs";
import path from "node:path";
import { supabase } from "@/integrations/supabase/client";

const env: Record<string, string> = {};
for (const f of [path.resolve("../../.env"), path.resolve(".env")]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0 && !line.startsWith("#")) {
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
}

await supabase.auth.signInWithPassword({
  email: env.LSATPREP_ADMIN_EMAIL,
  password: env.LSATPREP_ADMIN_PASSWORD,
});

/**
 * What an Activity needs before a student can reach it.
 *
 * Only Activities are checked here, because `activity_assignments` is the only
 * table this reads. Guided drills live in their own table behind
 * `has_drill_access` and are worth adding the day one goes missing the same
 * way; nothing is claimed about them today.
 */
const ACTIVITY_FLAG = "has_activity_access";

const { data: assignments, error: aErr } = await supabase
  .from("activity_assignments")
  .select("student_id,title,status,mode,created_at");
if (aErr) throw new Error(`could not read assignments: ${aErr.message}`);

const rows = (assignments ?? []) as Array<{
  student_id: string;
  title: string;
  status: string;
  mode: string | null;
  created_at: string;
}>;

const ids = [...new Set(rows.map((r) => r.student_id))].filter(Boolean);
const { data: profiles, error: pErr } = await supabase
  .from("profiles")
  .select("class_id,display_name,has_activity_access,has_drill_access")
  .in("class_id", ids);
if (pErr) throw new Error(`could not read profiles: ${pErr.message}`);

const byId = new Map(
  ((profiles ?? []) as Array<Record<string, unknown>>).map((p) => [p.class_id as string, p]),
);

let blocked = 0;
for (const id of ids) {
  const profile = byId.get(id);
  const mine = rows.filter((r) => r.student_id === id);
  const who = (profile?.display_name as string) ?? `(no profile for ${id.slice(0, 8)})`;

  if (!profile) {
    console.log(`MISSING PROFILE  ${who}  ${mine.length} assignment(s)`);
    blocked++;
    continue;
  }
  const flag = ACTIVITY_FLAG;
  if (profile[flag] === false) {
    blocked++;
    const open = mine.filter((r) => r.status !== "completed");
    console.log(
      `BLOCKED  ${who.padEnd(24)} ${flag}=false  ${mine.length} assigned, ${open.length} still open`,
    );
    for (const r of open.slice(0, 5)) {
      console.log(`         "${r.title}"  ${r.created_at?.slice(0, 10)}`);
    }
  }
}

console.log(
  blocked === 0
    ? `\nClean. ${ids.length} students with assigned work, all of them able to open it.`
    : `\n${blocked} of ${ids.length} students cannot open work that was assigned to them.`,
);
