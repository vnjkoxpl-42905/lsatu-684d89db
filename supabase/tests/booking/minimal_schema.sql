CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE OR REPLACE FUNCTION public.has_role(uuid, text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT true $$;

CREATE TABLE public.booking_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text NOT NULL UNIQUE,
  student_id uuid REFERENCES auth.users(id), student_email text, student_name text,
  booking_slug text, total_credits int NOT NULL CHECK (total_credits > 0),
  used_credits int NOT NULL DEFAULT 0 CHECK (used_credits >= 0 AND used_credits <= total_credits),
  session_length_minutes int NOT NULL DEFAULT 70, status text NOT NULL DEFAULT 'active',
  expires_at timestamptz, notes text, created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), google_event_id text UNIQUE,
  calendar_id text NOT NULL DEFAULT 'primary', title text, description text,
  location text, start_at timestamptz NOT NULL, end_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'confirmed',
  html_link text, meet_url text, source text, etag text, last_synced_at timestamptz,
  deleted_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_pass_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_pass_id uuid NOT NULL REFERENCES public.booking_passes(id),
  schedule_event_id uuid REFERENCES public.schedule_events(id), google_event_id text,
  start_at timestamptz NOT NULL, end_at timestamptz NOT NULL,
  status text NOT NULL, idempotency_key text NOT NULL,
  student_name_snapshot text, student_email_snapshot text, meet_url text,
  needs_gcal_sync boolean NOT NULL DEFAULT false, gcal_state text NOT NULL DEFAULT 'synced',
  gcal_attempts int NOT NULL DEFAULT 0, gcal_error text, gcal_lease_until timestamptz,
  reschedule_count int NOT NULL DEFAULT 0, student_note text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_pass_id, idempotency_key)
);

CREATE TABLE public.gcal_sync_state (
  id int PRIMARY KEY, calendar_id text NOT NULL DEFAULT 'primary', sync_token text,
  last_synced_at timestamptz, last_full_sync_at timestamptz
);
INSERT INTO public.gcal_sync_state(id) VALUES (1);

CREATE TABLE public.booking_availability_config (
  id int PRIMARY KEY, timezone text NOT NULL DEFAULT 'America/Toronto', updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.booking_availability_config(id) VALUES (1);
CREATE TABLE public.booking_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), day_of_week int NOT NULL,
  start_time time NOT NULL, end_time time NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.get_booking_availability() RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('timezone', c.timezone, 'ranges', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('day_of_week', a.day_of_week, 'start_time', a.start_time, 'end_time', a.end_time))
    FROM public.booking_availability a
  ), '[]'::jsonb)) FROM public.booking_availability_config c WHERE id = 1
$$;
CREATE OR REPLACE FUNCTION public.is_slot_bookable(timestamptz, int)
RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;

CREATE TABLE public.external_work_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, uploaded_by uuid,
  file_name text NOT NULL, file_type text, storage_path text NOT NULL,
  source_platform text, upload_type text, processing_status text,
  booking_pass_id uuid REFERENCES public.booking_passes(id),
  redemption_id uuid REFERENCES public.booking_pass_redemptions(id),
  booking_idempotency_key text, created_at timestamptz NOT NULL DEFAULT now()
);
