-- Journal workspace — Notion-style notes + databases for students.
--
-- User-scoped (auth.uid() = user_id), tight RLS. Distinct from the
-- Main Conclusion bootcamp's `journal_entries` table — do NOT touch that.
--
-- The existing `wrong_answer_journal` table stays exactly as-is: it is
-- class_id-scoped with its own (permissive) RLS and is surfaced read-only by
-- the app, never migrated here. Never cross the class_id / user_id streams.
--
-- Reuses:
--   public.update_updated_at_column()  (defined 2025-10-17)
--   public.has_role(auth.uid(), 'admin')  (defined 2026-04-15)
-- RLS policy shape copied verbatim from public.user_saved_sets.

-- ── journal_pages ────────────────────────────────────────────────────────────
-- Every doc, every database, AND every database row is a page.
--   type='doc'      → free-form TipTap document (body)
--   type='database' → has a journal_databases sidecar; its child pages are rows
--   a database row  → a page whose parent_page_id is a database page; row values
--                     live in `properties` keyed by column id
CREATE TABLE IF NOT EXISTS public.journal_pages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_page_id uuid REFERENCES public.journal_pages(id) ON DELETE CASCADE,
  title          text NOT NULL DEFAULT 'Untitled',
  icon           text,
  type           text NOT NULL DEFAULT 'doc' CHECK (type IN ('doc','database')),
  body           jsonb NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  properties     jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order     double precision NOT NULL DEFAULT 0,
  is_archived    boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_pages_user_parent_idx
  ON public.journal_pages (user_id, parent_page_id, sort_order);
CREATE INDEX IF NOT EXISTS journal_pages_user_updated_idx
  ON public.journal_pages (user_id, updated_at DESC);

ALTER TABLE public.journal_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_pages_select_own" ON public.journal_pages;
CREATE POLICY "journal_pages_select_own"
  ON public.journal_pages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_pages_select_admin" ON public.journal_pages;
CREATE POLICY "journal_pages_select_admin"
  ON public.journal_pages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "journal_pages_insert_own" ON public.journal_pages;
CREATE POLICY "journal_pages_insert_own"
  ON public.journal_pages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_pages_update_own" ON public.journal_pages;
CREATE POLICY "journal_pages_update_own"
  ON public.journal_pages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_pages_delete_own" ON public.journal_pages;
CREATE POLICY "journal_pages_delete_own"
  ON public.journal_pages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS journal_pages_updated_at ON public.journal_pages;
CREATE TRIGGER journal_pages_updated_at
  BEFORE UPDATE ON public.journal_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── journal_databases (1:1 sidecar for type='database' pages) ────────────────
-- columns: ordered jsonb array of {id, name, type, options?}
--   type ∈ ('text','number','select','multi_select','date','checkbox','url')
CREATE TABLE IF NOT EXISTS public.journal_databases (
  page_id    uuid PRIMARY KEY REFERENCES public.journal_pages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  columns    jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_databases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_databases_select_own" ON public.journal_databases;
CREATE POLICY "journal_databases_select_own"
  ON public.journal_databases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_databases_select_admin" ON public.journal_databases;
CREATE POLICY "journal_databases_select_admin"
  ON public.journal_databases FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "journal_databases_insert_own" ON public.journal_databases;
CREATE POLICY "journal_databases_insert_own"
  ON public.journal_databases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_databases_update_own" ON public.journal_databases;
CREATE POLICY "journal_databases_update_own"
  ON public.journal_databases FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_databases_delete_own" ON public.journal_databases;
CREATE POLICY "journal_databases_delete_own"
  ON public.journal_databases FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS journal_databases_updated_at ON public.journal_databases;
CREATE TRIGGER journal_databases_updated_at
  BEFORE UPDATE ON public.journal_databases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── journal_views (N per database) ───────────────────────────────────────────
-- kind ∈ ('table','board','gallery'); config holds sort/filter/group/visible cols.
CREATE TABLE IF NOT EXISTS public.journal_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id uuid NOT NULL REFERENCES public.journal_pages(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL DEFAULT 'Table',
  kind        text NOT NULL DEFAULT 'table' CHECK (kind IN ('table','board','gallery')),
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order  double precision NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_views_db_idx
  ON public.journal_views (database_id, sort_order);

ALTER TABLE public.journal_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_views_select_own" ON public.journal_views;
CREATE POLICY "journal_views_select_own"
  ON public.journal_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_views_select_admin" ON public.journal_views;
CREATE POLICY "journal_views_select_admin"
  ON public.journal_views FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "journal_views_insert_own" ON public.journal_views;
CREATE POLICY "journal_views_insert_own"
  ON public.journal_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_views_update_own" ON public.journal_views;
CREATE POLICY "journal_views_update_own"
  ON public.journal_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_views_delete_own" ON public.journal_views;
CREATE POLICY "journal_views_delete_own"
  ON public.journal_views FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS journal_views_updated_at ON public.journal_views;
CREATE TRIGGER journal_views_updated_at
  BEFORE UPDATE ON public.journal_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Feature flag ─────────────────────────────────────────────────────────────
-- has_waj_access lives on public.profiles (keyed class_id = user.id). Add the
-- new flag additively and backfill it from has_waj_access so existing Wrong
-- Answer Journal users keep access to the revamped Journal.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_journal_access boolean NOT NULL DEFAULT false;

UPDATE public.profiles
  SET has_journal_access = has_waj_access
  WHERE has_journal_access IS DISTINCT FROM has_waj_access;
