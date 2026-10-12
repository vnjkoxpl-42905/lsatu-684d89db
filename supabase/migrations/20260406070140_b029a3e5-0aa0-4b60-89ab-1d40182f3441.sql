
-- Add daily_stats table
CREATE TABLE IF NOT EXISTS daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  questions_answered int DEFAULT 0,
  correct_answers int DEFAULT 0,
  xp_earned int DEFAULT 0,
  time_spent_ms int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_id, date)
);
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view daily stats" ON daily_stats FOR SELECT USING (true);
CREATE POLICY "Students can insert daily stats" ON daily_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update daily stats" ON daily_stats FOR UPDATE USING (true);

-- Add question_usage table
CREATE TABLE IF NOT EXISTS question_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  qid text NOT NULL,
  mode text,
  last_seen_at timestamptz DEFAULT now(),
  times_seen int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_id, qid, mode)
);
ALTER TABLE question_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view question usage" ON question_usage FOR SELECT USING (true);
CREATE POLICY "Students can insert question usage" ON question_usage FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update question usage" ON question_usage FOR UPDATE USING (true);

-- Add missing column to section_history
ALTER TABLE section_history ADD COLUMN IF NOT EXISTS initial_total int DEFAULT 0;

-- Add missing columns to achievements
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS requirement text;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS achievement_id text;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS earned_at timestamptz;
