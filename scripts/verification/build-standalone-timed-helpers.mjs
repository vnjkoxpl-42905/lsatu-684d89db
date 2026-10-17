// Reproduce the reviewed parentless helper adaptation without editing PT SQL.
import { readFile, writeFile } from 'node:fs/promises';
const base = new URL('../../docs/implementation-plans/artifacts/', import.meta.url);
const source = await readFile(new URL('2026-09-30-timed-pt-checkpoint-metadata-upgrade.sql', base), 'utf8');
let helper = source.slice(source.indexOf('create or replace function public.timed_pt_save_checkpoint_v1'), source.indexOf('revoke create on schema public'));
// The source upgrade sets a local executor role before its helpers. The new
// artifact does not; copying RESET ROLE would change its caller's initial role.
helper = helper.replace(/^reset role;\s*$/gmi, '');
for (const [from, to] of [
  ['create or replace function', 'create function'],
  ['timed_pt_save_checkpoint_v1', 'timed_section_save_checkpoint_v1'],
  ['timed_pt_close_leg_v1', 'timed_section_close_v1'],
  ['p_run public.practice_test_runs', 'p_run public.timed_section_sittings_v1'],
  ["p_run.timed_manifest->'legs'->p_run.current_leg", 'p_run.frozen_source'],
  ['public.timed_pt_lr_bindings_v1', 'public.timed_section_source_bindings_v1'],
  ['where run_id=p_run.id and leg_index=p_run.current_leg', 'where sitting_id=p_run.id'],
  ['b.frozen_qids', 'p_run.frozen_qids'],
  ['practice_test_run_id=p_run.id and practice_test_leg=p_run.current_leg', 'timed_section_sitting_id=p_run.id'],
  ['p_run.user_id', 'p_run.owner_id'],
  ['p_run.timed_elapsed_ms', 'p_run.elapsed_ms'],
  ['timed_pt_run_id,timed_pt_leg', 'timed_section_sitting_id'],
  ['practice_test_run_id,practice_test_leg', 'timed_section_sitting_id'],
  ['p_run.id,p_run.current_leg', 'p_run.id'],
]) helper = helper.replaceAll(from, to);
helper = helper.replace('        -- Stable sitting/question identity',
  "        if (a->>'timeMs')::integer < prior.time_ms then raise exception 'Question time cannot decrease' using errcode='PT409'; end if;\n        -- Stable sitting/question identity");
if (/p_run\.(current_leg|user_id|timed_manifest)|timed_pt_lr_bindings_v1|practice_test_run_id=p_run/.test(helper)) throw new Error('PT attribution remains in helper');
const targetUrl = new URL('2026-09-30-standalone-timed-writer.sql', base);
let target = await readFile(targetUrl, 'utf8');
const start = '-- CHECKPOINT_AND_CLOSE_HELPERS';
const end = '-- PUBLIC_COMMAND_HANDLERS';
target = target.slice(0, target.indexOf(start) + start.length) + '\n' + helper.trim() + '\n' + target.slice(target.indexOf(end));
await writeFile(targetUrl, target);
console.log('Generated parentless standalone checkpoint/close helpers from reviewed metadata upgrade.');
