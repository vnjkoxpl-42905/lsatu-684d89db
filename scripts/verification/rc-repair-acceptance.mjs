// Read-only receipts for the dedicated RC tester. Credentials stay in .env.
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

process.loadEnvFile(resolve('.env'));
process.loadEnvFile(resolve('../..', 'ai-os', '.env'));
const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const { data: auth, error: signInError } = await client.auth.signInWithPassword({
  email: process.env.LSATPREP_TESTER_EMAIL, password: process.env.LSATPREP_TESTER_PASSWORD,
});
if (signInError || !auth.user) throw new Error('Dedicated tester authentication failed.');
const actor = auth.user.id;
const tables = ['rc_drill_sessions', 'rc_attempts', 'rc_annotations'];
const receipt = { actor, observedAt: new Date().toISOString(), tables: {} };
for (const table of tables) {
  const { data, error } = await client.from(table).select('*').eq('user_id', actor).order(table === 'rc_annotations' ? 'passage_id' : 'id');
  if (error) throw new Error(`${table}: ${error.message}`);
  receipt.tables[table] = { count: data.length, sha256: createHash('sha256').update(JSON.stringify(data)).digest('hex') };
  if (table === 'rc_drill_sessions') receipt.sessions = data.map(row => ({
    id: row.id, passageIds: row.passage_ids, status: row.status,
    reveal: row.config?.reveal, timing: row.config?.timing,
    protectedSource: Boolean((row.timed_section_sitting_id ?? row.config?.timedSectionSittingId)
      || (row.config?.practiceTestRunId ?? row.practice_test_run_id)),
    sha256: createHash('sha256').update(JSON.stringify(row)).digest('hex'),
  }));
}
const sessionId = process.argv[2];
if (sessionId) {
  const { data, error } = await client.from('rc_attempts').select('id, session_id, question_id, selected, flagged, is_first_attempt, time_ms').eq('user_id', actor).eq('session_id', sessionId).order('question_id');
  if (error) throw new Error(error.message);
  receipt.attempts = data;
}
console.log(JSON.stringify(receipt, null, 2));
await client.auth.signOut({ scope: 'local' });
