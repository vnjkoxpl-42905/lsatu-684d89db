-- Preserve historical paragraph/recap identities. New clients explicitly choose v2.
ALTER TABLE public.rc_recall_attempts
  ADD COLUMN IF NOT EXISTS segmentation_version smallint NOT NULL DEFAULT 1
  CHECK (segmentation_version IN (1, 2));

CREATE OR REPLACE FUNCTION public.rc_recall_keep_segmentation_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.segmentation_version IS DISTINCT FROM OLD.segmentation_version THEN
    RAISE EXCEPTION 'An attempt segmentation version cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rc_recall_keep_segmentation_version
BEFORE UPDATE ON public.rc_recall_attempts
FOR EACH ROW EXECUTE FUNCTION public.rc_recall_keep_segmentation_version();
