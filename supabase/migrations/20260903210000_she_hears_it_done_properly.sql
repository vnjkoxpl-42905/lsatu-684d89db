-- The model runs reach a student, for the first time.
--
-- `model_runs` holds 714 recordings across 109 sections, 713 of them
-- transcribed: Joshua doing this drill properly, out loud, on every stimulus of
-- all three live sections. Not one second of it has ever reached a student. It
-- is the largest piece of finished teaching material in the product and it
-- exists only as the grader's calibration set.
--
-- What unlocks it is a Report Card. "You dropped the word 'only'" is a
-- correction; "here is what you said, and here is what it sounds like done
-- right" is a lesson, and both files already exist for every stimulus she has
-- ever run.
--
-- The access rule is the whole design, and it is deliberately not "students can
-- read model runs".
--
--   She may hear the model run for a section she has ALREADY been graded on.
--
-- That is what makes it teaching rather than an answer key. A student who could
-- reach the model run for a section she has not sat could listen to a correct
-- recall of every stimulus and then "recall" it, and the drill would be
-- measuring her memory of our recording. Gating on the existence of her own
-- grade closes that: the recording becomes reachable at the exact moment it
-- stops being able to help her cheat and starts being able to teach her.
--
-- It is also self-maintaining. Nothing has to be granted per student or per
-- section, and a section she never finishes never opens.

-- The row, so the app can find which file belongs to which stimulus.
drop policy if exists "students hear model runs for sections they have finished" on public.model_runs;
create policy "students hear model runs for sections they have finished"
  on public.model_runs for select to authenticated
  using (
    exists (
      select 1
        from public.activity_section_grades g
       where g.student_id = auth.uid()
         and g.source_section = model_runs.source_section
    )
  );

grant select on public.model_runs to authenticated;

-- And the audio itself, under exactly the same condition.
--
-- Matched on the object's own path against `model_runs.audio_path` rather than
-- on a path convention, so a file that is not a model run cannot be reached
-- through this policy no matter what it is called.
drop policy if exists "students hear model run audio for sections they have finished" on storage.objects;
create policy "students hear model run audio for sections they have finished"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'model-runs'
    and exists (
      select 1
        from public.model_runs m
        join public.activity_section_grades g
          on g.source_section = m.source_section
       where m.audio_path = storage.objects.name
         and g.student_id = auth.uid()
    )
  );

-- The admin policies are untouched and deliberately not restated: Joshua reads
-- every one of these whether or not anybody has been graded.
