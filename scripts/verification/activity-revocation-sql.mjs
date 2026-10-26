import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Local synthetic database only. No app dependency or live credentials required.
const option = process.argv.indexOf('--pglite-module');
const modulePath = option >= 0 ? process.argv[option + 1] : process.env.PGLITE_MODULE;
if (!modulePath) throw new Error('Pass --pglite-module /absolute/path/to/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(resolve(modulePath)).href);
const db = new PGlite();
const admin = '10000000-0000-4000-8000-000000000001';
const secondAdmin = '10000000-0000-4000-8000-000000000002';
const student = '20000000-0000-4000-8000-000000000001';
const otherStudent = '20000000-0000-4000-8000-000000000002';
const assignment = '30000000-0000-4000-8000-000000000001';
const activity = '40000000-0000-4000-8000-000000000001';

await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users(id uuid primary key);
  insert into auth.users values ('${admin}'), ('${secondAdmin}'), ('${student}'), ('${otherStudent}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function public.has_role(p_user uuid, p_role text) returns boolean language sql stable as
    $$ select p_role = 'admin' and p_user in ('${admin}'::uuid, '${secondAdmin}'::uuid) $$;
  grant usage on schema public, auth to authenticated, anon;
  grant execute on function auth.uid(), public.has_role(uuid,text) to authenticated, anon;
  create table public.activity_assignments(
    id uuid primary key, activity_id uuid, student_id uuid not null, assigned_by uuid not null,
    status text not null, title text, items jsonb, score numeric, completed_at timestamptz
  );
  create table public.activity_item_responses(
    id uuid primary key default gen_random_uuid(), assignment_id uuid references public.activity_assignments(id),
    student_id uuid not null, response_text text
  );
  create table public.activity_section_grades(
    assignment_id uuid references public.activity_assignments(id), grade jsonb
  );
  create table public.classroom_items(
    id uuid primary key default gen_random_uuid(), student_id uuid, created_by uuid,
    source_table text, source_id text, type text, visible_to_student boolean,
    status text, metadata_json jsonb
  );
  insert into public.activity_assignments values
    ('${assignment}', '${activity}', '${student}', '${admin}', 'in_progress', 'Synthetic Activity', '[{"order":1}]', 80, null);
  insert into public.activity_item_responses(assignment_id, student_id, response_text)
    values ('${assignment}', '${student}', 'Historical answer');
  insert into public.activity_section_grades values ('${assignment}', '{"coverage":80}');
  insert into public.classroom_items(student_id,created_by,source_table,source_id,type,visible_to_student,status,metadata_json) values
    ('${student}','${admin}','activity_assignments','${assignment}','activity',true,'in_progress','{"keep":true}'),
    ('${student}','${admin}',null,'${assignment}','activity',true,'completed','{"legacy":true}');
  alter table public.activity_assignments enable row level security;
  alter table public.activity_item_responses enable row level security;
  alter table public.classroom_items enable row level security;
  grant select,insert,update on public.activity_assignments to authenticated;
  grant select,insert on public.activity_item_responses to authenticated;
  grant select,insert,update on public.classroom_items to authenticated;
  create policy "Students read own activity assignments" on public.activity_assignments
    for select to authenticated using (student_id=auth.uid());
  create policy "Students update own activity assignments" on public.activity_assignments
    for update to authenticated using (student_id=auth.uid()) with check(student_id=auth.uid());
  create policy admin_all on public.activity_assignments for all to authenticated
    using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
  create policy "activity_item_responses: owner can insert" on public.activity_item_responses
    for insert to authenticated with check(student_id=auth.uid());
  create policy response_read on public.activity_item_responses for select to authenticated
    using(student_id=auth.uid() or public.has_role(auth.uid(),'admin'));
  create policy mirror_admin on public.classroom_items for all to authenticated
    using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
  create policy mirror_student on public.classroom_items for select to authenticated
    using(student_id=auth.uid() and visible_to_student);
  -- Existing source snapshot guard, reduced to fields exercised by this harness.
  create function public.guard_activity_assignment_immutables() returns trigger language plpgsql as $$
  begin
    if not public.has_role(auth.uid(),'admin') and
      (NEW.student_id is distinct from OLD.student_id or NEW.assigned_by is distinct from OLD.assigned_by or
       NEW.items is distinct from OLD.items) then
      raise exception 'snapshot columns are immutable' using errcode='42501';
    end if;
    return NEW;
  end; $$;
  create trigger activity_assignments_guard_immutables before update on public.activity_assignments
    for each row execute function public.guard_activity_assignment_immutables();
`);
const artifact = new URL('../../docs/implementation-plans/artifacts/2026-09-30-activity-revocation.sql', import.meta.url);
await db.exec(await readFile(artifact, 'utf8'));

const asUser = async (id) => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec('set role authenticated');
};
const deny = async (sql, parameters = []) => {
  await assert.rejects(db.query(sql, parameters));
};
const revoke = () => db.query('select public.revoke_activity_assignment($1,$2) as receipt', [assignment, student]);
let checks = 0;

try {
  await asUser(student);
  await deny('select public.activity_revocation_capability()');
  await deny('select public.revoke_activity_assignment($1,$2)', [assignment, student]);
  await deny('update public.activity_assignments set student_id=$1 where id=$2', [otherStudent, assignment]);
  await deny('update public.activity_assignments set assigned_by=$1 where id=$2', [student, assignment]);
  await deny('update public.activity_assignments set revoked_at=now(),revoked_by=$1 where id=$2', [student, assignment]);
  checks += 5;

  await asUser(admin);
  assert.equal((await db.query('select public.activity_revocation_capability() as capability')).rows[0].capability.version, 1);
  await deny('select public.revoke_activity_assignment($1,$2)', [assignment, otherStudent]);
  await deny('update public.activity_assignments set revoked_at=now(),revoked_by=$1 where id=$2', [secondAdmin, assignment]);
  // Fail mirror hiding inside the RPC: source revocation must roll back too.
  await db.exec('reset role');
  await db.exec(`create function public.synthetic_mirror_failure() returns trigger language plpgsql as $$
    begin if not NEW.visible_to_student then raise exception 'synthetic failure'; end if; return NEW; end; $$;
    create trigger synthetic_failure before update on public.classroom_items for each row execute function public.synthetic_mirror_failure();`);
  await asUser(admin);
  await deny('select public.revoke_activity_assignment($1,$2)', [assignment, student]);
  assert.equal((await db.query('select revoked_at from public.activity_assignments where id=$1',[assignment])).rows[0].revoked_at, null);
  await db.exec('reset role');
  await db.exec('drop trigger synthetic_failure on public.classroom_items');
  await asUser(admin);
  const receipt = (await revoke()).rows[0].receipt;
  assert.equal(receipt.revoked_by, admin);
  assert.equal(receipt.performed_by, admin);
  assert.equal(receipt.already_revoked, false);
  assert.equal(receipt.mirrors_hidden, 2);
  const original = (await db.query('select * from public.activity_assignments where id=$1',[assignment])).rows[0];
  assert.equal(original.assigned_by, admin);
  assert.equal(original.status, 'in_progress');
  assert.equal(Number(original.score), 80);
  assert.deepEqual(original.items, [{ order: 1 }]);
  assert.equal((await db.query('select response_text from public.activity_item_responses')).rows[0].response_text, 'Historical answer');
  assert.equal((await db.query('select count(*)::int as n from public.classroom_items where visible_to_student')).rows[0].n, 0);
  assert.equal((await db.query('select count(*)::int as n from public.classroom_items')).rows[0].n, 2);
  await db.exec('reset role');
  assert.deepEqual((await db.query('select grade from public.activity_section_grades')).rows[0].grade, { coverage: 80 });
  checks += 12;

  await asUser(secondAdmin);
  const repeated = (await revoke()).rows[0].receipt;
  assert.equal(repeated.revoked_by, admin);
  assert.equal(repeated.performed_by, secondAdmin);
  assert.equal(repeated.revoked_at, receipt.revoked_at);
  assert.equal(repeated.already_revoked, true);
  assert.equal(repeated.mirrors_hidden, 0);
  await deny('update public.activity_assignments set revoked_at=null,revoked_by=null where id=$1', [assignment]);
  await deny('update public.classroom_items set visible_to_student=true where source_id=$1', [assignment]);
  await deny(`insert into public.classroom_items(student_id,created_by,source_table,source_id,type,visible_to_student)
    values($1,$2,'activity_assignments',$3,'activity',true)`, [student, secondAdmin, assignment]);
  // A fresh issuance can coexist with the retained revoked assignment.
  await db.query(`insert into public.activity_assignments(id,activity_id,student_id,assigned_by,status)
    values('30000000-0000-4000-8000-000000000002',$1,$2,$3,'assigned')`, [activity, student, secondAdmin]);
  checks += 9;

  await asUser(student);
  assert.equal((await db.query('select id from public.activity_assignments where id=$1',[assignment])).rows.length, 0);
  assert.equal((await db.query("update public.activity_assignments set status='completed' where id=$1 returning id",[assignment])).rows.length, 0);
  await deny('insert into public.activity_item_responses(assignment_id,student_id,response_text) values($1,$2,$3)', [assignment, student, 'After revocation']);
  assert.equal((await db.query('select id from public.classroom_items')).rows.length, 0);
  checks += 4;
  // Service-level inserts bypass RLS, but still cannot add revoked evidence.
  await db.exec('reset role');
  await deny('insert into public.activity_item_responses(assignment_id,student_id,response_text) values($1,$2,$3)', [assignment, student, 'Recovery after revocation']);
  await deny('insert into public.activity_item_responses(assignment_id,student_id,response_text) values($1,$2,$3)', ['30000000-0000-4000-8000-000000000002', otherStudent, 'Forged owner']);
  checks += 2;
  await asUser(otherStudent);
  await deny('insert into public.activity_item_responses(assignment_id,student_id,response_text) values($1,$2,$3)', ['30000000-0000-4000-8000-000000000002', otherStudent, 'Cross-student response']);
  checks += 1;
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
  await db.exec('set role anon');
  await deny('select public.activity_revocation_capability()');
  await deny('select public.revoke_activity_assignment($1,$2)', [assignment, student]);
  checks += 2;
  console.log(`Activity revocation SQL compiled and passed ${checks} local assertions. No live records used.`);
} finally {
  await db.close();
}
