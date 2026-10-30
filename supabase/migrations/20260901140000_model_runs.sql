-- Where Joshua's own run of a stimulus lives.
--
-- Read, Recall, Colour is graded against two different keys and they have
-- opposite audiences. The Details are the key her recall is scored against and
-- they travel with the Activity. His Model Run -- the recording of the drill
-- done correctly, and the transcript of it -- is the standard those Details
-- were calibrated against, and she must never read it before she has run the
-- section. Until now both were a rootless string in the content JSON
-- ("audio/PT105_S2_Q1.mp3") that resolved only against a folder on his Mac, so
-- nothing deployed could reach either one.
--
-- This is the home. One row per captured stimulus, keyed by the slug the
-- content already carries, so an Activity item joins to its Model Run on the
-- identifier it has rather than on a path it has to be told.
--
-- Why the transcript is a column and the audio is a pointer: the transcript is
-- 2KB of text a grader reads server-side and never streams, so a query returns
-- it in one round trip. The recording is 1.6MB she plays back in her review,
-- and 714 of them are 1.1GB, so it belongs in a bucket with a signed URL.
--
-- Why it is not in the Activity's `items`: a student fetching her own
-- assignment selects every column of it (activitiesClient.getStudentAssignment),
-- and Postgres RLS filters rows, never columns. Anything in `items` is in her
-- browser. That is already true of the Details and of The Read's key, which is
-- its own problem; it must not become true of his verbatim run of the drill.

create table if not exists public.model_runs (
  id uuid primary key default gen_random_uuid(),

  -- The join key, and the same string the content item carries as its slug.
  slug text not null,
  -- Re-transcribing the corpus with a better model writes a new version rather
  -- than overwriting the text a section's Details were calibrated against.
  version integer not null default 1,
  status text not null default 'active'
    check (status in ('active', 'archived')),

  source_section text not null,        -- PT105.S2
  citation text,                       -- PT105.S2.Q1

  -- The recording. Bucket and path rather than a URL: a signed URL expires, and
  -- the capture's own Airtable URLs already carry an expiry stamp.
  audio_bucket text not null default 'model-runs',
  audio_path text not null,
  audio_bytes bigint,
  audio_sha256 char(64),

  -- The transcript. Nullable on purpose and not a defect: 93 of the 714
  -- recordings are not transcribed yet, and a row that carries the audio with
  -- no transcript is the honest record of that.
  transcript_text text,
  transcript_sha256 char(64),
  asr_engine text,
  asr_model text,
  transcribed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (slug, version),
  -- The hash is what a drift check compares, so text without one is a row that
  -- cannot be checked and must not exist.
  constraint model_runs_transcript_pairing
    check ((transcript_text is null) = (transcript_sha256 is null))
);

-- One row per slug is the current truth; the rest are history.
create unique index if not exists model_runs_one_active_per_slug
  on public.model_runs (slug) where status = 'active';
create index if not exists model_runs_section_idx
  on public.model_runs (source_section, status);

drop trigger if exists model_runs_updated_at on public.model_runs;
create trigger model_runs_updated_at
  before update on public.model_runs
  for each row execute function public.update_updated_at_column();

alter table public.model_runs enable row level security;

-- One policy per command rather than one FOR ALL, so widening a write later
-- cannot silently widen the read. There is deliberately NO policy granting a
-- student select: that absence is the whole security property of this table.
drop policy if exists "admins read model runs" on public.model_runs;
drop policy if exists "admins insert model runs" on public.model_runs;
drop policy if exists "admins update model runs" on public.model_runs;
drop policy if exists "admins delete model runs" on public.model_runs;

create policy "admins read model runs"
  on public.model_runs for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Writable by an admin, not only by the service role. There is no service-role
-- key outside Lovable, so a service-role-only table could be loaded only by
-- pasting 621 transcripts into a browser SQL editor. An admin JWT loads it from
-- the command line instead, and keeps 2.6MB of his spoken keys out of this
-- repository's git history.
create policy "admins insert model runs"
  on public.model_runs for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "admins update model runs"
  on public.model_runs for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "admins delete model runs"
  on public.model_runs for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));
