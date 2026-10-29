-- The card and expanded instruction share this step body.
-- Include the library door as well as individual sections; leave completed
-- assignment snapshots unchanged.
do $$
declare
  v_read_step text := 'Read about one sentence at a time, silently. Give each word enough attention to hear it naturally in your head. If that feels like too much to hold, take a shorter piece. When you take on too much, the part that slips is always the beginning.';
begin
  update public.activities
     set instructions = jsonb_set(instructions,
       '{briefing,sections,1,steps,0,body}', to_jsonb(v_read_step), false)
   where slug like 'read-recall-colour-%'
     and mode in ('section', 'section-library')
     and instructions #>> '{briefing,sections,1,steps,0,label}' in ('Read it', 'Read it.');

  alter table public.activity_assignments disable trigger activity_assignments_guard_immutables;

  update public.activity_assignments aa
     set instructions = jsonb_set(aa.instructions,
       '{briefing,sections,1,steps,0,body}', to_jsonb(v_read_step), false)
    from public.activities a
   where aa.activity_id = a.id
     and a.slug like 'read-recall-colour-%'
     and a.mode in ('section', 'section-library')
     and aa.status is distinct from 'completed'
     and aa.instructions #>> '{briefing,sections,1,steps,0,label}' in ('Read it', 'Read it.');

  alter table public.activity_assignments enable trigger activity_assignments_guard_immutables;
end $$;
