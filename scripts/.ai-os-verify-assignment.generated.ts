import fs from 'node:fs';
import { supabase } from '@/integrations/supabase/client';
const env = Object.fromEntries(fs.readFileSync('C:/Users/Joshu/dev/ai-os/.env', 'utf8').split(/\r?\n/).filter(s => s.trim() && !s.trim().startsWith('#') && s.includes('=')).map(s => { const i=s.indexOf('='); return [s.slice(0,i).trim(), s.slice(i+1).trim().replace(/^["']|["']$/g,'')]; }));
const auth = await supabase.auth.signInWithPassword({email:env.LSATPREP_ADMIN_EMAIL,password:env.LSATPREP_ADMIN_PASSWORD});
if (auth.error) throw new Error('Admin verification sign-in failed');
const result = await supabase.from('classroom_items').select('id,student_id,type,title,status,source_id,source_table,visible_to_student,description,metadata_json,due_at,unlock_at').eq('id','dd42a851-5af5-49e9-af7c-b097db98f379').single();
if (result.error) throw result.error;
console.log(JSON.stringify(result.data));
if (result.data.source_id !== '/topics/abstract' || result.data.metadata_json?.bootcamp_id !== 'abstraction' || !result.data.visible_to_student || result.data.status !== 'assigned') throw new Error('Assignment readback mismatch');
