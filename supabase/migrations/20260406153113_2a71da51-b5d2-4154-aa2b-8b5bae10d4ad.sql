
-- Drop all existing permissive policies and replace with user-scoped ones
-- The app sets class_id = auth.uid()::text for each user

-- ============ STUDENTS ============
DROP POLICY IF EXISTS "Students can view own data" ON public.students;
DROP POLICY IF EXISTS "Students can update own data" ON public.students;
CREATE POLICY "Students can view own data" ON public.students FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Students can update own data" ON public.students FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Students can insert own data" ON public.students FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============ ATTEMPTS ============
DROP POLICY IF EXISTS "Students can insert own attempts" ON public.attempts;
DROP POLICY IF EXISTS "Students can view own attempts" ON public.attempts;
CREATE POLICY "Students can view own attempts" ON public.attempts FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert own attempts" ON public.attempts FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);

-- ============ PROFILES ============
DROP POLICY IF EXISTS "Students can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Students can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Students can view own profile" ON public.profiles;
CREATE POLICY "Students can view own profile" ON public.profiles FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);
CREATE POLICY "Students can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (class_id = auth.uid()::text) WITH CHECK (class_id = auth.uid()::text);

-- ============ SESSIONS ============
DROP POLICY IF EXISTS "Students can insert own session" ON public.sessions;
DROP POLICY IF EXISTS "Students can update own session" ON public.sessions;
DROP POLICY IF EXISTS "Students can view own session" ON public.sessions;
CREATE POLICY "Students can view own session" ON public.sessions FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert own session" ON public.sessions FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);
CREATE POLICY "Students can update own session" ON public.sessions FOR UPDATE TO authenticated USING (class_id = auth.uid()::text) WITH CHECK (class_id = auth.uid()::text);

-- ============ SETTINGS ============
DROP POLICY IF EXISTS "Students can insert own settings" ON public.settings;
DROP POLICY IF EXISTS "Students can update own settings" ON public.settings;
DROP POLICY IF EXISTS "Students can view own settings" ON public.settings;
CREATE POLICY "Students can view own settings" ON public.settings FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert own settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);
CREATE POLICY "Students can update own settings" ON public.settings FOR UPDATE TO authenticated USING (class_id = auth.uid()::text) WITH CHECK (class_id = auth.uid()::text);

-- ============ ACHIEVEMENTS ============
DROP POLICY IF EXISTS "Students can insert own achievements" ON public.achievements;
DROP POLICY IF EXISTS "Students can update own achievements" ON public.achievements;
DROP POLICY IF EXISTS "Students can view own achievements" ON public.achievements;
CREATE POLICY "Students can view own achievements" ON public.achievements FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert own achievements" ON public.achievements FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);
CREATE POLICY "Students can update own achievements" ON public.achievements FOR UPDATE TO authenticated USING (class_id = auth.uid()::text) WITH CHECK (class_id = auth.uid()::text);

-- ============ USER_ACHIEVEMENTS ============
DROP POLICY IF EXISTS "Students can insert user achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Students can update user achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Students can view user achievements" ON public.user_achievements;
CREATE POLICY "Students can view user achievements" ON public.user_achievements FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert user achievements" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);
CREATE POLICY "Students can update user achievements" ON public.user_achievements FOR UPDATE TO authenticated USING (class_id = auth.uid()::text) WITH CHECK (class_id = auth.uid()::text);

-- ============ BLIND_REVIEW_SESSIONS ============
DROP POLICY IF EXISTS "Students can insert blind reviews" ON public.blind_review_sessions;
DROP POLICY IF EXISTS "Students can update blind reviews" ON public.blind_review_sessions;
DROP POLICY IF EXISTS "Students can view blind reviews" ON public.blind_review_sessions;
CREATE POLICY "Students can view blind reviews" ON public.blind_review_sessions FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert blind reviews" ON public.blind_review_sessions FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);
CREATE POLICY "Students can update blind reviews" ON public.blind_review_sessions FOR UPDATE TO authenticated USING (class_id = auth.uid()::text) WITH CHECK (class_id = auth.uid()::text);

-- ============ DAILY_STATS ============
DROP POLICY IF EXISTS "Students can insert daily stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Students can update daily stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Students can view daily stats" ON public.daily_stats;
CREATE POLICY "Students can view daily stats" ON public.daily_stats FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert daily stats" ON public.daily_stats FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);
CREATE POLICY "Students can update daily stats" ON public.daily_stats FOR UPDATE TO authenticated USING (class_id = auth.uid()::text) WITH CHECK (class_id = auth.uid()::text);

-- ============ DRILL_TEMPLATES ============
DROP POLICY IF EXISTS "Students can delete drill templates" ON public.drill_templates;
DROP POLICY IF EXISTS "Students can insert drill templates" ON public.drill_templates;
DROP POLICY IF EXISTS "Students can update drill templates" ON public.drill_templates;
DROP POLICY IF EXISTS "Students can view drill templates" ON public.drill_templates;
CREATE POLICY "Students can view drill templates" ON public.drill_templates FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert drill templates" ON public.drill_templates FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);
CREATE POLICY "Students can update drill templates" ON public.drill_templates FOR UPDATE TO authenticated USING (class_id = auth.uid()::text) WITH CHECK (class_id = auth.uid()::text);
CREATE POLICY "Students can delete drill templates" ON public.drill_templates FOR DELETE TO authenticated USING (class_id = auth.uid()::text);

-- ============ EVENTS ============
DROP POLICY IF EXISTS "Students can insert own events" ON public.events;
DROP POLICY IF EXISTS "Students can view own events" ON public.events;
CREATE POLICY "Students can view own events" ON public.events FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert own events" ON public.events FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);

-- ============ FLAGGED_QUESTIONS ============
DROP POLICY IF EXISTS "Students can delete own flags" ON public.flagged_questions;
DROP POLICY IF EXISTS "Students can insert own flags" ON public.flagged_questions;
DROP POLICY IF EXISTS "Students can view own flags" ON public.flagged_questions;
CREATE POLICY "Students can view own flags" ON public.flagged_questions FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert own flags" ON public.flagged_questions FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);
CREATE POLICY "Students can delete own flags" ON public.flagged_questions FOR DELETE TO authenticated USING (class_id = auth.uid()::text);

-- ============ QUESTION_USAGE ============
DROP POLICY IF EXISTS "Students can insert question usage" ON public.question_usage;
DROP POLICY IF EXISTS "Students can update question usage" ON public.question_usage;
DROP POLICY IF EXISTS "Students can view question usage" ON public.question_usage;
CREATE POLICY "Students can view question usage" ON public.question_usage FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert question usage" ON public.question_usage FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);
CREATE POLICY "Students can update question usage" ON public.question_usage FOR UPDATE TO authenticated USING (class_id = auth.uid()::text) WITH CHECK (class_id = auth.uid()::text);

-- ============ SECTION_HISTORY ============
DROP POLICY IF EXISTS "Students can insert section history" ON public.section_history;
DROP POLICY IF EXISTS "Students can view section history" ON public.section_history;
CREATE POLICY "Students can view section history" ON public.section_history FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert section history" ON public.section_history FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);

-- ============ VOICE_COACHING_SESSIONS ============
DROP POLICY IF EXISTS "Students can insert voice sessions" ON public.voice_coaching_sessions;
DROP POLICY IF EXISTS "Students can view voice sessions" ON public.voice_coaching_sessions;
CREATE POLICY "Students can view voice sessions" ON public.voice_coaching_sessions FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert voice sessions" ON public.voice_coaching_sessions FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);

-- ============ WRONG_ANSWER_JOURNAL ============
DROP POLICY IF EXISTS "Students can insert own WAJ entries" ON public.wrong_answer_journal;
DROP POLICY IF EXISTS "Students can update own WAJ entries" ON public.wrong_answer_journal;
DROP POLICY IF EXISTS "Students can view own WAJ entries" ON public.wrong_answer_journal;
CREATE POLICY "Students can view own WAJ entries" ON public.wrong_answer_journal FOR SELECT TO authenticated USING (class_id = auth.uid()::text);
CREATE POLICY "Students can insert own WAJ entries" ON public.wrong_answer_journal FOR INSERT TO authenticated WITH CHECK (class_id = auth.uid()::text);
CREATE POLICY "Students can update own WAJ entries" ON public.wrong_answer_journal FOR UPDATE TO authenticated USING (class_id = auth.uid()::text) WITH CHECK (class_id = auth.uid()::text);
