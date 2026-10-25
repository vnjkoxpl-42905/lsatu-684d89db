-- Schedules as data, part 4.
--
-- A curriculum says WHICH drills come and in what order. A schedule says what a
-- WEEK looks like: which days are worked, what sits on each one, where the
-- timed day falls, where rest falls. They are independent axes, the same way
-- position and level already are -- "same week shape, different drills" and
-- "same drills, different week shape" are both things Joshua does.
--
-- Until now the week was a constant in curriculumSchedule.ts, which meant one
-- shape for everybody. He runs several: his standard week, and variants per
-- student (Malaya's, below, moves the full test to Saturday and adds a midweek
-- untimed section). So the shape becomes a row.
--
-- days_json is keyed by weekday, matching JS Date#getDay: 0 = Sunday .. 6 =
-- Saturday. A weekday that is absent is a REST day -- absent and empty mean the
-- same thing to a reader, and absent cannot be mistaken for "a day with no work
-- yet". Each day is an ordered list of tasks:
--
--   [{ "title": "...", "minutes": 45 | null, "drill_slot": true }]
--
-- drill_slot marks the one position curriculum work may fill. Everything else
-- is standing work (RC passages, journals, supersections, practice tests) that
-- no drill catalog supplies, so it rides as a checklist line and is never
-- assigned or notified.

-- ---------------------------------------------------------------------------
-- The schedules
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.schedule_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  title       text NOT NULL,
  description text,
  is_default  boolean NOT NULL DEFAULT false,
  days_json   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.schedule_templates IS
  'The shape of a study week. Independent of curriculum_tracks, which decide '
  'which drills fill the drill_slot positions.';

COMMENT ON COLUMN public.schedule_templates.days_json IS
  'Weekday (0=Sunday, per JS Date#getDay) -> ordered tasks. An absent weekday '
  'is a rest day.';

-- At most one default schedule, enforced rather than merely intended.
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_templates_one_default
  ON public.schedule_templates ((is_default)) WHERE is_default;

-- ---------------------------------------------------------------------------
-- Who is on which schedule
-- ---------------------------------------------------------------------------

-- Deliberately NOT a column on student_curriculum_enrollments: that table
-- requires a track, and a student can be on a schedule before Joshua has
-- decided their curriculum. Separate axes, separate rows.
CREATE TABLE IF NOT EXISTS public.student_schedules (
  student_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_template_id uuid NOT NULL REFERENCES public.schedule_templates(id) ON DELETE RESTRICT,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS: admin writes everything, students read only what concerns them.
-- ---------------------------------------------------------------------------

ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage schedule templates" ON public.schedule_templates;
CREATE POLICY "Admins manage schedule templates"
  ON public.schedule_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage student schedules" ON public.student_schedules;
CREATE POLICY "Admins manage student schedules"
  ON public.student_schedules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Read-only for students, matching the curriculum tables: a student changing
-- their own week would be indistinguishable from Joshua doing it.
DROP POLICY IF EXISTS "Students read their own schedule" ON public.student_schedules;
CREATE POLICY "Students read their own schedule"
  ON public.student_schedules FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students read the schedule they are on" ON public.schedule_templates;
CREATE POLICY "Students read the schedule they are on"
  ON public.schedule_templates FOR SELECT TO authenticated
  USING (
    is_default
    OR EXISTS (
      SELECT 1 FROM public.student_schedules s
      WHERE s.student_id = auth.uid() AND s.schedule_template_id = schedule_templates.id
    )
  );

-- ---------------------------------------------------------------------------
-- Seed: the two schedules that actually exist
-- ---------------------------------------------------------------------------
--
-- Both are transcribed, not invented. The standard week is captured twice in
-- the brain (a Mar 2025 screenshot and Joshua's 2026-07-23 manuscript); the
-- Saturday-test variant is the week he built live for a student on 2025-10-10.

INSERT INTO public.schedule_templates (slug, title, description, is_default, days_json)
VALUES (
  'standard-week',
  'Standard week',
  'Four untimed skill days, one timed supersection, Saturday rest, Sunday full test.',
  true,
  jsonb_build_object(
    '1', jsonb_build_array(
      jsonb_build_object('title', 'Priority question type drill (untimed)', 'minutes', null, 'drill_slot', true),
      jsonb_build_object('title', 'Wrong answer journal', 'minutes', null),
      jsonb_build_object('title', '1-2 RC passages (untimed)', 'minutes', null),
      jsonb_build_object('title', 'Wrong answer journal', 'minutes', null)
    ),
    '2', jsonb_build_array(
      jsonb_build_object('title', 'Priority question type drill (untimed)', 'minutes', null, 'drill_slot', true),
      jsonb_build_object('title', 'Wrong answer journal', 'minutes', null),
      jsonb_build_object('title', '1-2 RC passages (untimed)', 'minutes', null),
      jsonb_build_object('title', 'Wrong answer journal', 'minutes', null)
    ),
    '3', jsonb_build_array(
      jsonb_build_object('title', 'Priority question type drill (untimed)', 'minutes', null, 'drill_slot', true),
      jsonb_build_object('title', 'Wrong answer journal', 'minutes', null),
      jsonb_build_object('title', '1-2 RC passages (untimed)', 'minutes', null),
      jsonb_build_object('title', 'Wrong answer journal', 'minutes', null)
    ),
    '4', jsonb_build_array(
      jsonb_build_object('title', 'Priority question type drill (untimed)', 'minutes', null, 'drill_slot', true),
      jsonb_build_object('title', 'Wrong answer journal', 'minutes', null),
      jsonb_build_object('title', '1-2 RC passages (untimed)', 'minutes', null),
      jsonb_build_object('title', 'Wrong answer journal', 'minutes', null)
    ),
    '5', jsonb_build_array(
      jsonb_build_object('title', 'RC or LR supersection (5 passages / 35 questions), timed', 'minutes', 45),
      jsonb_build_object('title', 'Blind review and wrong answer journal', 'minutes', null)
    ),
    '0', jsonb_build_array(
      jsonb_build_object('title', 'Full practice test', 'minutes', null),
      jsonb_build_object('title', 'Blind review and wrong answer journal', 'minutes', null)
    )
  )
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.schedule_templates (slug, title, description, is_default, days_json)
VALUES (
  'saturday-test-week',
  'Saturday test week',
  'Skill days Monday to Thursday with a midweek untimed section, Friday superset, full test Saturday, Sunday rest.',
  false,
  jsonb_build_object(
    '1', jsonb_build_array(
      jsonb_build_object('title', 'Priority question type drill (untimed)', 'minutes', null, 'drill_slot', true),
      jsonb_build_object('title', 'Wrong answer journal', 'minutes', null),
      jsonb_build_object('title', '1-2 RC passages (untimed)', 'minutes', null),
      jsonb_build_object('title', 'Wrong answer journal', 'minutes', null)
    ),
    '2', jsonb_build_array(
      jsonb_build_object('title', 'Priority question type drill (untimed)', 'minutes', null, 'drill_slot', true),
      jsonb_build_object('title', 'Wrong answer journal', 'minutes', null),
      jsonb_build_object('title', '1-2 RC passages (untimed)', 'minutes', null),
      jsonb_build_object('title', 'Wrong answer journal', 'minutes', null)
    ),
    '3', jsonb_build_array(
      jsonb_build_object('title', 'Priority question type drill (untimed)', 'minutes', null, 'drill_slot', true),
      jsonb_build_object('title', 'Untimed section, answers shown immediately', 'minutes', null),
      jsonb_build_object('title', 'Review each miss on the spot', 'minutes', null)
    ),
    '4', jsonb_build_array(
      jsonb_build_object('title', 'Priority question type drill (untimed)', 'minutes', null, 'drill_slot', true),
      jsonb_build_object('title', 'Wrong answer journal', 'minutes', null),
      jsonb_build_object('title', '1-2 RC passages (untimed)', 'minutes', null),
      jsonb_build_object('title', 'Wrong answer journal', 'minutes', null)
    ),
    '5', jsonb_build_array(
      jsonb_build_object('title', 'Superset: 5 RC passages or 25 harder LR questions, timed', 'minutes', null),
      jsonb_build_object('title', 'Blind review and wrong answer journal', 'minutes', null)
    ),
    '6', jsonb_build_array(
      jsonb_build_object('title', 'Full practice test', 'minutes', null),
      jsonb_build_object('title', 'Blind review and wrong answer journal', 'minutes', null)
    )
  )
)
ON CONFLICT (slug) DO NOTHING;
