/*
 * Record a break the app was not yet able to record.
 *
 *   npx vite-node scripts/rrc-mark-pause.ts -- --assignment <id> --from <order> --seconds <n>
 *   npx vite-node scripts/rrc-mark-pause.ts -- ... --apply     # writes; otherwise dry run
 *
 * Pausing a section shipped on 2026-09-09. Before it, a student who had to
 * stop had two options and both were bad: sit through the interruption on the
 * clock, or leave and lose the whole run. Yahunathan took the first on
 * 2026-09-08 -- 1h 31m parked on stimulus 18 of 22 -- and his Report Card then
 * reported 2h 12m as if it were drill time.
 *
 * The clock is the only thing wrong with that card. The grade underneath it is
 * sound: the transcript drifted three seconds across the whole file and every
 * word landed inside a window. So this corrects the clock and touches nothing
 * else.
 *
 * What it does NOT do, on purpose:
 *
 * - It does not touch `audio_segments` or `transcript_segments`. The recording
 *   still physically contains the break -- we did not cut the file -- so its
 *   index has to keep describing the file as it actually is. An index shifted
 *   to match a corrected clock would point every Clip at the wrong audio, which
 *   is the exact failure the pause feature was written to avoid.
 * - It does not invent the break's extent silently. Every row it writes carries
 *   `paused_reconstructed`, saying which part was measured and which part was
 *   inferred and how, so nobody later reads these numbers as something the app
 *   recorded.
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

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

async function main() {
  const env = { ...readEnv(path.resolve(REPO, "../../.env")), ...readEnv(path.join(REPO, ".env")) };
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: env.LSATPREP_ADMIN_EMAIL,
    password: env.LSATPREP_ADMIN_PASSWORD,
  });
  if (authErr) throw authErr;

  const assignmentId = arg("assignment");
  const from = Number(arg("from"));
  const pausedSeconds = Number(arg("seconds"));
  const note = arg("note") ?? "";
  const apply = process.argv.includes("--apply");
  if (!assignmentId || !Number.isFinite(from) || !Number.isFinite(pausedSeconds)) {
    throw new Error("need --assignment <id> --from <order> --seconds <n>");
  }

  const { data: rows, error: rErr } = await supabase
    .from("activity_item_responses")
    .select("id, item_order, attempt_no, rrc")
    .eq("assignment_id", assignmentId)
    .order("attempt_no")
    .order("item_order");
  if (rErr) throw rErr;
  if (!rows?.length) throw new Error("no response rows for that assignment");

  const attempt = Math.max(...rows.map((r) => r.attempt_no ?? 1));
  const mine = rows.filter((r) => (r.attempt_no ?? 1) === attempt);
  const rawTotal = Math.max(
    ...mine.map((r) => Number((r.rrc as Record<string, unknown>).finished_at_seconds ?? 0)),
  );
  const correctedTotal = rawTotal - pausedSeconds;
  if (correctedTotal <= 0) throw new Error("the break cannot be longer than the run");

  console.log(`attempt ${attempt}, ${mine.length} rows`);
  console.log(`  raw clock        ${rawTotal}s (${(rawTotal / 60).toFixed(1)}m)`);
  console.log(`  break            ${pausedSeconds}s (${(pausedSeconds / 60).toFixed(1)}m), from stimulus ${from}`);
  console.log(`  corrected clock  ${correctedTotal}s (${(correctedTotal / 60).toFixed(1)}m)`);
  console.log(`  ${apply ? "APPLYING" : "dry run — pass --apply to write"}\n`);

  for (const row of mine) {
    const rrc = { ...(row.rrc as Record<string, unknown>) };
    /*
     * The corrected clock goes on every row, because the grader reads it from
     * "whichever row carries it" and otherwise falls back to the last
     * stimulus's raw finishing time -- which is the number being corrected.
     */
    rrc.section_total_seconds = correctedTotal;
    // The break itself is cumulative, exactly as a real pause would have
    // written it: absent from the rows that finished before it started.
    if ((row.item_order ?? 0) >= from) {
      rrc.paused_seconds = pausedSeconds;
      rrc.pause_count = 1;
      rrc.paused_reconstructed = {
        why: "Pausing did not exist when this section was run.",
        measured: note || null,
        applied_at: new Date().toISOString(),
        raw_section_total_seconds: rawTotal,
      };
    }
    const marked = (row.item_order ?? 0) >= from ? "  ← break" : "";
    console.log(
      `  stimulus ${String(row.item_order).padStart(2)}  total=${correctedTotal}s  paused=${rrc.paused_seconds ?? 0}s${marked}`,
    );
    if (!apply) continue;
    /*
     * `.select()` is the point here, not decoration.
     *
     * `activity_item_responses` has an owner SELECT policy and an owner INSERT
     * policy and no UPDATE policy at all, so an admin's UPDATE is permitted as
     * a statement and then matches zero rows. PostgREST does not call that an
     * error -- an update that changed nothing did not fail -- so the first
     * version of this script reported all 22 rows written while the database
     * was untouched, and the regrade that followed read the old numbers back
     * and looked like the correction had simply not worked. Asking for the
     * changed rows turns that silence into a count.
     */
    const { data: written, error: uErr } = await supabase
      .from("activity_item_responses")
      .update({ rrc })
      .eq("id", row.id)
      .select("id");
    if (uErr) throw new Error(`row ${row.item_order}: ${uErr.message}`);
    if (!written?.length) {
      throw new Error(
        `row ${row.item_order}: the update matched no rows. This table has no UPDATE policy, so ` +
          `the correction needs the service role -- run the SQL this script prints, or set ` +
          `SUPABASE_SERVICE_ROLE_KEY.`,
      );
    }
  }

  /*
   * The same correction as SQL, because the admin account cannot write it.
   *
   * Printed on the dry run rather than kept in a doc: the numbers in it are
   * computed here, and a statement someone has to fill in by hand is a
   * statement someone will fill in wrongly.
   */
  const marker = JSON.stringify({
    why: "Pausing did not exist when this section was run.",
    measured: note || null,
    raw_section_total_seconds: rawTotal,
  }).replace(/'/g, "''");
  console.log(`
-- Paste into the Supabase SQL editor. Service role only: this table has an
-- owner SELECT policy, an owner INSERT policy, and no UPDATE policy, so the
-- admin account's update is accepted and silently matches nothing.
begin;

update public.activity_item_responses
   set rrc = rrc || jsonb_build_object('section_total_seconds', ${correctedTotal})
 where assignment_id = '${assignmentId}'
   and attempt_no = ${attempt};

update public.activity_item_responses
   set rrc = rrc || jsonb_build_object(
         'paused_seconds', ${pausedSeconds},
         'pause_count', 1,
         'paused_reconstructed', '${marker}'::jsonb)
 where assignment_id = '${assignmentId}'
   and attempt_no = ${attempt}
   and item_order >= ${from};

-- Expect ${mine.length} rows then ${mine.filter((r) => (r.item_order ?? 0) >= from).length} rows.
commit;
`);

  if (!apply) return;
  console.log("rows written and confirmed. Re-grade to rebuild the card.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
