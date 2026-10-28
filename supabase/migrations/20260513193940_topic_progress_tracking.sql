-- Topic-bootcamp progress tracking. Two thin tables:
--
-- 1. chapter_progress
--    One row per (user, topic_tag, section_id) the first time a student
--    scrolls a chapter section into view. Updated on subsequent views.
--    Powers the Teacher Workspace Bootcamps dashboard "sections viewed".
--
-- 2. flashcard_reviews
--    One row per flashcard review event. SRS-compatible: stores the rating
--    multiplier the student picked, the next-due timestamp, and the
--    cumulative review_count. Aggregations (mastery %, due count, avg
--    interval) compose at read time so future SRS changes do not break
--    historical data.
--
-- Both tables: RLS so a student can read+write only their own rows; admin
-- can read everyone via public.has_role(auth.uid(), 'admin').

-- ── chapter_progress ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chapter_progress (
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_tag        text        NOT NULL,
  section_id       text        NOT NULL,
  first_viewed_at  timestamptz NOT NULL DEFAULT now(),
  last_viewed_at   timestamptz NOT NULL DEFAULT now(),
  view_count       integer     NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, topic_tag, section_id)
);

CREATE INDEX IF NOT EXISTS chapter_progress_topic_user_idx
  ON public.chapter_progress (topic_tag, user_id);

CREATE INDEX IF NOT EXISTS chapter_progress_topic_last_viewed_idx
  ON public.chapter_progress (topic_tag, last_viewed_at DESC);

ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chapter_progress_select_own" ON public.chapter_progress;
CREATE POLICY "chapter_progress_select_own"
  ON public.chapter_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chapter_progress_select_admin" ON public.chapter_progress;
CREATE POLICY "chapter_progress_select_admin"
  ON public.chapter_progress FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "chapter_progress_insert_own" ON public.chapter_progress;
CREATE POLICY "chapter_progress_insert_own"
  ON public.chapter_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chapter_progress_update_own" ON public.chapter_progress;
CREATE POLICY "chapter_progress_update_own"
  ON public.chapter_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── flashcard_reviews ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flashcard_reviews (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_tag       text        NOT NULL,
  card_id         text        NOT NULL,
  rating          text        NOT NULL CHECK (rating IN ('again', 'good', 'easy')),
  interval_days   integer     NOT NULL,
  due_at          timestamptz NOT NULL,
  review_count    integer     NOT NULL DEFAULT 1,
  reviewed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flashcard_reviews_user_topic_idx
  ON public.flashcard_reviews (user_id, topic_tag, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS flashcard_reviews_topic_due_idx
  ON public.flashcard_reviews (topic_tag, due_at);

CREATE INDEX IF NOT EXISTS flashcard_reviews_user_card_idx
  ON public.flashcard_reviews (user_id, card_id, reviewed_at DESC);

ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flashcard_reviews_select_own" ON public.flashcard_reviews;
CREATE POLICY "flashcard_reviews_select_own"
  ON public.flashcard_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "flashcard_reviews_select_admin" ON public.flashcard_reviews;
CREATE POLICY "flashcard_reviews_select_admin"
  ON public.flashcard_reviews FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "flashcard_reviews_insert_own" ON public.flashcard_reviews;
CREATE POLICY "flashcard_reviews_insert_own"
  ON public.flashcard_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
