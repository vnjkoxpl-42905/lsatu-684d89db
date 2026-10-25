// Executed as an ignored copy in the pinned operational checkout.
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { supabase } from '@/integrations/supabase/client';
import { assignWork } from '@/lib/assignWork';
import { resolveLeveledDrillQids } from '@/lib/guidedDrillLevel';
import { normalizeQType } from '@/lib/questionLoader';
import { resolvePool } from './lib/drill-pool.mjs';
import { levelBand, isInBand } from '@/lib/studentLevel';

const VAULT = "C:/Users/Joshu/dev/ai-os";
const started = performance.now();
const arg = (name: string) => { const i = process.argv.indexOf('--' + name); return i < 0 ? undefined : process.argv[i + 1]; };
const dryRun = process.argv.includes('--dry-run');
const plan = JSON.parse(arg('json') ?? fs.readFileSync(path.resolve(arg('file') ?? ''), 'utf8'));
function endOfDay(day: string) { return new Date(day + 'T23:59:59').toISOString(); }
function startOfDay(day: string) { return new Date(day + 'T00:00:00').toISOString(); }
function validDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(day + 'T12:00:00');
  return Number.isFinite(date.getTime()) && date.getFullYear() === Number(day.slice(0, 4)) && date.getMonth() + 1 === Number(day.slice(5, 7)) && date.getDate() === Number(day.slice(8, 10));
}
function envFrom(file: string) {
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
async function query(result: any) { const { data, error } = await result; if (error) throw error; return data; }
function sameTime(left: string | null, right: string) { return !!left && new Date(left).toISOString() === right; }

async function main() {
  if (!plan.student || !Array.isArray(plan.assignments) || plan.assignments.length < 1 || plan.assignments.length > 14) throw new Error('Provide one student and 1-14 assignments');
  const keys = new Set<string>();
  for (const item of plan.assignments) {
    if (!item.drill || !validDay(item.schedule) || !validDay(item.due) || item.due < item.schedule) throw new Error('Invalid drill or calendar dates');
    if (item.level != null && !['beginner', 'intermediate', 'advanced'].includes(item.level)) throw new Error('Invalid level');
    if (item.count != null && (!Number.isInteger(item.count) || item.count < 1 || item.count > 50)) throw new Error('Invalid question count');
    if (item.max_difficulty != null && (!Number.isInteger(item.max_difficulty) || item.max_difficulty < 1 || item.max_difficulty > 5)) throw new Error('Invalid difficulty ceiling');
    const key = item.drill + ':' + item.schedule;
    if (keys.has(key)) throw new Error('Duplicate drill/date in plan');
    keys.add(key);
  }
  const env = envFrom(path.join(VAULT, '.env'));
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email: env.LSATPREP_ADMIN_EMAIL, password: env.LSATPREP_ADMIN_PASSWORD });
  if (authError || !auth.user) throw new Error('Admin sign-in failed');
  const teacherId = auth.user.id;
  const { data: users, error: userError } = await supabase.functions.invoke('admin-manage-users', { method: 'GET' });
  if (userError || !Array.isArray(users)) throw new Error('Student lookup failed');
  const needle = plan.student.toLowerCase();
  const exact = users.filter((u: any) => [u.email, u.display_name].some(v => v?.toLowerCase() === needle));
  const matches = exact.length ? exact : users.filter((u: any) => [u.email, u.display_name].some(v => v?.toLowerCase().includes(needle)));
  if (matches.length !== 1) throw new Error('Student does not resolve uniquely');
  const student = matches[0];
  if (!student.has_classroom_access || !student.has_drill_access) throw new Error('Student lacks Classroom/drill access; grant it explicitly first');
  const profile = await query(supabase.from('profiles').select('proficiency_level').eq('class_id', student.class_id).single());
  const slugs = plan.assignments.map((item: any) => item.drill);
  const drills = await query(supabase.from('guided_drills').select('*').in('slug', slugs));
  const bankResponse = await fetch('https://lsatprep.study/data/_bank.generated.json');
  if (!bankResponse.ok) throw new Error('Deployed question bank read failed');
  const sections = await bankResponse.json();
  if (!Array.isArray(sections) || sections.length < 1) throw new Error('Invalid deployed bank');
  const bank = new Map<string, any>();
  for (const section of sections) {
    const match = /PT(\d+)-S(\d+)/.exec(section.filename ?? '');
    if (!match || !Array.isArray(section.questions)) throw new Error('Invalid deployed bank section');
    for (const q of section.questions) {
      if (q.status === 'removed' || !q.answerChoices || !q.correctAnswer || !q.questionStem) continue;
      const qid = `PT${match[1]}-S${match[2]}-Q${q.questionNumber || 0}`;
      bank.set(qid, { ...q, questionType: normalizeQType(q.questionType || '', q.questionStem), questionDifficulty: q.questionDifficulty || q.Question_Difficulty || 3, reasoningType: Array.isArray(q.reasoningType) ? q.reasoningType : q.reasoningType ? [q.reasoningType] : [] });
    }
  }
  const knownQids = new Set<string>(bank.keys());
  const prior = await query(supabase.from('guided_drill_assignments').select('id,guided_drill_id,scheduled_for,status,level,question_count,unlock_at,question_qids').eq('student_id', student.class_id).in('guided_drill_id', drills.map((d: any) => d.id)));
  const previousItems = prior.length ? await query(supabase.from('classroom_items').select('id,source_id,status,visible_to_student,title,due_at,unlock_at').eq('student_id', student.class_id).eq('source_table', 'guided_drill_assignments').in('source_id', prior.map((a: any) => a.id))) : [];
  // Resolve and validate every item before the first production write.
  const prepared = plan.assignments.map((item: any) => {
    const hits = drills.filter((d: any) => d.slug === item.drill);
    if (hits.length !== 1 || !hits[0].is_published) throw new Error('Missing or unpublished drill: ' + item.drill);
    const drill = hits[0];
    const level = item.level !== undefined ? item.level : profile.proficiency_level;
    const count = item.count ?? drill.question_count;
    const pool = resolvePool(drill.bank_filter, bank).map((q: any) => ({ ...q, qtype: q.type }));
    const resolved = resolveLeveledDrillQids({ pool, questionCount: count, drillQids: drill.question_qids, knownQids, level, rng: () => 0.5 });
    if (resolved.qids.length !== count || resolved.outOfBandUsed > 0 || ['empty', 'out_of_level', 'partially_out_of_level'].includes(resolved.warning ?? '')) throw new Error('Insufficient in-level pool: ' + item.drill);
    // With enough in-band questions the app never draws its out-of-band pool.
    const eligible = resolved.source === 'pinned' ? resolved.qids.map(qid => ({ difficulty: bank.get(qid)?.questionDifficulty })) : level ? pool.filter((q: any) => isInBand(q.difficulty, levelBand(level))) : pool;
    if (item.max_difficulty != null && eligible.some((q: any) => !Number.isFinite(q.difficulty) || q.difficulty > item.max_difficulty)) throw new Error('Drill pool exceeds difficulty ceiling: ' + item.drill);
    const existing = prior.filter((a: any) => a.guided_drill_id === drill.id && a.scheduled_for === item.schedule);
    if (existing.length > 1) throw new Error('Multiple existing assignments: ' + item.drill);
    let existingItem;
    if (existing.length) {
      const a = existing[0];
      if (a.question_qids?.length) throw new Error('Existing assignment has an unexpected exact pin; inspect it: ' + a.id);
      const cards = previousItems.filter((card: any) => card.source_id === a.id);
      if (cards.length !== 1 || !cards[0].visible_to_student || cards[0].status === 'archived' || cards[0].title !== drill.title || a.level !== level || a.question_count !== (item.count ?? null) || !sameTime(a.unlock_at, startOfDay(item.schedule)) || !sameTime(cards[0].due_at, endOfDay(item.due)) || !sameTime(cards[0].unlock_at, startOfDay(item.schedule))) throw new Error('Existing assignment conflicts with plan; inspect it: ' + a.id);
      existingItem = cards[0];
    }
    return { item, drill, level, count, poolCount: pool.length, eligibleMin: Math.min(...eligible.map((q: any) => q.difficulty)), eligibleMax: Math.max(...eligible.map((q: any) => q.difficulty)), existing: existing[0], existingItem };
  });
  const results: any[] = [];
  try {
  for (const entry of prepared) {
    const { item, drill, level, count } = entry;
    const summary = { day: item.schedule, due: item.due, title: drill.title, slug: drill.slug, level, count, pool_count: entry.poolCount, difficulty_min: entry.eligibleMin, difficulty_max: entry.eligibleMax };
    if (dryRun) { results.push({ ...summary, action: entry.existing ? 'already_assigned' : 'would_assign' }); continue; }
    if (entry.existing) { results.push({ ...summary, action: 'already_assigned', assignment_id: entry.existing.id, classroom_item_id: entry.existingItem.id, verified: true, notification: 'not_resent' }); continue; }
    const result = await assignWork({ teacherId, studentIds: [student.class_id], item: { kind: 'guided_drill', drillId: drill.id }, scheduledForLocalDate: item.schedule, levelOverrides: { [student.class_id]: level }, questionCountOverride: item.count ?? null, overrides: { dueAt: endOfDay(item.due), metadata: { guided_plan: plan.id ?? null } } });
    if (result.failed.length || result.ok.length !== 1) throw new Error('Assignment failed; inspect state before retry: ' + (result.failed[0]?.error ?? item.drill));
    const saved = result.ok[0];
    // Record success before verification so a read failure preserves the ID.
    const outcome: any = { ...summary, action: 'assigned', assignment_id: saved.assignmentId, classroom_item_id: saved.classroomItemId, notify: saved.notify, verified: false };
    results.push(outcome);
    const a = await query(supabase.from('guided_drill_assignments').select('id,student_id,guided_drill_id,scheduled_for,unlock_at,level,question_count').eq('id', saved.assignmentId).single());
    const card = await query(supabase.from('classroom_items').select('id,student_id,source_id,title,visible_to_student,status,unlock_at,due_at,metadata_json').eq('id', saved.classroomItemId).single());
    if (a.student_id !== student.class_id || a.guided_drill_id !== drill.id || a.scheduled_for !== item.schedule || a.level !== level || a.question_count !== (item.count ?? null) || !sameTime(a.unlock_at, startOfDay(item.schedule)) || card.student_id !== student.class_id || card.source_id !== a.id || !card.visible_to_student || card.status === 'archived' || !sameTime(card.unlock_at, startOfDay(item.schedule)) || !sameTime(card.due_at, endOfDay(item.due))) throw new Error('Read-after-write verification failed: ' + saved.assignmentId);
    if (saved.notify?.bell_ok) {
      const bells = await query(supabase.from('notifications').select('id,read').eq('user_id', student.class_id).eq('type', 'assignment').eq('link', saved.route));
      if (bells.length !== 1) throw new Error('Bell count differs for ' + saved.assignmentId);
      outcome.bell_count = bells.length;
    }
    outcome.verified = true;
  }
  } catch (error: any) {
    error.completedResults = results;
    throw error;
  }
  return { student: student.display_name, student_id: student.class_id, dry_run: dryRun, results, metrics: { sign_ins: 1, student_lookups: 1, planned: prepared.length, assigned: results.filter(r => r.action === 'assigned').length, elapsed_ms: Math.round(performance.now() - started) } };
}
main().then(result => console.log('LSATU_GUIDED_RESULT=' + JSON.stringify(result))).catch(error => { console.error('LSATU_GUIDED_ERROR=' + JSON.stringify({ error: error?.message ?? String(error), completed_results: error.completedResults ?? [], instruction: 'Read existing assignments before retrying; never replay notification failures.' })); process.exitCode = 1; });
