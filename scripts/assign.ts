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
 *   npx vite-node scripts/assign.ts -- --student "Celia" --section PT156.S2 --due 2026-09-13
 *   npx vite-node scripts/assign.ts -- --student "Celia" --set "PT156.S2 (LR)"
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
import { BOOTCAMPS } from "@/lib/bootcamps";
import { updateClassroomItem } from "@/lib/classroomItems";

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
const sectionQuery = arg("section");
const setQuery = arg("set");
const bootcampQuery = arg("bootcamp");
const scheduleFor = arg("schedule");
const dueOn = arg("due");
const dryRun = has("dry-run");

const kinds = [activityQuery, drillQuery, messageText, sectionQuery, setQuery, bootcampQuery].filter(Boolean).length;
if (!studentQuery || kinds !== 1) {
  console.error(
    "usage: vite-node scripts/assign.ts -- --student <name|email> \\\n" +
      "         (--activity <title> | --drill <slug|title> | --message <text>\\\n" +
      "          | --section PT<n>.S<n> | --set <title|id> | --bootcamp <id|title>)\\\n" +
      "         [--schedule YYYY-MM-DD] [--due YYYY-MM-DD] [--dry-run]",
  );
  process.exit(2);
}
for (const [flag, v] of [["schedule", scheduleFor], ["due", dueOn]] as const) {
  if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    console.error(`--${flag} must be YYYY-MM-DD, got "${v}"`);
    process.exit(2);
  }
}
if (dueOn && scheduleFor && dueOn < scheduleFor) {
  console.error(`--due ${dueOn} is before --schedule ${scheduleFor}; she could never do it in time.`);
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

// ------------------------------------------------------- PT sections / sets

/**
 * A timed PT section is a homework set whose qids are exactly one section of
 * one PrepTest. `drillRunSpec.singleSectionOf()` notices that shape and runs
 * it as a real 35-minute `full-section` instead of an untimed drill, so the
 * qids have to come from the section file itself, in order, with nothing
 * else mixed in. The file under public/data is the same one the section
 * runner loads, so the set can never name a question the runner lacks.
 */
const SECTION_PATTERN = /^PT\s*(\d+)[.\-\s]*S(?:ection)?\s*(\d+)$/i;

function sectionTitle(pt: number, section: number) {
  return `PT${pt}.S${section} (LR)`;
}

function readSectionQids(query: string): { pt: number; section: number; qids: string[] } {
  const m = SECTION_PATTERN.exec(query.trim());
  if (!m) {
    console.error(`assign: --section wants PT<n>.S<n> (e.g. PT156.S2), got "${query}".`);
    process.exit(2);
  }
  const pt = Number(m[1]);
  const section = Number(m[2]);
  const dataDir = path.join(REPO, "public", "data");
  const file = path.join(dataDir, `PT${pt}-S${section}-LR.json`);
  if (!fs.existsSync(file)) {
    const have = fs
      .readdirSync(dataDir)
      .filter((f) => f.startsWith(`PT${pt}-`) && f.endsWith("-LR.json"))
      .map((f) => f.replace(/-LR\.json$/, "").replace("-", "."));
    console.error(
      `assign: no LR section file for PT${pt}.S${section}.` +
        (have.length ? ` PT${pt} has: ${have.join(", ")}.` : ` Nothing for PT${pt} is loaded.`),
    );
    process.exit(1);
  }
  const rows = JSON.parse(fs.readFileSync(file, "utf8")) as Array<{
    practiceTest: string;
    sectionNumber: number;
    questionNumber: number;
  }>;
  const qids = rows
    .filter((r) => r.practiceTest === `PT${pt}` && r.sectionNumber === section)
    .sort((a, b) => a.questionNumber - b.questionNumber)
    .map((r) => `PT${pt}-S${section}-Q${r.questionNumber}`);
  if (qids.length < 20) {
    console.error(`assign: ${file} holds ${qids.length} questions; a full LR section has 24-26.`);
    process.exit(1);
  }
  return { pt, section, qids };
}

/**
 * One set per section, reused. Two sets with the same title would make the
 * teacher UI show duplicates and the unique index on (student, set) useless.
 */
async function findOrCreateSectionSet(teacherId: string, query: string, write: boolean) {
  const { pt, section, qids } = readSectionQids(query);
  const title = sectionTitle(pt, section);
  const { data: existing, error } = await supabase
    .from("homework_sets")
    .select("id,title,question_qids,estimated_minutes")
    .eq("title", title)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const match = (existing ?? []).find(
    (s) => JSON.stringify(s.question_qids ?? []) === JSON.stringify(qids),
  );
  if (match) {
    // The classroom card reads this; without it she is told "about 50
    // minutes" for a 35-minute section.
    if (match.estimated_minutes !== 35 && write) {
      await supabase.from("homework_sets").update({ estimated_minutes: 35 }).eq("id", match.id);
    }
    return { id: match.id, title: match.title, created: false, count: qids.length };
  }
  if (existing?.length) {
    console.error(
      `assign: a set titled "${title}" exists but its questions differ from PT${pt}-S${section}-LR.json.` +
        " Fix the set in Teacher > Homework before assigning.",
    );
    process.exit(1);
  }
  if (!write) return { id: "(new)", title, created: true, count: qids.length };
  const { data, error: insErr } = await supabase
    .from("homework_sets")
    .insert({
      title,
      description: `PrepTest ${pt}, Section ${section} - Logical Reasoning. Standard time.`,
      question_qids: qids,
      created_by: teacherId,
      class_id: teacherId,
      estimated_minutes: 35,
    })
    .select("id,title")
    .single();
  if (insErr) throw insErr;
  return { id: data.id, title: data.title, created: true, count: qids.length };
}

async function resolveSet(query: string) {
  const q = query.trim();
  if (/^[0-9a-f-]{36}$/i.test(q)) {
    const { data } = await supabase.from("homework_sets").select("id,title").eq("id", q).maybeSingle();
    if (data) return data;
  }
  const { data, error } = await supabase.from("homework_sets").select("id,title").ilike("title", `%${q}%`);
  if (error) throw error;
  const rows = data ?? [];
  const exact = rows.filter((r) => r.title.toLowerCase() === q.toLowerCase());
  const pool = exact.length ? exact : rows;
  if (pool.length === 0) {
    console.error(`assign: no homework set matches "${query}".`);
    process.exit(1);
  }
  if (pool.length > 1) {
    console.error(`assign: "${query}" matches ${pool.length} sets:`);
    for (const r of pool) console.error(`  - ${r.title}  (${r.id})`);
    process.exit(1);
  }
  return pool[0];
}

/** Due at the end of that calendar day, local time: "due Saturday" means all of Saturday. */
function dueAtEndOfDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59).toISOString();
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
const ACCESS_FLAGS = {
  activity: ["has_activity_access"],
  guided_drill: ["has_drill_access"],
  // A homework set is opened from /classroom/:id and run at /drill.
  homework_set: ["has_classroom_access", "has_drill_access"],
  // Bootcamps and Quick Drills open behind the Activities/Drill doors.
  bootcamp: ["has_activity_access"],
} as const;

async function ensureCanOpen(classId: string, kind: keyof typeof ACCESS_FLAGS, who: string) {
  for (const flag of ACCESS_FLAGS[kind]) await ensureFlag(classId, flag, who);
}

async function ensureFlag(classId: string, flag: string, who: string) {
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

  let item: Parameters<typeof assignWork>[0]["item"];
  let label: string;
  let note = "";
  if (activityQuery) {
    const a = await resolveActivity(activityQuery);
    item = { kind: "activity", activityId: a.id };
    label = a.title;
  } else if (drillQuery) {
    const d = await resolveDrill(drillQuery);
    item = { kind: "guided_drill", drillId: d.id };
    label = d.title;
  } else if (sectionQuery) {
    const s = await findOrCreateSectionSet(teacherId, sectionQuery, !dryRun);
    item = { kind: "homework_set", setId: s.id };
    label = s.title;
    note = `  ${s.count} questions, timed 35:00 · set ${s.created ? "created" : "reused"} (${s.id})`;
  } else if (bootcampQuery) {
    const q = bootcampQuery.trim().toLowerCase();
    const b = BOOTCAMPS.find((x) => x.id === q || x.title.toLowerCase() === q);
    if (!b) {
      console.error(`assign: no bootcamp matches "${bootcampQuery}". Known: ${BOOTCAMPS.map((x) => x.id).join(", ")}`);
      process.exit(1);
    }
    item = { kind: "bootcamp", topicId: b.id };
    label = b.title;
  } else {
    const s = await resolveSet(setQuery!);
    item = { kind: "homework_set", setId: s.id };
    label = s.title;
  }

  if (item.kind === "homework_set") {
    // The unique index refuses a second active copy; say so in plain words
    // rather than surfacing a Postgres constraint name.
    const { data: prior } = await supabase
      .from("homework_assignments")
      .select("id,status,created_at")
      .eq("student_id", student.class_id)
      .eq("set_id", item.setId)
      .neq("status", "completed")
      .maybeSingle();
    if (prior) {
      console.error(
        `assign: ${who} already has "${label}" (${prior.status}, assigned ${new Date(prior.created_at).toLocaleDateString("en-CA")}).` +
          `
  /classroom/${prior.id}. A set can be re-issued only after that copy is completed.`,
      );
      process.exit(1);
    }
  }

  console.log(
    `Assign "${label}" → ${who}` +
      `${scheduleFor ? `  (unlocks ${scheduleFor})` : ""}${dueOn ? `  (due ${dueOn})` : ""}`,
  );
  if (note) console.log(note);
  if (dryRun) return console.log("\n(dry run — nothing written)");

  const { ok, failed } = await assignWork({
    teacherId,
    studentIds: [student.class_id],
    item,
    scheduledForLocalDate: scheduleFor,
    overrides: dueOn ? { dueAt: dueAtEndOfDay(dueOn) } : undefined,
  });

  if (failed.length) {
    console.error(`FAILED: ${failed[0].error}`);
    process.exit(1);
  }
  const r = ok[0];
  const n = r.notify;
  // A bootcamp has no assignment row; its due date lives on the classroom
  // item, stamped afterwards exactly as the Desk's Assign sheet does.
  if (item.kind === "bootcamp" && dueOn && r.classroomItemId) {
    await updateClassroomItem(r.classroomItemId, { due_at: dueAtEndOfDay(dueOn) });
  }
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
