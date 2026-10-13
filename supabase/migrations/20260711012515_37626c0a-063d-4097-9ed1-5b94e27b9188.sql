
-- 1) lsat_knowledge_sources
CREATE TABLE IF NOT EXISTS public.lsat_knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  domain text NOT NULL,
  version text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  authority text NOT NULL DEFAULT 'canonical',
  source_format text NOT NULL DEFAULT 'markdown',
  raw_markdown text NOT NULL,
  source_sha256 text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.lsat_knowledge_sources TO service_role;
-- No grants to anon/authenticated; admin reads go through backend or admin-scoped policy below.

ALTER TABLE public.lsat_knowledge_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read lsat_knowledge_sources" ON public.lsat_knowledge_sources;
CREATE POLICY "Admins can read lsat_knowledge_sources"
  ON public.lsat_knowledge_sources
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- (Writes intentionally restricted to service_role via GRANT; no INSERT/UPDATE/DELETE policies.)

CREATE TRIGGER lsat_knowledge_sources_touch_updated_at
  BEFORE UPDATE ON public.lsat_knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Metadata GIN index on the existing content index (idempotent)
CREATE INDEX IF NOT EXISTS lsatu_content_index_metadata_gin
  ON public.lsatu_content_index USING GIN (metadata jsonb_path_ops);

-- 3) Backend-only retrieval RPC. SECURITY DEFINER so it can read the
--    admin-scoped lsatu_content_index; EXECUTE is granted ONLY to
--    service_role so browser clients cannot call it directly.
CREATE OR REPLACE FUNCTION public.retrieve_lsat_knowledge(
  query_text text,
  query_embedding vector(3072),
  entity_type text DEFAULT NULL,
  entity_key text DEFAULT NULL,
  section_key text DEFAULT NULL,
  authority_filter text DEFAULT NULL,
  source_version_filter text DEFAULT NULL,
  match_count integer DEFAULT 8,
  kinds text[] DEFAULT ARRAY['lsat_methodology']::text[],
  rrf_k integer DEFAULT 60
)
RETURNS TABLE (
  id uuid,
  record_id text,
  kind text,
  source_id text,
  chunk_index integer,
  title text,
  subtitle text,
  body text,
  url text,
  metadata jsonb,
  heading_path jsonb,
  fts_rank double precision,
  vector_similarity double precision,
  score double precision
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT c.*
    FROM public.lsatu_content_index c
    WHERE (kinds IS NULL OR c.kind = ANY(kinds))
      AND (entity_type IS NULL OR c.metadata->>'entity_type' = entity_type)
      AND (entity_key  IS NULL OR c.metadata->>'entity_key'  = entity_key)
      AND (section_key IS NULL OR c.metadata->>'section_key' = section_key)
      AND (authority_filter IS NULL OR c.metadata->>'authority' = authority_filter)
      AND (source_version_filter IS NULL OR c.metadata->>'source_version' = source_version_filter)
  ),
  fts AS (
    SELECT b.id,
           ts_rank(
             to_tsvector('english',
               coalesce(b.title,'')||' '||coalesce(b.subtitle,'')||' '||coalesce(b.body,'')),
             websearch_to_tsquery('english', coalesce(query_text,''))
           )::float AS rank
    FROM base b
    WHERE query_text IS NOT NULL
      AND length(btrim(query_text)) > 0
      AND to_tsvector('english',
            coalesce(b.title,'')||' '||coalesce(b.subtitle,'')||' '||coalesce(b.body,''))
          @@ websearch_to_tsquery('english', query_text)
    ORDER BY rank DESC
    LIMIT greatest(match_count * 4, 40)
  ),
  vec AS (
    SELECT b.id,
           1 - (b.embedding <=> query_embedding)::float AS similarity
    FROM base b
    WHERE query_embedding IS NOT NULL
      AND b.embedding IS NOT NULL
    ORDER BY b.embedding <=> query_embedding
    LIMIT greatest(match_count * 4, 40)
  ),
  fts_ranked AS (
    SELECT id, rank, row_number() OVER (ORDER BY rank DESC) AS rn
    FROM fts
  ),
  vec_ranked AS (
    SELECT id, similarity, row_number() OVER (ORDER BY similarity DESC) AS rn
    FROM vec
  ),
  fused AS (
    SELECT
      coalesce(f.id, v.id) AS id,
      coalesce(f.rank, 0)::float AS fts_rank,
      coalesce(v.similarity, 0)::float AS vector_similarity,
      (
        coalesce(1.0 / (rrf_k + f.rn), 0)
      + coalesce(1.0 / (rrf_k + v.rn), 0)
      )::float AS score
    FROM fts_ranked f
    FULL OUTER JOIN vec_ranked v ON v.id = f.id
  )
  SELECT
    b.id,
    (b.source_id || '/chunk-' || lpad(b.chunk_index::text, 2, '0')) AS record_id,
    b.kind,
    b.source_id,
    b.chunk_index,
    b.title,
    b.subtitle,
    b.body,
    b.url,
    b.metadata,
    coalesce(b.metadata->'heading_path', '[]'::jsonb) AS heading_path,
    fused.fts_rank,
    fused.vector_similarity,
    fused.score
  FROM fused
  JOIN base b ON b.id = fused.id
  ORDER BY fused.score DESC, b.chunk_index ASC
  LIMIT greatest(1, least(match_count, 25));
$$;

-- Backend-only: revoke default PUBLIC EXECUTE, grant to service_role only.
REVOKE ALL ON FUNCTION public.retrieve_lsat_knowledge(
  text, vector(3072), text, text, text, text, text, integer, text[], integer
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.retrieve_lsat_knowledge(
  text, vector(3072), text, text, text, text, text, integer, text[], integer
) FROM anon;
REVOKE ALL ON FUNCTION public.retrieve_lsat_knowledge(
  text, vector(3072), text, text, text, text, text, integer, text[], integer
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.retrieve_lsat_knowledge(
  text, vector(3072), text, text, text, text, text, integer, text[], integer
) TO service_role;
