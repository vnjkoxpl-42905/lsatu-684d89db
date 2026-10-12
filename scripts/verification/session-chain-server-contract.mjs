// Verifies docs/implementation-plans/artifacts/2026-10-02-session-chain-server-contract.sql
// (and its rollback) in an in-memory PGlite database with synthetic fixtures.
// No managed database is touched. Usage:
//   node scripts/verification/session-chain-server-contract.mjs --pglite-module /abs/path/to/pglite/dist/index.js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const flag = process.argv.indexOf('--pglite-module');
const modulePath = flag >= 0 ? process.argv[flag + 1] : process.env.PGLITE_MODULE;
if (!modulePath) throw new Error('Pass --pglite-module /absolute/path/to/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(resolve(modulePath)).href);

const contract = await readFile(new URL('../../docs/implementation-plans/artifacts/2026-10-02-session-chain-server-contract.sql', import.meta.url), 'utf8');
const rollback = await readFile(new URL('../../docs/implementation-plans/artifacts/2026-10-02-session-chain-server-contract-rollback.sql', import.meta.url), 'utf8');

const ADMIN = '10000000-0000-4000-8000-00000000000a';
const STUDENT = '10000000-0000-4000-8000-000000000001';
const OTHER = '10000000-0000-4000-8000-000000000002';
const PASS = '20000000-0000-4000-8000-000000000001';
const OTHER_PASS = '20000000-0000-4000-8000-000000000002';
const R_BOOKED = '30000000-0000-4000-8000-000000000001';
const R_CANCELED = '30000000-0000-4000-8000-000000000002';
const R_OTHER = '30000000-0000-4000-8000-000000000003';
const S_BOOKED = '40000000-0000-4000-8000-000000000001';
const S_MATCH_ONLY = '40000000-0000-4000-8000-000000000002';
const DRILL = '50000000-0000-4000-8000-000000000001';
const RECAP = '50000000-0000-4000-8000-000000000002';
const LEGACY = '50000000-0000-4000-8000-000000000003';
const OTHER_ITEM = '50000000-0000-4000-8000-000000000004';

const db = new PGlite();
let checks = 0;
const ok = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const rejects = async (promise, pattern, label) => { await assert.rejects(promise, (e) => pattern.test(`${e.code} ${e.message}`), label); checks++; };

async function as(user) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? '']);
  await db.exec(user ? 'set role authenticated' : 'reset role');
}
const meta = async (id) => { await as(null); return (await db.query('select metadata_json, updated_at from public.classroom_items where id=$1', [id])).rows[0]; };
const link = (args) => db.query('select public.set_classroom_item_session_link($1,$2,$3,$4,$5,$6) as r', args).then((x) => x.rows[0].r);

try {
  await db.exec(`
    create role authenticated; create role anon;
    create schema auth; create table auth.users(id uuid primary key);
    insert into auth.users values ('${ADMIN}'),('${STUDENT}'),('${OTHER}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to authenticated;
    grant execute on function auth.uid() to authenticated;

    create type public.app_role as enum ('admin', 'user');
    create table public.user_roles(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), role public.app_role not null default 'user', unique(user_id, role));
    create function public.has_role(_user_id uuid, _role public.app_role) returns boolean language sql stable security definer set search_path = public as
      $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
    insert into public.user_roles(user_id, role) values ('${ADMIN}', 'admin');

    create table public.classroom_items (
      id uuid primary key default gen_random_uuid(),
      student_id uuid not null references auth.users(id),
      class_id uuid, created_by uuid not null references auth.users(id),
      type text not null, title text not null, description text, content_html text, content_markdown text,
      source_table text, source_id text, status text not null default 'assigned',
      unlock_at timestamptz, due_at timestamptz, completed_at timestamptz, priority int not null default 0,
      visible_to_student boolean not null default true,
      metadata_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now());
    create function public.touch_classroom_items_updated_at() returns trigger language plpgsql as
      $$ begin new.updated_at := clock_timestamp(); return new; end $$;
    create trigger classroom_items_touch before update on public.classroom_items for each row execute function public.touch_classroom_items_updated_at();
    -- Production guard (20260811133621), verbatim logic.
    create function public.guard_classroom_items_student_update() returns trigger language plpgsql security definer set search_path = public as $$
    begin
      if auth.uid() is null or public.has_role(auth.uid(), 'admin') then return new; end if;
      if new.id is distinct from old.id or new.student_id is distinct from old.student_id or new.class_id is distinct from old.class_id
         or new.created_by is distinct from old.created_by or new.type is distinct from old.type or new.title is distinct from old.title
         or new.description is distinct from old.description or new.content_html is distinct from old.content_html
         or new.content_markdown is distinct from old.content_markdown or new.source_table is distinct from old.source_table
         or new.source_id is distinct from old.source_id or new.unlock_at is distinct from old.unlock_at or new.due_at is distinct from old.due_at
         or new.priority is distinct from old.priority or new.visible_to_student is distinct from old.visible_to_student
         or new.created_at is distinct from old.created_at then
        raise exception 'classroom_items: students may only update status, completed_at and metadata_json on their own items' using errcode = '42501';
      end if;
      return new;
    end; $$;
    create trigger classroom_items_student_update_guard before update on public.classroom_items for each row execute function public.guard_classroom_items_student_update();
    alter table public.classroom_items enable row level security;
    grant select, insert, update, delete on public.classroom_items to authenticated;
    create policy classroom_items_student_select on public.classroom_items for select to authenticated
      using (student_id = auth.uid() and visible_to_student = true and (type = 'bootcamp_module' or unlock_at is null or unlock_at <= now()));
    create policy classroom_items_student_update_status on public.classroom_items for update to authenticated
      using (student_id = auth.uid()) with check (student_id = auth.uid());
    create policy classroom_items_admin_all on public.classroom_items for all to authenticated
      using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

    create table public.booking_passes(id uuid primary key, student_id uuid references auth.users(id));
    create table public.booking_pass_redemptions(id uuid primary key, booking_pass_id uuid not null references public.booking_passes(id), status text not null, start_at timestamptz not null default now());
    create table public.single_session_bookings(id uuid primary key, user_id uuid references auth.users(id), email text, status text not null default 'draft', start_at timestamptz not null default now());
    insert into public.booking_passes values ('${PASS}', '${STUDENT}'), ('${OTHER_PASS}', '${OTHER}');
    insert into public.booking_pass_redemptions(id, booking_pass_id, status) values
      ('${R_BOOKED}', '${PASS}', 'booked'), ('${R_CANCELED}', '${PASS}', 'cancelled'), ('${R_OTHER}', '${OTHER_PASS}', 'booked');
    insert into public.single_session_bookings(id, user_id, email, status) values
      ('${S_BOOKED}', '${STUDENT}', 's@x', 'booked'), ('${S_MATCH_ONLY}', null, 's@x', 'booked');

    insert into public.classroom_items(id, student_id, created_by, type, title, metadata_json) values
      ('${DRILL}', '${STUDENT}', '${ADMIN}', 'drill', 'Flaw drill', '{"assignment_id":"a1"}'),
      ('${RECAP}', '${STUDENT}', '${ADMIN}', 'session_recap', 'Recap', '{"kind":"recap"}'),
      ('${LEGACY}', '${STUDENT}', '${ADMIN}', 'note', 'Note with forged link',
        '{"read_at":"x","session_chain":{"version":1,"booking_source":"redemption","booking_id":"${R_BOOKED}","phase":"preparation"}}'),
      ('${OTHER_ITEM}', '${OTHER}', '${ADMIN}', 'drill', 'Other student drill', '{}');
  `);

  // Before the contract: the gap the review found is real.
  await as(STUDENT);
  await db.query(`update public.classroom_items set metadata_json = metadata_json || '{"session_chain":{"version":1,"booking_source":"redemption","booking_id":"${R_BOOKED}","phase":"follow_up"}}' where id = $1`, [DRILL]);
  ok((await meta(DRILL)).metadata_json.session_chain.phase, 'follow_up', 'pre-contract: student can forge a link');
  await as(null);
  await db.query(`update public.classroom_items set metadata_json = '{"assignment_id":"a1"}' where id = $1`, [DRILL]);

  const before = (await db.query('select id, metadata_json from public.classroom_items order by id')).rows;
  await db.exec(contract);
  ok((await db.query('select id, metadata_json from public.classroom_items order by id')).rows, before, 'install rewrites no row');
  ok((await db.query('select item_id from public.classroom_item_session_link_legacy')).rows.map((r) => r.item_id), [LEGACY], 'existing member recorded as legacy');
  await db.exec(contract);
  ok((await db.query('select count(*)::int n from public.classroom_item_session_link_legacy')).rows[0].n, 1, 'install is re-runnable');

  // Students: cannot add, move or remove; ordinary metadata writes still work.
  await as(STUDENT);
  await rejects(db.query(`update public.classroom_items set metadata_json = metadata_json || '{"session_chain":{"version":1}}' where id = $1`, [DRILL]), /42501.*session_chain/, 'student cannot add');
  await rejects(db.query(`update public.classroom_items set metadata_json = jsonb_set(metadata_json, '{session_chain,phase}', '"recap"') where id = $1`, [LEGACY]), /42501.*session_chain/, 'student cannot move');
  await rejects(db.query(`update public.classroom_items set metadata_json = metadata_json - 'session_chain' where id = $1`, [LEGACY]), /42501.*session_chain/, 'student cannot remove');
  await db.query(`update public.classroom_items set metadata_json = metadata_json || '{"read_at":"y"}' where id = $1`, [LEGACY]);
  ok((await meta(LEGACY)).metadata_json.read_at, 'y', 'merge write that carries the member through is allowed');
  await as(STUDENT);
  await db.query(`update public.classroom_items set status = 'completed' where id = $1`, [DRILL]);
  ok((await db.query(`select status from public.classroom_items where id = $1`, [DRILL])).rows[0].status, 'completed', 'status write unaffected');
  await as(STUDENT);
  await rejects(link([DRILL, STUDENT, null, 'redemption', R_BOOKED, 'preparation']), /42501.*admin only/, 'student cannot call the writer');
  await as(null);
  await rejects(link([DRILL, STUDENT, null, 'redemption', R_BOOKED, 'preparation']), /42501.*admin only/, 'no JWT, no write');

  // Admin direct writes and inserts cannot bypass the function either.
  await as(ADMIN);
  await rejects(db.query(`update public.classroom_items set metadata_json = metadata_json || '{"session_chain":{"version":1}}' where id = $1`, [DRILL]), /42501.*session_chain/, 'admin direct update blocked');
  await rejects(db.query(`insert into public.classroom_items(student_id, created_by, type, title, metadata_json) values ($1, $2, 'drill', 't', '{"session_chain":{}}')`, [STUDENT, ADMIN]), /42501.*session_chain/, 'insert with member blocked');
  await db.query(`insert into public.classroom_items(student_id, created_by, type, title, metadata_json) values ($1, $2, 'drill', 'plain', '{"k":1}')`, [STUDENT, ADMIN]);
  checks++;
  await db.query(`update public.classroom_items set due_at = now() where id = $1`, [DRILL]);
  checks++;

  // Admin through the function: ownership, eligibility, status.
  let row = await meta(DRILL);
  await as(ADMIN);
  await rejects(link([DRILL, STUDENT, row.updated_at, 'redemption', R_OTHER, 'preparation']), /42501.*booking does not belong/, 'other student booking');
  await rejects(link([DRILL, OTHER, row.updated_at, 'redemption', R_BOOKED, 'preparation']), /42501.*item does not belong/, 'wrong intended student');
  await rejects(link([OTHER_ITEM, STUDENT, row.updated_at, 'redemption', R_BOOKED, 'preparation']), /42501.*item does not belong/, 'cross-student item');
  await rejects(link([DRILL, STUDENT, row.updated_at, 'single_session', S_MATCH_ONLY, 'preparation']), /42501.*booking does not belong/, 'email-match-only single session');
  await rejects(link([DRILL, STUDENT, row.updated_at, 'redemption', R_CANCELED, 'preparation']), /22023.*only booked/, 'canceled booking');
  await rejects(link([DRILL, STUDENT, row.updated_at, 'redemption', R_BOOKED, 'recap']), /22023.*cannot be linked as recap/, 'drill as recap');
  await rejects(link([DRILL, STUDENT, row.updated_at, 'calcom', R_BOOKED, 'preparation']), /22023.*unknown booking source/, 'unknown source');
  await rejects(link([DRILL, STUDENT, row.updated_at, 'redemption', R_BOOKED, 'homework']), /22023.*unknown phase/, 'unknown phase');
  ok(await link(['50000000-0000-4000-8000-0000000000ff', STUDENT, row.updated_at, 'redemption', R_BOOKED, 'preparation']), { status: 'not_found' }, 'missing item');

  // Save, acknowledgment, preservation.
  let res = await link([DRILL, STUDENT, row.updated_at, 'redemption', R_BOOKED, 'preparation']);
  ok(res.status, 'saved', 'saved');
  row = await meta(DRILL);
  ok(row.metadata_json.assignment_id, 'a1', 'unrelated metadata preserved');
  ok(row.metadata_json.session_chain.linked_by, ADMIN, 'actor stamped from JWT');
  ok({ ...row.metadata_json.session_chain, linked_by: undefined, linked_at: undefined },
    { version: 1, booking_source: 'redemption', booking_id: R_BOOKED, phase: 'preparation', linked_by: undefined, linked_at: undefined }, 'member shape');
  ok(new Date(res.updated_at).getTime(), new Date(row.updated_at).getTime(), 'ack carries the new updated_at');

  // Idempotent repeat (e.g. a lost reply retried): no second write.
  await as(ADMIN);
  res = await link([DRILL, STUDENT, '2000-01-01T00:00:00Z', 'redemption', R_BOOKED, 'preparation']);
  ok(res.status, 'unchanged', 'same target is unchanged even with stale expectation');
  ok(new Date((await meta(DRILL)).updated_at).getTime(), new Date(row.updated_at).getTime(), 'no write on unchanged');

  // Concurrency: a write between read and save is detected, nothing overwritten.
  const seen = row.updated_at;
  await as(STUDENT);
  await db.query(`update public.classroom_items set metadata_json = metadata_json || '{"read_at":"z"}' where id = $1`, [DRILL]);
  await as(ADMIN);
  res = await link([DRILL, STUDENT, seen, 'single_session', S_BOOKED, 'follow_up']);
  ok(res.status, 'conflict', 'stale updated_at is a conflict');
  ok(res.session_chain.phase, 'preparation', 'conflict reports the current link');
  row = await meta(DRILL);
  ok([row.metadata_json.session_chain.phase, row.metadata_json.read_at], ['preparation', 'z'], 'conflict changed nothing');

  // Move (explicit, with fresh expectation), then remove.
  await as(ADMIN);
  res = await link([DRILL, STUDENT, row.updated_at, 'single_session', S_BOOKED, 'follow_up']);
  ok(res.status, 'saved', 'move saved');
  row = await meta(DRILL);
  ok([row.metadata_json.session_chain.booking_source, row.metadata_json.session_chain.phase, row.metadata_json.read_at], ['single_session', 'follow_up', 'z'], 'move kept other keys');
  await as(ADMIN);
  res = await link([DRILL, STUDENT, row.updated_at, null, null, null]);
  ok(res.status, 'saved', 'remove saved');
  row = await meta(DRILL);
  ok(['session_chain' in row.metadata_json, row.metadata_json.read_at, row.metadata_json.assignment_id], [false, 'z', 'a1'], 'remove deletes only the member');
  await as(ADMIN);
  ok((await link([DRILL, STUDENT, row.updated_at, null, null, null])).status, 'unchanged', 'remove twice is unchanged');

  // Removing from a canceled appointment is allowed; the item survives.
  await as(ADMIN);
  row = await meta(RECAP);
  await as(ADMIN);
  ok((await link([RECAP, STUDENT, row.updated_at, 'redemption', R_BOOKED, 'recap'])).status, 'saved', 'recap linked');
  await as(null);
  await db.query(`update public.booking_pass_redemptions set status = 'cancelled' where id = $1`, [R_BOOKED]);
  row = await meta(RECAP);
  await as(ADMIN);
  ok((await link([RECAP, STUDENT, row.updated_at, null, null, null])).status, 'saved', 'remove from canceled booking');
  ok((await db.query('select count(*)::int n from public.classroom_items where id = $1', [RECAP])).rows[0].n, 1, 'item kept');
  await as(null);
  await db.query(`update public.booking_pass_redemptions set status = 'booked' where id = $1`, [R_BOOKED]);

  // Legacy: re-saving the same link through the function verifies it.
  row = await meta(LEGACY);
  await as(ADMIN);
  ok((await link([LEGACY, STUDENT, row.updated_at, 'redemption', R_BOOKED, 'preparation'])).status, 'saved', 'legacy same target is rewritten, not unchanged');
  ok((await db.query('select count(*)::int n from public.classroom_item_session_link_legacy')).rows[0].n, 0, 'legacy record cleared once teacher-authored');
  row = await meta(LEGACY);
  ok([row.metadata_json.session_chain.linked_by, row.metadata_json.read_at], [ADMIN, 'y'], 'legacy item now stamped, read state kept');

  // Legacy table is admin-readable only.
  await as(null);
  await db.query(`insert into public.classroom_item_session_link_legacy(item_id, snapshot) values ($1, '{}')`, [OTHER_ITEM]);
  await as(STUDENT);
  ok((await db.query('select * from public.classroom_item_session_link_legacy')).rows, [], 'student cannot read legacy record');
  await rejects(db.query(`insert into public.classroom_item_session_link_legacy(item_id, snapshot) values ($1, '{}')`, [DRILL]), /42501/, 'student cannot write legacy record');
  await as(ADMIN);
  ok((await db.query('select count(*)::int n from public.classroom_item_session_link_legacy')).rows[0].n, 1, 'admin can read legacy record');

  // Rollback: guard and function gone, rows untouched.
  await as(null);
  const preRollback = (await db.query('select id, metadata_json from public.classroom_items order by id')).rows;
  await db.exec(rollback);
  ok((await db.query('select id, metadata_json from public.classroom_items order by id')).rows, preRollback, 'rollback rewrites no row');
  ok((await db.query(`select to_regprocedure('public.set_classroom_item_session_link(uuid,uuid,timestamptz,text,uuid,text)') is null as gone`)).rows[0].gone, true, 'function dropped');
  await as(STUDENT);
  await db.query(`update public.classroom_items set metadata_json = metadata_json - 'session_chain' where id = $1`, [LEGACY]);
  ok('session_chain' in (await meta(LEGACY)).metadata_json, false, 'after rollback the pre-contract behavior returns');

  // Preconditions fail closed on an unexpected baseline.
  await as(null);
  const fresh = new PGlite();
  await assert.rejects(fresh.exec(contract), /reviewed baseline mismatch/);
  checks++;
  await fresh.close();

  console.log(`PASS session_chain server contract: ${checks} checks; synthetic fixtures; no managed database touched`);
} finally {
  await db.close();
}
