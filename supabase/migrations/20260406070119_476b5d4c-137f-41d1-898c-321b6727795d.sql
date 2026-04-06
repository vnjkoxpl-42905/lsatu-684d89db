
-- Add section_history table
CREATE TABLE IF NOT EXISTS section_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  pt int NOT NULL,
  section int NOT NULL,
  initial_score int NOT NULL DEFAULT 0,
  blind_review_score int,
  total_questions int NOT NULL DEFAULT 0,
  time_taken_ms int NOT NULL DEFAULT 0,
  completed_at timestamptz DEFAULT now(),
  questions_json jsonb DEFAULT '[]'::jsonb,
  mode text DEFAULT 'full-section',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE section_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view section history" ON section_history FOR SELECT USING (true);
CREATE POLICY "Students can insert section history" ON section_history FOR INSERT WITH CHECK (true);
CREATE INDEX idx_section_history_class ON section_history(class_id);

-- Add voice_coaching_sessions table
CREATE TABLE IF NOT EXISTS voice_coaching_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  qid text,
  action_taken text,
  coach_response text,
  feedback_type text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE voice_coaching_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view voice sessions" ON voice_coaching_sessions FOR SELECT USING (true);
CREATE POLICY "Students can insert voice sessions" ON voice_coaching_sessions FOR INSERT WITH CHECK (true);

-- Add user_id columns to tables that reference auth users
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE flagged_questions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE wrong_answer_journal ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE section_history ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE voice_coaching_sessions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_achievements view/alias as table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  achievement_id text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  requirement text,
  category text,
  UNIQUE(class_id, achievement_id)
);
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view user achievements" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "Students can insert user achievements" ON user_achievements FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update user achievements" ON user_achievements FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_flagged_user_id ON flagged_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts(user_id);
