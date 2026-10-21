-- Read, Recall, Colour: where a section's recording lives.
--
-- The drill is run out loud and recorded unbroken, so one finished section is
-- one audio file. It is her own voice working through 23 stimuli, which makes
-- it the most private thing this application stores: the bucket is private, and
-- the policies below let exactly two people near a file -- the student it
-- belongs to, and the instructor.
--
-- Ownership is carried by the path rather than a join table. Every object is
-- stored at `<student_id>/<assignment_id>.<ext>`, so the first path segment IS
-- the owner and `storage.foldername(name)[1]` is the whole check. That keeps
-- the policy readable and impossible to drift from the writer, which builds the
-- same path in `SectionRunner`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'drill-recordings',
  'drill-recordings',
  false,
  -- Twenty to thirty minutes of Opus lands well under 50 MB. The cap is a
  -- backstop against a stuck recorder, not a target.
  52428800,
  array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Idempotent: this migration has to be safe to re-run against a database that
-- already carries it, because it was applied by hand before it was a file.
drop policy if exists "own drill recordings are readable" on storage.objects;
drop policy if exists "own drill recordings are writable" on storage.objects;
drop policy if exists "own drill recordings are replaceable" on storage.objects;
drop policy if exists "admins read every drill recording" on storage.objects;

create policy "own drill recordings are readable"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'drill-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own drill recordings are writable"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'drill-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- The runner uploads with `upsert: true` so a re-run of the same assignment
-- replaces its file rather than failing. Upsert is an update, and needs its own
-- policy; without it the second attempt at a section fails at the very end.
create policy "own drill recordings are replaceable"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'drill-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'drill-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Review is the instructor's half of this drill: the recording is the thing he
-- checks The Read against. No delete policy for anyone -- a finished take is
-- not something either side should be able to remove from the browser.
create policy "admins read every drill recording"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'drill-recordings'
    and has_role(auth.uid(), 'admin'::app_role)
  );
