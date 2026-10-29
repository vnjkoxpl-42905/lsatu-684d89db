-- Unapplied additive contract. No source attempt, flag, journal or note writes.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '45s';
CREATE TABLE public.review_episodes_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  source_kind text NOT NULL CHECK (source_kind IN ('intro_lr_attempts','hs_capstone')),
  source_id text NOT NULL, question_id text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('missed','teacher_selected')),
  selection_reason text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (reason <> 'teacher_selected' OR length(btrim(selection_reason)) > 0 AND selection_reason IS NOT NULL),
  UNIQUE(student_id, source_kind, source_id, reason, actor_id)
);
CREATE TABLE public.review_episode_events_v1 (
  id uuid PRIMARY KEY, episode_id uuid NOT NULL REFERENCES public.review_episodes_v1(id),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  kind text NOT NULL CHECK (kind IN ('blind_answer','reveal','reflection','complete')),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX review_episode_student_v1 ON public.review_episodes_v1(student_id,created_at);
CREATE INDEX review_episode_event_v1 ON public.review_episode_events_v1(episode_id,created_at);
ALTER TABLE public.review_episodes_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_episode_events_v1 ENABLE ROW LEVEL SECURITY;
CREATE POLICY review_episode_read_v1 ON public.review_episodes_v1 FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY review_event_read_v1 ON public.review_episode_events_v1 FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.review_episodes_v1 e WHERE e.id=episode_id AND (e.student_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
REVOKE ALL ON public.review_episodes_v1,public.review_episode_events_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.review_episodes_v1,public.review_episode_events_v1 TO authenticated;

CREATE FUNCTION public.open_review_episode_v1(p_student uuid,p_source text,p_source_id text,p_reason text,p_selection_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid:=auth.uid(); q text; correct boolean; existing public.review_episodes_v1%ROWTYPE;
BEGIN
  IF actor IS NULL OR p_student IS NULL OR p_reason NOT IN ('missed','teacher_selected') OR p_reason IS NULL THEN RAISE EXCEPTION 'Invalid review actor or reason'; END IF;
  IF p_reason='teacher_selected' THEN
    IF NOT public.has_role(actor,'admin') OR actor=p_student OR p_selection_reason IS NULL OR length(btrim(p_selection_reason))=0 THEN RAISE EXCEPTION 'Teacher selection requires admin access and a reason'; END IF;
  ELSIF actor<>p_student THEN RAISE EXCEPTION 'Only the student may open a missed episode'; END IF;
  IF p_source='intro_lr_attempts' THEN
    SELECT a.question_id,a.correct INTO q,correct FROM public.intro_lr_attempts a WHERE a.user_id=p_student AND a.id::text=p_source_id FOR SHARE;
  ELSIF p_source='hs_capstone' THEN
    SELECT k.data->>'item_id',(k.data->>'correct')::boolean INTO q,correct FROM public.bootcamp_kv k
    WHERE k.user_id=p_student AND k.table_name='calibration_attempts' AND k.record_id=p_source_id
      AND k.data->>'user_id'=p_student::text AND k.data->>'calibration_module'='M5' AND k.data->'calibration_only'='true'::jsonb FOR SHARE;
  ELSE RAISE EXCEPTION 'Unsupported review source'; END IF;
  IF q IS NULL OR correct IS NULL OR (p_reason='missed' AND correct) THEN RAISE EXCEPTION 'Owned source does not support this review reason'; END IF;
  INSERT INTO public.review_episodes_v1(student_id,actor_id,source_kind,source_id,question_id,reason,selection_reason)
    VALUES(p_student,actor,p_source,p_source_id,q,p_reason,CASE WHEN p_reason='teacher_selected' THEN btrim(p_selection_reason) ELSE NULL END)
    ON CONFLICT(student_id,source_kind,source_id,reason,actor_id) DO NOTHING;
  SELECT * INTO existing FROM public.review_episodes_v1 WHERE student_id=p_student AND actor_id=actor AND source_kind=p_source AND source_id=p_source_id AND reason=p_reason;
  IF p_reason='teacher_selected' AND existing.selection_reason<>btrim(p_selection_reason) THEN RAISE EXCEPTION 'Existing selection has a different reason'; END IF;
  RETURN to_jsonb(existing);
END $$;

CREATE FUNCTION public.append_review_event_v1(p_episode uuid,p_event uuid,p_kind text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid:=auth.uid(); episode public.review_episodes_v1%ROWTYPE; prior public.review_episode_events_v1%ROWTYPE; saved public.review_episode_events_v1%ROWTYPE;
BEGIN
  SELECT * INTO episode FROM public.review_episodes_v1 WHERE id=p_episode FOR UPDATE;
  IF actor IS NULL OR episode.id IS NULL OR actor<>episode.student_id THEN RAISE EXCEPTION 'Only the student may record review work'; END IF;
  SELECT * INTO prior FROM public.review_episode_events_v1 WHERE id=p_event;
  IF prior.id IS NOT NULL THEN
    IF prior.episode_id<>p_episode OR prior.actor_id<>actor OR prior.kind IS DISTINCT FROM p_kind OR prior.payload IS DISTINCT FROM p_payload THEN RAISE EXCEPTION 'Review event identity conflict'; END IF;
    RETURN to_jsonb(prior);
  END IF;
  IF p_event IS NULL OR p_kind IS NULL OR p_kind NOT IN ('blind_answer','reveal','reflection','complete') OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
    OR EXISTS(SELECT 1 FROM jsonb_each(p_payload) v WHERE jsonb_typeof(v.value)<>'string') THEN RAISE EXCEPTION 'Invalid review event'; END IF;
  IF EXISTS(SELECT 1 FROM public.review_episode_events_v1 WHERE episode_id=p_episode AND kind='complete') THEN RAISE EXCEPTION 'This review episode is complete'; END IF;
  IF p_kind='blind_answer' THEN
    IF coalesce(length(btrim(p_payload->>'answer')),0)=0 OR EXISTS(SELECT 1 FROM public.review_episode_events_v1 WHERE episode_id=p_episode AND kind IN ('blind_answer','reveal')) THEN RAISE EXCEPTION 'Blind answer must precede reveal and is immutable'; END IF;
  END IF;
  IF p_kind='reveal' AND EXISTS(SELECT 1 FROM public.review_episode_events_v1 WHERE episode_id=p_episode AND kind='reveal') THEN RAISE EXCEPTION 'Reveal already recorded'; END IF;
  IF p_kind='complete' AND episode.reason='missed' AND (coalesce(length(btrim(p_payload->>'error_diagnosis')),0)=0 OR coalesce(length(btrim(p_payload->>'right_answer_diagnosis')),0)=0) THEN RAISE EXCEPTION 'Miss completion requires error and right-answer diagnoses'; END IF;
  INSERT INTO public.review_episode_events_v1(id,episode_id,actor_id,kind,payload) VALUES(p_event,p_episode,actor,p_kind,p_payload) RETURNING * INTO saved;
  RETURN to_jsonb(saved);
END $$;

CREATE FUNCTION public.read_review_episodes_v1(p_student uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  IF auth.uid() IS NULL OR p_student IS NULL OR (auth.uid()<>p_student AND NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Review access denied'; END IF;
  RETURN jsonb_build_object('episodes',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at,e.id) FROM public.review_episodes_v1 e WHERE e.student_id=p_student),'[]'::jsonb),
    'events',coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.created_at,v.id) FROM public.review_episode_events_v1 v JOIN public.review_episodes_v1 e ON e.id=v.episode_id WHERE e.student_id=p_student),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.open_review_episode_v1(uuid,text,text,text,text),public.append_review_event_v1(uuid,uuid,text,jsonb),public.read_review_episodes_v1(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.open_review_episode_v1(uuid,text,text,text,text),public.append_review_event_v1(uuid,uuid,text,jsonb),public.read_review_episodes_v1(uuid) TO authenticated;
COMMIT;
