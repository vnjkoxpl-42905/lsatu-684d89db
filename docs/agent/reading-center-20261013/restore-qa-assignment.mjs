// Restore only this receipt's QA visibility change using real admin authentication.
// Credentials and the short-lived token stay in process memory and are never printed.
import { readFile } from 'node:fs/promises';

const value = (source, name) => {
  const line = source.match(new RegExp(`^${name}\\s*=\\s*(.*)$`, 'm'))?.[1]?.trim();
  if (!line) throw new Error(`Missing configuration: ${name}`);
  return /^(['"]).*\1$/.test(line) ? line.slice(1, -1) : line;
};
const appEnv = await readFile(new URL('../../../.env', import.meta.url), 'utf8');
const adminEnv = await readFile('C:/Users/Joshu/dev/ai-os/.env', 'utf8');
const url = value(appEnv, 'VITE_SUPABASE_URL');
if (new URL(url).hostname !== 'atrcqxpmqrynmtvvyjju.supabase.co') throw new Error('Unexpected backend');
const apikey = value(appEnv, 'VITE_SUPABASE_PUBLISHABLE_KEY');
const auth = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: value(adminEnv, 'LSATPREP_ADMIN_EMAIL'), password: value(adminEnv, 'LSATPREP_ADMIN_PASSWORD') }),
});
if (!auth.ok) throw new Error(`Admin sign-in failed: HTTP ${auth.status}`);
const session = await auth.json();
if (session.user?.id !== '5ff160ef-016e-4ab5-aab1-55c7a2ad888f') throw new Error('Unexpected admin account');
const timestamp = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}T[\d:.+-]+$/.test(timestamp ?? '')) throw new Error('Pass the confirmed QA test timestamp');
const query = new URLSearchParams({ id: 'eq.689b3dfb-e18b-43fe-9b28-b2f42c10f541', student_id: 'eq.d763bfe6-d710-4c4b-90ff-4b3a20929211', visible_to_student: 'eq.false', status: 'eq.in_progress', updated_at: `eq.${timestamp}`, select: 'id,status,visible_to_student' });
const response = await fetch(`${url}/rest/v1/classroom_items?${query}`, {
  method: 'PATCH', headers: { apikey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({ visible_to_student: true, updated_at: new Date().toISOString() }),
});
if (!response.ok) throw new Error(`QA restore failed: HTTP ${response.status}`);
const rows = await response.json();
if (rows.length !== 1 || rows[0].visible_to_student !== true) throw new Error('QA restore did not match the unchanged test row');
console.log(JSON.stringify({ restored: rows[0] }));
