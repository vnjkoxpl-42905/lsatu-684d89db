
-- Create a secure view for students that excludes sensitive columns
CREATE OR REPLACE VIEW public.students_safe AS
SELECT id, user_id, class_id, student_label, schema_version, last_active_at, created_at
FROM public.students;

-- Grant access to the view
GRANT SELECT ON public.students_safe TO authenticated;
GRANT SELECT ON public.students_safe TO anon;
