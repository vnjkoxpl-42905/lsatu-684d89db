-- Where the Model Run recordings live.
--
-- Sibling of `drill-recordings`, and the mirror image of it. That bucket holds
-- the student's own run of a section and is private because it is hers. This
-- one holds Joshua's run of a single stimulus and is private for the opposite
-- reason: it is the drill done correctly, and hearing it before she has run the
-- section is hearing the answer.
--
-- Ownership is not carried by the path here, because there is no owner to carry.
-- Every object belongs to the corpus, so the policies are role checks rather
-- than folder checks. A student reaches a recording only through a signed URL
-- issued server-side after her section is graded; she is never granted select.
--
-- Objects are stored flat as `<slug>.mp3` -- PT105_S2_Q1.mp3 -- matching
-- model_runs.audio_path and the capture's own filenames, so a file can be
-- traced back to its source without a lookup.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'model-runs',
  'model-runs',
  false,
  -- The largest of the 714 captured recordings is a few MB; the cap is a
  -- backstop against a bad upload, not a target.
  52428800,
  array['audio/mpeg', 'audio/mp4', 'audio/webm']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admins read model runs audio" on storage.objects;
drop policy if exists "admins write model runs audio" on storage.objects;
drop policy if exists "admins replace model runs audio" on storage.objects;

create policy "admins read model runs audio"
  on storage.objects for select to authenticated
  using (bucket_id = 'model-runs' and public.has_role(auth.uid(), 'admin'));

create policy "admins write model runs audio"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'model-runs' and public.has_role(auth.uid(), 'admin'));

-- Re-uploading a corrected file is an update, not a delete and re-insert.
create policy "admins replace model runs audio"
  on storage.objects for update to authenticated
  using (bucket_id = 'model-runs' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'model-runs' and public.has_role(auth.uid(), 'admin'));

-- No delete policy for anyone, deliberately. The recordings are the corpus's
-- irreplaceable half: the questions can be re-fetched from the capture, a
-- recording of him working one cannot be re-made. Removing one is a decision
-- that should require the Supabase console, not an API call.
