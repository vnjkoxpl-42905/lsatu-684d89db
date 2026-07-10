import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import type { XPGain, UserStats, AttemptData } from "./gamification";
import type { StreakUpdate } from "./streakSystem";

export interface Achievement {
  id: string;
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xp_reward: number;
  tier: string;
}

export interface AttemptContext {
  attempt: AttemptData;
  xpGain: XPGain;
  streakUpdate: StreakUpdate;
  userStats: UserStats;
}

class AchievementEngine {
  // Check and award achievements
  async checkAndAwardAchievements(
    classId: string,
    context: AttemptContext
  ): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];
    
    // Check milestone achievements
    const milestoneAchievements = await this.checkMilestoneAchievements(classId, context);
    newAchievements.push(...milestoneAchievements);
    
    // Check streak achievements
    const streakAchievements = await this.checkStreakAchievements(classId, context);
    newAchievements.push(...streakAchievements);
    
    // Check accuracy achievements
    const accuracyAchievements = await this.checkAccuracyAchievements(classId, context);
    newAchievements.push(...accuracyAchievements);
    
    // Award XP and save achievements
    if (newAchievements.length > 0) {
      await this.awardAchievements(classId, newAchievements);
    }
    
    return newAchievements;
  }
  
  private async checkMilestoneAchievements(
    classId: string,
    context: AttemptContext
  ): Promise<Achievement[]> {
    const earned: any[] = [];
    const totalQuestions = context.userStats.overall_answered;
    
    // Get all milestone achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('category', 'milestone');

    if (!achievements) return earned;

    // Fetch this student's already-earned achievement ids once (was an N+1
    // existence query per candidate). Membership is then checked in memory.
    const earnedIds = await this.getEarnedAchievementIds(classId);

    // Check each milestone
    for (const achievement of achievements) {
      const req = achievement.requirement as unknown as { type: string; value: number | string };
      if (earnedIds.has(achievement.id)) continue;

      if (req.type === 'questions_total') {
        // Use >= so a milestone still fires if the counter skips the exact
        // threshold (batched/lost increments); the earnedIds guard prevents
        // re-awarding.
        if (typeof req.value === 'number' && totalQuestions >= req.value) {
          earned.push(achievement);
        }
      }

      if (req.type === 'practice_time') {
        const hour = new Date().getHours();
        const isMatch =
          (req.value === 'late' && hour >= 0 && hour < 6) ||
          (req.value === 'early' && hour >= 5 && hour < 7);

        if (isMatch) {
          earned.push(achievement);
        }
      }
    }

    return earned;
  }

  // Returns the set of achievement_ids this class has already earned.
  private async getEarnedAchievementIds(classId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('class_id', classId);
    if (error) throw error;
    return new Set((data ?? []).map(r => r.achievement_id));
  }
  
  private async checkStreakAchievements(
    classId: string,
    context: AttemptContext
  ): Promise<Achievement[]> {
    const earned: any[] = [];
    
    if (!context.streakUpdate.streakIncreased) {
      return earned;
    }
    
    const currentStreak = context.streakUpdate.newStreak;
    
    // Get all streak achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('category', 'streak');
    
    if (!achievements) return earned;
    
    for (const achievement of achievements) {
      const req = achievement.requirement as unknown as { type: string; value: number | string };
      
      if (req.type === 'streak' && currentStreak === req.value) {
        const { data: existing } = await supabase
          .from('user_achievements')
          .select('id')
          .eq('class_id', classId)
          .eq('achievement_id', achievement.id)
          .single();
        
        if (!existing) {
          earned.push(achievement);
        }
      }
    }
    
    return earned;
  }
  
  private async checkAccuracyAchievements(
    classId: string,
    context: AttemptContext
  ): Promise<Achievement[]> {
    const earned: any[] = [];
    
    // Check for "perfect 10" - 10 correct in a row
    if (context.attempt.correct) {
      const { data: recentAttempts, error: recentError } = await supabase
        .from('attempts')
        .select('correct')
        .eq('class_id', classId)
        .order('timestamp_iso', { ascending: false })
        .limit(10);

      // The attempts table has no `timestamp` column (only `timestamp_iso`), so
      // the old order clause returned a PostgREST error and null data, silently
      // making perfect_10 unwinnable. Surface real read failures.
      if (recentError) throw recentError;

      if (recentAttempts && recentAttempts.length === 10) {
        const allCorrect = recentAttempts.every(a => a.correct);
        
        if (allCorrect) {
          const { data: achievement } = await supabase
            .from('achievements')
            .select('*')
            .eq('badge_id', 'perfect_10')
            .single();
          
          if (achievement) {
            const { data: existing } = await supabase
              .from('user_achievements')
              .select('id')
              .eq('class_id', classId)
              .eq('achievement_id', achievement.id)
              .single();
            
            if (!existing) {
              earned.push(achievement);
            }
          }
        }
      }
    }
    
    return earned;
  }
  
  private async awardAchievements(
    classId: string,
    achievements: Achievement[]
  ): Promise<void> {
    // Insert user achievements. Typed against the generated Insert shape (no
    // `progress` column exists on the table, so the old `as any` masked a
    // phantom field). Check the error so we never toast "unlocked" for a badge
    // that was never persisted.
    const userAchievements: TablesInsert<'user_achievements'>[] = achievements.map(a => ({
      class_id: classId,
      achievement_id: a.id,
    }));

    const { error: insertError } = await supabase
      .from('user_achievements')
      .insert(userAchievements);
    if (insertError) throw insertError;

    // Award XP via an atomic increment (increment_xp_total) so concurrent awards
    // can't clobber each other's xp_total. Surface write errors.
    const totalXP = achievements.reduce((sum, a) => sum + a.xp_reward, 0);

    if (totalXP > 0) {
      const { error: xpError } = await supabase.rpc('increment_xp_total', {
        p_class_id: classId,
        p_xp: totalXP
      });
      if (xpError) throw xpError;
    }
  }
}

export const achievementEngine = new AchievementEngine();
