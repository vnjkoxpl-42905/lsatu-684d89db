UPDATE public.profiles
SET has_bootcamp_access = true,
    has_classroom_access = true,
    has_analytics_access = true,
    has_schedule_access = true,
    has_practice_access = true,
    has_drill_access = true,
    has_waj_access = true,
    has_flagged_access = true,
    has_chat_access = true,
    has_journal_access = true,
    has_ta_access = true,
    updated_at = now()
WHERE class_id = 'd9afa662-d72f-44c1-8948-475309268f63';