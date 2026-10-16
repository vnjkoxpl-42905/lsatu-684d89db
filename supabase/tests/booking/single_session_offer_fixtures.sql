INSERT INTO auth.users(id) VALUES
  ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000005');

INSERT INTO public.student_booking_offers(student_id, offer_id, enabled, url_override) VALUES
  ('00000000-0000-0000-0000-000000000003', 'single-session', true, NULL),
  ('00000000-0000-0000-0000-000000000004', 'single-session', false, '/book/session'),
  ('00000000-0000-0000-0000-000000000005', 'single-session', true, 'https://cal.com/custom/student');
