-- Phase F: student/user-facing notifications feed (Bell icon on FoyerDock).
-- Distinct from inbox messaging: assignment + reminder + streak alerts land
-- here, chat messages stay in the messages/conversations tables.

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('assignment','message','reminder','streak')),
  title       text NOT NULL,
  body        text,
  link        text,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users: read and delete their own rows.
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Users: update own rows. Column-level restriction enforced by the guard
-- trigger below — only the `read` flag may change, and only false -> true.
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins: full CRUD. Inserting for another user is required by DraftCard's
-- approve flow (admin notifies the student). Students cannot self-insert.
CREATE POLICY "Admins read all notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Immutability guard: non-admins may only flip `read` from false to true on
-- their own row. Everything else (user_id, type, title, body, link, created_at)
-- is frozen post-insert; `read` cannot be flipped back to false. Mirrors the
-- pattern used by guard_ta_assignment_immutables.
CREATE OR REPLACE FUNCTION public.guard_notification_immutables()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id    IS DISTINCT FROM OLD.user_id    OR
     NEW.type       IS DISTINCT FROM OLD.type       OR
     NEW.title      IS DISTINCT FROM OLD.title      OR
     NEW.body       IS DISTINCT FROM OLD.body       OR
     NEW.link       IS DISTINCT FROM OLD.link       OR
     NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'notifications: only the read flag is mutable for non-admin users';
  END IF;

  IF OLD.read = true AND NEW.read = false THEN
    RAISE EXCEPTION 'notifications: read flag cannot be flipped back to false';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_guard_immutables ON public.notifications;
CREATE TRIGGER notifications_guard_immutables
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_notification_immutables();

-- Primary scan: user's unread feed, newest first.
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, read, created_at DESC);

-- Per accepted suggestion #3: prevent a duplicate unread assignment
-- notification for the same target if approve somehow retries. Scoped to
-- type='assignment' and unread rows only so a later re-assignment of a
-- cleared link still goes through.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_unread_assignment
  ON public.notifications (user_id, link)
  WHERE type = 'assignment' AND read = false;

-- Enable postgres_changes for realtime bell updates.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
