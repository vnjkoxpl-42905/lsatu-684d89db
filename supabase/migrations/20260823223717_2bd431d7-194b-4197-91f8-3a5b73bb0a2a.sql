alter table public.activity_assignments
  add column if not exists item_count integer
  generated always as (jsonb_array_length(coalesce(items, '[]'::jsonb))) stored;

comment on column public.activity_assignments.item_count is
  'How many items the run holds, generated from items. Exists so the Activities list can render a count without transferring the entire per-student question snapshot on every row.';