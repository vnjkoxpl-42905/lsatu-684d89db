-- The Activities list stops shipping every question to print a number.
--
-- The list selected `*`, which carries each assignment's whole `items` snapshot
-- -- roughly 30KB for Conditional Rephrase alone -- so a card could render its
-- title, status, score, and the COUNT of those items. The count is the only
-- thing the card ever wanted from that payload, and the database can do the
-- counting once, at write time, instead of shipping the array every read.
--
-- Stored rather than virtual so the read is a column read. `jsonb_array_length`
-- and `coalesce` are both immutable, which is what a generated column requires;
-- a row whose items are null counts as zero rather than as null.
--
-- The runner is untouched. It still reads the full row, because it genuinely
-- needs every item.

alter table public.activity_assignments
  add column if not exists item_count integer
  generated always as (jsonb_array_length(coalesce(items, '[]'::jsonb))) stored;

comment on column public.activity_assignments.item_count is
  'How many items the run holds, generated from items. Exists so the Activities list can render a count without transferring the entire per-student question snapshot on every row.';
