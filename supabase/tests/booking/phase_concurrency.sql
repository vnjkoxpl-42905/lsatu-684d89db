INSERT INTO auth.users(id) VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.booking_passes(
  id, token_hash, student_id, total_credits, used_credits, session_length_minutes,
  status, created_by
) VALUES (
  '10000000-0000-0000-0000-000000000001', 'hash',
  '00000000-0000-0000-0000-000000000002', 1, 1, 70, 'exhausted',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.booking_pass_redemptions(
  id, booking_pass_id, start_at, end_at, status, idempotency_key
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  now() + interval '2 days', now() + interval '2 days 70 minutes', 'booked', 'cancel-test'
) ON CONFLICT (id) DO NOTHING;
