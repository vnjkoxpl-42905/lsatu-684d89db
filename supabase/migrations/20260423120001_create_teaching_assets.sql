-- AI Teaching Assistant Phase 1 (A): permanent teaching library.
-- One row per asset. Text extracted from PDFs/docs lives in content_text for
-- full-text retrieval by the ta-chat edge function. Admin-only read/write.

CREATE TABLE IF NOT EXISTS public.teaching_assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  asset_type    text NOT NULL
                CHECK (asset_type IN ('pdf','document','question_set','drill','curriculum','notes')),
  content_text  text,
  file_path     text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teaching_assets ENABLE ROW LEVEL SECURITY;

-- Admin-only CRUD. Students have zero access — the TA never exposes the
-- library directly to students; assets surface only through approved
-- assignments.
CREATE POLICY "Admins read teaching assets"
  ON public.teaching_assets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert teaching assets"
  ON public.teaching_assets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins update teaching assets"
  ON public.teaching_assets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete teaching assets"
  ON public.teaching_assets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-bump updated_at on any UPDATE.
CREATE OR REPLACE FUNCTION public.bump_teaching_assets_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teaching_assets_updated_at ON public.teaching_assets;
CREATE TRIGGER teaching_assets_updated_at
  BEFORE UPDATE ON public.teaching_assets
  FOR EACH ROW EXECUTE FUNCTION public.bump_teaching_assets_updated_at();

-- Sorting index.
CREATE INDEX IF NOT EXISTS teaching_assets_asset_type_idx
  ON public.teaching_assets (asset_type, created_at DESC);

-- Full-text search index. The ta-chat edge function uses this to retrieve
-- relevant assets given a free-text query — see search_teaching_assets() RPC
-- below. Coalesce guards against NULL content_text.
CREATE INDEX IF NOT EXISTS teaching_assets_search_idx
  ON public.teaching_assets
  USING GIN (to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(content_text, '')
  ));

-- FTS RPC: ranked retrieval, bounded excerpt. Exposed via PostgREST so the
-- edge function (service role) can call it without inline SQL.
CREATE OR REPLACE FUNCTION public.search_teaching_assets(q text, max_rows int DEFAULT 5)
RETURNS TABLE (
  id          uuid,
  title       text,
  description text,
  asset_type  text,
  excerpt     text,
  rank        real
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    a.id,
    a.title,
    a.description,
    a.asset_type,
    substring(coalesce(a.content_text, ''), 1, 2000) AS excerpt,
    ts_rank(
      to_tsvector('english',
        coalesce(a.title, '') || ' ' ||
        coalesce(a.description, '') || ' ' ||
        coalesce(a.content_text, '')
      ),
      websearch_to_tsquery('english', q)
    ) AS rank
  FROM public.teaching_assets a
  WHERE
    q IS NOT NULL
    AND length(btrim(q)) > 0
    AND to_tsvector('english',
          coalesce(a.title, '') || ' ' ||
          coalesce(a.description, '') || ' ' ||
          coalesce(a.content_text, '')
        ) @@ websearch_to_tsquery('english', q)
  ORDER BY rank DESC
  LIMIT greatest(1, least(max_rows, 20));
$$;

REVOKE ALL ON FUNCTION public.search_teaching_assets(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_teaching_assets(text, int) TO authenticated, service_role;
