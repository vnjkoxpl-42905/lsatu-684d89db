-- Student Hub RPCs
-- ================
-- Two SECURITY DEFINER functions that the Student Hub uses to avoid
-- O(N) full-roster calls:
--
--   public.get_student_email(_student_id uuid) returns text
--     - Looks up one email on auth.users. Admin-guarded inside the body.
--       Replaces the admin-manage-users GET round trip for email.
--
--   public.get_assignment_counts_per_student() returns setof (...)
--     - Server-side aggregation of ta_assignments.status counts per
--       student. Replaces the client-side bucketing that scanned the
--       whole ta_assignments table on every hub load.

-- ── 1. Per-student email lookup ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_student_email(_student_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Admin-only. Non-admins get NULL rather than an exception so the UI
  -- can degrade gracefully (email field just doesn't render).
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;

  SELECT email INTO v_email
  FROM auth.users
  WHERE id = _student_id;

  RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_email(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_email(uuid) TO authenticated, service_role;

-- ── 2. Aggregated assignment counts per student ─────────────────────────────

CREATE OR REPLACE FUNCTION public.get_assignment_counts_per_student()
RETURNS TABLE (
  student_id  uuid,
  assigned    int,
  viewed      int,
  completed   int,
  total       int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.student_id,
    COUNT(*) FILTER (WHERE a.status = 'assigned')::int  AS assigned,
    COUNT(*) FILTER (WHERE a.status = 'viewed')::int    AS viewed,
    COUNT(*) FILTER (WHERE a.status = 'completed')::int AS completed,
    COUNT(*)::int                                       AS total
  FROM public.ta_assignments a
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY a.student_id;
$$;

REVOKE ALL ON FUNCTION public.get_assignment_counts_per_student() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assignment_counts_per_student()
  TO authenticated, service_role;
