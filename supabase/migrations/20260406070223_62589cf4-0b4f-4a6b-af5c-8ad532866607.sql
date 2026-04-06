
ALTER TABLE section_history ADD COLUMN IF NOT EXISTS br_score int;
ALTER TABLE section_history ADD COLUMN IF NOT EXISTS br_percent numeric;
ALTER TABLE section_history ADD COLUMN IF NOT EXISTS total_time_ms int DEFAULT 0;
