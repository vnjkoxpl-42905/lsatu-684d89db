-- The Report Card for a Read, Recall, Colour section.
--
-- A separate table rather than columns on activity_assignments, because a grade
-- the student can write is not a grade (ADR 0019). She holds UPDATE on her own
-- assignment row and the immutability trigger guards ten columns that do not
-- include score, status or completed_at -- so a score living there is one she
-- can set herself. Here she has SELECT and nothing else.
--
-- Written by the grader edge function with the service role, which bypasses RLS
-- entirely. That is why there is no admin INSERT policy: nothing outside the
-- function is meant to author a grade.

create table if not exists public.activity_section_grades (
  assignment_id uuid primary key
    references public.activity_assignments(id) on delete cascade,
  student_id uuid not null,

  -- PT105.S2. Carried so a grade can be read without joining the assignment.
  source_section text not null,

  -- Which ear heard the run. The Details were calibrated against Nova-3
  -- (ADR 0017), so a grade produced by a different engine is not comparable and
  -- must say so rather than blend in.
  transcript_engine text not null,
  transcript_text text,

  -- What the grader was when it ran. A prompt change bumps this, so a re-grade
  -- is legible instead of mysterious.
  grader_version smallint not null,

  -- Per stimulus: coverage, band, the Details missed, and the Reciting and
  -- Listing flags. One object per stimulus, in section order.
  stimuli jsonb not null,
  -- The whole run: time against her goal, dead air, and the decoy check.
  section jsonb not null,

  graded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists activity_section_grades_student_idx
  on public.activity_section_grades (student_id, graded_at desc);

alter table public.activity_section_grades enable row level security;

-- She reads her own Report Card.
drop policy if exists "students read own section grades" on public.activity_section_grades;
create policy "students read own section grades"
  on public.activity_section_grades for select to authenticated
  using (student_id = auth.uid());

-- Joshua reads every one.
drop policy if exists "admins read section grades" on public.activity_section_grades;
create policy "admins read section grades"
  on public.activity_section_grades for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- There is deliberately NO insert, update or delete policy for anyone. The
-- absence is the security property: the only writer is the service role inside
-- the grader, and a run with no row is ungraded rather than faked.

grant select on public.activity_section_grades to authenticated;

-- Then take back everything else.
--
-- This database grants ALL on every table in public to `authenticated` by
-- default, which for a fresh table means INSERT, UPDATE, DELETE and TRUNCATE
-- arrive uninvited. RLS already blocks the first three, since no policy permits
-- them -- but TRUNCATE is not subject to RLS at all, so the grant is the only
-- thing standing between a signed-in student and every grade in the table. It
-- is not reachable through PostgREST, which exposes no TRUNCATE, and it is
-- still not a grant this table should hold.
--
-- Revoking makes the intent explicit rather than implied, and means a
-- permissive policy added here by accident later cannot open a write path on
-- its own.
revoke insert, update, delete, truncate, references, trigger
  on public.activity_section_grades from authenticated;
revoke all on public.activity_section_grades from anon;

-- Verified in production 2026-09-01: authenticated holds SELECT and nothing
-- else; service_role, which is what the grader runs as, holds everything.
