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
const checks = {};
const own = await student.client.rpc('get_student_progress_user_id',{p_class_id:student.owner});
checks.studentOwnIdentity = !own.error && own.data === student.owner;
const foreign = await student.client.rpc('get_student_progress_user_id',{p_class_id:teacher.owner});
checks.studentForeignDenied = foreign.error?.code === '42501';
const selected = await teacher.client.rpc('get_student_progress_user_id',{p_class_id:student.owner});
checks.teacherSelectedIdentity = !selected.error && selected.data === student.owner;
const direct = await teacher.client.from('students').select('user_id').eq('class_id',student.owner);
checks.studentsRlsUnchanged = !direct.error && Array.isArray(direct.data) && direct.data.length === 0;
const publicClient = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const anonymous = await publicClient.rpc('get_student_progress_user_id',{p_class_id:student.owner});
checks.anonymousDenied = Boolean(anonymous.error);
console.log(JSON.stringify({checkedAt:new Date().toISOString(),readOnly:true,ordinaryJwt:true,checks},null,2));
if(Object.values(checks).some(value=>!value)) process.exitCode=1;