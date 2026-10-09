// Read-only acceptance probe using ordinary student/admin sessions, never service-role access.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) return [];
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [[match[1], value]];
  }));
}

const credentialPath = process.argv[2];
if (!credentialPath) throw new Error('Usage: node scripts/verification/scoped-source-audit.mjs <central-env-path>');
const credentials = parseEnv(await readFile(resolve(credentialPath), 'utf8'));
const publicEnv = parseEnv(await readFile(resolve('.env'), 'utf8'));
const url = publicEnv.VITE_SUPABASE_URL;
const key = publicEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing public app configuration');

async function login(prefix) {
  const email = credentials[`${prefix}_EMAIL`];
  const password = credentials[`${prefix}_PASSWORD`];
  if (!email || !password) throw new Error(`Missing ${prefix} credentials`);
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`${prefix} authentication failed`);
  return { client, owner: data.user.id };
}

const student = await login('LSATPREP_TESTER');
const teacher = await login('LSATPREP_ADMIN');
if (student.owner === teacher.owner) throw new Error('Distinct accounts required');
const roleRead = await teacher.client.from('user_roles').select('role').eq('user_id', teacher.owner);
if (roleRead.error || !roleRead.data?.some((row) => row.role === 'admin')) throw new Error('Configured teacher account must have an acknowledged admin role');
const sources = [
  ['guided_drill_assignments', 'student_id', 'id'],
  ['activity_assignments', 'student_id', 'id'],
  ['bootcamp_kv', 'user_id', 'table_name,record_id'],
  ['rc_drill_sessions', 'user_id', 'id'],
  ['practice_test_runs', 'user_id', 'id'],
  ['classroom_items', 'student_id', 'id'],
];
const evidence = [];
for (const [table, ownerColumn, idColumn] of sources) {
  const reads = await Promise.all([
    student.client.from(table).select(idColumn, { count: 'exact' }).eq(ownerColumn, student.owner),
    student.client.from(table).select(idColumn, { count: 'exact', head: true }).eq(ownerColumn, teacher.owner),
    teacher.client.from(table).select(idColumn, { count: 'exact' }).eq(ownerColumn, student.owner),
    teacher.client.from(table).select(idColumn, { count: 'exact', head: true }).eq(ownerColumn, teacher.owner),
  ]);
  const errorCodes = reads.map((read) => read.error?.code ?? null);
  const readFailed = reads.map((read) => Boolean(read.error));
  const [studentOwn, studentCrossOwner, teacherStudent, teacherOwn] = reads.map((read) => read.error ? null : read.count);
  const sourceIds = (read) => (read.data ?? []).map((row) => JSON.stringify(idColumn.split(',').map((column) => row[column]))).sort();
  const completeSets = reads[0].data?.length === studentOwn && reads[2].data?.length === teacherStudent;
  evidence.push({ table, studentOwn, studentCrossOwner, teacherStudent, teacherOwn, errorCodes, readFailed,
    crossOwnerDenied: !reads[1].error && studentCrossOwner === 0 && teacherOwn > 0,
    teacherSourceVisible: !reads[2].error && teacherStudent > 0,
    sameSourceIds: !reads[0].error && !reads[2].error && completeSets && JSON.stringify(sourceIds(reads[0])) === JSON.stringify(sourceIds(reads[2])),
  });
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), readOnly: true, teacherAdminConfirmed: true, evidence,
  limits: ['Source identity parity does not prove UI projection or all missing-source coverage.', 'No mutation, actor attribution, revocation or race was exercised.', 'Zero foreign rows are positive denial evidence only where the admin session confirms foreign rows exist.', 'Classroom source sets can legitimately differ when visibility/unlock policies filter student reads.'],
}, null, 2));
if (evidence.some((row) => row.readFailed.some(Boolean) || !row.crossOwnerDenied || !row.teacherSourceVisible || (row.table !== 'classroom_items' && !row.sameSourceIds))) process.exitCode = 1;
