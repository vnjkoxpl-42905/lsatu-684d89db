-- User-customizable layout preferences for the Foyer surfaces (orbital ring,
-- dock, sidebar). Null resolves to the Default preset at read time.
alter table public.profiles
  add column if not exists layout_prefs jsonb;
