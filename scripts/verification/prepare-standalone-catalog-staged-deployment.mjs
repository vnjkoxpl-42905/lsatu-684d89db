// The SQL tool has a request-size limit. Install the schema first, then load
// immutable content in bounded, independently atomic and idempotent batches.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {preservingDeployment} from './build-preserving-deployment.mjs';
const directory=resolve('docs/implementation-plans/artifacts');
const tables=['practice_test_runs','attempts','bootcamp_kv','section_history','rc_drill_sessions','rc_attempts','wrong_answer_journal','profiles','user_roles','practice_test_assignments','timed_pt_configuration_v1','timed_content_manifests_v1','timed_pt_receipts_v1','timed_pt_lr_bindings_v1','timed_section_configuration_v1','timed_section_sittings_v1','timed_section_receipts_v1','timed_section_source_bindings_v1','review_episodes_v1','review_episode_events_v1','intro_lr_attempts'];
const seed=await readFile(resolve(directory,'timed-section-all-sections-v2.generated.sql'),'utf8');
const statements=seed.match(/do \$catalog\$[\s\S]*?end \$catalog\$;/g);
if(!statements||statements.length!==236)throw new Error('Expected all236 immutable seed statements');
const body=seed.replace(/^--[^\n]*\nbegin;\n/,'').replace(/\ncommit;\n$/,'');
if(statements.join('\n')!==body)throw new Error('Full seed statement parity failed');
const batches=[];let pending=[];
const header='-- Bounded immutable standalone seed. Does not activate configuration.\nbegin;\n';
const sqlFor=items=>header+items.join('\n')+'\ncommit;\n';
for(const statement of statements){
 if(pending.length && (pending.length>=20||Buffer.byteLength(sqlFor([...pending,statement]))>48000)){batches.push(pending);pending=[];}
 pending.push(statement);
}
if(pending.length)batches.push(pending);
if(batches.flat().join('\n')!==body)throw new Error('Batch/full-seed equality failed');
const target=resolve(directory,'standalone-catalog-seed-batches-v2');await mkdir(target,{recursive:true});
const report=[];
for(let index=0;index<batches.length;index++){
 const sql=sqlFor(batches[index]);if(Buffer.byteLength(sql)>48000)throw new Error('Oversized seed section');
 const name=`batch-${String(index+1).padStart(2,'0')}.sql`;await writeFile(resolve(target,name),sql);
 report.push({name,sections:batches[index].length,bytes:Buffer.byteLength(sql),sha256:createHash('sha256').update(sql).digest('hex')});
}
const schema=preservingDeployment(await readFile(resolve(directory,'2026-09-30-standalone-section-catalog-upgrade.sql'),'utf8'),tables);
const outputIndex=process.argv.indexOf('--output');if(outputIndex<0)throw new Error('Pass --output schema-only SQL temp path');
const output=resolve(process.argv[outputIndex+1]);await writeFile(output,schema);
const manifest={schemaOutput:output,schemaSha256:createHash('sha256').update(schema).digest('hex'),schemaBytes:Buffer.byteLength(schema),preservedTables:tables,sections:236,activation:false,maximumBatchBytes:48000,batches:report};
await writeFile(resolve(target,'batch-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest));
