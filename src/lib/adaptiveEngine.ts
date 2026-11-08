// Deterministic adaptive question selection engine

import { LRQuestion, questionBank } from './questionLoader';
import { supabase } from '@/integrations/supabase/client';
import { MIN_RATED_ANSWERS, ratingDifficultyFit, type RatingProfile } from './practiceRating';

const ADAPTIVE_CONFIG = {
  weakAccuracyThreshold: 0.60,
  strongAccuracyThreshold: 0.75,
  weakAreaThreshold: 0.65,
  advanceThreshold: 0.75,
  retreatThreshold: 0.40,
  strugglingThreshold: 0.5,
  minAttemptsForAnalysis: 10,
  minAttemptsForWeakDetection: 5,
  hydrateLimit: 200,
  analyzeLimit: 150,
  generateLimit: 300,
  cooldownMinutes: 60,
  bucketWeights: { progression: 0.40, redemption: 0.40, maintenance: 0.20 },
  recencyHalfLife: 70,
  fastThresholdMs: 60000,
  slowThresholdMs: 120000,
} as const;

export const SMART_DRILL_SELECTOR_WEIGHTS = {
  weaknessFit: 0.4,
  difficultyFit: 0.3,
  freshness: 0.15,
  variety: 0.1,
  metadataQuality: 0.05,
} as const;

export type AdaptiveHydrationStatus = 'idle' | 'loading' | 'ready' | 'failed';

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
  reasoningType?: string[];
  questionFeatures?: string[];
}

export type SmartDrillDataMode = 'cold' | 'warm' | 'personalized';

export interface SmartDrillStat {
  attempts: number;
  accuracy: number;
  weightedAccuracy: number;
  avgDifficulty: number;
}

export interface SmartDrillProfile {
  attemptCount: number;
  dataMode: SmartDrillDataMode;
  overall: SmartDrillStat;
  byQType: Record<string, SmartDrillStat>;
  byDifficulty: Record<number, SmartDrillStat>;
  byReasoningType: Record<string, SmartDrillStat>;
  byQuestionFeature: Record<string, SmartDrillStat>;
}

export interface SmartDrillSelectionContext {
  attempts: AttemptRecord[];
  currentSessionUsedQids: Set<string>;
  recentExposureQids: Set<string>;
  /** Injectable so equal-score sampling stays deterministic in tests. */
  random?: () => number;
  practiceRating?: RatingProfile;
}

export interface SmartDrillSelectionReason {
  score: number;
  matchedWeaknesses: string[];
  excludedRecentExposure: boolean;
  targetDifficulty: number;
  dataMode: SmartDrillDataMode;
}

export interface SmartDrillSelection {
  question: LRQuestion;
  selectionReason: SmartDrillSelectionReason;
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
  /** True when the engine could not compose a real adaptive drill (cold start or pool starvation). UI should suppress mastery surfaces. */
  coldStart?: boolean;
  weakQTypes?: string[];
  confidence?: number;
}

export class AdaptiveEngine {
  private cooldowns: Map<string, Date> = new Map();
  private recentAttempts: AttemptRecord[] = [];
  private hydrated = false;
  private hydrationStatus: AdaptiveHydrationStatus = 'idle';
  private hydrationPromise: Promise<void> | null = null;

  /**
   * Hydrate engine state from the database so it persists across sessions.
   * Loads the user's last 200 attempts and rebuilds cooldowns.
   */
  getHydrationStatus(): AdaptiveHydrationStatus {
    return this.hydrationStatus;
  }

  async ensureHydratedFromDB(classId: string): Promise<void> {
    if (this.hydrated) return;
    if (this.hydrationPromise) return this.hydrationPromise;

    this.hydrationStatus = 'loading';
    this.hydrationPromise = this.loadHydrationFromDB(classId).finally(() => {
      this.hydrationPromise = null;
    });
    return this.hydrationPromise;
  }

  async hydrateFromDB(classId: string): Promise<void> {
    return this.ensureHydratedFromDB(classId);
  }

  private async loadHydrationFromDB(classId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('attempts')
        .select('qid, correct, time_ms, qtype, level, timestamp_iso')
        .eq('class_id', classId)
        .order('timestamp_iso', { ascending: false })
        .limit(ADAPTIVE_CONFIG.hydrateLimit);

      if (error || !data) {
        console.warn('Failed to hydrate adaptive engine:', error);
        // Keep the engine retryable. A brief outage on the first Smart Drill
        // should not force cold-start selection for the rest of this app
        // session.
        this.hydrated = false;
        this.hydrationStatus = 'failed';
        return;
      }

      // Rebuild recent attempts and cooldowns from DB history (oldest first)
      const sorted = [...data].reverse();
      for (const a of sorted) {
        const question = questionBank.getQuestion(a.qid);
        const record: AttemptRecord = {
          qid: a.qid,
          correct: a.correct,
          time_ms: a.time_ms,
          qtype: question?.qtype ?? a.qtype,
          difficulty: question?.difficulty ?? a.level,
          timestamp: new Date(a.timestamp_iso),
          reasoningType: question?.reasoningType ?? [],
          questionFeatures: question?.questionFeatures ?? [],
        };
        this.recentAttempts.push(record);
        this.cooldowns.set(a.qid, new Date(a.timestamp_iso));
      }

      // Trim to 100
      if (this.recentAttempts.length > 100) {
        this.recentAttempts = this.recentAttempts.slice(-100);
      }

      this.hydrated = true;
      this.hydrationStatus = 'ready';
      console.log(`Adaptive engine hydrated with ${data.length} attempts`);
    } catch (err) {
      console.error('Error hydrating adaptive engine:', err);
      this.hydrated = false;
      this.hydrationStatus = 'failed';
    }
  }

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
      const minutesSince = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
      return minutesSince > ADAPTIVE_CONFIG.cooldownMinutes;
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
      if (recentAccuracy < ADAPTIVE_CONFIG.strugglingThreshold && q.difficulty < targetDifficulty) {
        score += 1; // Small boost for easier questions when struggling
      } else if (recentAccuracy > ADAPTIVE_CONFIG.advanceThreshold && q.difficulty > targetDifficulty) {
        score += 0.5; // Small boost for harder questions when doing well
      }
      
      if (score > bestScore) {
        bestScore = score;
        best = q;
      }
    }

    return best || eligible[0];
  }

  /** True if this qid was answered within the configured cooldown window. */
  private isOnCooldown(qid: string, now: Date = new Date()): boolean {
    const lastSeen = this.cooldowns.get(qid);
    if (!lastSeen) return false;
    const minutesSince = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    return minutesSince <= ADAPTIVE_CONFIG.cooldownMinutes;
  }

  recordAttempt(attempt: AttemptRecord): void {
    this.recentAttempts.push(attempt);
    this.cooldowns.set(attempt.qid, attempt.timestamp);
    
    // Keep only recent 100 attempts
    if (this.recentAttempts.length > 100) {
      this.recentAttempts.shift();
    }
  }

  getRecentAttempts(): AttemptRecord[] {
    return [...this.recentAttempts];
  }

  buildStudentProfile(attempts: AttemptRecord[]): SmartDrillProfile {
    const normalized = attempts.map((attempt) => ({
      ...attempt,
      reasoningType: Array.isArray(attempt.reasoningType) ? attempt.reasoningType : [],
      questionFeatures: Array.isArray(attempt.questionFeatures) ? attempt.questionFeatures : [],
    }));

    const sortedNewestFirst = [...normalized].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    type Bucket = {
      attempts: number;
      correctWeighted: number;
      totalWeighted: number;
      difficultyTotal: number;
    };

    const emptyBucket = (): Bucket => ({
      attempts: 0,
      correctWeighted: 0,
      totalWeighted: 0,
      difficultyTotal: 0,
    });

    const add = (map: Record<string, Bucket>, key: string, attempt: AttemptRecord, weight: number) => {
      if (!key) return;
      if (!map[key]) map[key] = emptyBucket();
      map[key].attempts += 1;
      map[key].totalWeighted += weight;
      map[key].difficultyTotal += attempt.difficulty;
      if (attempt.correct) map[key].correctWeighted += weight;
    };

    const overallBucket = emptyBucket();
    const qtypeBuckets: Record<string, Bucket> = {};
    const difficultyBuckets: Record<string, Bucket> = {};
    const reasoningBuckets: Record<string, Bucket> = {};
    const featureBuckets: Record<string, Bucket> = {};

    sortedNewestFirst.forEach((attempt, idx) => {
      const weight = Math.exp(-idx / ADAPTIVE_CONFIG.recencyHalfLife);
      overallBucket.attempts += 1;
      overallBucket.totalWeighted += weight;
      overallBucket.difficultyTotal += attempt.difficulty;
      if (attempt.correct) overallBucket.correctWeighted += weight;

      add(qtypeBuckets, attempt.qtype, attempt, weight);
      add(difficultyBuckets, String(attempt.difficulty), attempt, weight);
      for (const reasoningType of attempt.reasoningType ?? []) {
        add(reasoningBuckets, reasoningType, attempt, weight);
      }
      for (const feature of attempt.questionFeatures ?? []) {
        add(featureBuckets, feature, attempt, weight);
      }
    });

    const toStat = (bucket?: Bucket): SmartDrillStat => {
      if (!bucket || bucket.attempts === 0 || bucket.totalWeighted === 0) {
        return { attempts: 0, accuracy: 0, weightedAccuracy: 0, avgDifficulty: 3 };
      }
      const weightedAccuracy = bucket.correctWeighted / bucket.totalWeighted;
      return {
        attempts: bucket.attempts,
        accuracy: weightedAccuracy,
        weightedAccuracy,
        avgDifficulty: bucket.difficultyTotal / bucket.attempts,
      };
    };

    const mapStats = (buckets: Record<string, Bucket>) =>
      Object.fromEntries(Object.entries(buckets).map(([key, bucket]) => [key, toStat(bucket)]));

    const dataMode: SmartDrillDataMode =
      normalized.length < 15 ? 'cold' : normalized.length < 50 ? 'warm' : 'personalized';

    return {
      attemptCount: normalized.length,
      dataMode,
      overall: toStat(overallBucket),
      byQType: mapStats(qtypeBuckets),
      byDifficulty: mapStats(difficultyBuckets) as Record<number, SmartDrillStat>,
      byReasoningType: mapStats(reasoningBuckets),
      byQuestionFeature: mapStats(featureBuckets),
    };
  }

  selectSmartDrillQuestion(
    pool: LRQuestion[],
    profile: SmartDrillProfile,
    context: SmartDrillSelectionContext,
  ): SmartDrillSelection | null {
    if (pool.length === 0) return null;

    // The caller owns the eligible pool. That is where the student's
    // allow-repeats, prefer-unseen, and recycle settings are applied. The
    // selector only enforces the two rules that are intrinsic to one Smart
    // Drill run: do not repeat this session, and avoid recent exposures while
    // another eligible question exists.
    const hardEligible = pool.filter((q) => {
      if (context.currentSessionUsedQids.has(q.qid)) return false;
      return true;
    });

    const freshEligible = hardEligible.filter((q) => !context.recentExposureQids.has(q.qid));
    const candidates = freshEligible.length > 0 ? freshEligible : hardEligible;
    if (candidates.length === 0) return null;

    const targetDifficulty = (q: LRQuestion): number => {
      const qtypeStat = profile.byQType[q.qtype];
      const base = qtypeStat?.attempts ? qtypeStat.avgDifficulty : profile.overall.avgDifficulty;
      const accuracy = qtypeStat?.attempts ? qtypeStat.weightedAccuracy : profile.overall.weightedAccuracy;
      if (profile.attemptCount === 0) return 3;
      if (accuracy < 0.55) return Math.max(1, Math.round(base));
      if (accuracy < 0.70) return Math.max(2, Math.round(base));
      if (accuracy < 0.85) return Math.min(4, Math.max(3, Math.round(base)));
      return Math.min(5, Math.max(4, Math.round(base + 1)));
    };

    const weaknessFor = (stat?: SmartDrillStat): number | null => {
      if (!stat || stat.attempts === 0) return null;
      // A single miss is evidence, not a verdict. The one-success/one-miss
      // prior keeps sparse analytics from swinging a type from "mastered" to
      // "weak" after one question, then fades as real attempts accumulate.
      const weightedMisses = (1 - stat.weightedAccuracy) * stat.attempts;
      return (weightedMisses + 1) / (stat.attempts + 2);
    };

    let best: SmartDrillSelection | null = null;
    let equalBestCount = 0;
    const random = context.random ?? Math.random;

    for (const q of candidates) {
      const matchedWeaknesses: string[] = [];
      const weaknessScores: number[] = [];

      const qtypeWeakness = weaknessFor(profile.byQType[q.qtype]);
      if (qtypeWeakness !== null) {
        weaknessScores.push(qtypeWeakness);
        if (qtypeWeakness >= 0.4) matchedWeaknesses.push(`qtype:${q.qtype}`);
      }

      const difficultyWeakness = weaknessFor(profile.byDifficulty[q.difficulty]);
      if (difficultyWeakness !== null) weaknessScores.push(difficultyWeakness * 0.75);

      for (const reasoningType of q.reasoningType ?? []) {
        const weakness = weaknessFor(profile.byReasoningType[reasoningType]);
        if (weakness !== null) {
          weaknessScores.push(weakness);
          if (weakness >= 0.4) matchedWeaknesses.push(`reasoningType:${reasoningType}`);
        }
      }

      for (const feature of q.questionFeatures ?? []) {
        const weakness = weaknessFor(profile.byQuestionFeature[feature]);
        if (weakness !== null) {
          weaknessScores.push(weakness);
          if (weakness >= 0.4) matchedWeaknesses.push(`questionFeature:${feature}`);
        }
      }

      const weaknessFit = weaknessScores.length > 0
        ? weaknessScores.reduce((sum, score) => sum + score, 0) / weaknessScores.length
        : profile.attemptCount === 0 ? 0.5 : 0.2;
      const target = targetDifficulty(q);
      const legacyFit = Math.max(0, 1 - Math.abs(q.difficulty - target) / 4);
      const ratedFit = context.practiceRating ? ratingDifficultyFit(context.practiceRating, q.difficulty, q.qtype) : null;
      const difficultyFit = ratedFit === null ? legacyFit : 0.25 * legacyFit + 0.75 * ratedFit;
      const freshness = context.recentExposureQids.has(q.qid) ? 0.1 : 1;
      const metadataQuality =
        (q.reasoningType?.length ? 0.5 : 0) +
        (q.questionFeatures?.length ? 0.5 : 0);
      const recentSameTypeCount = context.attempts
        .slice(-3)
        .filter((attempt) => attempt.qtype === q.qtype).length;
      const variety = Math.max(0.4, 1 - recentSameTypeCount * 0.2);

      const score =
        SMART_DRILL_SELECTOR_WEIGHTS.weaknessFit * weaknessFit +
        SMART_DRILL_SELECTOR_WEIGHTS.difficultyFit * difficultyFit +
        SMART_DRILL_SELECTOR_WEIGHTS.freshness * freshness +
        SMART_DRILL_SELECTOR_WEIGHTS.variety * variety +
        SMART_DRILL_SELECTOR_WEIGHTS.metadataQuality * metadataQuality;

      const selection: SmartDrillSelection = {
        question: q,
        selectionReason: {
          score,
          matchedWeaknesses,
          excludedRecentExposure: context.recentExposureQids.has(q.qid),
          targetDifficulty: target,
          dataMode: profile.dataMode,
        },
      };

      if (!best || score > best.selectionReason.score) {
        best = selection;
        equalBestCount = 1;
      } else if (Math.abs(score - best.selectionReason.score) < 1e-12) {
        // Reservoir sampling gives every equally useful candidate the same
        // chance without shuffling the full bank. Cold-start students now get
        // a varied diagnostic mix instead of the bank's first questions.
        equalBestCount += 1;
        if (random() < 1 / equalBestCount) best = selection;
      }
    }

    return best;
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

  async analyzeWeakAreas(classId: string): Promise<WeakAreaAnalysis | null> {
    try {
      const { data: attempts, error } = await supabase
        .from('attempts')
        .select('qtype, level, correct, timestamp_iso, time_ms')
        .eq('class_id', classId)
        .order('timestamp_iso', { ascending: false })
        .limit(ADAPTIVE_CONFIG.analyzeLimit);

      if (error || !attempts || attempts.length < ADAPTIVE_CONFIG.minAttemptsForAnalysis) {
        return null; // Not enough data
      }

      // Weight recent attempts more heavily using exponential decay
      const weightedAttempts = attempts.map((a, idx) => ({
        ...a,
        weight: Math.exp(-idx / ADAPTIVE_CONFIG.recencyHalfLife),
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
        .filter(([_, stats]) => stats.rawTotal >= ADAPTIVE_CONFIG.minAttemptsForWeakDetection)
        .map(([qtype, stats]) => ({
          qtype,
          weightedAccuracy: stats.correctWeighted / stats.totalWeighted,
          rawAccuracy: stats.rawCorrect / stats.rawTotal,
          total: stats.rawTotal,
          avgTimeMs: stats.avgTimeMs,
        }))
        .sort((a, b) => a.weightedAccuracy - b.weightedAccuracy) // Sort by weighted accuracy
        .slice(0, 4) // Top 4 weakest
        .filter(q => q.weightedAccuracy < ADAPTIVE_CONFIG.weakAreaThreshold)
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
        .filter(([_, stats]) => stats.rawTotal >= ADAPTIVE_CONFIG.minAttemptsForWeakDetection)
        .map(([diff, stats]) => ({
          diff: parseInt(diff),
          weightedAccuracy: stats.correctWeighted / stats.totalWeighted,
        }))
        .filter(d => d.weightedAccuracy < ADAPTIVE_CONFIG.weakAreaThreshold)
        .map(d => d.diff);

      // Identify struggling patterns (fast wrong answers = guessing, slow wrong = reasoning errors)
      const fastWrongCount = attempts.filter(a =>
        !a.correct && a.time_ms && a.time_ms < ADAPTIVE_CONFIG.fastThresholdMs
      ).length;
      const slowWrongCount = attempts.filter(a =>
        !a.correct && a.time_ms && a.time_ms > ADAPTIVE_CONFIG.slowThresholdMs
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
          if (acc >= ADAPTIVE_CONFIG.retreatThreshold) {
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
      if (workingAccuracy > ADAPTIVE_CONFIG.advanceThreshold) {
        // Mastered current level — push to the next
        masteryLevel = Math.min(5, workingLevel + 1);
      } else if (workingAccuracy < ADAPTIVE_CONFIG.retreatThreshold) {
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
        isWeak: overallAccuracy < ADAPTIVE_CONFIG.weakAccuracyThreshold,
        isStrong: overallAccuracy >= ADAPTIVE_CONFIG.strongAccuracyThreshold && masteryLevel >= 4,
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
    classId: string,
    pool: LRQuestion[],
    count: number,
    practiceRating?: RatingProfile,
  ): Promise<SmartDrillResult> {
    // ── 1. Pull recent attempt history ──────────────────────────────────────
    const { data: rawAttempts, error } = await supabase
      .from('attempts')
      .select('qid, qtype, level, correct, timestamp_iso')
      .eq('class_id', classId)
      .order('timestamp_iso', { ascending: false })
      .limit(ADAPTIVE_CONFIG.generateLimit);

    const orderForPractice = (questions: LRQuestion[]) => {
      const shuffled = questions.sort(() => Math.random() - 0.5);
      if (!practiceRating) return shuffled;
      const fit = (q: LRQuestion) => ratingDifficultyFit(practiceRating, q.difficulty, q.qtype) ?? 0.5;
      return shuffled.sort((a, b) => fit(b) - fit(a));
    };
    const attemptCount = !error && rawAttempts ? rawAttempts.length : 0;
    if (error || !rawAttempts || attemptCount < ADAPTIVE_CONFIG.minAttemptsForAnalysis) {
      // Cold start — too little history to compose a real adaptive drill.
      const shuffled = orderForPractice([...pool]);
      return {
        questions: shuffled.slice(0, count),
        masteryMap: {},
        buckets: { progression: shuffled.slice(0, count).length, redemption: 0, maintenance: 0 },
        explanation: practiceRating && practiceRating.LR.count >= MIN_RATED_ANSWERS
          ? 'Question difficulty is matched to your practice rating.'
          : 'This set helps Smart Drill learn which questions fit you.',
        coldStart: true,
      };
    }

    // Exponential decay weight: most recent = 1.0, older → smaller
    const weighted = rawAttempts.map((a, idx: number) => ({
      ...a,
      weight: Math.exp(-idx / ADAPTIVE_CONFIG.recencyHalfLife),
    }));

    // ── 2. Calculate per-type mastery ────────────────────────────────────────
    const masteryMap = this.calculateTypeMastery(weighted);

    // ── 3. Build lookup sets ─────────────────────────────────────────────────
    // All qids the user has ever attempted (for "unseen" filtering)
    const attemptedQids = new Set<string>(rawAttempts.map((a) => a.qid));

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
    const now = new Date();
    const progressionPool = pool.filter(q => {
      if (this.isOnCooldown(q.qid, now)) return false;
      if (attemptedQids.has(q.qid)) return false;
      if (!weakQTypes.has(q.qtype)) return false;
      const target = masteryMap[q.qtype]?.masteryLevel ?? 2;
      return q.difficulty === target;
    });

    // Redemption: previously wrong questions in the pool
    const redemptionPool = pool.filter(q => {
      if (this.isOnCooldown(q.qid, now)) return false;
      return redemptionQids.has(q.qid);
    });

    // Maintenance: unseen questions from strong types at difficulty 4–5
    const maintenancePool = pool.filter(q => {
      if (this.isOnCooldown(q.qid, now)) return false;
      if (attemptedQids.has(q.qid)) return false;
      if (!strongQTypes.has(q.qtype)) return false;
      return q.difficulty >= 4;
    });

    // ── 5. Fill buckets with quota enforcement ───────────────────────────────
    const progressionTarget = Math.round(count * ADAPTIVE_CONFIG.bucketWeights.progression);
    const redemptionTarget  = Math.round(count * ADAPTIVE_CONFIG.bucketWeights.redemption);
    const target = {
      progression: progressionTarget,
      redemption:  redemptionTarget,
      maintenance: count - progressionTarget - redemptionTarget,
    };

    const pick = (src: LRQuestion[], n: number, used: Set<string>): LRQuestion[] => {
      const eligible = src.filter(q => !used.has(q.qid));
      const shuffled = orderForPractice(eligible);
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
      const remaining = [...fallback];
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

    // Pool starvation: every real bucket was empty before the deficit fallback ran.
    // We still return the questions (so the drill can launch), but flag the result
    // honestly instead of narrating fabricated buckets.
    const realBucketsEmpty =
      progressionPool.length === 0 &&
      redemptionPool.length === 0 &&
      maintenancePool.length === 0;
    if (realBucketsEmpty) {
      return {
        questions: merged.slice(0, count),
        masteryMap,
        buckets: {
          progression: progression.length,
          redemption: redemption.length,
          maintenance: maintenance.length,
        },
        explanation: 'Your filter pool is smaller than the requested set. Showing all available questions.',
        coldStart: true,
      };
    }

    // Build human-readable explanation
    const weakList = [...weakQTypes].slice(0, 3).join(', ') || 'none identified';
    const dominantLevel = Object.values(masteryMap).length > 0
      ? Math.round(
          Object.values(masteryMap).reduce((s, m) => s + m.masteryLevel, 0) /
          Object.values(masteryMap).length
        )
      : 2;
    let explanation =
      `${merged.length}-question smart drill: ` +
      `${progression.length} progression (new ${weakList} questions at level ${dominantLevel}), ` +
      `${redemption.length} redemption (previously missed), ` +
      `${maintenance.length} maintenance (strong types at L4–5). ` +
      `Based on ${rawAttempts.length} attempts.`;

    // ── 7. Layer in weak-area narrative + timing insights ──────────────────────
    let weakAreaResult: WeakAreaAnalysis | null = null;
    try {
      weakAreaResult = await this.analyzeWeakAreas(classId);
    } catch (err) {
      // Non-fatal: keep the bucket explanation as-is.
      console.warn('analyzeWeakAreas failed during smart drill build:', err);
    }
    if (weakAreaResult) {
      explanation = `${weakAreaResult.explanation} ${explanation}`;
    }

    return {
      questions: merged.slice(0, count),
      masteryMap,
      buckets: {
        progression: progression.length,
        redemption:  redemption.length,
        maintenance: maintenance.length,
      },
      explanation,
      weakQTypes: weakAreaResult?.weakQTypes ?? [...weakQTypes],
      confidence: weakAreaResult?.confidence,
    };
  }

}
