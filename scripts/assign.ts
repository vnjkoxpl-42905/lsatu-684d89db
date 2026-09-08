/**
 * Headless assign: put an Activity, a guided drill, or a plain message into a
 * student's LSAT U account from the command line.
 *
 * Run with vite-node so `@/` resolves and this calls the app's OWN assignWork()
 * rather than a second implementation of it. That matters: assigning touches
 * seven tables (assignment snapshot, classroom item, conversation, message,
 * notification, plus the email edge function) and rolls back on failure. A
 * reimplementation would drift from the UI the first time the app changed.
 *
 *   npx vite-node scripts/assign.ts -- --student "Celia" --activity "Read, Recall, Colour"
 *   npx vite-node scripts/assign.ts -- --student "Celia" --drill "main-conclusion-1"
 *   npx vite-node scripts/assign.ts -- --student "Celia" --message "Start with PT105.S2."
 *   npx vite-node scripts/assign.ts -- --student "Celia" --activity "..." --dry-run
 *
 * Credentials are read from ~/ai-os/.env (git-ignored), never from this repo's
 * .env, which IS tracked in git. Same convention as scripts/db-pull.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabase } from "@/integrations/supabase/client";
import { assignWork } from "@/lib/assignWork";

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

// ---------------------------------------------------------------- arguments

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

const studentQuery = arg("student");
const activityQuery = arg("activity");
const drillQuery = arg("drill");
const messageText = arg("message");
const scheduleFor = arg("schedule");
const dryRun = has("dry-run");

if (!studentQuery || (!activityQuery && !drillQuery && !messageText)) {
  console.error(
    "usage: vite-node scripts/assign.ts -- --student <name|email> \\\n" +
      "         (--activity <title> | --drill <slug|title> | --message <text>)\\\n" +
      "         [--schedule YYYY-MM-DD] [--dry-run]",
  );
  process.exit(2);
}
if (scheduleFor && !/^\d{4}-\d{2}-\d{2}$/.test(scheduleFor)) {
  console.error(`--schedule must be YYYY-MM-DD, got "${scheduleFor}"`);
  process.exit(2);
}

// --------------------------------------------------------------- signing in

/**
 * Sign in as Joshua. The service_role key would bypass RLS entirely, so it is
 * only honoured when explicitly present; the default is a normal admin login,
 * which exercises the same permission path the UI does. A script that quietly
 * ran as service_role would hide an RLS regression instead of hitting it.
 */
async function signIn(): Promise<string> {
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "! SUPABASE_SERVICE_ROLE_KEY is set but this script signs in as the admin user.\n" +
        "  Using it would require injecting a second client into assignWork, which would\n" +
        "  bypass RLS for every write. Falling back to the admin login.",
    );
  }
  const email = env.LSATPREP_ADMIN_EMAIL;
  const password = env.LSATPREP_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error(
      "assign: LSATPREP_ADMIN_EMAIL / LSATPREP_ADMIN_PASSWORD are not set.\n" +
        "  Add them to ~/ai-os/.env (git-ignored). This repo's .env is TRACKED in git,\n" +
        "  so a credential placed there would be committed.",
    );
    process.exit(2);
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    console.error(`assign: sign-in failed — ${error?.message ?? "no user returned"}`);
    process.exit(1);
  }
  return data.user.id;
}

// -------------------------------------------------------------- resolution

interface StudentRow {
  class_id: string;
  display_name: string | null;
  email: string | null;
  [k: string]: unknown;
}

/**
 * Students come from the admin-manage-users edge function, which cross-joins
 * profiles with auth.users for the email. `class_id` is the canonical student
 * identifier everywhere in this codebase.
 */
async function listStudents(): Promise<StudentRow[]> {
  const { data, error } = await supabase.functions.invoke("admin-manage-users", {
    method: "GET",
  });
  if (error) throw new Error(`admin-manage-users failed: ${error.message}`);
  const rows = (data ?? []) as StudentRow[];
  if (!Array.isArray(rows)) throw new Error("admin-manage-users returned no user list");
  return rows;
}

/**
 * Resolve a name or email to exactly one student. Ambiguity is fatal rather
 * than resolved by picking the first: sending a student's homework to the wrong
 * account is silent — she simply never sees it, and he never learns why.
 */
function resolveStudent(rows: StudentRow[], query: string): StudentRow {
  const q = query.trim().toLowerCase();
  const exact = rows.filter(
    (r) => r.email?.toLowerCase() === q || r.display_name?.toLowerCase() === q,
  );
  const pool = exact.length ? exact : rows.filter(
    (r) =>
      r.display_name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q),
  );

  if (pool.length === 0) {
    console.error(`assign: no student matches "${query}".`);
    console.error("Known:", rows.map((r) => r.display_name ?? r.email).join(" · "));
    process.exit(1);
  }
  if (pool.length > 1) {
    console.error(`assign: "${query}" is ambiguous — ${pool.length} accounts match:`);
    for (const r of pool) console.error(`  - ${r.display_name ?? "(no name)"}  <${r.email ?? "?"}>`);
    console.error("Narrow it with the full name or the email address.");
    process.exit(1);
  }
  return pool[0];
}

async function resolveActivity(query: string) {
  const q = query.trim();
  const bySlug = await supabase.from("activities").select("id,title,slug,mode").eq("slug", q).maybeSingle();
  if (bySlug.data) return bySlug.data;

  const { data, error } = await supabase
    .from("activities")
    .select("id,title,slug,mode")
    .ilike("title", `%${q}%`);
  if (error) throw error;
  const rows = data ?? [];

  // "Read, Recall, Colour" matches the door and all 12 sections. Prefer the
  // exact title, which is the door — the surface that lets her pick a section.
  const exact = rows.filter((r) => r.title.toLowerCase() === q.toLowerCase());
  const pool = exact.length ? exact : rows;

  if (pool.length === 0) {
    console.error(`assign: no Activity matches "${query}".`);
    process.exit(1);
  }
  if (pool.length > 1) {
    console.error(`assign: "${query}" matches ${pool.length} Activities:`);
    for (const r of pool) console.error(`  - ${r.title}  (${r.slug})`);
    process.exit(1);
  }
  return pool[0];
}

async function resolveDrill(query: string) {
  const q = query.trim();
  const bySlug = await supabase.from("guided_drills").select("id,title,slug").eq("slug", q).maybeSingle();
  if (bySlug.data) return bySlug.data;

  const { data, error } = await supabase
    .from("guided_drills")
    .select("id,title,slug")
    .ilike("title", `%${q}%`);
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) {
    console.error(`assign: no guided drill matches "${query}".`);
    process.exit(1);
  }
  if (rows.length > 1) {
    console.error(`assign: "${query}" matches ${rows.length} drills:`);
    for (const r of rows) console.error(`  - ${r.title}  (${r.slug})`);
    process.exit(1);
  }
  return rows[0];
}

// ---------------------------------------------------------------- messaging

/** Mirrors findOrCreateThread in src/lib/classroomNotify.ts, which is private. */
async function findOrCreateThread(adminUserId: string, studentId: string): Promise<string> {
  const { data: mine } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", adminUserId);
  const { data: theirs } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", studentId);

  const ids = new Set((mine ?? []).map((r) => r.conversation_id));
  const shared = (theirs ?? []).find((r) => ids.has(r.conversation_id));
  if (shared) return shared.conversation_id as string;

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();
  if (error || !conv) throw error ?? new Error("could not create conversation");

  const { error: pErr } = await supabase.from("conversation_participants").insert([
    { conversation_id: conv.id, user_id: adminUserId },
    { conversation_id: conv.id, user_id: studentId },
  ]);
  if (pErr) throw pErr;
  return conv.id as string;
}

// --------------------------------------------------------------------- main

// ------------------------------------------------------------ access

/**
 * The flag that has to be on for a student to open what she was just assigned.
 *
 * Every route into this work sits behind a `ProtectedRoute`, and Classroom's
 * own feed drops rows a student cannot open, so a missing flag does not read as
 * a locked door: the work is simply invisible, and the link Joshua sends says
 * "Not open yet".
 *
 * That happened. Ivory Johnson was assigned three Read, Recall, Colour sections
 * on 2026-09-08 with `has_activity_access` off. He mailed Joshua on the Monday
 * to say the portal was empty, tried the link on the Tuesday, was told it was
 * not in his plan, and lost a day of study to a boolean. Nothing in the assign
 * path had any opinion about whether he could reach what it was writing.
 *
 * Assigning work he cannot open is never what Joshua means, so this grants the
 * one flag the assigned work needs. It never grants anything else and it never
 * revokes: the rest of the feature set stays exactly where he set it.
 */
const ACCESS_FLAG = {
  activity: "has_activity_access",
  guided_drill: "has_drill_access",
} as const;

async function ensureCanOpen(classId: string, kind: keyof typeof ACCESS_FLAG, who: string) {
  const flag = ACCESS_FLAG[kind];
  const { data, error } = await supabase
    .from("profiles")
    .select(flag)
    .eq("class_id", classId)
    .single();
  if (error) {
    console.warn(`! Could not check ${flag} for ${who}: ${error.message}`);
    console.warn("  The work is assigned. Confirm they can open it before telling them it is there.");
    return;
  }
  if ((data as Record<string, boolean>)?.[flag]) return;

  const { error: upErr } = await supabase
    .from("profiles")
    .update({ [flag]: true })
    .eq("class_id", classId);
  if (upErr) {
    console.error(`! ${who} does not have ${flag} and it could not be turned on: ${upErr.message}`);
    console.error("  They will see \"Not open yet\". Turn it on in Admin before telling them.");
    return;
  }
  console.log(`  ${flag} was off for ${who}. Turned it on, or they could not have opened this.`);
}

async function main() {
  const teacherId = await signIn();
  const student = resolveStudent(await listStudents(), studentQuery!);
  const who = `${student.display_name ?? "(no name)"} <${student.email ?? "?"}>`;

  if (messageText) {
    console.log(`Message → ${who}\n  "${messageText}"`);
    if (dryRun) return console.log("\n(dry run — nothing sent)");
    const conversationId = await findOrCreateThread(teacherId, student.class_id);
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: teacherId, body: messageText });
    if (error) throw error;
    return console.log("Sent.");
  }

  const item = activityQuery
    ? { kind: "activity" as const, activityId: (await resolveActivity(activityQuery)).id }
    : { kind: "guided_drill" as const, drillId: (await resolveDrill(drillQuery!)).id };

  const label = activityQuery
    ? (await resolveActivity(activityQuery)).title
    : (await resolveDrill(drillQuery!)).title;

  console.log(`Assign "${label}" → ${who}${scheduleFor ? `  (unlocks ${scheduleFor})` : ""}`);
  if (dryRun) return console.log("\n(dry run — nothing written)");

  const { ok, failed } = await assignWork({
    teacherId,
    studentIds: [student.class_id],
    item,
    scheduledForLocalDate: scheduleFor,
  });

  if (failed.length) {
    console.error(`FAILED: ${failed[0].error}`);
    process.exit(1);
  }
  const r = ok[0];
  const n = r.notify;
  // After the write, not before: a student who is never assigned anything has
  // no business having a feature opened for them.
  await ensureCanOpen(student.class_id, item.kind, who);
  console.log(
    `Assigned. id=${r.assignmentId}\n` +
      `  inbox ${n?.inbox_ok ? "ok" : "FAILED"} · bell ${n?.bell_ok ? "ok" : "FAILED"} · email ${n?.email_ok ? "ok" : "FAILED"}`,
  );
  if (n && !(n.inbox_ok && n.bell_ok && n.email_ok)) {
    console.warn("! The work IS assigned and visible; only a notification channel failed.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
