
-- Schedule events synced with Google Calendar
CREATE TABLE public.schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_event_id text UNIQUE,
  calendar_id text NOT NULL DEFAULT 'primary',
  title text NOT NULL DEFAULT '(no title)',
  description text,
  location text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'confirmed',
  html_link text,
  source text NOT NULL DEFAULT 'google',
  created_by uuid,
  etag text,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_events_start_at ON public.schedule_events(start_at);
CREATE INDEX idx_schedule_events_active ON public.schedule_events(start_at) WHERE deleted_at IS NULL;

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (it's a shared admin calendar)
CREATE POLICY "Authenticated can read schedule events"
ON public.schedule_events FOR SELECT
TO authenticated USING (true);

-- Only admins can write
CREATE POLICY "Admins can insert schedule events"
ON public.schedule_events FOR INSERT
TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update schedule events"
ON public.schedule_events FOR UPDATE
TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete schedule events"
ON public.schedule_events FOR DELETE
TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER schedule_events_updated_at
BEFORE UPDATE ON public.schedule_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sync state table (cursor token, selected calendar)
CREATE TABLE public.gcal_sync_state (
  id int PRIMARY KEY DEFAULT 1,
  calendar_id text NOT NULL DEFAULT 'primary',
  sync_token text,
  last_full_sync_at timestamptz,
  last_synced_at timestamptz,
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO public.gcal_sync_state (id, calendar_id) VALUES (1, 'primary');

ALTER TABLE public.gcal_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read sync state"
ON public.gcal_sync_state FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update sync state"
ON public.gcal_sync_state FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
