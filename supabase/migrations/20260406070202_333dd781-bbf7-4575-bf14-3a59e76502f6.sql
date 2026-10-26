
-- Add missing columns to section_history
ALTER TABLE section_history ADD COLUMN IF NOT EXISTS initial_percent numeric DEFAULT 0;
ALTER TABLE section_history ADD COLUMN IF NOT EXISTS blind_review_percent numeric;

-- Add missing columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_practice_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_goal_questions int DEFAULT 20;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level int DEFAULT 1;

-- drill_templates table
CREATE TABLE IF NOT EXISTS drill_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  name text NOT NULL,
  config_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE drill_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view drill templates" ON drill_templates FOR SELECT USING (true);
CREATE POLICY "Students can insert drill templates" ON drill_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update drill templates" ON drill_templates FOR UPDATE USING (true);
CREATE POLICY "Students can delete drill templates" ON drill_templates FOR DELETE USING (true);

-- blind_review_sessions table
CREATE TABLE IF NOT EXISTS blind_review_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  pt int,
  section int,
  original_answers jsonb DEFAULT '{}'::jsonb,
  reviewed_answers jsonb DEFAULT '{}'::jsonb,
  flagged_qids text[] DEFAULT ARRAY[]::text[],
  confidence_ratings jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE blind_review_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view blind reviews" ON blind_review_sessions FOR SELECT USING (true);
CREATE POLICY "Students can insert blind reviews" ON blind_review_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update blind reviews" ON blind_review_sessions FOR UPDATE USING (true);
