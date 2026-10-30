UPDATE public.profiles SET
  has_practice_access = has_drill_access,
  has_ta_access       = has_classroom_access,
  has_journal_access  = has_journal_access OR has_waj_access;