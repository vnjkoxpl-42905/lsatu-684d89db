-- Phase 2: atomic cancellation and pass administration
ALTER TABLE public.booking_pass_redemptions
  ADD COLUMN IF NOT EXISTS calendar_action text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS calendar_status text NOT NULL DEFAULT 'synced',
  ADD COLUMN IF NOT EXISTS calendar_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calendar_error text,
  ADD COLUMN IF NOT EXISTS calendar_lease_until timestamptz,
  ADD COLUMN IF NOT EXISTS calendar_last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credit_refunded boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.booking_pass_redemptions'::regclass AND conname = 'booking_redemptions_calendar_action_ck') THEN
    ALTER TABLE public.booking_pass_redemptions ADD CONSTRAINT booking_redemptions_calendar_action_ck CHECK (calendar_action IN ('create', 'update', 'delete', 'none'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.booking_pass_redemptions'::regclass AND conname = 'booking_redemptions_calendar_status_ck') THEN
    ALTER TABLE public.booking_pass_redemptions ADD CONSTRAINT booking_redemptions_calendar_status_ck CHECK (calendar_status IN ('pending', 'processing', 'synced', 'failed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.booking_pass_redemptions'::regclass AND conname = 'booking_redemptions_calendar_attempts_ck') THEN
    ALTER TABLE public.booking_pass_redemptions ADD CONSTRAINT booking_redemptions_calendar_attempts_ck CHECK (calendar_attempts >= 0);
  END IF;
END $$;

UPDATE public.booking_pass_redemptions
SET calendar_action = CASE WHEN status = 'booked' AND (gcal_state = 'pending' OR needs_gcal_sync) THEN 'create' ELSE 'none' END,
    calendar_status = CASE WHEN gcal_state = 'pending' OR needs_gcal_sync THEN 'pending' WHEN gcal_state = 'failed' THEN 'failed' ELSE 'synced' END,
    calendar_error = COALESCE(calendar_error, gcal_error),
    calendar_last_synced_at = CASE WHEN gcal_state = 'synced' THEN updated_at ELSE NULL END;

CREATE INDEX IF NOT EXISTS booking_redemptions_calendar_work
  ON public.booking_pass_redemptions (calendar_status, calendar_lease_until, updated_at)
  WHERE calendar_action <> 'none';

CREATE OR REPLACE FUNCTION public.cancel_booking_redemption(_redemption_id uuid, _refund boolean DEFAULT true, _actor_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _redemption public.booking_pass_redemptions%ROWTYPE; _pass public.booking_passes%ROWTYPE; _did_refund boolean := false;
BEGIN
  SELECT * INTO _redemption FROM public.booking_pass_redemptions WHERE id = _redemption_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'redemption_not_found' USING ERRCODE = 'P0404'; END IF;
  SELECT * INTO _pass FROM public.booking_passes WHERE id = _redemption.booking_pass_id FOR UPDATE;
  IF _redemption.status = 'cancelled' THEN
    RETURN jsonb_build_object('redemption', to_jsonb(_redemption), 'pass', to_jsonb(_pass), 'was_existing', true, 'refunded', _redemption.credit_refunded);
  END IF;
  IF _redemption.status <> 'booked' THEN RAISE EXCEPTION 'redemption_not_booked:%', _redemption.status USING ERRCODE = 'P0400'; END IF;
  IF COALESCE(_refund, true) AND NOT _redemption.credit_refunded AND _pass.used_credits > 0 THEN
    UPDATE public.booking_passes SET used_credits = used_credits - 1,
      status = CASE WHEN status = 'exhausted' AND (expires_at IS NULL OR expires_at > now()) THEN 'active' ELSE status END
    WHERE id = _pass.id RETURNING * INTO _pass;
    _did_refund := true;
  END IF;
  UPDATE public.booking_pass_redemptions
  SET status = 'cancelled', cancelled_at = COALESCE(cancelled_at, now()), cancelled_by = COALESCE(cancelled_by, _actor_id),
      credit_refunded = credit_refunded OR _did_refund,
      calendar_action = 'delete', calendar_status = 'pending', calendar_error = NULL, calendar_lease_until = NULL,
      needs_gcal_sync = true, gcal_state = 'pending', gcal_error = NULL
  WHERE id = _redemption.id RETURNING * INTO _redemption;
  UPDATE public.schedule_events SET status = 'cancelled', deleted_at = COALESCE(deleted_at, now())
  WHERE id = _redemption.schedule_event_id
     OR (_redemption.google_event_id IS NOT NULL AND google_event_id = _redemption.google_event_id);
  RETURN jsonb_build_object('redemption', to_jsonb(_redemption), 'pass', to_jsonb(_pass), 'was_existing', false, 'refunded', _did_refund);
END; $$;
REVOKE ALL ON FUNCTION public.cancel_booking_redemption(uuid, boolean, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_redemption(uuid, boolean, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.manage_booking_pass(_pass_id uuid, _action text, _credits int DEFAULT NULL, _session_length_minutes int DEFAULT NULL, _expires_at timestamptz DEFAULT NULL, _clear_expiry boolean DEFAULT false)
RETURNS public.booking_passes LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pass public.booking_passes%ROWTYPE;
BEGIN
  SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'pass_not_found' USING ERRCODE = 'P0404'; END IF;
  IF _action = 'add_credits' THEN
    IF _credits IS NULL OR _credits < 1 OR _credits > 50 THEN RAISE EXCEPTION 'invalid_credits' USING ERRCODE = 'P0400'; END IF;
    UPDATE public.booking_passes SET total_credits = total_credits + _credits,
      status = CASE WHEN status = 'exhausted' AND (expires_at IS NULL OR expires_at > now()) THEN 'active' ELSE status END
    WHERE id = _pass_id RETURNING * INTO _pass;
  ELSIF _action IN ('set_remaining', 'set_terms_and_remaining') THEN
    IF _credits IS NULL OR _credits < 0 OR _credits > 50 THEN RAISE EXCEPTION 'invalid_credits' USING ERRCODE = 'P0400'; END IF;
    IF _pass.used_credits = 0 AND _credits = 0 THEN RAISE EXCEPTION 'invalid_credits' USING ERRCODE = 'P0400'; END IF;
    IF _action = 'set_terms_and_remaining' AND _session_length_minutes IS NOT NULL AND (_session_length_minutes < 15 OR _session_length_minutes > 480) THEN
      RAISE EXCEPTION 'invalid_session_length' USING ERRCODE = 'P0400';
    END IF;
    UPDATE public.booking_passes SET total_credits = used_credits + _credits,
      session_length_minutes = CASE WHEN _action = 'set_terms_and_remaining' THEN COALESCE(_session_length_minutes, session_length_minutes) ELSE session_length_minutes END,
      expires_at = CASE WHEN _action = 'set_terms_and_remaining' AND _clear_expiry THEN NULL WHEN _action = 'set_terms_and_remaining' THEN COALESCE(_expires_at, expires_at) ELSE expires_at END,
      status = CASE
        WHEN status IN ('revoked', 'paused') THEN status
        WHEN _action = 'set_terms_and_remaining' AND NOT _clear_expiry AND COALESCE(_expires_at, expires_at) IS NOT NULL AND COALESCE(_expires_at, expires_at) <= now() THEN 'expired'
        WHEN _action <> 'set_terms_and_remaining' AND expires_at IS NOT NULL AND expires_at <= now() THEN 'expired'
        WHEN _credits = 0 THEN 'exhausted' ELSE 'active' END
    WHERE id = _pass_id RETURNING * INTO _pass;
  ELSIF _action = 'pause' THEN
    IF _pass.status = 'revoked' THEN RAISE EXCEPTION 'pass_revoked' USING ERRCODE = 'P0400'; END IF;
    UPDATE public.booking_passes SET status = 'paused' WHERE id = _pass_id RETURNING * INTO _pass;
  ELSIF _action = 'resume' THEN
    IF _pass.status <> 'paused' THEN RAISE EXCEPTION 'pass_not_paused' USING ERRCODE = 'P0400'; END IF;
    UPDATE public.booking_passes SET status = CASE
      WHEN expires_at IS NOT NULL AND expires_at <= now() THEN 'expired'
      WHEN used_credits >= total_credits THEN 'exhausted' ELSE 'active' END
    WHERE id = _pass_id RETURNING * INTO _pass;
  ELSIF _action = 'update_terms' THEN
    IF _session_length_minutes IS NOT NULL AND (_session_length_minutes < 15 OR _session_length_minutes > 480) THEN
      RAISE EXCEPTION 'invalid_session_length' USING ERRCODE = 'P0400';
    END IF;
    UPDATE public.booking_passes SET session_length_minutes = COALESCE(_session_length_minutes, session_length_minutes),
      expires_at = CASE WHEN _clear_expiry THEN NULL ELSE COALESCE(_expires_at, expires_at) END,
      status = CASE WHEN status IN ('revoked', 'paused') THEN status
        WHEN NOT _clear_expiry AND COALESCE(_expires_at, expires_at) IS NOT NULL AND COALESCE(_expires_at, expires_at) <= now() THEN 'expired'
        WHEN used_credits >= total_credits THEN 'exhausted' ELSE 'active' END
    WHERE id = _pass_id RETURNING * INTO _pass;
  ELSIF _action = 'revoke' THEN
    UPDATE public.booking_passes SET status = 'revoked' WHERE id = _pass_id RETURNING * INTO _pass;
  ELSE RAISE EXCEPTION 'invalid_action' USING ERRCODE = 'P0400';
  END IF;
  RETURN _pass;
END; $$;
REVOKE ALL ON FUNCTION public.manage_booking_pass(uuid, text, int, int, timestamptz, boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_booking_pass(uuid, text, int, int, timestamptz, boolean) TO service_role;

-- Phase 3: calendar reconciliation
ALTER TABLE public.schedule_events ADD COLUMN IF NOT EXISTS transparency text NOT NULL DEFAULT 'opaque';
ALTER TABLE public.gcal_sync_state
  ADD COLUMN IF NOT EXISTS busy_calendar_ids text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sync_token_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.schedule_events'::regclass AND conname = 'schedule_events_transparency_ck') THEN
    ALTER TABLE public.schedule_events ADD CONSTRAINT schedule_events_transparency_ck CHECK (transparency IN ('opaque', 'transparent'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.booking_calendar_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id uuid NOT NULL REFERENCES public.booking_pass_redemptions(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('deleted', 'move_conflict', 'duplicate_event', 'terminal_failure', 'persistence_failure')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS booking_calendar_alerts_one_open
  ON public.booking_calendar_alerts (redemption_id, alert_type) WHERE status = 'open';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_calendar_alerts TO authenticated;
GRANT ALL ON public.booking_calendar_alerts TO service_role;
ALTER TABLE public.booking_calendar_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage booking calendar alerts" ON public.booking_calendar_alerts;
CREATE POLICY "Admins manage booking calendar alerts" ON public.booking_calendar_alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.claim_booking_calendar_actions(_limit int DEFAULT 25, _lease_seconds int DEFAULT 120)
RETURNS SETOF public.booking_pass_redemptions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.booking_pass_redemptions
    WHERE calendar_action <> 'none' AND calendar_status IN ('pending', 'processing')
      AND (calendar_lease_until IS NULL OR calendar_lease_until < now())
    ORDER BY updated_at FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(_limit, 1), 100)
  )
  UPDATE public.booking_pass_redemptions r
  SET calendar_status = 'processing', calendar_attempts = calendar_attempts + 1,
      calendar_lease_until = now() + make_interval(secs => LEAST(GREATEST(_lease_seconds, 30), 600))
  FROM candidates c WHERE r.id = c.id RETURNING r.*;
END; $$;
REVOKE ALL ON FUNCTION public.claim_booking_calendar_actions(int, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_calendar_actions(int, int) TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_booking_calendar_event(_redemption_id uuid, _google_event_id text, _start_at timestamptz, _end_at timestamptz, _deleted boolean DEFAULT false, _meet_url text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _red public.booking_pass_redemptions%ROWTYPE; _conflict uuid;
BEGIN
  SELECT * INTO _red FROM public.booking_pass_redemptions WHERE id = _redemption_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'redemption_not_found' USING ERRCODE = 'P0404'; END IF;
  IF _deleted THEN
    INSERT INTO public.booking_calendar_alerts (redemption_id, alert_type, details)
    VALUES (_redemption_id, 'deleted', jsonb_build_object('google_event_id', _google_event_id))
    ON CONFLICT (redemption_id, alert_type) WHERE status = 'open' DO UPDATE SET details = EXCLUDED.details;
    UPDATE public.booking_pass_redemptions
    SET calendar_action = 'none', calendar_status = 'failed',
        calendar_error = 'google_event_deleted_requires_adjudication', calendar_lease_until = NULL,
        gcal_state = 'failed', gcal_error = 'google_event_deleted_requires_adjudication', needs_gcal_sync = false
    WHERE id = _redemption_id RETURNING * INTO _red;
    RETURN jsonb_build_object('outcome', 'deleted_alert', 'redemption', to_jsonb(_red));
  END IF;
  SELECT id INTO _conflict FROM public.booking_pass_redemptions
  WHERE id <> _redemption_id AND status = 'booked' AND start_at < _end_at AND end_at > _start_at LIMIT 1;
  IF _conflict IS NOT NULL THEN
    INSERT INTO public.booking_calendar_alerts (redemption_id, alert_type, details)
    VALUES (_redemption_id, 'move_conflict', jsonb_build_object('google_event_id', _google_event_id, 'conflicting_redemption_id', _conflict, 'requested_start_at', _start_at, 'requested_end_at', _end_at))
    ON CONFLICT (redemption_id, alert_type) WHERE status = 'open' DO UPDATE SET details = EXCLUDED.details;
    RETURN jsonb_build_object('outcome', 'move_conflict', 'conflicting_redemption_id', _conflict);
  END IF;
  UPDATE public.booking_pass_redemptions
  SET start_at = _start_at, end_at = _end_at, google_event_id = COALESCE(_google_event_id, google_event_id),
      meet_url = COALESCE(_meet_url, meet_url), calendar_action = 'none', calendar_status = 'synced',
      calendar_error = NULL, calendar_lease_until = NULL, calendar_last_synced_at = now(),
      needs_gcal_sync = false, gcal_state = 'synced', gcal_error = NULL
  WHERE id = _redemption_id RETURNING * INTO _red;
  RETURN jsonb_build_object('outcome', 'updated', 'redemption', to_jsonb(_red));
END; $$;
REVOKE ALL ON FUNCTION public.reconcile_booking_calendar_event(uuid, text, timestamptz, timestamptz, boolean, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_booking_calendar_event(uuid, text, timestamptz, timestamptz, boolean, text) TO service_role;

-- Phase 4: upload idempotency
ALTER TABLE public.external_work_uploads
  ADD COLUMN IF NOT EXISTS client_upload_id text,
  ADD COLUMN IF NOT EXISTS cleanup_claimed_at timestamptz;
ALTER TABLE public.booking_pass_redemptions
  ADD COLUMN IF NOT EXISTS submission_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS submission_error text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.booking_pass_redemptions'::regclass AND conname = 'booking_redemptions_submission_status_ck') THEN
    ALTER TABLE public.booking_pass_redemptions ADD CONSTRAINT booking_redemptions_submission_status_ck CHECK (submission_status IN ('none', 'staged', 'linked', 'failed'));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS external_work_uploads_booking_client_id
  ON public.external_work_uploads (booking_pass_id, booking_idempotency_key, client_upload_id)
  WHERE booking_pass_id IS NOT NULL AND booking_idempotency_key IS NOT NULL AND client_upload_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS external_work_uploads_abandoned_booking_stage
  ON public.external_work_uploads (created_at)
  WHERE redemption_id IS NULL AND booking_pass_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_booking_upload_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _count int;
BEGIN
  IF NEW.booking_pass_id IS NULL OR NEW.booking_idempotency_key IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.booking_pass_id::text || ':' || NEW.booking_idempotency_key, 0));
  SELECT count(*) INTO _count FROM public.external_work_uploads
  WHERE booking_pass_id = NEW.booking_pass_id AND booking_idempotency_key = NEW.booking_idempotency_key
    AND (TG_OP <> 'UPDATE' OR id <> NEW.id);
  IF _count >= 5 THEN RAISE EXCEPTION 'too_many_files' USING ERRCODE = 'P0400'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS external_work_uploads_booking_limit ON public.external_work_uploads;
CREATE TRIGGER external_work_uploads_booking_limit
BEFORE INSERT OR UPDATE OF booking_pass_id, booking_idempotency_key
ON public.external_work_uploads FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_upload_limit();

CREATE OR REPLACE FUNCTION public.take_abandoned_booking_uploads(_older_than interval DEFAULT interval '24 hours', _limit int DEFAULT 250)
RETURNS TABLE(id uuid, storage_path text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH doomed AS (
    SELECT e.id FROM public.external_work_uploads e
    WHERE e.redemption_id IS NULL AND e.booking_pass_id IS NOT NULL
      AND e.created_at < now() - _older_than
      AND (e.cleanup_claimed_at IS NULL OR e.cleanup_claimed_at < now() - interval '30 minutes')
    ORDER BY e.created_at FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(_limit, 1), 1000)
  )
  UPDATE public.external_work_uploads e SET cleanup_claimed_at = now()
  FROM doomed d WHERE e.id = d.id RETURNING e.id, e.storage_path;
END; $$;
REVOKE ALL ON FUNCTION public.take_abandoned_booking_uploads(interval, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.take_abandoned_booking_uploads(interval, int) TO service_role;

-- Phase 5: student state
CREATE OR REPLACE FUNCTION public.get_student_booking(_auth_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pass public.booking_passes%ROWTYPE;
BEGIN
  UPDATE public.booking_passes SET status = 'expired'
  WHERE student_id = _auth_user_id AND status = 'active' AND expires_at IS NOT NULL AND expires_at <= now();
  UPDATE public.booking_passes SET status = 'exhausted'
  WHERE student_id = _auth_user_id AND status = 'active' AND used_credits >= total_credits;
  SELECT * INTO _pass FROM public.booking_passes WHERE student_id = _auth_user_id
  ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 WHEN 'exhausted' THEN 2 WHEN 'expired' THEN 3 ELSE 4 END, created_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'pass', CASE WHEN _pass.id IS NULL THEN NULL ELSE jsonb_build_object(
      'status', _pass.status, 'total_credits', _pass.total_credits, 'used_credits', _pass.used_credits,
      'credits_remaining', GREATEST(0, _pass.total_credits - _pass.used_credits),
      'session_length_minutes', _pass.session_length_minutes, 'expires_at', _pass.expires_at) END,
    'redemptions', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.start_at) FROM (
        SELECT red.id, red.start_at, red.end_at, red.status, red.meet_url,
          red.reschedule_count, red.google_event_id, red.calendar_status, red.submission_status,
          (red.status = 'booked' AND red.start_at > now() AND red.reschedule_count < 1) AS can_reschedule
        FROM public.booking_pass_redemptions red
        JOIN public.booking_passes bp ON bp.id = red.booking_pass_id
        WHERE bp.student_id = _auth_user_id
      ) r), '[]'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION public.get_student_booking(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_booking(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.set_booking_availability(_timezone text, _ranges jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _overlap boolean;
BEGIN
  IF _timezone IS NOT NULL AND length(_timezone) > 0 THEN PERFORM now() AT TIME ZONE _timezone; END IF;
  WITH parsed AS (
    SELECT (e->>'day_of_week')::int AS dow, (e->>'start_time')::time AS start_time, (e->>'end_time')::time AS end_time
    FROM jsonb_array_elements(COALESCE(_ranges, '[]'::jsonb)) e
  )
  SELECT EXISTS (SELECT 1 FROM parsed a JOIN parsed b
    ON a.dow = b.dow AND (a.start_time, a.end_time) <> (b.start_time, b.end_time)
    AND a.start_time < b.end_time AND a.end_time > b.start_time) INTO _overlap;
  IF _overlap THEN RAISE EXCEPTION 'overlapping_availability_ranges' USING ERRCODE = 'P0400'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(_ranges, '[]'::jsonb)) e
    WHERE (e->>'day_of_week')::int NOT BETWEEN 0 AND 6 OR (e->>'end_time')::time <= (e->>'start_time')::time) THEN
    RAISE EXCEPTION 'invalid_availability_range' USING ERRCODE = 'P0400';
  END IF;
  IF _timezone IS NOT NULL AND length(_timezone) > 0 THEN
    UPDATE public.booking_availability_config SET timezone = _timezone, updated_at = now() WHERE id = 1;
  END IF;
  DELETE FROM public.booking_availability;
  INSERT INTO public.booking_availability(day_of_week, start_time, end_time)
  SELECT (e->>'day_of_week')::int, (e->>'start_time')::time, (e->>'end_time')::time
  FROM jsonb_array_elements(COALESCE(_ranges, '[]'::jsonb)) e;
  RETURN public.get_booking_availability();
END; $$;
REVOKE ALL ON FUNCTION public.set_booking_availability(text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_booking_availability(text, jsonb) TO service_role;

-- Phase 6: health
CREATE OR REPLACE FUNCTION public.get_booking_health()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH pending AS (
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE updated_at < now() - interval '5 minutes')::int AS over_5m,
      count(*) FILTER (WHERE updated_at < now() - interval '15 minutes')::int AS over_15m,
      min(updated_at) AS oldest_at
    FROM public.booking_pass_redemptions
    WHERE calendar_action <> 'none' AND calendar_status IN ('pending', 'processing')
  ), failed AS (
    SELECT (SELECT count(*)::int FROM public.booking_pass_redemptions WHERE calendar_status = 'failed') AS total,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'redemption_id', f.id, 'calendar_action', f.calendar_action,
        'attempts', f.calendar_attempts, 'error', f.calendar_error) ORDER BY f.updated_at)
      FROM (SELECT * FROM public.booking_pass_redemptions WHERE calendar_status = 'failed' ORDER BY updated_at LIMIT 25) f), '[]'::jsonb) AS items
  ), alerts AS (
    SELECT count(*) FILTER (WHERE status = 'open')::int AS open_total,
      count(*) FILTER (WHERE status = 'open' AND alert_type = 'duplicate_event')::int AS duplicate_events,
      count(*) FILTER (WHERE status = 'open' AND alert_type IN ('deleted', 'move_conflict'))::int AS mismatches,
      count(*) FILTER (WHERE status = 'open' AND alert_type = 'persistence_failure')::int AS repair_items
    FROM public.booking_calendar_alerts
  ), uploads AS (
    SELECT count(*)::int AS staged_over_1h FROM public.external_work_uploads
    WHERE redemption_id IS NULL AND booking_pass_id IS NOT NULL AND created_at < now() - interval '1 hour'
  ), sync AS (
    SELECT last_synced_at, last_attempt_at, sync_token_updated_at,
      extract(epoch FROM now() - last_synced_at)::int AS last_success_age_seconds,
      extract(epoch FROM now() - sync_token_updated_at)::int AS token_age_seconds
    FROM public.gcal_sync_state WHERE id = 1
  ), counts AS (
    SELECT count(*) FILTER (WHERE status = 'booked' AND google_event_id IS NULL)::int AS missing_google_event_ids,
      count(*) FILTER (WHERE status = 'booked' AND calendar_status = 'synced' AND meet_url IS NULL)::int AS synced_missing_meet_urls,
      count(*) FILTER (WHERE submission_status = 'failed')::int AS failed_submissions
    FROM public.booking_pass_redemptions
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'overall_status', CASE
      WHEN failed.total > 0 OR pending.over_15m > 0 OR alerts.mismatches > 0 THEN 'red'
      WHEN pending.total > 0 OR uploads.staged_over_1h > 0 OR counts.synced_missing_meet_urls > 0 OR alerts.repair_items > 0 THEN 'amber'
      ELSE 'green' END,
    'pending_calendar_actions', to_jsonb(pending),
    'failed_calendar_actions', jsonb_build_object('total', failed.total, 'items', failed.items),
    'missing_google_event_ids', counts.missing_google_event_ids,
    'synced_missing_meet_urls', counts.synced_missing_meet_urls,
    'failed_submissions', counts.failed_submissions,
    'staged_uploads_over_1h', uploads.staged_over_1h,
    'calendar_sync', to_jsonb(sync),
    'alerts', to_jsonb(alerts))
  FROM pending, failed, alerts, uploads, sync, counts;
$$;
REVOKE ALL ON FUNCTION public.get_booking_health() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_health() TO service_role;