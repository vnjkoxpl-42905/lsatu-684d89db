-- A verdict resting on a mis-hearing must be disputable (W7).
--
-- The audit's run: stimulus 5's judge reason quoted her as saying "clearly moral
-- characters". The recording says IMMORAL. Deepgram dropped the prefix and the
-- card told her she gave the wrong Read. The v1 spec named transcription error
-- as the top risk and the mitigation was showing her the transcript. The
-- transcript is shown; nothing said the verdict may rest on a mis-hearing, and
-- there was no way to say so.
--
-- WHY ITS OWN TABLE, and not a column on `activity_section_grades`.
--
-- Joshua's call, 2026-09-04, and the session that asked it had just proved the
-- argument by accident. A `force` re-grade of assignment f8684334 attempt 2
-- REPLACED the whole grade row. A dispute stored on that row would have been
-- destroyed by precisely the operation the dispute is about -- the same shape as
-- the W17 mistake, where a stash sharing a lifetime with the thing it protects
-- against gets deleted by the event it exists for.
--
-- A dispute is also not one per grade. She may dispute several stimuli in one
-- section, at different times, and each is its own assertion with its own clock.
-- A column could hold one; a table holds what actually happens.
--
-- It is deliberately NOT a workflow. There is no status, no assignee, no
-- resolution state machine. The order asks for a stored flag and a place Joshua
-- can see it, and anything past that is a product decision nobody has made.

create table if not exists public.activity_grade_disputes (
  id uuid primary key default gen_random_uuid(),

  -- What is being disputed, at the grain the card shows: one stimulus of one
  -- sitting. `attempt_no` is part of the key for the same reason the grade is
  -- keyed per Attempt -- a second run of the same section is a different
  -- Report Card and a dispute against it is a different assertion.
  assignment_id uuid not null references public.activity_assignments (id) on delete cascade,
  attempt_no integer not null,
  stimulus_slug text not null,

  -- Denormalised on purpose. The dispute has to stay legible after a re-grade
  -- rewrites the grade row, so the section it was about is stored here rather
  -- than joined for. This is the whole reason the table exists.
  source_section text,

  student_id uuid not null references auth.users (id) on delete cascade,

  -- Her own words, optional. The control is one tap and typing is not required:
  -- a dispute with no note is still the signal Joshua needs, and demanding an
  -- explanation from a student who has just been marked wrongly is a way of
  -- making sure she does not bother.
  note text,

  -- What the card said at the moment she disputed it. Kept because a re-grade
  -- can change the verdict, and "she disputed this" is only useful alongside
  -- what she was disputing.
  disputed_band text,
  disputed_reason text,

  created_at timestamptz not null default now(),

  -- One dispute per stimulus per sitting. Tapping twice is a student checking
  -- it registered, not a second complaint.
  unique (assignment_id, attempt_no, stimulus_slug)
);

-- Joshua reads this by student and by recency; she reads only her own.
create index if not exists activity_grade_disputes_student_idx
  on public.activity_grade_disputes (student_id, created_at desc);
create index if not exists activity_grade_disputes_assignment_idx
  on public.activity_grade_disputes (assignment_id, attempt_no);

alter table public.activity_grade_disputes enable row level security;

-- She may raise one against her own run and read her own back, so the control
-- can show that it registered. She may not edit or withdraw one: a dispute is
-- an event, and an event that can be unsaid is not evidence of anything.
drop policy if exists "students raise their own disputes" on public.activity_grade_disputes;
create policy "students raise their own disputes"
  on public.activity_grade_disputes for insert to authenticated
  with check (student_id = auth.uid());

drop policy if exists "students read their own disputes" on public.activity_grade_disputes;
create policy "students read their own disputes"
  on public.activity_grade_disputes for select to authenticated
  using (student_id = auth.uid());

-- Joshua reads all of them. This is the "place he can see it" half of the order.
drop policy if exists "admins read every dispute" on public.activity_grade_disputes;
create policy "admins read every dispute"
  on public.activity_grade_disputes for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
