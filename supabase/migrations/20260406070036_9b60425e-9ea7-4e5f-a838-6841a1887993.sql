
-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  token_hash text NOT NULL,
  student_label text,
  pin_hash text,
  created_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now(),
  schema_version int DEFAULT 1,
  UNIQUE(class_id, token_hash)
);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own data" ON students FOR SELECT USING (true);
CREATE POLICY "Students can update own data" ON students FOR UPDATE USING (true);

-- Attempts table
CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  qid text NOT NULL,
  pt int NOT NULL,
  section int NOT NULL,
  qnum int NOT NULL,
  qtype text NOT NULL,
  level int NOT NULL,
  correct boolean NOT NULL,
  time_ms int NOT NULL,
  confidence int,
  mode text NOT NULL,
  set_id text,
  timestamp_iso timestamptz DEFAULT now(),
  app_version text DEFAULT 'v1'
);
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own attempts" ON attempts FOR SELECT USING (true);
CREATE POLICY "Students can insert own attempts" ON attempts FOR INSERT WITH CHECK (true);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  class_id text PRIMARY KEY,
  overall_answered int DEFAULT 0,
  overall_correct int DEFAULT 0,
  overall_avg_ms int DEFAULT 0,
  by_qtype_json jsonb DEFAULT '{}'::jsonb,
  by_level_json jsonb DEFAULT '{}'::jsonb,
  streak_current int DEFAULT 0,
  xp_total int DEFAULT 0,
  daily_goal_streak int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own profile" ON profiles FOR SELECT USING (true);
CREATE POLICY "Students can insert own profile" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update own profile" ON profiles FOR UPDATE USING (true);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  class_id text PRIMARY KEY,
  queue_json jsonb DEFAULT '[]'::jsonb,
  cursor_index int DEFAULT 0,
  current_qid text,
  started_at timestamptz DEFAULT now(),
  elapsed_ms int DEFAULT 0,
  timer_mode text DEFAULT 'stopwatch',
  review_queue_json jsonb DEFAULT '[]'::jsonb,
  cooldowns_json jsonb DEFAULT '{}'::jsonb,
  markup_json jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own session" ON sessions FOR SELECT USING (true);
CREATE POLICY "Students can insert own session" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update own session" ON sessions FOR UPDATE USING (true);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  class_id text PRIMARY KEY,
  enabled_qtypes text[] DEFAULT ARRAY[]::text[],
  enabled_levels int[] DEFAULT ARRAY[1,2,3,4,5]::int[],
  adaptive_on boolean DEFAULT true,
  explore_ratio decimal DEFAULT 0.15,
  pace_vs_challenge decimal DEFAULT 0,
  time_pref text DEFAULT 'balanced',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Students can insert own settings" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update own settings" ON settings FOR UPDATE USING (true);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  event text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  timestamp_iso timestamptz DEFAULT now()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own events" ON events FOR SELECT USING (true);
CREATE POLICY "Students can insert own events" ON events FOR INSERT WITH CHECK (true);

-- Wrong Answer Journal table
CREATE TABLE public.wrong_answer_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  qid TEXT NOT NULL,
  pt INTEGER NOT NULL,
  section INTEGER NOT NULL,
  qnum INTEGER NOT NULL,
  qtype TEXT NOT NULL,
  level INTEGER NOT NULL,
  first_wrong_at_iso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_status TEXT NOT NULL CHECK (last_status IN ('wrong', 'right')),
  revisit_count INTEGER NOT NULL DEFAULT 0,
  history_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(class_id, qid)
);
ALTER TABLE public.wrong_answer_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own WAJ entries" ON public.wrong_answer_journal FOR SELECT USING (true);
CREATE POLICY "Students can insert own WAJ entries" ON public.wrong_answer_journal FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update own WAJ entries" ON public.wrong_answer_journal FOR UPDATE USING (true);
CREATE TRIGGER update_waj_updated_at BEFORE UPDATE ON public.wrong_answer_journal FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Concept Library table
CREATE TABLE concept_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_name text NOT NULL UNIQUE,
  reasoning_type text,
  category text,
  explanation text NOT NULL,
  keywords text[],
  application text,
  examples text,
  related_concepts text[],
  created_at timestamptz DEFAULT now()
);
ALTER TABLE concept_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Knowledge is public" ON concept_library FOR SELECT USING (true);

-- Question Type Strategies table
CREATE TABLE question_type_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_type text NOT NULL UNIQUE,
  category text NOT NULL,
  stem_keywords text[],
  reading_strategy text NOT NULL,
  answer_strategy text NOT NULL,
  correct_answer_patterns text,
  wrong_answer_patterns text,
  prephrase_goal text,
  related_reasoning_types text[],
  difficulty_indicators text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE question_type_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strategies are public" ON question_type_strategies FOR SELECT USING (true);

-- Reasoning Type Guidance table
CREATE TABLE reasoning_type_guidance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reasoning_type text NOT NULL UNIQUE,
  description text NOT NULL,
  key_indicators text[],
  common_flaws text[],
  strengthen_tactics text,
  weaken_tactics text,
  relevant_question_types text[],
  examples text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reasoning_type_guidance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guidance is public" ON reasoning_type_guidance FOR SELECT USING (true);

-- Tactical Patterns table
CREATE TABLE tactical_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name text NOT NULL,
  pattern_type text NOT NULL,
  reasoning_type text,
  question_types text[],
  description text NOT NULL,
  formula text,
  application text,
  examples text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tactical_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patterns are public" ON tactical_patterns FOR SELECT USING (true);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  badge_id text NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  progress jsonb DEFAULT '{}'::jsonb,
  UNIQUE(class_id, badge_id)
);
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own achievements" ON achievements FOR SELECT USING (true);
CREATE POLICY "Students can insert own achievements" ON achievements FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update own achievements" ON achievements FOR UPDATE USING (true);

-- Flagged Questions table
CREATE TABLE IF NOT EXISTS flagged_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  qid text NOT NULL,
  pt int NOT NULL,
  section int NOT NULL,
  qnum int NOT NULL,
  qtype text NOT NULL,
  level int NOT NULL,
  note text,
  flagged_at timestamptz DEFAULT now(),
  UNIQUE(class_id, qid)
);
ALTER TABLE flagged_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own flags" ON flagged_questions FOR SELECT USING (true);
CREATE POLICY "Students can insert own flags" ON flagged_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can delete own flags" ON flagged_questions FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attempts_class_id ON attempts(class_id);
CREATE INDEX IF NOT EXISTS idx_attempts_qid ON attempts(qid);
CREATE INDEX IF NOT EXISTS idx_attempts_timestamp ON attempts(timestamp_iso DESC);
CREATE INDEX IF NOT EXISTS idx_events_class_id ON events(class_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp_iso DESC);
CREATE INDEX idx_waj_class_qid ON public.wrong_answer_journal(class_id, qid);
CREATE INDEX idx_waj_class_last_status ON public.wrong_answer_journal(class_id, last_status);
CREATE INDEX idx_waj_class_qtype ON public.wrong_answer_journal(class_id, qtype);
CREATE INDEX IF NOT EXISTS idx_flagged_class ON flagged_questions(class_id);
CREATE INDEX IF NOT EXISTS idx_achievements_class ON achievements(class_id);
