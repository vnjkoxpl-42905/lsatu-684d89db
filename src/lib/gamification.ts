import { supabase } from "@/integrations/supabase/client";
import { localDayISO } from "@/lib/localDate";

export interface XPGain {
  base: number;
  accuracyBonus: number;
  speedBonus: number;
  difficultyMultiplier: number;
  streakMultiplier: number;
  firstTimeBonus: number;
  total: number;
}

export interface UserStats {
  level: number;
  xp_total: number;
  streak_current: number;
  overall_answered: number;
  overall_correct: number;
}

export interface AttemptData {
  correct: boolean;
  timeMs: number;
  difficulty: number;
  qtype: string;
}

// Level progression thresholds
export const getLevelThreshold = (level: number): number => {
  if (level <= 10) return 100 * level;
  if (level <= 25) return 1000 + (level - 10) * 200;
  if (level <= 50) return 4000 + (level - 25) * 500;
  return 16500 + (level - 50) * 1000;
};

// Calculate current level from total XP
export const calculateLevel = (totalXP: number): number => {
  let level = 1;
  let requiredXP = 0;
  
  while (totalXP >= requiredXP + getLevelThreshold(level)) {
    requiredXP += getLevelThreshold(level);
    level++;
  }
  
  return level;
};

// Get XP progress for current level
export const getLevelProgress = (totalXP: number, level: number): { current: number; required: number; percentage: number } => {
  let xpForCurrentLevel = 0;
  for (let i = 1; i < level; i++) {
    xpForCurrentLevel += getLevelThreshold(i);
  }
  
  const currentLevelXP = totalXP - xpForCurrentLevel;
  const requiredForNext = getLevelThreshold(level);
  const percentage = Math.min((currentLevelXP / requiredForNext) * 100, 100);
  
  return {
    current: currentLevelXP,
    required: requiredForNext,
    percentage
  };
};

// Average time per difficulty (milliseconds)
const getAvgTimeForDifficulty = (difficulty: number): number => {
  const baseTimes = [60000, 75000, 90000, 105000, 120000]; // 1-5 minutes
  return baseTimes[difficulty - 1] || 90000;
};

// Calculate XP for a single attempt
export const calculateXP = async (
  attempt: AttemptData,
  userStats: UserStats,
  classId: string
): Promise<XPGain> => {
  const baseXP = 10;
  
  // Difficulty multiplier (1x to 3x)
  const difficultyMultiplier = 1 + (attempt.difficulty - 1) * 0.4;
  
  // Accuracy bonus (correct answer = 2x base)
  const accuracyBonus = attempt.correct ? baseXP : 0;
  
  // Speed bonus (faster than average = bonus)
  const avgTime = getAvgTimeForDifficulty(attempt.difficulty);
  const speedBonus = attempt.timeMs < avgTime * 0.8 ? baseXP * 0.5 : 0;
  
  // Streak multiplier (grows with streak, max 50% bonus)
  const streakMultiplier = 1 + Math.min(userStats.streak_current * 0.05, 0.5);
  
  // First time seeing this question type today
  const today = localDayISO();
  const { data: todayStats, error: todayError } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('class_id', classId)
    .eq('date', today)
    .maybeSingle();
  if (todayError) throw todayError;

  // Simple check - if no stats today, it's first of any type
  const firstTimeBonus = !todayStats || todayStats.questions_answered === 0 ? 5 : 0;
  
  const total = Math.round(
    (baseXP + accuracyBonus + speedBonus) * 
    difficultyMultiplier * 
    streakMultiplier
  ) + firstTimeBonus;
  
  return {
    base: baseXP,
    accuracyBonus,
    speedBonus,
    difficultyMultiplier,
    streakMultiplier,
    firstTimeBonus,
    total
  };
};

// Update daily stats
export const updateDailyStats = async (
  classId: string,
  xpEarned: number,
  timeMs: number,
  correct: boolean
): Promise<void> => {
  const today = localDayISO();

  // Atomic single-statement upsert (increment_daily_stats) so two answers landing
  // in quick succession during a drill can't drop an increment. Surface write
  // errors so a failed stats write is not invisible.
  const { error } = await supabase.rpc('increment_daily_stats', {
    p_class_id: classId,
    p_date: today,
    p_xp: xpEarned,
    p_time_ms: timeMs,
    p_correct: correct
  });
  if (error) throw error;
};
