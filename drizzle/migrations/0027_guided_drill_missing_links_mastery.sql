insert into public.guided_drills
  (slug, week, order_in_week, title, category, estimated_minutes, question_count,
   question_types, question_features, reasoning_types, source_file, is_published)
values
  ('missing-links-sufficient-assumption-mastery', 2, 16,
   'Missing Links: Sufficient Assumption Mastery', 'Conditional Reasoning', 20, 12,
   array['Sufficient Assumption'], array['Missing Links'], array['Conditional Reasoning'],
   '109_missing_links_sufficient_assumption_mastery.html', true)
on conflict (slug) do update set
  week = excluded.week, order_in_week = excluded.order_in_week, title = excluded.title,
  category = excluded.category, estimated_minutes = excluded.estimated_minutes,
  question_count = excluded.question_count, question_types = excluded.question_types,
  question_features = excluded.question_features, reasoning_types = excluded.reasoning_types,
  source_file = excluded.source_file, is_published = excluded.is_published, updated_at = now();