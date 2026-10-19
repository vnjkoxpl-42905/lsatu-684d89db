-- Level-aware guided drills, part 3: the curriculum.
--
-- A track is an ordered spine of guided drills -- the sequence Joshua already
-- has, made explicit. Per-student changes are stored as a DIFF against that
-- spine rather than as a copy of it.
--
-- That is the whole design decision, and it comes from the requirement that
-- edits work "individually or in the entirety". A per-student copy (the obvious
-- jsonb-blob approach, and what schedule_templates.items_json would give us)
-- freezes at copy time: editing the default spine afterwards reaches nobody who
-- has already been enrolled. With a diff, a student who has not diverged has
-- zero override rows and therefore inherits every later spine edit, while a
-- student Joshua has hand-tuned keeps exactly the tuning he gave them.
--
-- Position and level are independent axes. The track says WHEN a drill comes;
-- profiles.proficiency_level says which questions come out of it. "A harder
-- causal drill from later in the journey" is those two set separately, not a
-- different drill.

-- ---------------------------------------------------------------------------
-- Tracks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.curriculum_tracks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  title       text NOT NULL,
  description text,
  is_default  boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.curriculum_tracks IS
  'An ordered course of guided drills. Per-student changes live in '
  'student_curriculum_overrides, never as a copy of the track.';

-- At most one default track, enforced rather than merely intended.
CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculum_tracks_one_default
  ON public.curriculum_tracks ((is_default)) WHERE is_default;

-- ---------------------------------------------------------------------------
-- The spine
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.curriculum_track_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id         uuid NOT NULL REFERENCES public.curriculum_tracks(id) ON DELETE CASCADE,
  -- RESTRICT, not CASCADE: deleting a drill that a curriculum depends on should
  -- fail loudly rather than silently punch a hole in every student's sequence.
  guided_drill_id  uuid NOT NULL REFERENCES public.guided_drills(id) ON DELETE RESTRICT,
  position         integer NOT NULL,
  suggested_week   integer,
  estimated_minutes integer,
  is_optional      boolean NOT NULL DEFAULT false,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- DEFERRABLE so a reorder can shuffle several rows inside one transaction
-- without tripping over itself mid-update.
ALTER TABLE public.curriculum_track_items
  DROP CONSTRAINT IF EXISTS curriculum_track_items_position_key;
ALTER TABLE public.curriculum_track_items
  ADD CONSTRAINT curriculum_track_items_position_key
  UNIQUE (track_id, position) DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX IF NOT EXISTS idx_curriculum_track_items_track
  ON public.curriculum_track_items (track_id, position);

-- ---------------------------------------------------------------------------
-- The per-student diff
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_curriculum_overrides (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id        uuid NOT NULL REFERENCES public.curriculum_tracks(id) ON DELETE CASCADE,
  -- NULL for an 'insert', which adds a drill the spine does not contain.
  track_item_id   uuid REFERENCES public.curriculum_track_items(id) ON DELETE CASCADE,
  action          text NOT NULL CHECK (action IN ('skip', 'reorder', 'insert', 'repace')),
  -- 'reorder' and 'insert': where it goes. Otherwise NULL.
  position        integer,
  -- 'insert': what to add. Otherwise NULL.
  guided_drill_id uuid REFERENCES public.guided_drills(id) ON DELETE CASCADE,
  -- Pin one entry to a band regardless of the student's profile level.
  level           text CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- An insert names a drill; everything else names a spine item.
  CONSTRAINT student_curriculum_overrides_target CHECK (
    (action = 'insert' AND guided_drill_id IS NOT NULL)
    OR (action <> 'insert' AND track_item_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.student_curriculum_overrides IS
  'Rows exist only where a student diverges from the track. No rows means the '
  'student follows the spine and inherits future edits to it.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_curriculum_overrides_unique
  ON public.student_curriculum_overrides (student_id, track_id, track_item_id, action)
  WHERE track_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_curriculum_overrides_student
  ON public.student_curriculum_overrides (student_id, track_id);

-- ---------------------------------------------------------------------------
-- Enrollment
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_curriculum_enrollments (
  student_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id        uuid NOT NULL REFERENCES public.curriculum_tracks(id) ON DELETE RESTRICT,
  started_on      date,
  -- "go faster for some": >1 packs more work per week, <1 stretches it out.
  pace_multiplier numeric NOT NULL DEFAULT 1.0 CHECK (pace_multiplier > 0),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS: admin writes everything, students read only what concerns them.
-- ---------------------------------------------------------------------------

ALTER TABLE public.curriculum_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_track_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_curriculum_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_curriculum_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage curriculum tracks" ON public.curriculum_tracks;
CREATE POLICY "Admins manage curriculum tracks"
  ON public.curriculum_tracks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage curriculum track items" ON public.curriculum_track_items;
CREATE POLICY "Admins manage curriculum track items"
  ON public.curriculum_track_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage student curriculum overrides" ON public.student_curriculum_overrides;
CREATE POLICY "Admins manage student curriculum overrides"
  ON public.student_curriculum_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage student curriculum enrollments" ON public.student_curriculum_enrollments;
CREATE POLICY "Admins manage student curriculum enrollments"
  ON public.student_curriculum_enrollments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Read-only for students. Deliberately no student INSERT/UPDATE/DELETE
-- anywhere: a student re-pacing or un-skipping their own curriculum would be
-- indistinguishable from Joshua doing it.
DROP POLICY IF EXISTS "Students read their own enrollment" ON public.student_curriculum_enrollments;
CREATE POLICY "Students read their own enrollment"
  ON public.student_curriculum_enrollments FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students read their own overrides" ON public.student_curriculum_overrides;
CREATE POLICY "Students read their own overrides"
  ON public.student_curriculum_overrides FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students read the track they are enrolled on" ON public.curriculum_tracks;
CREATE POLICY "Students read the track they are enrolled on"
  ON public.curriculum_tracks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_curriculum_enrollments e
    WHERE e.student_id = auth.uid() AND e.track_id = curriculum_tracks.id
  ));

DROP POLICY IF EXISTS "Students read the items of their track" ON public.curriculum_track_items;
CREATE POLICY "Students read the items of their track"
  ON public.curriculum_track_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_curriculum_enrollments e
    WHERE e.student_id = auth.uid() AND e.track_id = curriculum_track_items.track_id
  ));

-- ---------------------------------------------------------------------------
-- Seed the default track from the order that already exists
-- ---------------------------------------------------------------------------
--
-- guided_drills.week + order_in_week IS the known sequence; this just makes it
-- a first-class, editable object. Idempotent: re-running adds only drills the
-- track does not already contain, appended after the current last position.

INSERT INTO public.curriculum_tracks (slug, title, description, is_default)
VALUES (
  'blue-lr-default',
  'Blue LR (default)',
  'The full guided-drill sequence in week order. The starting point for every student; per-student edits are stored as overrides.',
  true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.curriculum_track_items
  (track_id, guided_drill_id, position, suggested_week, estimated_minutes)
SELECT
  t.id,
  d.id,
  COALESCE((SELECT max(position) FROM public.curriculum_track_items WHERE track_id = t.id), 0)
    + row_number() OVER (ORDER BY d.week, d.order_in_week, d.slug),
  d.week,
  d.estimated_minutes
FROM public.guided_drills d
CROSS JOIN (SELECT id FROM public.curriculum_tracks WHERE slug = 'blue-lr-default') t
WHERE d.is_published
  AND NOT EXISTS (
    SELECT 1 FROM public.curriculum_track_items i
    WHERE i.track_id = t.id AND i.guided_drill_id = d.id
  );
