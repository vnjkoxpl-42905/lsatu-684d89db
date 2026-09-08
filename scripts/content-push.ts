/**
 * Push authored Activity content from this repo into the database.
 *
 * Read, Recall, Colour's briefing is authored once, in
 * `src/features/activity-centre/content/read-recall-colour-section.instructions.json`.
 * Students never read that file. They read `activities.instructions`, or, once
 * the work is assigned, the per-student copy in
 * `activity_assignments.instructions`.
 *
 * Nothing connected the two. A test in this repo says the briefing is "copied in
 * by the seed builder"; no such builder was ever written, so every reworded
 * sentence needed a hand-authored migration, and in between the file and the
 * database simply disagreed. This is that builder.
 *
 *   npx vite-node scripts/content-push.ts              # show the diff, write nothing
 *   npx vite-node scripts/content-push.ts -- --apply   # file  -> database
 *   npx vite-node scripts/content-push.ts -- --pull    # database -> file
 *
 * Check the direction before you write. The database was edited directly for
 * months while this file stood still, so on first use the file is the stale
 * side and --pull is what you want. Push only once the file is the copy you
 * mean to keep.
 *
 * Completed assignments are never touched. A run that has been graded keeps the
 * words it was graded under; rewriting them would re-score finished work.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabase } from "@/integrations/supabase/client";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(
  REPO,
  "src/features/activity-centre/content/read-recall-colour-section.instructions.json",
);
/** Every Activity whose instructions are this one authored briefing. */
const SLUG_PREFIX = "read-recall-colour-";

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

const pull = process.argv.includes("--pull");
/**
 * Writing is opt in. The database has been edited directly for months while the
 * file stood still, so a push run by reflex would revert copy nobody backed up.
 * Look at the diff, then pass --apply.
 */
const apply = process.argv.includes("--apply");
const dryRun = !apply;

/** Key order differs between Postgres jsonb and the file, so compare sorted. */
function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as object).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

async function main() {
  const authored = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
  const want = stable(authored);

  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: env.LSATPREP_ADMIN_EMAIL,
    password: env.LSATPREP_ADMIN_PASSWORD,
  });
  if (authErr) {
    console.error(
      `content-push: sign-in failed - ${authErr.message}\n` +
        "  LSATPREP_ADMIN_EMAIL / LSATPREP_ADMIN_PASSWORD live in ~/ai-os/.env,\n" +
        "  never in this repo's .env, which is tracked in git.",
    );
    process.exit(1);
  }

  if (pull) {
    // Not the door. The library door row carries an older copy of this briefing
    // than the twelve sections do: it still says "say it back" and "The Read",
    // both of which CONTEXT.md retires in favour of "tell it back" and "The
    // Recall". Take the copy the most rows agree on, and say so when they do
    // not all agree, rather than trusting any one row's name.
    const { data: rows, error: rowErr } = await supabase
      .from("activities")
      .select("slug,instructions")
      .like("slug", `${SLUG_PREFIX}%`)
      .order("slug");
    if (rowErr) throw rowErr;
    if (!rows?.length) {
      console.error(`content-push: no ${SLUG_PREFIX}* rows to pull from.`);
      process.exit(1);
    }

    const groups = new Map<string, { slugs: string[]; value: unknown }>();
    for (const r of rows) {
      const k = stable(r.instructions);
      const g = groups.get(k) ?? { slugs: [], value: r.instructions };
      g.slugs.push(r.slug);
      groups.set(k, g);
    }
    const ranked = [...groups.values()].sort((a, b) => b.slugs.length - a.slugs.length);
    const winner = ranked[0];

    if (ranked.length > 1) {
      console.log(`The ${rows.length} rows carry ${ranked.length} different briefings:`);
      for (const g of ranked) {
        console.log(`  ${String(g.slugs.length).padStart(3)} rows  ${g.slugs.slice(0, 3).join(", ")}${g.slugs.length > 3 ? " ..." : ""}`);
      }
      console.log(`Taking the copy ${winner.slugs.length} of them agree on.
`);
    }

    if (stable(winner.value) === want) {
      console.log("Already in sync. Nothing to pull.");
      return;
    }
    if (!apply) {
      console.log(
        `${path.relative(REPO, SOURCE)} differs from the database.
` +
          "Re-run with --pull --apply to overwrite the file with the database copy.",
      );
      return;
    }
    fs.writeFileSync(SOURCE, `${JSON.stringify(winner.value, null, 2)}
`, "utf8");
    console.log(`Pulled into ${path.relative(REPO, SOURCE)}.`);
    console.log("Review the diff, run the tests, then commit it.");
    return;
  }

  console.log(`source: ${path.relative(REPO, SOURCE)}`);
  console.log(dryRun ? "mode:   diff only, nothing is written\n" : "mode:   writing to the database\n");

  // ---- the catalog ------------------------------------------------------
  const { data: activities, error } = await supabase
    .from("activities")
    .select("id,slug,instructions")
    .like("slug", `${SLUG_PREFIX}%`)
    .order("slug");
  if (error) throw error;

  const staleActivities = (activities ?? []).filter((a) => stable(a.instructions) !== want);
  console.log(`activities: ${activities?.length ?? 0} found, ${staleActivities.length} out of date`);
  for (const a of staleActivities) {
    console.log(`  ${dryRun ? "would update" : "update"}  ${a.slug}`);
    if (dryRun) continue;
    const { error: upErr } = await supabase
      .from("activities")
      .update({ instructions: authored })
      .eq("id", a.id);
    if (upErr) throw new Error(`${a.slug}: ${upErr.message}`);
  }

  // ---- issued snapshots -------------------------------------------------
  const ids = new Set((activities ?? []).map((a) => a.id));
  const { data: assignments, error: asgErr } = await supabase
    .from("activity_assignments")
    .select("id,title,status,activity_id,instructions")
    .in("activity_id", [...ids]);
  if (asgErr) throw asgErr;

  const open = (assignments ?? []).filter((a) => a.status !== "completed");
  const done = (assignments ?? []).length - open.length;
  const staleOpen = open.filter((a) => stable(a.instructions) !== want);

  console.log(
    `\nassignments: ${assignments?.length ?? 0} found, ${done} completed and left alone, ` +
      `${staleOpen.length} of ${open.length} open out of date`,
  );
  for (const a of staleOpen) {
    console.log(`  ${dryRun ? "would update" : "update"}  ${a.title}`);
    if (dryRun) continue;
    // The immutability trigger exempts admins, so this needs no DDL. A
    // migration has to disable the trigger only because it runs with no
    // auth.uid() and so fails the admin check.
    const { error: upErr } = await supabase
      .from("activity_assignments")
      .update({ instructions: authored })
      .eq("id", a.id);
    if (upErr) throw new Error(`${a.title}: ${upErr.message}`);
  }

  const total = staleActivities.length + staleOpen.length;
  console.log(
    total === 0
      ? "\nAlready in sync. Nothing to do."
      : dryRun
        ? `
${total} rows would change. Re-run with --apply to write them.
  Check the direction first: --pull takes the database copy into the file.`
        : `\n${total} rows updated.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
