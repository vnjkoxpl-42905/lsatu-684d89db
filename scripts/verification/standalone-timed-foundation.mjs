import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setupSql, owner, other, blueprint, manifestHash } from './timed-pt-writer-fixtures.mjs';

const flag = process.argv.indexOf('--pglite-module');
const modulePath = flag >= 0 ? process.argv[flag + 1] : process.env.PGLITE_MODULE;
if (!modulePath) throw new Error('Pass --pglite-module /absolute/path/to/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(resolve(modulePath)).href);
const db = new PGlite();
let checks = 0;
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const denied = async (action, code) => { await assert.rejects(action, error => !code || error.code === code); checks++; };
const role = async name => { await db.exec('reset role'); await db.exec(`set role ${name}`); };
const auth = async id => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role authenticated');
};
const insert = async (id, kind = 'lr', section = 1, overrides = {}) => {
  const frozen = blueprint.legs.find(leg => leg.kind === kind && leg.section === section);
  const values = { owner, kind, section, sourceKey: `${kind}::pt140-s${section}`, frozen, qids: frozen.qids, ...overrides };
  return db.query(`insert into public.timed_section_sittings_v1
    (id,owner_id,kind,source_kind,source_key,pt,section,manifest_sha256,frozen_source,frozen_qids,pace,budget_ms,lease_ms,device_id)
    values($1,$2,$3,'manual-canonical',$4,140,$5,$6,$7,$8,'standard',2100000,30000,'device-a')`,
  [id, values.owner, values.kind, values.sourceKey, values.section, manifestHash, JSON.stringify(values.frozen), values.qids]);
};
try {
  await db.exec(setupSql);
  await db.exec(`create table public.timed_content_manifests_v1(manifest_sha256 text,pt integer,blueprint jsonb,primary key(manifest_sha256,pt));
    alter table public.timed_content_manifests_v1 enable row level security;`);
  await db.query('insert into public.timed_content_manifests_v1 values($1,140,$2)', [manifestHash, JSON.stringify(blueprint)]);
  const before = (await db.query("select jsonb_agg(t) as rows from public.profiles t")).rows[0].rows;
  await db.exec(await readFile(new URL('../../docs/implementation-plans/artifacts/2026-09-30-standalone-timed-control-foundation.sql', import.meta.url), 'utf8'));
  check((await db.query('select enabled from public.timed_section_configuration_v1')).rows[0].enabled, false);
  check((await db.query("select rolcanlogin,rolsuper,rolbypassrls from pg_roles where rolname='timed_section_executor'")).rows[0], { rolcanlogin: false, rolsuper: false, rolbypassrls: false });
  check((await db.query("select pg_has_role('authenticated','timed_section_executor','MEMBER') as allowed")).rows[0].allowed, false);
  check((await db.query("select has_schema_privilege('timed_section_executor','auth','USAGE') as allowed")).rows[0].allowed, false);
  check((await db.query("select jsonb_agg(t) as rows from public.profiles t")).rows[0].rows, before);
  await auth(owner);
  check((await db.query('select public.timed_section_capability_v1() as capability')).rows[0].capability.enabled, false);
  const id = randomUUID();
  await denied(() => insert(id), '42501');
  // This harness's session_user is the superuser; SET ROLE is not an
  // ordinary-login membership test. The catalog membership assertion above is.
  await role('anon');
  await denied(() => db.query('select public.timed_section_capability_v1()'), '42501');
  await role('timed_section_executor');
  await insert(id);
  check((await db.query('select count(*)::integer n from public.timed_section_sittings_v1')).rows[0].n, 1);
  await denied(() => insert(randomUUID()), '23505');
  await denied(() => insert(randomUUID(), 'lr', 3, { frozen: { ...blueprint.legs[2], qids: ['foreign'] }, qids: ['foreign'] }), '42501');
  await denied(() => insert(randomUUID(), 'lr', 3, { qids: [...blueprint.legs[2].qids].reverse() }), '42501');
  await denied(() => db.query("update public.timed_section_sittings_v1 set owner_id=$1,revision=revision+1 where id=$2", [other, id]), '42501');
  await denied(() => db.query("update public.timed_section_sittings_v1 set elapsed_ms=-1,revision=revision+1 where id=$1", [id]));
  await denied(() => db.query("update public.timed_section_sittings_v1 set revision=revision+2 where id=$1", [id]), '42501');
  await denied(() => db.query("update public.timed_section_sittings_v1 set device_id='device-b',revision=revision+1 where id=$1", [id]), '42501');
  await db.query("update public.timed_section_sittings_v1 set device_id='device-b',writer_epoch=writer_epoch+1,revision=revision+1 where id=$1", [id]);
  check((await db.query('select writer_epoch from public.timed_section_sittings_v1 where id=$1', [id])).rows[0].writer_epoch, 2);
  await denied(() => db.query("update public.timed_section_sittings_v1 set phase='running',revision=revision+1 where id=$1", [id]), '23514');
  await db.query("update public.timed_section_sittings_v1 set phase='running',clock_anchor_at=clock_timestamp(),lease_expires_at=clock_timestamp()+interval '30 seconds',revision=revision+1 where id=$1", [id]);
  await db.query("update public.timed_section_sittings_v1 set phase='paused',clock_anchor_at=null,lease_expires_at=null,elapsed_ms=100,revision=revision+1 where id=$1", [id]);
  await denied(() => db.query("update public.timed_section_sittings_v1 set elapsed_ms=99,revision=revision+1 where id=$1", [id]), '42501');
  await db.query("insert into public.timed_section_source_bindings_v1(sitting_id,owner_id,kind,namespace,record_id) values($1,$2,'lr','practice_sessions',$3)", [id, owner, `timed-section::${id}`]);
  await denied(() => db.query("update public.timed_section_source_bindings_v1 set owner_id=$1 where sitting_id=$2", [other, id]), '42501');
  const commandId = randomUUID();
  await db.query('insert into public.timed_section_receipts_v1(owner_id,sitting_id,command_id,canonical_command,committed_revision,result) values($1,$2,$3,$4,4,$5)', [owner, id, commandId, '{}', '{}']);
  await denied(() => db.query('insert into public.timed_section_receipts_v1(owner_id,sitting_id,command_id,canonical_command,committed_revision,result) values($1,$2,$3,$4,4,$5)', [owner, id, commandId, '{}', '{}']), '23505');
  await denied(() => db.query('insert into public.timed_section_receipts_v1(owner_id,sitting_id,command_id,canonical_command,committed_revision,result) values($1,$2,$3,$4,4,$5)', [other, id, randomUUID(), '{}', '{}']), '23503');
  await db.query("update public.timed_section_sittings_v1 set phase='complete',result='{}',completed_at=clock_timestamp(),revision=revision+1 where id=$1", [id]);
  await denied(() => db.query("update public.timed_section_sittings_v1 set revision=revision+1 where id=$1", [id]), '42501');
  await insert(randomUUID());
  const rcId = randomUUID();
  await insert(rcId, 'rc', 2);
  await denied(() => db.query("insert into public.timed_section_source_bindings_v1(sitting_id,owner_id,kind,namespace,record_id) values($1,$2,'lr','practice_sessions',$3)", [rcId, owner, `timed-section::${rcId}`]), '42501');
  await auth(owner);
  check((await db.query('select count(*)::integer n from public.timed_section_sittings_v1')).rows[0].n, 3);
  check((await db.query('select count(*)::integer n from public.timed_section_receipts_v1')).rows[0].n, 1);
  await denied(() => db.query("update public.timed_section_sittings_v1 set revision=revision+1 where id=$1", [rcId]), '42501');
  await denied(() => db.query('delete from public.timed_section_sittings_v1 where id=$1', [rcId]), '42501');
  await auth(other);
  check((await db.query('select count(*)::integer n from public.timed_section_sittings_v1')).rows[0].n, 0);
  check((await db.query('select count(*)::integer n from public.timed_section_receipts_v1')).rows[0].n, 0);
  check((await db.query('select count(*)::integer n from public.timed_section_source_bindings_v1')).rows[0].n, 0);
  console.log(JSON.stringify({ status: 'passed', checks, scope: 'inactive-section-foundation-only', deployed: false }));
} finally { await db.close(); }
