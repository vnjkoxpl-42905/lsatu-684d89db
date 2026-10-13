-- Carry the refined Read, Recall, Colour instructions into the rows students
-- actually receive. The source copy lives in
-- `src/features/activity-centre/content/read-recall-colour-section.instructions.json`.
--
-- Completed assignments keep the instructions they were run under. Assigned
-- and in-progress sections receive the clearer wording before the student next
-- reads it.

do $$
declare
  v_read_rule text := 'Read roughly one sentence at a time, without saying it aloud. If you are unsure how much to read at once, choose a shorter piece.';
  v_read_step text := 'Read roughly one sentence at a time, without saying it aloud. Give each word enough attention to hear the sentence naturally in your head. If you are unsure how much to read at once, choose a shorter piece. When you take on too much, the beginning is usually the first part you lose.';
  v_recording_rule text := 'Press space again to move on. Your entire section is recorded in one take. You cannot pause the recording or return to an earlier stimulus.';
begin
  update public.activities
     set instructions = jsonb_set(
       jsonb_set(
         jsonb_set(
           coalesce(instructions, '{}'::jsonb) #- '{briefing,closer}',
           '{rules,1}',
           to_jsonb(v_read_rule),
           false
         ),
         '{rules,6}',
         to_jsonb(v_recording_rule),
         false
       ),
       '{briefing,sections,1,steps,0,body}',
       to_jsonb(v_read_step),
       false
     )
   where slug like 'read-recall-colour-%'
     and mode = 'section';

  alter table public.activity_assignments disable trigger activity_assignments_guard_immutables;

  update public.activity_assignments aa
     set instructions = jsonb_set(
       jsonb_set(
         jsonb_set(
           coalesce(aa.instructions, '{}'::jsonb) #- '{briefing,closer}',
           '{rules,1}',
           to_jsonb(v_read_rule),
           false
         ),
         '{rules,6}',
         to_jsonb(v_recording_rule),
         false
       ),
       '{briefing,sections,1,steps,0,body}',
       to_jsonb(v_read_step),
       false
     )
    from public.activities a
   where aa.activity_id = a.id
     and a.slug like 'read-recall-colour-%'
     and a.mode = 'section'
     and aa.status is distinct from 'completed';

  alter table public.activity_assignments enable trigger activity_assignments_guard_immutables;
end $$;
