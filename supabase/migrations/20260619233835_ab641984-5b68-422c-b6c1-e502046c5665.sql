CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.lsatu_content_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  source_id text NOT NULL,
  chunk_index int NOT NULL DEFAULT 0,
  title text,
  subtitle text,
  body text,
  url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(3072),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, source_id, chunk_index)
);

GRANT SELECT ON public.lsatu_content_index TO authenticated;
GRANT ALL ON public.lsatu_content_index TO service_role;

ALTER TABLE public.lsatu_content_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read content index"
  ON public.lsatu_content_index FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX lsatu_content_index_kind_idx ON public.lsatu_content_index (kind);
CREATE INDEX lsatu_content_index_fts_idx ON public.lsatu_content_index
  USING gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(subtitle,'') || ' ' || coalesce(body,'')));

CREATE TRIGGER lsatu_content_index_touch
  BEFORE UPDATE ON public.lsatu_content_index
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.match_lsatu_content(
  query_embedding vector(3072),
  match_count int DEFAULT 8,
  kind_filter text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  kind text,
  source_id text,
  title text,
  subtitle text,
  url text,
  metadata jsonb,
  snippet text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.kind,
    c.source_id,
    c.title,
    c.subtitle,
    c.url,
    c.metadata,
    substring(coalesce(c.body,''), 1, 400) AS snippet,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.lsatu_content_index c
  WHERE public.has_role(auth.uid(),'admin')
    AND c.embedding IS NOT NULL
    AND (kind_filter IS NULL OR c.kind = ANY(kind_filter))
  ORDER BY c.embedding <=> query_embedding
  LIMIT greatest(1, least(match_count, 25));
$$;

CREATE OR REPLACE FUNCTION public.fts_lsatu_content(
  q text,
  match_count int DEFAULT 8,
  kind_filter text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  kind text,
  source_id text,
  title text,
  subtitle text,
  url text,
  metadata jsonb,
  snippet text,
  rank float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.kind,
    c.source_id,
    c.title,
    c.subtitle,
    c.url,
    c.metadata,
    substring(coalesce(c.body,''), 1, 400) AS snippet,
    ts_rank(
      to_tsvector('english', coalesce(c.title,'') || ' ' || coalesce(c.subtitle,'') || ' ' || coalesce(c.body,'')),
      websearch_to_tsquery('english', q)
    )::float AS rank
  FROM public.lsatu_content_index c
  WHERE public.has_role(auth.uid(),'admin')
    AND q IS NOT NULL AND length(btrim(q)) > 0
    AND (kind_filter IS NULL OR c.kind = ANY(kind_filter))
    AND to_tsvector('english', coalesce(c.title,'') || ' ' || coalesce(c.subtitle,'') || ' ' || coalesce(c.body,''))
        @@ websearch_to_tsquery('english', q)
  ORDER BY rank DESC
  LIMIT greatest(1, least(match_count, 25));
$$;