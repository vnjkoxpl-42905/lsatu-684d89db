// Deployment compatibility probe for Lovable's non-superuser CREATEROLE role.
// Runs only in an explicitly verified, isolated synthetic PostgreSQL cluster.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { setupSql, owner, blueprint, manifestHash, createCommand, commandFor } from './timed-pt-writer-fixtures.mjs';
const argument = name => process.argv[process.argv.indexOf(name) + 1];
for (const flag of ['--pg-module','--port','--data-dir']) if (!process.argv.includes(flag)) throw new Error(`Required ${flag}`);
const { default: pg } = await import(pathToFileURL(resolve(argument('--pg-module'))).href);
const settings = { host: '127.0.0.1', port: Number(argument('--port')), user: 'lsatu_test', database: 'postgres' };
const clients = [];
const normalize = value => value.replaceAll('\\','/').replace(/\/$/,'').toLowerCase();
async function connect(user = settings.user, database = settings.database) {
  const client = new pg.Client({ ...settings, user, database }); await client.connect(); clients.push(client);
  await client.query("set statement_timeout='15s'"); return client;
}
try {
  const controller = await connect();
  const directory = (await controller.query('show data_directory')).rows[0].data_directory;
  assert.equal(normalize(directory), normalize(resolve(argument('--data-dir'))));
  assert.ok(/lsatu-pg-atomic-/.test(directory));
  const suffix = randomUUID().replaceAll('-','');
  const role = `lsatu_migration_${suffix}`, database = `lsatu_role_${suffix}`;
  await controller.query(`create role ${role} login nosuperuser createrole createdb bypassrls`);
  // CREATEROLE grants ADMIN but no SET membership on newly created PG17 roles.
  // Reproduce that state for the executor shared by our prior synthetic tests.
  await controller.query(`grant timed_pt_executor to ${role} with admin true, set false, inherit false`);
  await controller.query(`create database ${database} owner ${role}`);
  const deployer = await connect(role, database);
  assert.equal((await deployer.query("select pg_has_role(current_user,'timed_pt_executor','SET') as allowed")).rows[0].allowed, false);
  await deployer.query(setupSql.replace('create role authenticated; create role anon;', () => ''));
  const authOwner = `lsatu_auth_owner_${suffix}`;
  await controller.query(`create role ${authOwner} nologin nosuperuser nocreaterole nocreatedb nobypassrls`);
  const schemaController = await connect(settings.user, database);
  await schemaController.query(`alter schema auth owner to ${authOwner}`);
  await schemaController.query(`alter function auth.uid() owner to ${authOwner}`);
  await schemaController.query(`alter table auth.users owner to ${authOwner}`);
  await schemaController.query(`grant usage on schema auth to ${role},authenticated,anon`);
  await schemaController.query(`grant references on auth.users to ${role}`);
  assert.equal((await deployer.query("select has_schema_privilege(current_user,'auth','USAGE WITH GRANT OPTION') as allowed")).rows[0].allowed, false);
  for (const name of ['2026-09-30-timed-pt-control-foundation.sql','2026-09-30-timed-pt-writer.sql']) {
    await deployer.query(await readFile(new URL(`../../docs/implementation-plans/artifacts/${name}`, import.meta.url), 'utf8'));
  }
  assert.equal((await deployer.query("select rolname from pg_roles where rolname=current_user and not rolsuper and rolcreaterole and rolbypassrls")).rows.length, 1);
  assert.equal((await deployer.query("select pg_has_role(current_user,'timed_pt_executor','SET') as allowed")).rows[0].allowed, false);
  assert.equal((await deployer.query("select pg_has_role('authenticated','timed_pt_executor','MEMBER') as allowed")).rows[0].allowed, false);
  assert.equal((await deployer.query("select has_schema_privilege('timed_pt_executor','auth','USAGE') as allowed")).rows[0].allowed, false);
  const functionOwners = (await deployer.query("select distinct r.rolname from pg_proc p join pg_roles r on r.oid=p.proowner where p.proname in ('create_timed_practice_test_v1','commit_timed_work_v1','read_timed_practice_test_v1')")).rows;
  assert.deepEqual(functionOwners, [{ rolname: 'timed_pt_executor' }]);
  await deployer.query('insert into public.timed_content_manifests_v1 values($1,140,$2::jsonb)', [manifestHash, JSON.stringify(blueprint)]);
  await deployer.query('update public.timed_pt_configuration_v1 set enabled=true,manifest_sha256=$1,lease_ms=45000', [manifestHash]);
  const ordinaryRole = `lsatu_role_client_${suffix}`;
  await controller.query(`create role ${ordinaryRole} login nosuperuser nocreaterole nocreatedb nobypassrls noinherit`);
  await controller.query(`grant authenticated to ${ordinaryRole} with set true`);
  const ordinary = await connect(ordinaryRole, database);
  await ordinary.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  await ordinary.query('set role authenticated');
  await assert.rejects(ordinary.query('set role timed_pt_executor'), error => error.code === '42501');
  const command = createCommand('managed-role-created', randomUUID());
  const created = (await ordinary.query('select public.create_timed_practice_test_v1($1::jsonb) as result', [JSON.stringify(command)])).rows[0].result;
  const started = (await ordinary.query('select public.commit_timed_work_v1($1::jsonb) as result', [JSON.stringify(commandFor(created.parent,'start-leg',{},randomUUID()))])).rows[0].result;
  assert.equal(started.checkpoint.record.user_id, owner);
  console.log(JSON.stringify({ assertions: 10, database, nonSuperuserDeployment: true, separateAuthSchemaOwner: true, syntheticOnly: true, productionWrites: false }));
} finally { await Promise.allSettled(clients.map(client => client.end())); }
