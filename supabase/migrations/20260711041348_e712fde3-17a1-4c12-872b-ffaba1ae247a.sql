
-- Add SECURITY DEFINER RPC for exact canonical-id retrieval that is restricted
-- to the currently-active source version. Retrieval callers must go through
-- this so ordinary lookups can never return stale/archived records.
CREATE OR REPLACE FUNCTION public.get_lsat_knowledge_by_canonical_id(
  _canonical_id text,
  _kinds text[] DEFAULT ARRAY['lsat_methodology']::text[]
) RETURNS TABLE (
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
  heading_path jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    (c.metadata->>'canonical_id') || '/chunk-' || lpad(c.chunk_index::text, 2, '0') AS record_id,
    c.kind,
    c.source_id,
    c.chunk_index,
    c.title,
    c.subtitle,
    c.body,
    c.url,
    c.metadata,
    coalesce(c.metadata->'heading_path', '[]'::jsonb) AS heading_path
  FROM public.lsatu_content_index c
  JOIN public.lsat_knowledge_sources s
    ON s.slug    = c.metadata->>'source_slug'
   AND s.version = c.metadata->>'source_version'
   AND s.status  = 'active'
  WHERE (_kinds IS NULL OR c.kind = ANY(_kinds))
    AND c.metadata->>'canonical_id' = _canonical_id
  ORDER BY c.chunk_index ASC;
$$;

REVOKE ALL ON FUNCTION public.get_lsat_knowledge_by_canonical_id(text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lsat_knowledge_by_canonical_id(text, text[]) FROM anon;
REVOKE ALL ON FUNCTION public.get_lsat_knowledge_by_canonical_id(text, text[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_lsat_knowledge_by_canonical_id(text, text[]) TO service_role;
