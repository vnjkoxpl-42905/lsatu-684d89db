// Real PostgreSQL only: fresh diagnostic database, retained after verification.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {owner} from './timed-pt-writer-fixtures.mjs';
const arg=name=>process.argv[process.argv.indexOf(name)+1];
for(const flag of ['--pg-module','--port','--data-dir'])if(!process.argv.includes(flag))throw new Error('Required '+flag);
assert.equal(Number(arg('--port')),55437);
const {default:pg}=await import(pathToFileURL(resolve(arg('--pg-module'))).href);
const clients=[];
async function connect(database='postgres',user='lsatu_test') {
 const client=new pg.Client({host:'127.0.0.1',port:55437,user,database,application_name:'lsatu-standalone-catalog-preservation'});
 await client.connect();clients.push(client);await client.query("set statement_timeout='60s'");return client;
}
try {
 const root=await connect();const normalize=path=>path.replaceAll('\\','/').toLowerCase();
 assert.equal(normalize((await root.query('show data_directory')).rows[0].data_directory),normalize(resolve(arg('--data-dir'))));
 const suffix=randomUUID().replaceAll('-','');const migration='lsatu_catalog_migration_'+suffix;const database='lsatu_catalog_'+suffix;
 await root.query(`create role ${migration} login nosuperuser createrole createdb bypassrls`);
 await root.query(`grant timed_pt_executor,timed_section_executor to ${migration} with admin true,set false,inherit false`);
 await root.query(`create database ${database} owner ${migration}`);
 const client=await connect(database);await client.query(`set role ${migration}`);
 const initial=(await client.query('select session_user,current_user')).rows[0];
 const options=(await client.query("select r.rolname,m.admin_option,m.set_option,m.inherit_option from pg_auth_members m join pg_roles r on r.oid=m.roleid where member=(select oid from pg_roles where rolname=current_user) order by r.rolname")).rows;
 globalThis.standaloneCatalogAdminSql=`set role ${migration}`;
 globalThis.standaloneCatalogTestDb={
  query:(sql,args)=>client.query(sql,args),
  exec:async sql=>{const result=await client.query(sql);return Array.isArray(result)?result:[result];},
  close:async()=>{},
 };
 await import('./standalone-section-catalog-upgrade.mjs');
 assert.deepEqual((await client.query('select session_user,current_user')).rows[0],initial);
 const after=(await client.query("select r.rolname,m.admin_option,m.set_option,m.inherit_option from pg_auth_members m join pg_roles r on r.oid=m.roleid where member=(select oid from pg_roles where rolname=current_user) order by r.rolname")).rows;
 // Original PT/section installation can add its own grantor rows. The shared
 // harness compares exact membership immediately before/after this upgrade.
 assert.ok(options.every(saved=>after.some(row=>JSON.stringify(row)===JSON.stringify(saved))));
 assert.ok(after.every(row=>!row.set_option&&!row.inherit_option));
 // Actual ordinary login cannot escalate even though the installer session is privileged.
 const ordinary='lsatu_catalog_student_'+suffix;await root.query(`create role ${ordinary} login nosuperuser nocreaterole nocreatedb nobypassrls noinherit;grant authenticated to ${ordinary} with set true`);
 const student=await connect(database,ordinary);await student.query('set role authenticated');
 await student.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 const authorityBefore=(await client.query('select to_jsonb(s) value from public.timed_section_sittings_v1 s order by id')).rows;
 assert.equal((await student.query('select public.timed_section_capability_v1() result')).rows[0].result.enabled,true);
 const owned=(await student.query('select id from public.timed_section_sittings_v1 where owner_id=$1 order by id limit 1',[owner])).rows[0];
 assert.ok(owned);const read=(await student.query('select public.read_timed_section_v1($1) result',[owned.id])).rows[0].result;
 assert.equal(read.sitting.owner_id,owner);assert.equal(read.sitting.id,owned.id);
 assert.deepEqual((await client.query('select to_jsonb(s) value from public.timed_section_sittings_v1 s order by id')).rows,authorityBefore);
 await assert.rejects(()=>student.query('set role timed_section_executor'),e=>e.code==='42501');
 await assert.rejects(()=>student.query('insert into public.timed_section_content_manifests_v1 values(null,1,\'lr\',1,\'{}\')'),e=>e.code==='42501');
 console.log(JSON.stringify({realPostgres:true,managedRole:true,effectiveRolePreserved:true,membershipOptionsPreserved:true,ordinarySetExecutorDenied:true,ordinaryCapabilityRead:true,ordinaryOwnedRead:true,ordinaryReadNoMutations:true,database,retained:true,deployed:false}));
}finally{await Promise.all(clients.map(client=>client.end()));}
