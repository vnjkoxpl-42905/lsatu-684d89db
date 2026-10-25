-- Booking remediation Phase 4: idempotent staged submissions and cleanup.

ALTER TABLE public.external_work_uploads
  ADD COLUMN IF NOT EXISTS client_upload_id text,
  ADD COLUMN IF NOT EXISTS cleanup_claimed_at timestamptz;

ALTER TABLE public.booking_pass_redemptions
  ADD COLUMN IF NOT EXISTS submission_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS submission_error text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.booking_pass_redemptions'::regclass
      AND conname = 'booking_redemptions_submission_status_ck'
  ) THEN
    ALTER TABLE public.booking_pass_redemptions
      ADD CONSTRAINT booking_redemptions_submission_status_ck
      CHECK (submission_status IN ('none', 'staged', 'linked', 'failed'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS external_work_uploads_booking_client_id
  ON public.external_work_uploads (booking_pass_id, booking_idempotency_key, client_upload_id)
  WHERE booking_pass_id IS NOT NULL
    AND booking_idempotency_key IS NOT NULL
    AND client_upload_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS external_work_uploads_abandoned_booking_stage
  ON public.external_work_uploads (created_at)
  WHERE redemption_id IS NULL AND booking_pass_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_booking_upload_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _count int;
BEGIN
  IF NEW.booking_pass_id IS NULL OR NEW.booking_idempotency_key IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.booking_pass_id::text || ':' || NEW.booking_idempotency_key, 0));
  SELECT count(*) INTO _count
  FROM public.external_work_uploads
  WHERE booking_pass_id = NEW.booking_pass_id
    AND booking_idempotency_key = NEW.booking_idempotency_key
    AND (TG_OP <> 'UPDATE' OR id <> NEW.id);
  IF _count >= 5 THEN
    RAISE EXCEPTION 'too_many_files' USING ERRCODE = 'P0400';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS external_work_uploads_booking_limit ON public.external_work_uploads;
CREATE TRIGGER external_work_uploads_booking_limit
BEFORE INSERT OR UPDATE OF booking_pass_id, booking_idempotency_key
ON public.external_work_uploads
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_upload_limit();

CREATE OR REPLACE FUNCTION public.take_abandoned_booking_uploads(
  _older_than interval DEFAULT interval '24 hours',
  _limit int DEFAULT 250
) RETURNS TABLE(id uuid, storage_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH doomed AS (
    SELECT e.id
    FROM public.external_work_uploads e
    WHERE e.redemption_id IS NULL
      AND e.booking_pass_id IS NOT NULL
      AND e.created_at < now() - _older_than
      AND (e.cleanup_claimed_at IS NULL OR e.cleanup_claimed_at < now() - interval '30 minutes')
    ORDER BY e.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(_limit, 1), 1000)
  )
  UPDATE public.external_work_uploads e
  SET cleanup_claimed_at = now()
  FROM doomed d
  WHERE e.id = d.id
  RETURNING e.id, e.storage_path;
END;
$$;

REVOKE ALL ON FUNCTION public.take_abandoned_booking_uploads(interval, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.take_abandoned_booking_uploads(interval, int) TO service_role;

-- The daily booking-upload cleanup invocation is installed during the Lovable
-- production apply with the project-scoped service key.
