
-- Trigger-only functions: nobody should call directly
REVOKE EXECUTE ON FUNCTION public.bump_conversation_last_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_operator_conversation_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_signup() FROM PUBLIC, anon, authenticated;

-- App helpers: revoke from anon, keep authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_conversation_participant_names(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_joshua_conversation() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_assignment_counts_per_student() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_student_email(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_teaching_assets(text, integer) FROM PUBLIC, anon;
