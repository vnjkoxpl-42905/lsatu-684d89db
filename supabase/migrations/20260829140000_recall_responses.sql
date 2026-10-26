-- Read, Recall, Colour: what one spoken capture produced.
--
-- Extends `activity_item_responses` rather than adding a table. RRC is still an
-- Activity, its rows still belong to an assignment and a student, and the RLS,
-- the append-only shape and the admin read are all already right. What it needs
-- is a place to put the parts a typed answer does not have.
--
-- Everything here is nullable and every other Activity leaves it null, so this
-- is additive for the eight already running.

ALTER TABLE public.activity_item_responses
  ADD COLUMN IF NOT EXISTS rrc jsonb;

COMMENT ON COLUMN public.activity_item_responses.rrc IS
  'Read, Recall, Colour only. One spoken capture: {chunk_n, stage, covers, transcript, covered, total_details, longest_run, overlap, elapsed_ms}. '
  '`covered` ABSENT means the Coach never answered, which is not the same as no detail surviving and must never be rendered or scored as a zero. '
  '`stage` is recall | colour | cumulative | the-read; a colour carries a transcript and is never judged, by design.';

-- `verdict` stays null for every RRC row. A recall is not correct, partial or
-- incorrect: it is a set of details that did or did not survive, and forcing it
-- into the three-way verdict would put a grade on something the drill
-- deliberately does not grade.
--
-- The consequence is that RRC rows are invisible to the existing score
-- aggregate, which is correct rather than a gap: an RRC assignment's result is
-- the per-detail trend across the set, not a count of correct items.

CREATE INDEX IF NOT EXISTS activity_item_responses_rrc_idx
  ON public.activity_item_responses (assignment_id, item_order)
  WHERE rrc IS NOT NULL;

-- The `activities.item_format` check constraint predates spoken work and allows
-- only free-text, mcq and variation. Read, Recall, Colour is `spoken-recall`,
-- and that string is not cosmetic: `ActivityRunner` switches on it to hand the
-- whole screen to a different player (docs/adr/0009). Without widening this the
-- seed insert fails outright, which is exactly how it failed when the seed was
-- first applied by hand on 2026-08-29.
--
-- Dropped and recreated rather than altered because Postgres has no ALTER for a
-- check expression. The window where the table is unconstrained is inside this
-- transaction, so nothing can write through it.
ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_item_format_check;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_item_format_check
  CHECK (item_format = ANY (ARRAY['free-text'::text, 'mcq'::text, 'variation'::text, 'spoken-recall'::text]));
