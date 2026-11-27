import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (!process.argv[2]) throw new Error("Pass the path to the local PGlite module.");
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const migration = (name) => readFile(new URL("../../supabase/migrations/" + name, import.meta.url), "utf8");
const [teacher, other, student, session] = Array.from({ length: 4 }, () => randomUUID());

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table user_roles(user_id uuid, role text);
    create table profiles(class_id text, has_classroom_access boolean, archived_at timestamptz, lsat_accommodation text);
    create table teacher_post_session_tasks(id uuid primary key, owner_id uuid, student_id uuid, student_name text,
      revision integer, source_state text, match_state text, transcript_status text,
      transcript_source text, transcript_doc_id text);
    create table lr_questions(preptest integer, section integer, question_number integer, qid text);
    create table timed_section_content_manifests_v1(pt integer, section integer, kind text, definition jsonb);
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
  await db.exec(await readFile(new URL("../../drizzle/migrations/0049_teacher_transcript_assignment.sql", import.meta.url), "utf8"));
  await db.exec(await migration("20261127193000_teacher_transcript_section_timing.sql"));
  await db.query("insert into user_roles values ($1, 'admin'), ($2, 'admin')", [teacher, other]);
  await db.query("insert into profiles values ($1, true, null, 'accommodation_53')", [student]);
  await db.query("insert into teacher_post_session_tasks values ($1,$2,$3,'Example Student',1,'ended','matched','linked','auto','test-doc')", [session, teacher, student]);
  await db.exec("insert into lr_questions values (110,3,2,'PT110-S3-Q2'),(110,3,1,'PT110-S3-Q1')");

  const call = async ({
    hash = "first", accept = null, actor = teacher, replace = null, section = null, pt = null, timing = null,
    proposedPt = null, proposedSection = null, excerpt = "Example Teacher: I will assign you a section.",
  } = {}) => (await db.query(
    "select teacher_transcript_assignment($1,$2,'test-doc',$3,$4,1,$5,$6,$7,$8,$9,$10,$11,$12) as value",
    [actor, session, hash, student, proposedPt, proposedSection, excerpt, accept, replace, section, pt, timing],
  )).rows[0].value;
  const count = async (table) => (await db.query("select count(*)::int as count from " + table)).rows[0].count;

  await db.exec("set role authenticated");
  await assert.rejects(call(), /permission denied/);
  await db.exec("reset role");
  await assert.rejects(call({ actor: other }), /Session unavailable/);
  const first = await call();
  assert.equal((await call()).id, first.id);
  assert.equal(first.snapshot.catalog, null);
  assert.equal(first.snapshot.timing_mode, "52.5");
  assert.equal(await count("homework_assignments"), 0);
  await assert.rejects(call({ accept: first.id }), /Preview changed/);
  const corrected = await call({ replace: first.id, pt: 110, section: 2, timing: "35" });
  assert.equal(corrected.snapshot.section, 2);
  assert.equal(corrected.snapshot.catalog, null);
  await db.exec("insert into lr_questions values (110,2,1,'PT110-S2-Q1'),(110,2,3,'PT110-S2-Q3')");
  assert.equal((await call()).snapshot.catalog, null);
  await db.query("insert into timed_section_content_manifests_v1 values (110,2,'lr',$1)",
    [{ qids: ["PT110-S2-Q1", "PT110-S2-Q3"] }]);
  const withdrawn = await call();
  assert.deepEqual(withdrawn.snapshot.catalog.question_qids, ["PT110-S2-Q1", "PT110-S2-Q3"]);
  assert.equal((await call()).id, withdrawn.id);
  await assert.rejects(call({ accept: first.id }), /Preview changed/);
  await assert.rejects(call({ accept: corrected.id }), /Preview changed/);
  await assert.rejects(call({ accept: first.id, hash: "changed" }), /Preview changed/);
  const second = await call({
    hash: "changed", proposedPt: 110, proposedSection: 3, excerpt: "Example Teacher: I will assign PT110, Section 3.",
  });
  assert.notEqual(second.id, first.id);
  await assert.rejects(call({ accept: first.id, hash: "changed" }), /Preview changed/);
  assert.deepEqual(second.snapshot.catalog.question_qids, ["PT110-S3-Q1", "PT110-S3-Q2"]);
  await db.exec("insert into lr_questions values (110,3,3,'PT110-S3-Q3')");
  await assert.rejects(call({ accept: second.id, hash: "changed" }), /Preview changed/);
  let final = second;
  for (const timing of ["35", "70", "52.5", "unlimited"]) {
    const old = final;
    final = await call({ hash: "changed", replace: old.id, pt: 110, section: 3, timing });
    assert.equal(final.snapshot.timing_mode, timing);
    assert.notEqual(final.id, old.id);
    await assert.rejects(call({ accept: old.id, hash: "changed" }), /Preview changed/);
  }
  assert.equal(final.snapshot.catalog.title, "PT110, Section 3");
  assert.deepEqual(final.snapshot.catalog.question_qids, ["PT110-S3-Q1", "PT110-S3-Q2", "PT110-S3-Q3"]);
  assert.equal(await count("homework_assignments"), 0);
  assert.equal(await count("homework_sets"), 0);
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
  assert.equal(assignment.class_id, student);
  assert.equal(assignment.set_id, null);
  assert.equal(assignment.section_timing_mode, "unlimited");
  assert.equal(assignment.notification_policy, "suppressed");
  assert.equal(accepted.receipt.assignment.route, "/classroom/" + assignment.id);
  await assert.rejects(db.exec("update homework_assignments set section_timing_mode = '35'"), /timing is immutable/);
  console.log("PASS: full LR section without a saved set, generic proposal, all four timing previews, stale source and catalog, immutable student timing, writer rollback and one assignment.");
} finally {
  await db.close();
}
