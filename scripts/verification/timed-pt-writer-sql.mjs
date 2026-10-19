import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setupSql, owner, other, blueprint, manifestHash, createCommand, commandFor } from './timed-pt-writer-fixtures.mjs';
const flag = process.argv.indexOf('--pglite-module');
const modulePath = flag >= 0 ? process.argv[flag+1] : process.env.PGLITE_MODULE;
if (!modulePath) throw new Error('Pass --pglite-module absolute/path/to/dist/index.js');
const { PGlite } = await import(pathToFileURL(resolve(modulePath)).href);
const db = new PGlite();
let checks = 0;
const check = (actual, expected) => { assert.deepEqual(actual,expected); checks++; };
const auth = async (id=owner) => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  await db.exec('set role authenticated');
};
const rpc = async (name,command) => (await db.query(`select public.${name}($1::jsonb) as result`,[JSON.stringify(command)])).rows[0].result;
const denied = async (action,code) => { await assert.rejects(action,error=>!code||error.code===code); checks++; };
try {
  await db.exec(setupSql);
  for (const name of ['2026-09-30-timed-pt-control-foundation.sql','2026-09-30-timed-pt-writer.sql']) {
    await db.exec(await readFile(new URL('../../docs/implementation-plans/artifacts/'+name,import.meta.url),'utf8'));
  }
  // Exercise the incremental artifact's helper bodies, not only fresh install.
  await db.exec(await readFile(new URL('../../docs/implementation-plans/artifacts/2026-09-30-timed-pt-checkpoint-metadata-upgrade.sql',import.meta.url),'utf8'));
  check((await db.query("select has_schema_privilege('timed_pt_executor','auth','USAGE') as allowed")).rows[0].allowed,false);
  check((await db.query("select has_function_privilege('authenticated','public.timed_pt_actor_v1()','EXECUTE') as allowed")).rows[0].allowed,false);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]); await db.exec('set role timed_pt_executor');
  check((await db.query('select public.timed_pt_actor_v1() as actor')).rows[0].actor,owner);
  await denied(()=>db.query('select auth.uid()'),'42501');
  await auth();
  check((await db.query('select public.timed_practice_test_capability_v1() as result')).rows[0].result.enabled,false);
  await denied(()=>rpc('create_timed_practice_test_v1',createCommand('inactive',randomUUID())),'PT503');
  await db.exec('reset role');
  await db.query('insert into public.timed_content_manifests_v1 values($1,140,$2)',[manifestHash,JSON.stringify(blueprint)]);
  await db.query('update public.timed_pt_configuration_v1 set enabled=true,manifest_sha256=$1,lease_ms=45000',[manifestHash]);
  await auth();
  const creation=createCommand('test-run',randomUUID());
  let response=await rpc('create_timed_practice_test_v1',creation);
  check(response.parent.timed_phase,'ready'); check(response.receipt.ownerId,owner);
  check((await rpc('create_timed_practice_test_v1',creation)).replayed,true);
  let parent=response.parent;
  const commit=async(op,payload={},device='device-a')=>{
    const command=commandFor(parent,op,payload,randomUUID(),device);
    response=await rpc('commit_timed_work_v1',command); parent=response.parent; return command;
  };
  const start=await commit('start-leg');
  check(response.checkpoint.record.question_queue,blueprint.legs[0].qids);
  check(response.checkpoint.record.user_id,owner);
  await denied(()=>rpc('commit_timed_work_v1',{...start,commandId:randomUUID()}),'PT409');
  await denied(()=>rpc('commit_timed_work_v1',{...start,payload:{forged:true}}),'PT412');
  await commit('checkpoint',{currentIndex:1,answers:[{qid:'PT140-S1-Q1',selected:'A',correct:false,timeMs:500}]});
  check(response.checkpoint.record.attempts.length,1);
  const checkpointCommand=await commit('checkpoint',{currentIndex:0,answers:[]});
  check(response.checkpoint.record.attempts.length,1);
  await denied(()=>rpc('commit_timed_work_v1',commandFor(parent,'checkpoint',{currentIndex:0,answers:[{qid:'foreign',selected:'A',correct:true,timeMs:1}]},randomUUID())),'PT422');
  await denied(()=>rpc('commit_timed_work_v1',commandFor(parent,'checkpoint',{currentIndex:0,answers:[],regulationAnsweredQids:['PT140-S1-Q2']},randomUUID())),'PT409');
  await commit('checkpoint',{currentIndex:0,answers:[{qid:'PT140-S1-Q1',selected:'A',correct:false,timeMs:500,flagged:true,switchCount:2}]});
  await commit('checkpoint',{currentIndex:0,answers:[{qid:'PT140-S1-Q1',selected:'A',correct:false,timeMs:500}]});
  check(response.checkpoint.record.attempts[0].flagged,true); check(response.checkpoint.record.attempts[0].switch_count,2);
  const validLr={qid:'PT140-S1-Q1',selected:'A',correct:false,timeMs:500};
  for (const patch of [{qid:null},{qid:undefined},{timeMs:'500'},{timeMs:0.5},{flagged:'false'},{switchCount:'0'},{selected:1}]) {
    await denied(()=>rpc('commit_timed_work_v1',commandFor(parent,'checkpoint',{currentIndex:0,answers:[{...validLr,...patch}]},randomUUID())),'PT422');
  }
  await denied(()=>rpc('commit_timed_work_v1',commandFor(parent,'checkpoint',{currentIndex:0,answers:[validLr,validLr]},randomUUID())),'PT422');
  const blankState={qid:'PT140-S1-Q2',timeMs:900,flagged:true,eliminations:['A','E']};
  await commit('checkpoint',{currentIndex:1,answers:[],questionStates:[blankState]});
  check(response.checkpoint.record.question_states,[blankState]);check(response.checkpoint.record.attempts.length,1);
  for(const patch of [{qid:null},{qid:'foreign'},{timeMs:'900'},{flagged:null},{eliminations:['Z']},{eliminations:['A','A']}]) {
    await denied(()=>rpc('commit_timed_work_v1',commandFor(parent,'checkpoint',{currentIndex:1,answers:[],questionStates:[{...blankState,...patch}]},randomUUID())),'PT422');
  }
  await denied(()=>rpc('commit_timed_work_v1',commandFor(parent,'checkpoint',{currentIndex:1,answers:[],questionStates:[blankState,blankState]},randomUUID())),'PT422');
  await denied(()=>rpc('commit_timed_work_v1',commandFor(parent,'checkpoint',{currentIndex:1,answers:[],questionStates:[{...blankState,timeMs:100}]},randomUUID())),'PT409');
  await denied(()=>rpc('commit_timed_work_v1',{...commandFor(parent,'heartbeat',{},randomUUID()),expectedRevision:String(parent.revision)}),'PT422');
  await denied(()=>db.query("update public.bootcamp_kv set data='{}' where user_id=$1",[owner]),'42501');
  await denied(()=>db.query("insert into public.bootcamp_kv(user_id,table_name,record_id,data) values($1,'practice_sessions','alternate',$2)",[owner,JSON.stringify({completion_id:'drill::practice-test::test-run::leg-0'})]),'42501');
  await auth(other);
  await denied(()=>db.query("insert into public.bootcamp_kv(user_id,table_name,record_id,data) values($1,'practice_sessions','alternate',$2)",[other,JSON.stringify({pool_slug:'drill::practice-test::test-run::leg-0'})]),'42501');
  await denied(()=>db.query("select public.read_timed_practice_test_v1('test-run')"),'PT401');
  await denied(()=>rpc('create_timed_practice_test_v1',createCommand('foreign-access',randomUUID())),'PT401');
  await auth();
  await commit('pause'); check(parent.timed_phase,'leg-paused');
  await commit('resume'); check(parent.timed_phase,'leg-running');
  await db.exec('reset role');
  await db.exec("create function public.fixture_fail_waj() returns trigger language plpgsql as $$ begin raise exception 'injected WAJ failure' using errcode='PT999'; end $$; create trigger fixture_waj_failure before insert on public.wrong_answer_journal for each row execute function public.fixture_fail_waj();");
  await auth();
  const closing=commandFor(parent,'close-leg',{answerKeys:blueprint.legs[0].qids.map(qid=>({qid,correctAnswer:'B'}))},randomUUID());
  await denied(()=>rpc('commit_timed_work_v1',closing),'PT999');
  check((await db.query("select revision from public.practice_test_runs where id='test-run'")).rows[0].revision,parent.revision);
  check((await db.query('select count(*)::int as n from public.attempts')).rows[0].n,0);
  await db.exec('reset role'); await db.exec('drop trigger fixture_waj_failure on public.wrong_answer_journal');
  await db.exec('create temporary table wrong_answer_journal (like public.wrong_answer_journal including all)'); await auth();
  await commit('close-leg',{answerKeys:blueprint.legs[0].qids.map(qid=>({qid,correctAnswer:'B'})),analysis:{}});
  check(parent.current_leg,1);
  await db.exec('reset role');
  const blankStats=(await db.query('select questions_json from public.section_history')).rows[0].questions_json[1];
  check(blankStats.timeMs,900);check(blankStats.flagged,true);check(blankStats.eliminations,['A','E']);
  await auth();
  check((await db.query('select count(*)::int as n from public.attempts')).rows[0].n,1);
  await db.exec('reset role');
  check((await db.query('select count(*)::int as n from public.wrong_answer_journal')).rows[0].n,2);
  check((await db.query('select count(*)::int as n from pg_temp.wrong_answer_journal')).rows[0].n,0);
  await auth();
  await commit('start-leg'); check(response.checkpoint.kind,'rc');
  const answer={attemptId:randomUUID(),questionId:1001,passageId:101,selected:'C',isCorrect:true,timeMs:100};
  await commit('checkpoint',{currentIndex:1,answers:[answer]});
  for (const patch of [{questionId:'1001'},{passageId:null},{timeMs:'100'},{flagged:1},{selected:2},{isCorrect:null}]) {
    await denied(()=>rpc('commit_timed_work_v1',commandFor(parent,'checkpoint',{currentIndex:1,answers:[{...answer,...patch}]},randomUUID())),'PT422');
  }
  await denied(()=>rpc('commit_timed_work_v1',commandFor(parent,'checkpoint',{currentIndex:1,answers:[answer,answer]},randomUUID())),'PT422');
  await commit('checkpoint',{currentIndex:0,answers:[answer]}); check(response.checkpoint.attempts.length,1);
  await commit('checkpoint',{currentIndex:0,answers:[{...answer,flagged:true,eliminations:['A']}]});
  check(response.checkpoint.attempts[0].flagged,true); check(response.checkpoint.attempts[0].eliminations,['A']);
  const previousAnswerCommand=response.receipt.command;
  await commit('checkpoint',{currentIndex:0,answers:[{...answer,selected:'D',isCorrect:false,timeMs:300}]});
  check(response.checkpoint.attempts[0].id,answer.attemptId);check(response.checkpoint.attempts[0].selected,'D');
  check(response.checkpoint.attempts[0].time_ms,300);check(response.checkpoint.attempts.length,1);
  const revisited=await rpc('commit_timed_work_v1',previousAnswerCommand);
  check(revisited.receipt.command.payload.answers[0].selected,'C');check(revisited.checkpoint.attempts[0].selected,'D');
  await commit('checkpoint',{currentIndex:0,answers:[answer]});
  await denied(()=>rpc('commit_timed_work_v1',commandFor(parent,'checkpoint',{currentIndex:1,answers:[{...answer,attemptId:randomUUID()}]},randomUUID())),'PT409');
  await denied(()=>db.query('update public.rc_drill_sessions set practice_test_run_id=null,practice_test_leg=null,config=\'{}\''),'42501');
  await denied(()=>rpc('commit_timed_work_v1',commandFor(parent,'close-leg',{analysis:'bad'},randomUUID())),'PT422');
  const rcSessionId=response.checkpoint.session.id;
  await commit('close-leg',{analysis:{timedTelemetry:{visits:{'1001':2}}}}); check(parent.current_leg,2); check(parent.break_taken,false);
  await db.exec('reset role');check((await db.query('select config from public.rc_drill_sessions where id=$1',[rcSessionId])).rows[0].config.analysis,{timedTelemetry:{visits:{'1001':2}}});await auth();
  await denied(()=>rpc('commit_timed_work_v1',commandFor(parent,'start-leg',{},randomUUID())),'PT409');
  await commit('start-break'); await commit('heartbeat'); check(parent.timed_phase,'break-running');
  await commit('pause'); await commit('resume'); await commit('finish-break');
  check(parent.break_taken,true);
  await commit('start-leg'); await commit('close-leg',{answerKeys:blueprint.legs[2].qids.map(qid=>({qid,correctAnswer:'D'}))});
  check(parent.status,'complete'); check(parent.raw_total,6); check(parent.raw_correct,1);
  check(parent.score_source,'estimate'); check(parent.scaled_score,126);
  for (const [raw,expected] of [[0,120],[6,120],[11,125],[17,130],[23,135],[29,140],[36,145],[43,150],[50,155],[57,160],[63,165],[68,170],[72,175],[75,180]]) {
    check((await db.query('select public.timed_pt_estimated_score_v1($1,75) as score',[raw])).rows[0].score,expected);
  }
  check((await db.query('select public.timed_pt_estimated_score_v1(50,100) as score')).rows[0].score,146);
  check((await db.query('select public.timed_pt_estimated_score_v1(0,0) as score')).rows[0].score,120);
  await denied(()=>rpc('commit_timed_work_v1',commandFor(parent,'resume',{},randomUUID())),'PT409');
  const replay=await rpc('commit_timed_work_v1',checkpointCommand);
  check(replay.parent.status,'complete'); check(replay.replayed,true); check(replay.receipt.committedRevision,checkpointCommand.expectedRevision+1);
  await db.exec('reset role');
  // Protected OLD fields prevent source clearing/moving; legacy RC rows remain editable.
  await db.query("insert into public.rc_drill_sessions(user_id,config,passage_ids) values($1,'{}',array[101])",[owner]);
  await auth();
  await db.query("update public.rc_drill_sessions set excluded_from_analytics=true where practice_test_run_id is null"); checks++;
  await db.exec('reset role');
  await db.query('update public.profiles set has_practice_access=true where class_id=$1',[owner]); await auth();
  let lease=await rpc('create_timed_practice_test_v1',createCommand('lease-run',randomUUID()));
  lease=await rpc('commit_timed_work_v1',commandFor(lease.parent,'start-leg',{},randomUUID()));
  await db.exec('reset role'); await db.exec('set role timed_pt_executor');
  const expired=(await db.query("update public.practice_test_runs set timed_running_anchor=clock_timestamp()-interval '100 seconds',timed_lease_expires_at=clock_timestamp()-interval '55 seconds',revision=revision+1 where id='lease-run' returning *")).rows[0];
  await auth();
  await denied(()=>rpc('commit_timed_work_v1',commandFor(expired,'heartbeat',{},randomUUID())),'PT410');
  lease=await rpc('commit_timed_work_v1',commandFor(expired,'claim',{},randomUUID(),'device-b'));
  check(lease.parent.timed_phase,'leg-paused'); check(lease.parent.timed_writer_epoch,2);
  assert.ok(lease.parent.timed_elapsed_ms>=45000 && lease.parent.timed_elapsed_ms<=45001); checks++;
  check(lease.checkpoint.record.elapsed_ms,lease.parent.timed_elapsed_ms);
  await denied(()=>rpc('commit_timed_work_v1',commandFor(expired,'checkpoint',{currentIndex:0,answers:[]},randomUUID())),'PT409');
  await db.exec('reset role');
  await db.query('update public.profiles set has_practice_access=false where class_id=$1',[owner]);
  await auth(); check((await rpc('commit_timed_work_v1',checkpointCommand)).replayed,true);
  await db.exec('reset role');
  await db.query('update public.profiles set has_practice_access=true where class_id=$1',[owner]); await auth();
  let repeated=await rpc('create_timed_practice_test_v1',createCommand('repeat-run',randomUUID()));
  repeated=await rpc('commit_timed_work_v1',commandFor(repeated.parent,'start-leg',{},randomUUID()));
  const repeatedClose=commandFor(repeated.parent,'close-leg',{answerKeys:blueprint.legs[0].qids.map(qid=>({qid,correctAnswer:'B'}))},randomUUID());
  await rpc('commit_timed_work_v1',repeatedClose); await rpc('commit_timed_work_v1',repeatedClose);
  await db.exec('reset role');
  check((await db.query("select revisit_count from public.wrong_answer_journal where qid='PT140-S1-Q1'")).rows[0].revisit_count,1);
  check((await db.query("select jsonb_array_length(history_json) as n from public.wrong_answer_journal where qid='PT140-S1-Q1'")).rows[0].n,2);
  await db.exec('reset role');
  await db.exec(await readFile(new URL('../../docs/implementation-plans/artifacts/timed-content-manifest-v1.generated.sql',import.meta.url),'utf8'));
  const catalog=JSON.parse(await readFile(new URL('../../docs/implementation-plans/artifacts/timed-content-manifest-v1.generated.json',import.meta.url),'utf8'));
  await db.query('update public.timed_pt_configuration_v1 set manifest_sha256=$1',[catalog.manifestSha256]);
  await db.query('update public.profiles set has_practice_access=true where class_id=$1',[owner]);
  await auth();
  for (const real of catalog.blueprints) {
    const envelope=createCommand('catalog-'+real.pt,randomUUID()); envelope.payload.pt=real.pt;
    const created=await rpc('create_timed_practice_test_v1',envelope);
    check(created.parent.timed_manifest,real);
  }
  console.log(`Generated manifest seed validated against the writer for ${catalog.blueprints.length} actual-source PrepTest blueprints.`);
  console.log(`Timed writer SQL passed ${checks} isolated assertions; local synthetic data only. Activation remains disabled in artifact.`);
} catch(error) { console.error(error); process.exitCode=1; }
finally { await db.close(); }
