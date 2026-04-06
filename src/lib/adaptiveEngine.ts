// Deterministic adaptive question selection engine

import { LRQuestion } from './questionLoader';
import { supabase } from '@/integrations/supabase/client';

export interface StudentAbility {
  overall: number;
  byQType: Record<string, number>;
}

export interface AttemptRecord {
  qid: string;
  correct: boolean;
  time_ms: number;
  qtype: string;
  difficulty: number;
  timestamp: Date;
}

export interface WeakAreaAnalysis {
  weakQTypes: string[];
  weakDifficulties: number[];
  recommendedSize: number;
  explanation: string;
  sampleSize: number;
  confidence?: number; // 0-1, how confident we are in this analysis
}

/** Per question-type mastery level (1–5) and the accuracy data behind it */
export interface TypeMastery {
  qtype: string;
  masteryLevel: number;   // 1–5, the target difficulty tier for this type
  accuracy: number;       // 0–1, weighted accuracy across all recent attempts
  attemptsCount: number;
  isWeak: boolean;        // accuracy < 0.60 — needs focused work
  isStrong: boolean;      // accuracy >= 0.75 AND masteryLevel >= 4
}

/** The assembled smart drill composition */
export interface SmartDrillResult {
  questions: LRQuestion[];
  masteryMap: Record<string, TypeMastery>;
  buckets: {
    progression: number;  // # of questions in each bucket
    redemption: number;
    maintenance: number;
  };
  explanation: string;
}

export class AdaptiveEngine {
  private cooldowns: Map<string, Date> = new Map();
  private recentAttempts: AttemptRecord[] = [];

  // Enhanced adaptive selection with spaced repetition and breadth
  selectNextQuestion(
    pool: LRQuestion[],
    ability: StudentAbility,
    exploreRatio: number = 0.15,
    qtypeCoverage?: Map<string, number> // track which qtypes have been seen
  ): LRQuestion | null {
    if (pool.length === 0) return null;

    // Filter out recently attempted (cooldown with recency weighting)
    const now = new Date();
    const eligible = pool.filter((q) => {
      const lastSeen = this.cooldowns.get(q.qid);
      if (!lastSeen) return true;
      const hoursSince = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);
      return hoursSince > 1; // Reduced to 1-hour cooldown for better pool
    });

    if (eligible.length === 0) return pool[0]; // Fallback

    // Dynamic explore ratio based on data availability
    const attemptCount = this.recentAttempts.length;
    const dynamicExploreRatio = attemptCount < 20 
      ? 0.3 // High exploration when data is sparse
      : attemptCount < 50 
        ? 0.2 
        : exploreRatio; // Use provided ratio when enough data

    // Explore vs exploit
    const explore = Math.random() < dynamicExploreRatio;
    
    if (explore) {
      // Exploration: prefer qtypes not seen recently
      if (qtypeCoverage) {
        const qtypeGroups = new Map<string, LRQuestion[]>();
        eligible.forEach(q => {
          if (!qtypeGroups.has(q.qtype)) qtypeGroups.set(q.qtype, []);
          qtypeGroups.get(q.qtype)!.push(q);
        });

        // Find least-seen qtype
        let minSeen = Infinity;
        let leastSeenQTypes: string[] = [];
        qtypeGroups.forEach((questions, qtype) => {
          const seen = qtypeCoverage.get(qtype) || 0;
          if (seen < minSeen) {
            minSeen = seen;
            leastSeenQTypes = [qtype];
          } else if (seen === minSeen) {
            leastSeenQTypes.push(qtype);
          }
        });

        // Random from least-seen qtypes
        const selectedQType = leastSeenQTypes[Math.floor(Math.random() * leastSeenQTypes.length)];
        const candidates = qtypeGroups.get(selectedQType)!;
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
      
      // Random selection for exploration
      return eligible[Math.floor(Math.random() * eligible.length)];
    }

    // Exploit: advanced scoring considering multiple factors
    const targetDifficulty = Math.max(1, Math.min(5, Math.round(ability.overall)));
    
    let best: LRQuestion | null = null;
    let bestScore = -Infinity;

    for (const q of eligible) {
      let score = 0;

      // 1. Difficulty match (higher weight)
      const difficultyMatch = -Math.abs(q.difficulty - targetDifficulty);
      score += difficultyMatch * 3;
      
      // 2. Question type weakness (higher weight for weaker areas)
      const qtypeAbility = ability.byQType[q.qtype] || ability.overall;
      const qtypeWeight = -(qtypeAbility - 1); // 0 to -4, weaker = more negative = higher priority
      score += qtypeWeight * 2.5;
      
      // 3. Recency bonus (prefer questions not seen in a while)
      const lastSeen = this.cooldowns.get(q.qid);
      if (lastSeen) {
        const hoursSince = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);
        const recencyBonus = Math.min(3, hoursSince / 24); // Max +3 for questions not seen in days
        score += recencyBonus;
      } else {
        score += 3; // Never seen = high priority
      }

      // 4. Breadth bonus (reward covering less-practiced qtypes)
      if (qtypeCoverage) {
        const timesSeen = qtypeCoverage.get(q.qtype) || 0;
        const avgSeen = Array.from(qtypeCoverage.values()).reduce((a, b) => a + b, 0) / 
                        (qtypeCoverage.size || 1);
        if (timesSeen < avgSeen * 0.7) {
          score += 1.5; // Bonus for underrepresented types
        }
      }

      // 5. Adaptive difficulty adjustment (if struggling, slightly prefer easier)
      const recentAccuracy = this.recentAttempts.slice(-10).filter(a => a.correct).length / 
                            Math.max(1, Math.min(10, this.recentAttempts.length));
      if (recentAccuracy < 0.5 && q.difficulty < targetDifficulty) {
        score += 1; // Small boost for easier questions when struggling
      } else if (recentAccuracy > 0.75 && q.difficulty > targetDifficulty) {
        score += 0.5; // Small boost for harder questions when doing well
      }
      
      if (score > bestScore) {
        bestScore = score;
        best = q;
      }
    }

    return best || eligible[0];
  }

  recordAttempt(attempt: AttemptRecord): void {
    this.recentAttempts.push(attempt);
    this.cooldowns.set(attempt.qid, attempt.timestamp);
    
    // Keep only recent 100 attempts
    if (this.recentAttempts.length > 100) {
      this.recentAttempts.shift();
    }
  }

  calculateAbility(attempts: AttemptRecord[]): StudentAbility {
    if (attempts.length === 0) {
      return {
        overall: 3,
        byQType: {},
      };
    }

    // Simple ability estimation based on recent performance
    const recent = attempts.slice(-20); // Last 20 attempts
    const correctCount = recent.filter((a) => a.correct).length;
    const accuracy = correctCount / recent.length;

    // Base ability (1-5 scale)
    let overall = 1 + accuracy * 4;

    // Adjust for average difficulty of correct answers
    const correctAttempts = recent.filter((a) => a.correct);
    if (correctAttempts.length > 0) {
      const avgDifficulty = correctAttempts.reduce((sum, a) => sum + a.difficulty, 0) / correctAttempts.length;
      overall = (overall + avgDifficulty) / 2;
    }

    overall = Math.max(1, Math.min(5, overall));

    // Calculate per-qtype ability
    const byQType: Record<string, number> = {};
    const byQTypeAttempts: Record<string, AttemptRecord[]> = {};

    for (const a of recent) {
      if (!byQTypeAttempts[a.qtype]) {
        byQTypeAttempts[a.qtype] = [];
      }
      byQTypeAttempts[a.qtype].push(a);
    }

    for (const [qtype, qtypeAttempts] of Object.entries(byQTypeAttempts)) {
      const qtypeCorrect = qtypeAttempts.filter((a) => a.correct).length;
      const qtypeAccuracy = qtypeCorrect / qtypeAttempts.length;
      byQType[qtype] = 1 + qtypeAccuracy * 4;
    }

    return { overall, byQType };
  }

  async analyzeWeakAreas(userId: string): Promise<WeakAreaAnalysis | null> {
    try {
      const { data: attempts, error } = await (supabase as any)
        .from('attempts')
        .select('qtype, level, correct, timestamp_iso, time_ms')
        .eq('user_id', userId)
        .order('timestamp_iso', { ascending: false })
        .limit(150); // Increased from 100 for better analysis

      if (error || !attempts || attempts.length < 10) {
        return null; // Not enough data
      }

      // Weight recent attempts more heavily using exponential decay
      const weightedAttempts = attempts.map((a, idx) => ({
        ...a,
        weight: Math.exp(-idx / 50), // More recent = higher weight
      }));

      // Calculate weighted accuracy by question type
      const qtypeStats: Record<string, { 
        correctWeighted: number; 
        totalWeighted: number;
        rawCorrect: number;
        rawTotal: number;
        avgTimeMs: number;
        timeCount: number;
      }> = {};
      
      weightedAttempts.forEach(a => {
        if (!qtypeStats[a.qtype]) {
          qtypeStats[a.qtype] = { 
            correctWeighted: 0, 
            totalWeighted: 0,
            rawCorrect: 0,
            rawTotal: 0,
            avgTimeMs: 0,
            timeCount: 0,
          };
        }
        qtypeStats[a.qtype].totalWeighted += a.weight;
        qtypeStats[a.qtype].rawTotal++;
        if (a.correct) {
          qtypeStats[a.qtype].correctWeighted += a.weight;
          qtypeStats[a.qtype].rawCorrect++;
        }
        if (a.time_ms) {
          qtypeStats[a.qtype].avgTimeMs += a.time_ms;
          qtypeStats[a.qtype].timeCount++;
        }
      });

      // Calculate average time for each qtype
      Object.values(qtypeStats).forEach(stats => {
        if (stats.timeCount > 0) {
          stats.avgTimeMs = stats.avgTimeMs / stats.timeCount;
        }
      });

      // Find weakest question types with enhanced criteria
      const weakQTypes = Object.entries(qtypeStats)
        .filter(([_, stats]) => stats.rawTotal >= 5) // At least 5 attempts
        .map(([qtype, stats]) => ({
          qtype,
          weightedAccuracy: stats.correctWeighted / stats.totalWeighted,
          rawAccuracy: stats.rawCorrect / stats.rawTotal,
          total: stats.rawTotal,
          avgTimeMs: stats.avgTimeMs,
        }))
        .sort((a, b) => a.weightedAccuracy - b.weightedAccuracy) // Sort by weighted accuracy
        .slice(0, 4) // Top 4 weakest
        .filter(q => q.weightedAccuracy < 0.65) // Accuracy threshold
        .map(q => q.qtype);

      // Calculate accuracy by difficulty with weighting
      const diffStats: Record<number, { 
        correctWeighted: number; 
        totalWeighted: number;
        rawTotal: number;
      }> = {};
      
      weightedAttempts.forEach(a => {
        if (!diffStats[a.level]) {
          diffStats[a.level] = { correctWeighted: 0, totalWeighted: 0, rawTotal: 0 };
        }
        diffStats[a.level].totalWeighted += a.weight;
        diffStats[a.level].rawTotal++;
        if (a.correct) diffStats[a.level].correctWeighted += a.weight;
      });

      // Find difficulty range where accuracy dips
      const weakDifficulties = Object.entries(diffStats)
        .filter(([_, stats]) => stats.rawTotal >= 5) // At least 5 attempts
        .map(([diff, stats]) => ({
          diff: parseInt(diff),
          weightedAccuracy: stats.correctWeighted / stats.totalWeighted,
        }))
        .filter(d => d.weightedAccuracy < 0.65)
        .map(d => d.diff);

      // Identify struggling patterns (fast wrong answers = guessing, slow wrong = reasoning errors)
      const fastWrongCount = attempts.filter(a => 
        !a.correct && a.time_ms && a.time_ms < 60000 // Wrong in < 1 minute
      ).length;
      const slowWrongCount = attempts.filter(a => 
        !a.correct && a.time_ms && a.time_ms > 120000 // Wrong in > 2 minutes
      ).length;

      let timingInsight = '';
      if (fastWrongCount > attempts.length * 0.2) {
        timingInsight = ' You may be rushing - take more time to analyze.';
      } else if (slowWrongCount > attempts.length * 0.2) {
        timingInsight = ' You may be overthinking - trust your initial instincts more.';
      }

      // Generate detailed explanation
      const recentAccuracy = attempts.slice(0, 20).filter(a => a.correct).length / 20;
      const overallAccuracy = attempts.filter(a => a.correct).length / attempts.length;
      const trend = recentAccuracy > overallAccuracy + 0.05 ? ' (improving!)' : 
                    recentAccuracy < overallAccuracy - 0.05 ? ' (declining)' : '';

      const qtypeList = weakQTypes.length > 0 
        ? weakQTypes.join(', ')
        : 'No specific weak areas identified';
      
      const diffRange = weakDifficulties.length > 0
        ? `levels ${Math.min(...weakDifficulties)}-${Math.max(...weakDifficulties)}`
        : 'balanced difficulty';

      // Confidence score based on sample size and recency
      const confidence = Math.min(0.95, (attempts.length / 100) * 0.7 + 0.3);

      return {
        weakQTypes: weakQTypes.length > 0 ? weakQTypes : [],
        weakDifficulties: weakDifficulties.length > 0 ? weakDifficulties : [2, 3, 4],
        recommendedSize: Math.min(25, Math.max(12, Math.floor(attempts.length / 4))),
        explanation: `Based on ${attempts.length} attempts: Focus on ${qtypeList} at ${diffRange}. ` +
                    `Current accuracy: ${Math.round(recentAccuracy * 100)}%${trend}.${timingInsight}`,
        sampleSize: attempts.length,
        confidence,
      } as WeakAreaAnalysis & { confidence: number };
    } catch (err) {
      console.error('Error analyzing weak areas:', err);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Smart Drill — mastery-aware 40/40/20 question assembly
  // ---------------------------------------------------------------------------

  /**
   * Calculate per-type mastery levels from the user's attempt history.
   *
   * Mastery level (1–5) is derived from weighted accuracy at each difficulty
   * tier. The target level advances when the user clears >75% at their current
   * ceiling, and retreats when they fall below 40%.
   *
   * Returns a map of qtype → TypeMastery for every type seen in history.
   */
  private calculateTypeMastery(
    attempts: Array<{ qid: string; qtype: string; level: number; correct: boolean; weight: number }>
  ): Record<string, TypeMastery> {
    // Group attempts by qtype, then by difficulty level
    const byType: Record<string, Array<typeof attempts[0]>> = {};
    for (const a of attempts) {
      if (!byType[a.qtype]) byType[a.qtype] = [];
      byType[a.qtype].push(a);
    }

    const masteryMap: Record<string, TypeMastery> = {};

    for (const [qtype, typeAttempts] of Object.entries(byType)) {
      // Overall weighted accuracy for this type
      let totalWeight = 0;
      let correctWeight = 0;
      for (const a of typeAttempts) {
        totalWeight += a.weight;
        if (a.correct) correctWeight += a.weight;
      }
      const overallAccuracy = totalWeight > 0 ? correctWeight / totalWeight : 0;

      // Weighted accuracy broken down by difficulty level (1–5)
      const levelStats: Record<number, { correct: number; total: number }> = {};
      for (const a of typeAttempts) {
        if (!levelStats[a.level]) levelStats[a.level] = { correct: 0, total: 0 };
        levelStats[a.level].total += a.weight;
        if (a.correct) levelStats[a.level].correct += a.weight;
      }

      // Find the highest difficulty where accuracy ≥ 40% (working level)
      let workingLevel = 1;
      for (let lvl = 5; lvl >= 1; lvl--) {
        const stats = levelStats[lvl];
        if (stats && stats.total > 0) {
          const acc = stats.correct / stats.total;
          if (acc >= 0.40) {
            workingLevel = lvl;
            break;
          }
        }
      }

      // Advance or retreat the target level based on working-level accuracy
      const workingStats = levelStats[workingLevel];
      const workingAccuracy = workingStats && workingStats.total > 0
        ? workingStats.correct / workingStats.total
        : overallAccuracy;

      let masteryLevel: number;
      if (workingAccuracy > 0.75) {
        // Mastered current level — push to the next
        masteryLevel = Math.min(5, workingLevel + 1);
      } else if (workingAccuracy < 0.40) {
        // Struggling — retreat one tier
        masteryLevel = Math.max(1, workingLevel - 1);
      } else {
        // Solidifying — stay here
        masteryLevel = workingLevel;
      }

      masteryMap[qtype] = {
        qtype,
        masteryLevel,
        accuracy: overallAccuracy,
        attemptsCount: typeAttempts.length,
        isWeak: overallAccuracy < 0.60,
        isStrong: overallAccuracy >= 0.75 && masteryLevel >= 4,
      };
    }

    return masteryMap;
  }

  /**
   * Assemble a smart drill using the 40 / 40 / 20 formula:
   *
   *   40% Progression  — unseen questions at the user's mastery level for
   *                       weak question types (accuracy < 60%)
   *   40% Redemption   — questions the user has previously gotten wrong,
   *                       prioritised by the most-missed types
   *   20% Maintenance  — questions from strong types (accuracy ≥ 75%,
   *                       mastery level 4–5) to prevent regression
   *
   * If any bucket can't fill its quota the remainder is distributed to the
   * other buckets so the requested `count` is always honoured (within pool
   * limits).
   */
  async generateSmartDrill(
    userId: string,
    pool: LRQuestion[],
    count: number
  ): Promise<SmartDrillResult> {
    // ── 1. Pull recent attempt history ──────────────────────────────────────
    const { data: rawAttempts, error } = await (supabase as any)
      .from('attempts')
      .select('qid, qtype, level, correct')
      .eq('user_id', userId)
      .order('timestamp_iso', { ascending: false })
      .limit(300);

    if (error || !rawAttempts || rawAttempts.length === 0) {
      // No history — fall back to a random sample
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      return {
        questions: shuffled.slice(0, count),
        masteryMap: {},
        buckets: { progression: count, redemption: 0, maintenance: 0 },
        explanation: 'No history found — returning a random sample to get you started.',
      };
    }

    // Exponential decay weight: most recent = 1.0, older → smaller
    const weighted = rawAttempts.map((a: any, idx: number) => ({
      ...a,
      weight: Math.exp(-idx / 80),
    }));

    // ── 2. Calculate per-type mastery ────────────────────────────────────────
    const masteryMap = this.calculateTypeMastery(weighted);

    // ── 3. Build lookup sets ─────────────────────────────────────────────────
    // All qids the user has ever attempted (for "unseen" filtering)
    const attemptedQids = new Set<string>(rawAttempts.map((a: any) => a.qid));

    // Most-recently-wrong qids (deduplicated, preserving last outcome per qid)
    const lastOutcomeByQid: Record<string, boolean> = {};
    for (const a of [...rawAttempts].reverse()) {
      lastOutcomeByQid[a.qid] = a.correct;
    }
    const redemptionQids = new Set<string>(
      Object.entries(lastOutcomeByQid)
        .filter(([, correct]) => !correct)
        .map(([qid]) => qid)
    );

    // ── 4. Classify pool questions into buckets ──────────────────────────────
    const weakQTypes = new Set(
      Object.values(masteryMap)
        .filter(m => m.isWeak)
        .map(m => m.qtype)
    );
    const strongQTypes = new Set(
      Object.values(masteryMap)
        .filter(m => m.isStrong)
        .map(m => m.qtype)
    );

    // Progression: unseen questions whose type is weak AND difficulty matches mastery level
    const progressionPool = pool.filter(q => {
      if (attemptedQids.has(q.qid)) return false;
      if (!weakQTypes.has(q.qtype)) return false;
      const target = masteryMap[q.qtype]?.masteryLevel ?? 2;
      return q.difficulty === target;
    });

    // Redemption: previously wrong questions in the pool
    const redemptionPool = pool.filter(q => redemptionQids.has(q.qid));

    // Maintenance: unseen questions from strong types at difficulty 4–5
    const maintenancePool = pool.filter(q => {
      if (attemptedQids.has(q.qid)) return false;
      if (!strongQTypes.has(q.qtype)) return false;
      return q.difficulty >= 4;
    });

    // ── 5. Fill buckets with quota enforcement ───────────────────────────────
    const target = {
      progression: Math.round(count * 0.40),
      redemption:  Math.round(count * 0.40),
      maintenance: count - Math.round(count * 0.40) - Math.round(count * 0.40),
    };

    const pick = (src: LRQuestion[], n: number, used: Set<string>): LRQuestion[] => {
      const eligible = src.filter(q => !used.has(q.qid));
      const shuffled = eligible.sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, n);
      picked.forEach(q => used.add(q.qid));
      return picked;
    };

    const used = new Set<string>();
    let progression = pick(progressionPool, target.progression, used);
    let redemption  = pick(redemptionPool,  target.redemption,  used);
    let maintenance = pick(maintenancePool, target.maintenance, used);

    // Redistribute any deficit to other buckets using the full pool
    const deficit = count - progression.length - redemption.length - maintenance.length;
    if (deficit > 0) {
      const fallback = pick(pool, deficit, used);
      // Assign deficit to the bucket that needs it most (proportionally)
      const progressionDeficit = target.progression - progression.length;
      const redemptionDeficit  = target.redemption  - redemption.length;
      const maintenanceDeficit = target.maintenance - maintenance.length;
      let remaining = [...fallback];
      if (progressionDeficit > 0) {
        const take = remaining.splice(0, progressionDeficit);
        progression = [...progression, ...take];
      }
      if (redemptionDeficit > 0 && remaining.length > 0) {
        const take = remaining.splice(0, redemptionDeficit);
        redemption = [...redemption, ...take];
      }
      if (maintenanceDeficit > 0 && remaining.length > 0) {
        const take = remaining.splice(0, maintenanceDeficit);
        maintenance = [...maintenance, ...take];
      }
      // Any still-remaining go to progression
      progression = [...progression, ...remaining];
    }

    // ── 6. Merge, shuffle, return ────────────────────────────────────────────
    const merged = [...progression, ...redemption, ...maintenance];
    for (let i = merged.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [merged[i], merged[j]] = [merged[j], merged[i]];
    }

    // Build human-readable explanation
    const weakList = [...weakQTypes].slice(0, 3).join(', ') || 'none identified';
    const dominantLevel = Object.values(masteryMap).length > 0
      ? Math.round(
          Object.values(masteryMap).reduce((s, m) => s + m.masteryLevel, 0) /
          Object.values(masteryMap).length
        )
      : 2;
    const explanation =
      `${merged.length}-question smart drill: ` +
      `${progression.length} progression (new ${weakList} questions at level ${dominantLevel}), ` +
      `${redemption.length} redemption (previously missed), ` +
      `${maintenance.length} maintenance (strong types at L4–5). ` +
      `Based on ${rawAttempts.length} attempts.`;

    return {
      questions: merged.slice(0, count),
      masteryMap,
      buckets: {
        progression: progression.length,
        redemption:  redemption.length,
        maintenance: maintenance.length,
      },
      explanation,
    };
  }

  /**
   * Generate an optimal sequence of questions for adaptive drilling
   */
  getAdaptiveDrillSequence(
    pool: LRQuestion[],
    ability: StudentAbility,
    weakAreas: WeakAreaAnalysis,
    count: number
  ): LRQuestion[] {
    const sequence: LRQuestion[] = [];
    const used = new Set<string>();

    // 70% weak areas, 20% breadth, 10% confidence builders
    const weakCount = Math.floor(count * 0.7);
    const breadthCount = Math.floor(count * 0.2);
    const confidenceCount = count - weakCount - breadthCount;

    // 1. Add weak area questions
    const weakPool = pool.filter(q =>
      weakAreas.weakQTypes.includes(q.qtype) ||
      weakAreas.weakDifficulties.includes(q.difficulty)
    );
    for (let i = 0; i < weakCount && weakPool.length > 0; i++) {
      const idx = Math.floor(Math.random() * weakPool.length);
      const q = weakPool.splice(idx, 1)[0];
      if (!used.has(q.qid)) {
        sequence.push(q);
        used.add(q.qid);
      }
    }

    // 2. Add breadth questions (variety)
    const breadthPool = pool.filter(q => !used.has(q.qid));
    for (let i = 0; i < breadthCount && breadthPool.length > 0; i++) {
      const idx = Math.floor(Math.random() * breadthPool.length);
      const q = breadthPool.splice(idx, 1)[0];
      sequence.push(q);
      used.add(q.qid);
    }

    // 3. Add confidence builders (easier questions)
    const easyPool = pool.filter(q => 
      !used.has(q.qid) && 
      q.difficulty <= Math.max(1, Math.floor(ability.overall) - 1)
    );
    for (let i = 0; i < confidenceCount && easyPool.length > 0; i++) {
      const idx = Math.floor(Math.random() * easyPool.length);
      const q = easyPool.splice(idx, 1)[0];
      sequence.push(q);
      used.add(q.qid);
    }

    // Shuffle to mix weak/breadth/confidence throughout drill
    for (let i = sequence.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
    }

    return sequence;
  }
}
