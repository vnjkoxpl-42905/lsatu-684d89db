-- Booking remediation Phase 6: admin-safe health summary.

CREATE OR REPLACE FUNCTION public.get_booking_health()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pending AS (
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE updated_at < now() - interval '5 minutes')::int AS over_5m,
      count(*) FILTER (WHERE updated_at < now() - interval '15 minutes')::int AS over_15m,
      min(updated_at) AS oldest_at
    FROM public.booking_pass_redemptions
    WHERE calendar_action <> 'none' AND calendar_status IN ('pending', 'processing')
  ), failed AS (
    SELECT
      (SELECT count(*)::int FROM public.booking_pass_redemptions WHERE calendar_status = 'failed') AS total,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'redemption_id', f.id, 'calendar_action', f.calendar_action,
        'attempts', f.calendar_attempts, 'error', f.calendar_error
      ) ORDER BY f.updated_at) FROM (
        SELECT * FROM public.booking_pass_redemptions
        WHERE calendar_status = 'failed' ORDER BY updated_at LIMIT 25
      ) f), '[]'::jsonb) AS items
  ), alerts AS (
    SELECT count(*) FILTER (WHERE status = 'open')::int AS open_total,
      count(*) FILTER (WHERE status = 'open' AND alert_type = 'duplicate_event')::int AS duplicate_events,
      count(*) FILTER (WHERE status = 'open' AND alert_type IN ('deleted', 'move_conflict'))::int AS mismatches,
      count(*) FILTER (WHERE status = 'open' AND alert_type = 'persistence_failure')::int AS repair_items
    FROM public.booking_calendar_alerts
  ), uploads AS (
    SELECT count(*)::int AS staged_over_1h
    FROM public.external_work_uploads
    WHERE redemption_id IS NULL AND booking_pass_id IS NOT NULL
      AND created_at < now() - interval '1 hour'
  ), sync AS (
    SELECT last_synced_at, last_attempt_at, sync_token_updated_at,
      extract(epoch FROM now() - last_synced_at)::int AS last_success_age_seconds,
      extract(epoch FROM now() - sync_token_updated_at)::int AS token_age_seconds
    FROM public.gcal_sync_state WHERE id = 1
  ), counts AS (
    SELECT
      count(*) FILTER (WHERE status = 'booked' AND google_event_id IS NULL)::int AS missing_google_event_ids,
      count(*) FILTER (WHERE status = 'booked' AND calendar_status = 'synced' AND meet_url IS NULL)::int AS synced_missing_meet_urls,
      count(*) FILTER (WHERE submission_status = 'failed')::int AS failed_submissions
    FROM public.booking_pass_redemptions
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'overall_status', CASE
      WHEN failed.total > 0 OR pending.over_15m > 0 OR alerts.mismatches > 0 THEN 'red'
      WHEN pending.total > 0 OR uploads.staged_over_1h > 0 OR counts.synced_missing_meet_urls > 0 OR alerts.repair_items > 0 THEN 'amber'
      ELSE 'green'
    END,
    'pending_calendar_actions', to_jsonb(pending),
    'failed_calendar_actions', jsonb_build_object('total', failed.total, 'items', failed.items),
    'missing_google_event_ids', counts.missing_google_event_ids,
    'synced_missing_meet_urls', counts.synced_missing_meet_urls,
    'failed_submissions', counts.failed_submissions,
    'staged_uploads_over_1h', uploads.staged_over_1h,
    'calendar_sync', to_jsonb(sync),
    'alerts', to_jsonb(alerts)
  )
  FROM pending, failed, alerts, uploads, sync, counts;
$$;

REVOKE ALL ON FUNCTION public.get_booking_health() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_health() TO service_role;
