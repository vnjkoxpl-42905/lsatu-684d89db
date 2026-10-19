-- external-work-uploads bucket: private. Students may upload their own
-- files; admins can read everything. Mirrors the student-context bucket
-- policy pattern.

insert into storage.buckets (id, name, public)
values ('external-work-uploads', 'external-work-uploads', false)
on conflict (id) do nothing;

-- Student inserts into a path scoped to their own user id.
create policy "external_work_uploads_student_insert"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'external-work-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Student reads only their own files.
create policy "external_work_uploads_student_select"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'external-work-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins: full access.
create policy "external_work_uploads_admin_all"
  on storage.objects
  for all to authenticated
  using (
    bucket_id = 'external-work-uploads'
    and public.has_role(auth.uid(), 'admin')
  )
  with check (
    bucket_id = 'external-work-uploads'
    and public.has_role(auth.uid(), 'admin')
  );
