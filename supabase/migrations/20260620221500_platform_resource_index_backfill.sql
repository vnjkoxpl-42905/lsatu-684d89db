-- Backfill first-class platform resources into the universal LSAT U content index.
-- Embeddings stay null here; exact title/source/alias matching and FTS cover these
-- canonical objects, while the embedding job can populate vectors separately.

WITH route_rows(kind, source_id, chunk_index, title, subtitle, body, url, metadata) AS (
  VALUES
    ('route', '/teacher', 0, 'Teacher Desk', 'Main assistant workspace', 'teacher desk assistant today dashboard chat', '/teacher', '{"canonical_id":"route:/teacher","aliases":["teacher desk","teacher workspace"]}'::jsonb),
    ('route', '/teacher/library/activities', 0, 'Activity Center', 'Teacher activity library', 'activity centre activity center activities assign launch teacher library', '/teacher/library/activities', '{"canonical_id":"route:/teacher/library/activities","aliases":["activity centre","activity center","teacher activities"]}'::jsonb),
    ('route', '/activities', 0, 'Activity Centre', 'Student activity centre', 'activity centre activity center student activities assigned work', '/activities', '{"canonical_id":"route:/activities","aliases":["activity center","activity centre","student activities"]}'::jsonb),
    ('route', '/teacher/library/guided-drills', 0, 'Guided Drills', 'Teacher guided drill library', 'guided drills guided drill library teacher assign launch', '/teacher/library/guided-drills', '{"canonical_id":"route:/teacher/library/guided-drills","aliases":["guided drill library","teacher guided drills"]}'::jsonb),
    ('route', '/drill', 0, 'Smart Drill', 'Adaptive drilling surface', 'smart drill drilling practice questions adaptive drill', '/drill', '{"canonical_id":"route:/drill","aliases":["smart drill","practice drill"]}'::jsonb),
    ('route', '/bootcamp/causation-station', 0, 'Causation Station', 'Bootcamp', 'causation station causal reasoning bootcamp', '/bootcamp/causation-station', '{"canonical_id":"bootcamp:causation-station","aliases":["causation station bootcamp","causal reasoning bootcamp"]}'::jsonb),
    ('route', '/bootcamp/intro-to-lr', 0, 'Intro to LR', 'Bootcamp', 'intro to logical reasoning main conclusion structure bootcamp', '/bootcamp/intro-to-lr', '{"canonical_id":"bootcamp:intro-to-lr","aliases":["intro logical reasoning","intro to logical reasoning"]}'::jsonb),
    ('route', '/bootcamp/principle-flaw', 0, 'Principle and Flaw', 'Bootcamp', 'principle flaw bootcamp questions', '/bootcamp/principle-flaw', '{"canonical_id":"bootcamp:principle-flaw","aliases":["principle flaw","principle and flaw bootcamp"]}'::jsonb),
    ('route', '/bootcamp/fallacy-flaw', 0, 'Flaw and Famous Flaws', 'Bootcamp', 'fallacy flaw famous flaws bootcamp', '/bootcamp/fallacy-flaw', '{"canonical_id":"bootcamp:fallacy-flaw","aliases":["famous flaws","fallacy flaw bootcamp"]}'::jsonb),
    ('route', '/journal', 0, 'Wrong Answer Journal', 'Journal', 'wrong answer journal waj review missed questions', '/journal', '{"canonical_id":"route:/journal","aliases":["waj","wrong answer journal"]}'::jsonb)
)
INSERT INTO public.lsatu_content_index (kind, source_id, chunk_index, title, subtitle, body, url, metadata)
SELECT kind, source_id, chunk_index, title, subtitle, body, url, metadata
FROM route_rows
ON CONFLICT (kind, source_id, chunk_index) DO UPDATE
SET title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    body = EXCLUDED.body,
    url = EXCLUDED.url,
    metadata = public.lsatu_content_index.metadata || EXCLUDED.metadata,
    updated_at = now();

INSERT INTO public.lsatu_content_index (kind, source_id, chunk_index, title, subtitle, body, url, metadata)
SELECT
  'activity',
  a.id::text,
  0,
  a.title,
  a.subtitle,
  concat_ws(' ', a.title, a.subtitle, 'activity centre activity center assignment'),
  '/activities',
  jsonb_build_object(
    'canonical_id', 'activity:' || a.id::text,
    'slug', a.slug,
    'aliases', jsonb_build_array(a.title, a.slug, replace(a.title, 'Station', 'Station drill'))
  )
FROM public.activities a
ON CONFLICT (kind, source_id, chunk_index) DO UPDATE
SET title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    body = EXCLUDED.body,
    url = EXCLUDED.url,
    metadata = public.lsatu_content_index.metadata || EXCLUDED.metadata,
    updated_at = now();

INSERT INTO public.lsatu_content_index (kind, source_id, chunk_index, title, subtitle, body, url, metadata)
SELECT
  'guided_drill',
  g.id::text,
  0,
  g.title,
  g.category,
  concat_ws(' ', g.title, g.category, 'guided drill assignment practice'),
  '/guided',
  jsonb_build_object(
    'canonical_id', 'guided_drill:' || g.id::text,
    'slug', g.slug,
    'aliases', jsonb_build_array(g.title, g.slug)
  )
FROM public.guided_drills g
ON CONFLICT (kind, source_id, chunk_index) DO UPDATE
SET title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    body = EXCLUDED.body,
    url = EXCLUDED.url,
    metadata = public.lsatu_content_index.metadata || EXCLUDED.metadata,
    updated_at = now();
