// Isolated verification of docs/implementation-plans/artifacts/2026-11-20-sections-post-section-rebuild.sql
// Run: node scripts/verification/sections-post-section-rebuild-sql.mjs --pglite-module /abs/path/pglite/dist/index.js
// PGlite has one connection, so "concurrent" cases are checked as sequential
// interleavings; the advisory lock that serializes them in production is not
// exercised here.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setupSql, owner, other } from './timed-pt-writer-fixtures.mjs';

const flag = process.argv.indexOf('--pglite-module');
const modulePath = flag >= 0 ? process.argv[flag + 1] : process.env.PGLITE_MODULE;
if (!modulePath) throw new Error('Pass --pglite-module /absolute/path/to/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(resolve(modulePath)).href);
const db = new PGlite();
let checks = 0;
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const denied = async (action, code, label) => {
  await assert.rejects(action, (e) => !code || e.code === code, label); checks++;
};
const auth = async (id) => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
  await db.exec('set role authenticated');
};
const su = async () => db.exec('reset role');
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const count = async (sql, params = []) => Number((await one(sql, params)).n);

const open = (pool, opts = {}) => one(
  'select public.open_section_sitting_v1($1,$2,$3,$4,$5,$6) r',
  [pool, opts.known ?? null, opts.restart ?? false, opts.gen ?? null, opts.legacy ?? null, opts.sittingRecord ?? null],
).then((x) => x.r);
const close = (id, payload) => one('select public.close_standalone_section_v1($1,$2) r', [id, JSON.stringify(payload)]).then((x) => x.r);

const QIDS = ['q1', 'q2', 'q3'];
const payload = (answers = ['A', 'B', '-'], extra = {}) => {
  const questions = QIDS.map((qid, i) => ({
    qid, qnum: i + 1, qtype: 'Flaw', difficulty: 3, initialAnswer: answers[i], correctAnswer: 'A',
    initialCorrect: answers[i] === 'A', timeMs: 1000, switchCount: 0, flagged: false,
  }));
  const attempts = questions.filter((q) => q.initialAnswer !== '-').map((q) => ({
    qid: q.qid, pt: 105, section: 2, qnum: q.qnum, qtype: 'Flaw', level: 3, correct: q.initialCorrect, time_ms: 1000, selected_answer: q.initialAnswer,
  }));
  const journal = questions.filter((q) => !q.initialCorrect).map((q) => ({
    qid: q.qid, pt: 105, section: 2, qnum: q.qnum, qtype: 'Flaw', level: 3, item: { result: 0, chosen_answer: q.initialAnswer, correct_answer: 'A' },
  }));
  return {
    pt: 105, section: 2,
    history: { initial_score: questions.filter((q) => q.initialCorrect).length, initial_percent: 33, total_time_ms: 3000, avg_time_ms: 1000, unanswered_count: 1, by_qtype_json: {}, by_difficulty_json: {} },
    questions, analysis: { version: 1 }, attempts, journal, ...extra,
  };
};

try {
  await db.exec(setupSql);
  // Stubs for objects production has and the fixture does not.
  await db.exec(`
    create type public.app_role as enum ('admin','student');
    create table public.admins(user_id uuid primary key);
    create function public.has_role(_uid uuid, _role public.app_role) returns boolean language sql stable security definer as
      $$ select exists(select 1 from public.admins where user_id=_uid) and _role='admin' $$;
    grant execute on function public.has_role(uuid, public.app_role) to authenticated;
    alter table public.section_history add column br_score integer, add column br_total integer, add column br_percent numeric,
      add column br_delta integer, add column timed_section_sitting_id uuid;
    create table public.homework_assignments(id uuid primary key default gen_random_uuid(), student_id uuid, question_qids text[]);
    alter table public.homework_assignments enable row level security;
    grant execute on function public.append_waj_wrong(text,text,jsonb,integer,integer,integer,text,integer) to authenticated;
  `);
  const sql = await readFile(new URL('../../docs/implementation-plans/artifacts/2026-11-20-sections-post-section-rebuild.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  await db.exec(sql); // re-runnable
  checks++;

  const pool = 'drill::section::pt105-s2';

  // --- open: first open, resume, second tab ---------------------------------
  await auth(owner);
  const first = await open(pool);
  check(first.status, 'open', 'first open');
  check(first.generation, 1);
  const again = await open(pool);
  check(again.sitting_id, first.sitting_id, 'second tab gets the same sitting');
  const resumed = await open(pool, { known: first.sitting_id });
  check(resumed.sitting_id, first.sitting_id, 'resume with known id');

  // --- unauthenticated and anon are refused ---------------------------------
  await auth(null);
  await denied(() => open(pool), '42501', 'no auth.uid');
  await su(); await db.exec('set role anon');
  await denied(() => open(pool), '42501', 'anon has no execute');

  // --- bad pool key ---------------------------------------------------------
  await auth(owner);
  await denied(() => open('drill::timed-section::x'), '22023', 'protected namespace refused');

  // --- close-out: created, attempts and journal once ------------------------
  const created = await close(first.sitting_id, payload());
  check(created.status, 'created');
  const historyId = created.history_id;
  await su();
  check(await count('select count(*) n from public.section_history where client_sitting_id=$1', [first.sitting_id]), 1);
  check(await count('select count(*) n from public.attempts where user_id=$1', [owner]), 2, 'one attempt per answered question');
  check(await count("select count(*) n from public.wrong_answer_journal where class_id=$1", [owner]), 2, 'one journal row per miss');
  check(await count("select coalesce(sum(jsonb_array_length(history_json)),0) n from public.wrong_answer_journal where class_id=$1", [owner]), 2);
  check((await one("select history_json->0->>'sitting_id' s from public.wrong_answer_journal where class_id=$1 and qid='q2'", [owner])).s, first.sitting_id, 'journal item carries the sitting id');
  check((await one('select class_id, user_id, release_requires_br from public.section_history where id=$1', [historyId])), { class_id: owner, user_id: owner, release_requires_br: false });

  // --- retry / lost acknowledgment ------------------------------------------
  await auth(owner);
  const replay = await close(first.sitting_id, payload());
  check([replay.status, replay.history_id, replay.conflict], ['replayed', historyId, false], 'retry replays');
  const conflict = await close(first.sitting_id, payload(['B', 'B', 'B']));
  check([conflict.status, conflict.conflict], ['replayed', true], 'second tab with different answers gets conflict');
  await su();
  check(await count('select count(*) n from public.attempts where user_id=$1', [owner]), 2, 'no new attempts on replay');
  check(await count("select coalesce(sum(jsonb_array_length(history_json)),0) n from public.wrong_answer_journal where class_id=$1", [owner]), 2, 'no new journal items on replay');

  // --- reload after close: known id returns closed + history ----------------
  await auth(owner);
  const reload = await open(pool, { known: first.sitting_id });
  check([reload.status, reload.history_id], ['closed', historyId], 'reload of a closed sitting');
  await su();
  check(await count('select count(*) n from public.standalone_section_sittings where user_id=$1', [owner]), 1, 'no successor created');

  // --- new visit after close: generation 2 ----------------------------------
  await auth(owner);
  const g2 = await open(pool);
  check([g2.status, g2.generation], ['open', 2], 'retake opens generation 2');

  // --- restart, stale tab, duplicated restart -------------------------------
  const r1 = await open(pool, { restart: true, gen: 2 });
  check(r1.generation, 3, 'restart creates generation 3');
  const r1dup = await open(pool, { restart: true, gen: 2 });
  check([r1dup.sitting_id, r1dup.generation], [r1.sitting_id, 3], 'duplicated restart creates nothing');
  const staleClose = await close(g2.sitting_id, payload());
  check(staleClose.status, 'stale', 'abandoned sitting cannot close');
  const staleOpen = await open(pool, { known: g2.sitting_id });
  check([staleOpen.status, staleOpen.sitting_id], ['stale', r1.sitting_id], 'stale tab reconciles to latest');
  const g3done = await close(r1.sitting_id, payload(['A', 'A', 'A']));
  check(g3done.status, 'created');
  const lateRestart = await open(pool, { restart: true, gen: 2 });
  check([lateRestart.status, lateRestart.sitting_id], ['closed', r1.sitting_id], 'late restart after close returns the closed sitting');
  const oldTab = await open(pool, { known: g2.sitting_id });
  check([oldTab.status, oldTab.latest_state, oldTab.history_id], ['stale', 'closed', g3done.history_id], 'old tab gets the saved result, no new generation');
  await su();
  check(await count('select count(*) n from public.standalone_section_sittings where user_id=$1', [owner]), 3);
  check(await count('select count(*) n from public.section_history where user_id=$1', [owner]), 2, 'a retake is a second history row');

  // --- forged inputs --------------------------------------------------------
  await auth(owner);
  const f = await open('drill::section::pt106-s1');
  await denied(() => close(f.sitting_id, payload(undefined, { class_id: other })), '42501', 'forged class_id');
  await denied(() => close(f.sitting_id, payload(undefined, { practice_test_run_id: 'run' })), '42501', 'practice-test marker');
  await denied(() => close(f.sitting_id, { ...payload(), history: { ...payload().history, timed_section_sitting_id: randomUUID() } }), '42501', 'protected marker');
  await denied(() => close(f.sitting_id, { ...payload(), questions: [...payload().questions, payload().questions[0]] }), '22023', 'duplicate qids');
  await denied(() => close(f.sitting_id, { ...payload(), questions: Array.from({ length: 41 }, (_, i) => ({ ...payload().questions[0], qid: `x${i}` })) }), '22023', 'oversized');
  await denied(() => close(f.sitting_id, { ...payload(), attempts: [{ ...payload().attempts[0], qid: 'outside' }] }), '22023', 'attempt outside section');
  await denied(() => close(f.sitting_id, payload(undefined, { assignment_id: randomUUID() })), '42501', 'assignment on a non-assignment sitting');
  await auth(other);
  check((await close(f.sitting_id, payload())).status, 'stale', 'foreign sitting id');
  await su();
  check(await count("select count(*) n from public.section_history where user_id=$1", [owner]), 2, 'nothing written by rejected calls');

  // --- rollback partway -----------------------------------------------------
  await auth(owner);
  await denied(() => close(f.sitting_id, { ...payload(), attempts: [{ ...payload().attempts[0], level: 'not-a-number' }] }), null, 'bad attempt aborts');
  await su();
  check(await count("select count(*) n from public.section_history where client_sitting_id=$1", [f.sitting_id]), 0, 'history rolled back');
  check((await one('select state from public.standalone_section_sittings where id=$1', [f.sitting_id])).state, 'open', 'sitting still open');

  // --- assignment ownership -------------------------------------------------
  const asg = (await one('insert into public.homework_assignments(student_id,question_qids) values($1,$2) returning id', [owner, QIDS])).id;
  const foreignAsg = (await one('insert into public.homework_assignments(student_id,question_qids) values($1,$2) returning id', [other, QIDS])).id;
  await auth(owner);
  const as = await open(`drill::assignment::${asg}`);
  await denied(() => close(as.sitting_id, payload()), '22023', 'assignment sitting needs an assignment id');
  await denied(() => close(as.sitting_id, payload(undefined, { assignment_id: foreignAsg })), '42501', 'foreign assignment');
  const asDone = await close(as.sitting_id, payload(undefined, { assignment_id: asg }));
  check(asDone.status, 'created');
  await su();
  check((await one('select assignment_id, release_requires_br from public.section_history where id=$1', [asDone.history_id])), { assignment_id: asg, release_requires_br: true });

  // --- adoption of an in-flight record --------------------------------------
  await db.query("insert into public.bootcamp_kv(user_id,table_name,record_id,data,updated_at) values($1,'practice_sessions','legacy-1',$2,'2026-11-01')",
    [owner, JSON.stringify({ id: 'legacy-1', status: 'in_progress', answers: { q1: 'A' } })]);
  await auth(owner);
  const ad = await open('drill::section::pt107-s1', { legacy: 'legacy-1', sittingRecord: 'sitting-1' });
  check(ad.adopted, true, 'adopted');
  const adAgain = await open('drill::section::pt107-s1', { legacy: 'legacy-1', sittingRecord: 'sitting-2' });
  check(adAgain.sitting_id, ad.sitting_id, 'second tab gets the adopted sitting');
  await su();
  check((await one("select data->'answers'->>'q1' a, data->>'id' id from public.bootcamp_kv where record_id='sitting-1'")), { a: 'A', id: 'sitting-1' });
  check(await count("select count(*) n from public.bootcamp_kv where record_id='sitting-2'"), 0, 'no second copy');
  check((await one("select data->>'id' id from public.bootcamp_kv where record_id='legacy-1'")).id, 'legacy-1', 'old record untouched');
  await auth(other);
  const foreignAdopt = await open('drill::section::pt107-s1', { legacy: 'legacy-1', sittingRecord: 'sitting-x' });
  check(foreignAdopt.adopted, false, 'cannot adopt another user record');

  // --- direct table access --------------------------------------------------
  await auth(owner);
  await denied(() => db.query("insert into public.standalone_section_sittings(user_id,pool_key,generation) values($1,'drill::section::pt1-s1',1)", [owner]), '42501', 'direct insert sittings');
  await denied(() => db.query('update public.standalone_section_sittings set state=$1', ['closed']), '42501', 'direct update sittings');
  await denied(() => db.query('delete from public.standalone_section_sittings'), '42501', 'direct delete sittings');
  await denied(() => db.query('insert into public.section_review_records(history_id,user_id,br_completed_at) values($1,$2,now())', [historyId, owner]), '42501', 'direct insert review record');
  await auth(other);
  check(await count('select count(*) n from public.standalone_section_sittings where user_id=$1', [owner]), 0, 'no cross-owner read');

  // --- prediction and blind review -----------------------------------------
  await auth(owner);
  check((await one('select public.save_section_prediction_v1($1,150) r', [historyId])).r.status, 'saved');
  // The bank key changes after the sitting; BR must still grade from the saved key.
  const br = (await one('select public.save_section_blind_review_v1($1,$2,$3) r', [historyId,
    JSON.stringify([{ qid: 'q2', brAnswer: 'A', brTimeMs: 500 }, { qid: 'q3', brAnswer: 'C', brTimeMs: 500 }]), JSON.stringify({ version: 2 })])).r;
  check([br.status, br.br_score, br.br_total], ['saved', 2, 3], 'graded from saved key: q1 kept, q2 fixed, q3 still wrong');
  check(br.br_results.map((r) => [r.qid, r.correct, r.brChanged]), [['q2', true, true], ['q3', false, true]]);
  check((await one('select public.save_section_blind_review_v1($1,$2,null) r', [historyId, '[]'])).r.status, 'already_saved', 'idempotent');
  check((await one('select public.save_section_prediction_v1($1,151) r', [historyId])).r.status, 'saved');
  check((await one('select predicted_score, br_score, br_completed_at is not null done from public.section_review_records where history_id=$1', [historyId])), { predicted_score: 151, br_score: 2, done: true }, 'prediction does not clear BR');
  await denied(() => db.query('select public.save_section_blind_review_v1($1,$2,null)', [historyId, JSON.stringify([{ qid: 'zz', brAnswer: 'A' }])]), null, 'BR answer outside section');
  await auth(other);
  await denied(() => db.query('select public.save_section_prediction_v1($1,140)', [historyId]), '42501', 'other user prediction');
  await denied(() => db.query('select public.save_section_blind_review_v1($1,$2,null)', [historyId, '[]']), '42501', 'other user BR');
  check(await count('select count(*) n from public.section_review_records'), 0, 'other user cannot read the record');
  await su();
  const runRow = (await one("insert into public.practice_test_runs(id,user_id,pt,pace,legs,break_after_leg,status) values('run1',$1,105,'standard','[]',2,'in_progress') returning id", [owner])).id;
  const ptHist = (await one("insert into public.section_history(user_id,class_id,pt,section,practice_test_run_id,practice_test_leg,questions_json) values($1,$3,105,1,$2,0,'[]') returning id", [owner, runRow, owner])).id;
  await auth(owner);
  await denied(() => db.query('select public.save_section_blind_review_v1($1,$2,null)', [ptHist, '[]']), '42501', 'practice-test row rejected');
  await denied(() => db.query('select public.save_section_prediction_v1($1,140)', [ptHist]), '42501', 'practice-test prediction rejected');

  console.log(`sections-post-section-rebuild SQL: ${checks} checks passed`);
} finally {
  await db.close();
}
