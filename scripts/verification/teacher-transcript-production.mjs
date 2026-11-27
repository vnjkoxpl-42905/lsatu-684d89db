import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (!process.argv[2]) throw new Error("Pass the path to the local PGlite module.");
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const migration = (name) => readFile(new URL("../../supabase/migrations/" + name, import.meta.url), "utf8");
const [teacher, other, student, session, set] = Array.from({ length: 5 }, () => randomUUID());

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table user_roles(user_id uuid, role text);
    create table profiles(class_id text, has_classroom_access boolean, archived_at timestamptz);
    create table teacher_post_session_tasks(id uuid primary key, owner_id uuid, student_id uuid, student_name text,
      revision integer, source_state text, match_state text, transcript_status text,
      transcript_source text, transcript_doc_id text);
    create table lr_questions(preptest integer, section integer, question_number integer, qid text);
    create table homework_sets(id uuid primary key, created_by uuid, title text, description text, question_qids text[], class_id text);
    create table homework_assignments(id uuid primary key default gen_random_uuid(), set_id uuid, student_id uuid,
      question_qids text[], set_title text, set_description text, status text, assigned_by uuid, class_id text,
      notification_policy text, notification_group_id uuid, unique(set_id, student_id));
    create table classroom_items(student_id uuid, created_by uuid, type text, title text, description text,
      source_table text, source_id uuid, status text, visible_to_student boolean, metadata_json jsonb);
    create table mcp_write_audit(actor_id uuid, tool_name text, idempotency_key text, student_id uuid, result jsonb);
    create function mcp_require_admin() returns uuid language sql stable as
      $$ select user_id from public.user_roles where user_id = auth.uid() and role = 'admin' $$;
  `);
  const writer = await migration("20261028141000_student_work_mcp_writers.sql");
  const writerStart = writer.indexOf("CREATE OR REPLACE FUNCTION public.mcp_assign_homework_set");
  const writerEnd = writer.indexOf("$function$", writer.indexOf("AS $function$", writerStart) + "AS $function$".length);
  await db.exec(writer.slice(writerStart, writerEnd + "$function$".length) + ";");
  await db.exec(await migration("20261127190000_teacher_transcript_assignment.sql"));
  await db.query("insert into user_roles values ($1, 'admin'), ($2, 'admin')", [teacher, other]);
  await db.query("insert into profiles values ($1, true, null)", [student]);
  await db.query("insert into teacher_post_session_tasks values ($1,$2,$3,'Example Student',1,'ended','matched','linked','auto','test-doc')", [session, teacher, student]);
  await db.exec("insert into lr_questions values (110,3,2,'test-q2'),(110,3,1,'test-q1')");
  await db.query("insert into homework_sets values ($1,$2,'Example LR section',null,array['test-q1','test-q2'],null)", [set, teacher]);

  const call = async ({ hash = "first", accept = null, actor = teacher, replace = null, section = null } = {}) => (await db.query(
    "select teacher_transcript_assignment($1,$2,'test-doc',$3,$4,1,110,3,'Example Teacher: I will assign you PT110, section 3.',$5,$6,$7) as value",
    [actor, session, hash, student, accept, replace, section],
  )).rows[0].value;
  const count = async (table) => (await db.query("select count(*)::int as count from " + table)).rows[0].count;

  await db.exec("set role authenticated");
  await assert.rejects(call(), /permission denied/);
  await db.exec("reset role");
  await assert.rejects(call({ actor: other }), /Session unavailable/);
  const first = await call();
  assert.equal((await call()).id, first.id);
  assert.equal(await count("homework_assignments"), 0);
  const corrected = await call({ replace: first.id, section: 2 });
  assert.equal(corrected.snapshot.section, 2);
  assert.equal(corrected.snapshot.catalog, null);
  assert.equal((await call()).id, corrected.id);
  await assert.rejects(call({ accept: first.id }), /Preview changed/);
  await assert.rejects(call({ accept: corrected.id }), /Preview changed/);
  await assert.rejects(call({ accept: first.id, hash: "changed" }), /Preview changed/);
  const second = await call({ hash: "changed" });
  assert.notEqual(second.id, first.id);
  await assert.rejects(call({ accept: first.id, hash: "changed" }), /Preview changed/);
  await db.query("update homework_sets set title = 'Revised catalog title' where id = $1", [set]);
  await assert.rejects(call({ accept: second.id, hash: "changed" }), /Preview changed/);
  const final = await call({ hash: "changed" });
  assert.equal(final.snapshot.catalog.title, "Revised catalog title");
  assert.deepEqual(final.snapshot.catalog.question_qids, ["test-q1", "test-q2"]);
  assert.equal(await count("homework_assignments"), 0);
  await db.exec("update teacher_post_session_tasks set transcript_status = 'needs_review'");
  await assert.rejects(call({ accept: final.id, hash: "changed" }), /Session changed/);
  await db.exec("update teacher_post_session_tasks set transcript_status = 'linked'");
  await db.exec("alter table classroom_items add constraint synthetic_writer_failure check (false)");
  await assert.rejects(call({ accept: final.id, hash: "changed" }), /synthetic_writer_failure/);
  assert.equal(await count("homework_assignments"), 0);
  assert.equal(await count("mcp_write_audit"), 0);
  await db.exec("alter table classroom_items drop constraint synthetic_writer_failure");
  const accepted = await call({ accept: final.id, hash: "changed" });
  const retry = await call({ accept: final.id, hash: "changed" });
  assert.deepEqual(retry.receipt, accepted.receipt);
  assert.equal(accepted.receipt.approved_by, teacher);
  assert.equal(accepted.receipt.preview_id, final.id);
  assert.deepEqual(accepted.snapshot, final.snapshot);
  assert.equal(await count("homework_assignments"), 1);
  assert.equal(await count("classroom_items"), 1);
  assert.equal(await count("mcp_write_audit"), 1);
  const [assignment] = (await db.query("select * from homework_assignments")).rows;
  assert.equal(assignment.id, accepted.receipt.assignment.assignment_id);
  assert.equal(assignment.student_id, student);
  assert.equal(assignment.notification_policy, "suppressed");
  console.log("PASS: approval migration and existing writer, private access, stale source and catalog, no pre-approval write, writer rollback, receipt recovery and one assignment.");
} finally {
  await db.close();
}
