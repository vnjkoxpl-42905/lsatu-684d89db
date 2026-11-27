import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setupSql, owner, other, blueprint, manifestHash } from './timed-pt-writer-fixtures.mjs';

if (!process.argv[2]) throw new Error('Pass the absolute local PGlite module path.');
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const get = async (sql, args) => (await db.query(sql, args)).rows[0];
const artifact = (name) => readFile(new URL('../../docs/implementation-plans/artifacts/' + name, import.meta.url), 'utf8');
const admin = () => db.exec('reset role');
const authenticate = async (id = owner) => {
  await admin();
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role authenticated');
};
const denied = (action, code) => assert.rejects(action, (error) => error.code === code);
const device = 'assignment-device';
const rc = blueprint.legs.find((leg) => leg.kind === 'rc');
const prepare = async (id, launch = randomUUID(), targetDevice = device) =>
  (await get('select public.start_assigned_timed_section_v1($1,$2,$3) as response', [id, launch, targetDevice])).response;
const writer = async (command) =>
  (await get('select public.commit_timed_section_v1($1::jsonb) as response', [JSON.stringify(command)])).response;
const read = async (id) => (await get('select public.read_timed_section_v1($1) as response', [id])).response;
const command = (sitting, operation, payload = {}) => ({
  workKind: 'standalone-section', workId: sitting.id, commandId: randomUUID(),
  deviceId: sitting.device_id, expectedRevision: sitting.revision, writerEpoch: sitting.writer_epoch,
  operation, payload,
});

try {
  await db.exec(setupSql);
  await db.exec(`
    alter table public.profiles add column has_drill_access boolean not null default false,
      add column has_classroom_access boolean not null default true, add column archived_at timestamptz;
    create table public.homework_assignments (
      id uuid primary key, student_id uuid not null, section_kind text, section_preptest integer,
      section_number integer, section_manifest_sha256 text, question_qids text[] not null,
      section_timing_mode text, status text not null default 'assigned', started_at timestamptz,
      completed_at timestamptz, score numeric
    );
    create table public.classroom_items (
      source_table text, source_id uuid, student_id uuid,
      status text not null default 'assigned', completed_at timestamptz
    );
    grant select, update on public.homework_assignments to authenticated;
  `);
  for (const name of [
    '2026-09-30-timed-pt-control-foundation.sql',
    '2026-09-30-timed-pt-writer.sql',
    '2026-09-30-standalone-timed-control-foundation.sql',
    '2026-09-30-standalone-timed-writer.sql',
  ]) await db.exec(await artifact(name));
  await db.query('insert into public.timed_content_manifests_v1 values ($1,140,$2)', [manifestHash, JSON.stringify(blueprint)]);
  await db.exec(await artifact('2026-09-30-standalone-section-catalog-upgrade.sql'));
  await db.query('update public.timed_section_configuration_v1 set enabled=true,manifest_sha256=$1', [manifestHash]);

  if (process.argv.includes('--managed-role')) {
    await db.exec(`
      create role isolated_rc_migration nologin nosuperuser createrole bypassrls;
      grant timed_section_executor to isolated_rc_migration with admin true, set false, inherit false;
      alter schema public owner to isolated_rc_migration;
      alter table public.timed_section_sittings_v1 owner to isolated_rc_migration;
      alter table public.homework_assignments owner to isolated_rc_migration;
      alter table public.classroom_items owner to isolated_rc_migration;
      grant select,update on public.profiles to isolated_rc_migration;
      set role isolated_rc_migration;
    `);
    assert.equal((await get("select pg_has_role(current_user,'timed_section_executor','SET') as enabled")).enabled, false);
  }
  const before = await get(`
    select (select proowner from pg_proc where oid = 'public.commit_timed_section_v1(jsonb)'::regprocedure) as owner,
      (select nspacl::text from pg_namespace where nspname = 'public') as schema_acl
  `);
  await db.exec(await readFile(
    new URL('../../supabase/migrations/20261127195000_assigned_rc_protected_sitting.sql', import.meta.url), 'utf8',
  ));
  assert.deepEqual(await get(`
    select (select proowner from pg_proc where oid = 'public.commit_timed_section_v1(jsonb)'::regprocedure) as owner,
      (select nspacl::text from pg_namespace where nspname = 'public') as schema_acl
  `), before);
  if (process.argv.includes('--managed-role')) {
    assert.equal((await get("select pg_has_role(current_user,'timed_section_executor','SET') as enabled")).enabled, false);
    await admin();
  }
  await db.exec(`
    create function public.fixture_unsafe_legacy_finish(p_id uuid) returns void
    language sql security definer set search_path=pg_catalog,public as
    $$ update public.homework_assignments set status='completed' where id=p_id $$;
    grant execute on function public.fixture_unsafe_legacy_finish(uuid) to authenticated;
  `);
  const assignments = new Map();
  for (const timing of ['35', '52.5', '70', 'unlimited']) {
    const id = randomUUID();
    assignments.set(timing, id);
    await db.query(`
      insert into public.homework_assignments
        (id,student_id,section_kind,section_preptest,section_number,section_manifest_sha256,question_qids,section_timing_mode)
      values ($1,$2,'rc',140,$3,$4,$5,$6)
    `, [id, owner, rc.section, manifestHash, rc.qids, timing]);
    await db.query("insert into public.classroom_items (source_table,source_id,student_id) values ('homework_assignments',$1,$2)", [id, owner]);
  }
  const halfId = assignments.get('52.5');
  await authenticate(other);
  await denied(() => prepare(halfId), 'PT401');
  await authenticate();
  await denied(() => prepare(randomUUID()), 'PT401');
  const launchId = randomUUID();
  for (const [mode, milliseconds] of [['35', 2100000], ['52.5', 3150000], ['70', 4200000], ['unlimited', null]]) {
    const id = assignments.get(mode);
    const prepared = await prepare(id, mode === '52.5' ? launchId : randomUUID());
    assert.equal(prepared.sitting.budget_ms, milliseconds);
    assert.equal(prepared.sitting.phase, 'ready');
    assert.equal(prepared.sitting.clock_anchor_at, null);
    assert.equal(prepared.sitting.homework_assignment_id, id);
    assert.deepEqual(prepared.sitting.frozen_qids, rc.qids);
    assert.equal(prepared.receipt.command.operation, 'create');
    assert.equal((await prepare(id)).sitting.id, prepared.sitting.id);
    const started = await writer(command(prepared.sitting, 'start'));
    assert.equal(started.child.session.config.timerSeconds, milliseconds === null ? null : milliseconds / 1000);
  }
  const launched = await prepare(halfId, launchId);
  assert.equal(launched.replayed, true);
  await denied(() => prepare(halfId, launchId, 'different-device'), 'PT412');
  const directManual = {
    workKind: 'standalone-section', workId: randomUUID(), commandId: randomUUID(), deviceId: device,
    expectedRevision: 0, writerEpoch: 0, operation: 'create',
    payload: { kind: 'rc', pt: 140, section: rc.section, pace: 'standard' },
  };
  await denied(() => get('select public.create_timed_section_v1($1::jsonb)', [JSON.stringify(directManual)]), 'PT401');
  await denied(() => db.query("update public.homework_assignments set status='completed' where id=$1", [halfId]), '42501');
  await denied(() => get('select public.fixture_unsafe_legacy_finish($1)', [halfId]), '42501');
  const paused = await writer(command(launched.sitting, 'pause'));
  assert.equal(paused.sitting.phase, 'paused');
  const resumed = await writer(command(paused.sitting, 'resume'));
  assert.equal(resumed.sitting.budget_ms, 3150000);
  const first = rc.questions[0];
  const checkpoint = await writer(command(resumed.sitting, 'checkpoint', {
    currentIndex: 0,
    answers: [{ attemptId: randomUUID(), questionId: first.questionId, passageId: first.passageId,
      selected: 'C', isCorrect: true, timeMs: 500, flagged: false, eliminations: [] }],
  }));
  const close = command(checkpoint.sitting, 'close');
  const result = await writer(close);
  assert.equal(result.sitting.phase, 'complete');
  assert.equal(result.sitting.result.correct, 1);
  assert.equal((await writer(close)).replayed, true);
  assert.equal((await prepare(halfId)).sitting.id, result.sitting.id);
  await authenticate(other);
  await denied(() => read(result.sitting.id), 'PT401');
  await admin();
  const complete = await get('select status,completed_at,score from public.homework_assignments where id=$1', [halfId]);
  assert.equal(complete.status, 'completed');
  assert.ok(complete.completed_at);
  assert.equal(Number(complete.score), Math.round(10000 / rc.qids.length) / 100);
  const source = await get('select status,completed_at from public.classroom_items where source_id=$1', [halfId]);
  assert.equal(source.status, 'completed');
  assert.deepEqual(source.completed_at, complete.completed_at);
  assert.equal((await get("select count(*)::int n from public.homework_assignments where status='completed'")).n, 1);

  await db.query('update public.profiles set has_drill_access=true where class_id=$1', [owner]);
  await authenticate();
  const manual = (await get('select public.create_timed_section_v1($1::jsonb) response', [JSON.stringify(directManual)])).response;
  assert.equal(manual.sitting.source_kind, 'manual-canonical');
  assert.equal(manual.sitting.homework_assignment_id, null);
  assert.equal((await writer(command(manual.sitting, 'start'))).sitting.phase, 'running');
  console.log('PASS: protected RC assignments use all four exact clocks, retain one sitting across retries, close only the bound assignment, and preserve manual practice.');
} finally {
  await db.close();
}
