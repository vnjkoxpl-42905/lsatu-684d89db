// Ordinary authenticated sessions only. Never insert/delete or change work,
// status, scores, answers, or ownership. Probe the exact foreign identity by
// asking to set its immutable identity column to the already stored value.
// This is denied UPDATE evidence only. It proves neither INSERT restrictions,
// teacher mutation attribution, revocation, nor protection against write races.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) return [];
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [[match[1], value]];
  }));
}

const sources = [
  { table: 'guided_drill_assignments', owner: 'student_id', identity: ['id'] },
  { table: 'activity_assignments', owner: 'student_id', identity: ['id'] },
  { table: 'bootcamp_kv', owner: 'user_id', identity: ['table_name', 'record_id'], updateIdentity: 'record_id' },
  { table: 'rc_drill_sessions', owner: 'user_id', identity: ['id'] },
  { table: 'practice_test_runs', owner: 'user_id', identity: ['id'] },
  { table: 'classroom_items', owner: 'student_id', identity: ['id'] },
];

function errorClass(error) {
  if (error?.code === '42501') return 'explicit_rls_denial';
  if (error?.code && /^[A-Z0-9_]{1,32}$/.test(error.code)) return `backend_${error.code}`;
  return 'network_or_unclassified_error';
}

async function main() {
  const credentialPath = process.argv[2];
  if (!credentialPath) throw new Error('configuration');
  const credentials = parseEnv(await readFile(resolve(credentialPath), 'utf8'));
  const publicEnv = parseEnv(await readFile(resolve('.env'), 'utf8'));
  const url = publicEnv.VITE_SUPABASE_URL;
  const key = publicEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('configuration');
  // Refuse secret/service-role keys even if a configuration variable was
  // accidentally misnamed. Ordinary Auth sessions must remain the authority.
  if (!key.startsWith('sb_publishable_')) {
    try {
      const parts = key.split('.');
      if (parts.length !== 3 || JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role !== 'anon') throw new Error();
    } catch { throw new Error('configuration'); }
  }

  async function login(prefix) {
    const email = credentials[`${prefix}_EMAIL`];
    const password = credentials[`${prefix}_PASSWORD`];
    if (!email || !password) throw new Error('credentials_unavailable');
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new Error('authentication_failed');
    return { client, owner: data.user.id };
  }

  const student = await login('LSATPREP_TESTER');
  const teacher = await login('LSATPREP_ADMIN');
  if (student.owner === teacher.owner) throw new Error('distinct_accounts_required');
  const teacherRoles = await teacher.client.from('user_roles').select('role').eq('user_id', teacher.owner);
  const studentRoles = await student.client.from('user_roles').select('role').eq('user_id', student.owner);
  if (teacherRoles.error || studentRoles.error || !Array.isArray(teacherRoles.data) || !Array.isArray(studentRoles.data) ||
      !teacherRoles.data?.some(row => row.role === 'admin') || studentRoles.data?.some(row => row.role === 'admin')) {
    throw new Error('roles_not_confirmed');
  }

  let failed = false;
  for (const source of sources) {
    const evidence = { table: source.table, foreignFixtureExists: false, zeroReturnedRows: false, explicitDenial: false, errorClass: null };
    try {
      const columns = [...source.identity, source.owner].join(',');
      const fixtureRead = await teacher.client.from(source.table).select(columns).eq(source.owner, teacher.owner).limit(1).maybeSingle();
      if (fixtureRead.error) {
        evidence.errorClass = `fixture_read_${errorClass(fixtureRead.error)}`;
      } else if (!fixtureRead.data) {
        evidence.errorClass = 'unverified_missing_foreign_fixture';
      } else if (fixtureRead.data[source.owner] !== teacher.owner ||
          !source.identity.every(column => typeof fixtureRead.data[column] === 'string' && fixtureRead.data[column].length > 0)) {
        evidence.errorClass = 'invalid_foreign_fixture';
      } else {
        evidence.foreignFixtureExists = true;
        const identityColumn = source.updateIdentity ?? source.identity[0];
        // All predicates come from the teacher-confirmed row, not a guessed
        // foreign ID. KV includes namespace, record ID AND owner explicitly.
        let update = student.client.from(source.table)
          .update({ [identityColumn]: fixtureRead.data[identityColumn] })
          .eq(source.owner, teacher.owner);
        for (const column of source.identity) update = update.eq(column, fixtureRead.data[column]);
        const result = await update.select(source.identity.join(','));
        if (result.error) {
          evidence.errorClass = errorClass(result.error);
          evidence.explicitDenial = result.error.code === '42501';
        } else if (!Array.isArray(result.data)) {
          evidence.errorClass = 'ambiguous_update_response';
        } else if (result.data.length > 0) {
          evidence.errorClass = 'cross_owner_update_returned_rows';
        } else {
          evidence.zeroReturnedRows = true;
        }
      }
    } catch {
      evidence.errorClass = 'network_or_unclassified_error';
    }
    if (!evidence.foreignFixtureExists || (!evidence.zeroReturnedRows && !evidence.explicitDenial)) failed = true;
    // No IDs, row contents, account identifiers, credentials, or tokens.
    console.log(JSON.stringify(evidence));
  }
  if (failed) process.exitCode = 1;
}

// Sanitize all setup failures; Supabase messages can carry request details.
main().catch(error => {
  const allowed = new Set(['configuration', 'credentials_unavailable', 'authentication_failed', 'distinct_accounts_required', 'roles_not_confirmed']);
  console.log(JSON.stringify({ table: 'setup', foreignFixtureExists: false, zeroReturnedRows: false, explicitDenial: false,
    errorClass: allowed.has(error?.message) ? error.message : 'setup_failed' }));
  process.exitCode = 1;
});
