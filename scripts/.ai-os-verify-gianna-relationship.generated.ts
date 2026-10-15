import fs from 'node:fs';
import { supabase } from '@/integrations/supabase/client';
const env = Object.fromEntries(fs.readFileSync('C:/Users/Joshu/dev/ai-os/.env', 'utf8').split(/\r?\n/).filter(s => s.trim() && !s.trim().startsWith('#') && s.includes('=')).map(s => { const i=s.indexOf('='); return [s.slice(0,i).trim(), s.slice(i+1).trim().replace(/^["']|["']$/g,'')]; }));
const auth = await supabase.auth.signInWithPassword({email:env.LSATPREP_ADMIN_EMAIL,password:env.LSATPREP_ADMIN_PASSWORD});
if (auth.error) throw new Error('Admin verification sign-in failed');
const phase = process.argv.includes('--after') ? 'after' : 'before';
const {data: student,error:se}=await supabase.from('profiles').select('class_id').eq('class_id','b0ee59e5-7ff5-430d-8856-f5e6d7f15474').single(); if(se)throw new Error(JSON.stringify(se));
if(student.class_id!=='b0ee59e5-7ff5-430d-8856-f5e6d7f15474')throw new Error('Student identity mismatch');
const {data:a,error:ae}=await supabase.from('activities').select('*').eq('title','Spot the Relationship').single();if(ae)throw new Error(JSON.stringify(ae));
const counts={items:a.items.length,keys:a.items.filter((i:any)=>i.answer_key&&Object.keys(i.answer_key).length).length,explanations:a.items.filter((i:any)=>typeof i.explanation==='string'&&i.explanation.trim()).length};
if(Object.values(counts).some(n=>n!==48))throw new Error('48 complete keys/explanations required '+JSON.stringify(counts));
const {data:rows,error:re}=await supabase.from('activity_assignments').select('*').eq('student_id',student.class_id).eq('activity_id',a.id);if(re)throw new Error(JSON.stringify(re));
const active=rows.filter((r:any)=>!['completed','archived'].includes(r.status));
if(phase==='before'){if(active.length)throw new Error('Active duplicate exists');fs.writeFileSync('C:/Users/Joshu/AppData/Local/Temp/gianna-relationship-artifact.json',JSON.stringify(a));}
else {if(active.length!==1)throw new Error('Expected one active assignment');const r=active[0];const frozen=JSON.parse(fs.readFileSync('C:/Users/Joshu/AppData/Local/Temp/gianna-relationship-artifact.json','utf8'));for(const k of ['title','subtitle','instructions','item_format','items','mode','time_goal_minutes','source_section'])if(JSON.stringify(r[k])!==JSON.stringify(frozen[k]))throw new Error('Snapshot mismatch '+k);
const {data:ci,error:ce}=await supabase.from('classroom_items').select('id,student_id,type,title,status,source_id,source_table,visible_to_student').eq('student_id',student.class_id).eq('source_id',r.id);if(ce)throw new Error(JSON.stringify(ce));if(ci.length!==1||!ci[0].visible_to_student)throw new Error('Classroom readback mismatch');console.log(JSON.stringify({assignmentId:r.id,status:r.status,classroom:ci,snapshotMatches:true,activeCount:active.length}));}
console.log(JSON.stringify({phase,student,artifact:{id:a.id,title:a.title,slug:a.slug,mode:a.mode},counts,activeCount:active.length}));