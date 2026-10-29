
-- 1) lsat_knowledge_sources: drop UNIQUE(slug); enforce UNIQUE(slug,version) + one-active-per-slug.
ALTER TABLE public.lsat_knowledge_sources
  DROP CONSTRAINT IF EXISTS lsat_knowledge_sources_slug_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lsat_knowledge_sources_slug_version_key'
  ) THEN
    ALTER TABLE public.lsat_knowledge_sources
      ADD CONSTRAINT lsat_knowledge_sources_slug_version_key UNIQUE (slug, version);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS lsat_knowledge_sources_one_active_per_slug
  ON public.lsat_knowledge_sources (slug)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS lsat_knowledge_sources_slug_status_idx
  ON public.lsat_knowledge_sources (slug, status);

-- 2) Staging table (version-isolated). Service-role only; no anon/authenticated grants.
CREATE TABLE IF NOT EXISTS public.lsatu_content_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_version text NOT NULL,
  kind text NOT NULL,
  source_id text NOT NULL,
  chunk_index integer NOT NULL,
  title text,
  subtitle text,
  body text,
  url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(3072),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_version, kind, source_id, chunk_index)
);

GRANT ALL ON public.lsatu_content_staging TO service_role;

ALTER TABLE public.lsatu_content_staging ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT policies for authenticated/anon: only service_role can touch staging.
-- Belt-and-suspenders admin read policy (still gated by has_role):
DROP POLICY IF EXISTS "Admins can read lsatu_content_staging" ON public.lsatu_content_staging;
CREATE POLICY "Admins can read lsatu_content_staging"
  ON public.lsatu_content_staging
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS lsatu_content_staging_version_idx
  ON public.lsatu_content_staging (import_version);
CREATE INDEX IF NOT EXISTS lsatu_content_staging_meta_slug_idx
  ON public.lsatu_content_staging ((metadata->>'source_slug'));

-- 3) Promotion RPC — atomic, transactional, service-role only.
CREATE OR REPLACE FUNCTION public.promote_lsat_knowledge_version(
  _slug text,
  _version text,
  _expected_count integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _staged_total int;
  _staged_slug int;
  _no_embed int;
  _bad_dim int;
  _prev_active text;
  _obsolete int := 0;
  _inserted int := 0;
BEGIN
  -- Lock the source row to serialize concurrent promotions.
  PERFORM 1 FROM lsat_knowledge_sources
    WHERE slug = _slug AND version = _version
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'source_row_missing: %/%', _slug, _version;
  END IF;

  SELECT count(*) INTO _staged_total
    FROM lsatu_content_staging
   WHERE import_version = _version;
  SELECT count(*) INTO _staged_slug
    FROM lsatu_content_staging
   WHERE import_version = _version
     AND kind = 'lsat_methodology'
     AND metadata->>'source_slug' = _slug;

  IF _staged_slug <> _expected_count THEN
    RAISE EXCEPTION 'staged_count_mismatch: got % expected %', _staged_slug, _expected_count;
  END IF;
  IF _staged_total <> _staged_slug THEN
    RAISE EXCEPTION 'staging_polluted: total % vs slug %', _staged_total, _staged_slug;
  END IF;

  SELECT count(*) INTO _no_embed
    FROM lsatu_content_staging
   WHERE import_version = _version AND embedding IS NULL;
  IF _no_embed > 0 THEN
    RAISE EXCEPTION 'missing_embeddings: %', _no_embed;
  END IF;

  SELECT count(*) INTO _bad_dim
    FROM lsatu_content_staging
   WHERE import_version = _version
     AND vector_dims(embedding) <> 3072;
  IF _bad_dim > 0 THEN
    RAISE EXCEPTION 'wrong_dim: %', _bad_dim;
  END IF;

  SELECT version INTO _prev_active
    FROM lsat_knowledge_sources
   WHERE slug = _slug AND status = 'active' AND version <> _version
   LIMIT 1;

  -- Archive any currently-active version(s) for this slug (other than us).
  UPDATE lsat_knowledge_sources
     SET status = 'archived', updated_at = now()
   WHERE slug = _slug AND status = 'active' AND version <> _version;

  -- Remove old live records for this slug (any prior version). Counted for reporting.
  WITH del AS (
    DELETE FROM lsatu_content_index
     WHERE kind = 'lsat_methodology'
       AND metadata->>'source_slug' = _slug
    RETURNING 1
  )
  SELECT count(*) INTO _obsolete FROM del;

  -- Promote staged rows into live index.
  WITH ins AS (
    INSERT INTO lsatu_content_index
      (kind, source_id, chunk_index, title, subtitle, body, url, metadata, embedding)
    SELECT kind, source_id, chunk_index, title, subtitle, body, url, metadata, embedding
      FROM lsatu_content_staging
     WHERE import_version = _version
       AND metadata->>'source_slug' = _slug
    RETURNING 1
  )
  SELECT count(*) INTO _inserted FROM ins;

  IF _inserted <> _expected_count THEN
    -- Trigger rollback of the whole transaction.
    RAISE EXCEPTION 'insert_count_mismatch: inserted % expected %', _inserted, _expected_count;
  END IF;

  -- Flip source row to active.
  UPDATE lsat_knowledge_sources
     SET status = 'active', updated_at = now()
   WHERE slug = _slug AND version = _version;

  -- Clear staging for this version.
  DELETE FROM lsatu_content_staging WHERE import_version = _version;

  RETURN jsonb_build_object(
    'promoted', _inserted,
    'obsolete_removed', _obsolete,
    'previously_active_version', _prev_active
  );
END;
$$;

REVOKE ALL ON FUNCTION public.promote_lsat_knowledge_version(text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.promote_lsat_knowledge_version(text, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.promote_lsat_knowledge_version(text, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.promote_lsat_knowledge_version(text, text, integer) TO service_role;

-- 4) Retrieval RPC — restrict to currently-active source version.
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
    JOIN public.lsat_knowledge_sources s
      ON s.slug    = c.metadata->>'source_slug'
     AND s.version = c.metadata->>'source_version'
     AND s.status  = 'active'
    WHERE (kinds IS NULL OR c.kind = ANY(kinds))
      AND (entity_type IS NULL OR c.metadata->>'entity_type' = entity_type)
      AND (entity_key  IS NULL OR c.metadata->>'entity_key'  = entity_key)
      AND (section_key IS NULL OR c.metadata->>'section_key' = section_key)
      AND (authority_filter IS NULL OR c.metadata->>'authority' = authority_filter)
      -- source_version_filter is accepted for backwards-compat but is
      -- intersected with the active-version join above, so it can only ever
      -- narrow to the active version.
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
    SELECT id, rank, row_number() OVER (ORDER BY rank DESC) AS rn FROM fts
  ),
  vec_ranked AS (
    SELECT id, similarity, row_number() OVER (ORDER BY similarity DESC) AS rn FROM vec
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
