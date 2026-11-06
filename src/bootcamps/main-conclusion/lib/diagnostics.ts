/**
 * Diagnostics aggregations.
 * Pure functions over persistence records and live Intro to LR sources.
 */

import type {
  CalibrationAttempt,
  TrapsTag,
  ModuleProgress,
  SimulatorAttempt,
  DrillStageGate,
  RrRecording,
  SrsQueueItem,
} from '@/bootcamps/main-conclusion/persistence/records';
import { INTRO_LR_PATH, type PathAction } from '@/bootcamps/main-conclusion/content/introToLrPath';
import { INTRO_DRILLS } from '@/bootcamps/main-conclusion/modules/drills/introDrills';
import {
  HARD_ENTRIES,
  firstIncomplete as firstIncompleteHardEntry,
  isEntryComplete as isHardEntryComplete,
  type HardEntry,
} from '@/bootcamps/main-conclusion/modules/hard-sentences/hardSentencesNav';
import { MAIN_CONCLUSION_PRACTICE_CARDS } from '@/bootcamps/main-conclusion/data/practiceDrillCards';
import type { PracticeDrillStatus } from '@/bootcamps/main-conclusion/hooks/usePracticeDrillStatus';
import {
  classifyIntroLrAttempt,
  decodeIntroLrSelectedAnswer,
  type IntroLrAttemptRow,
} from '@/bootcamps/main-conclusion/hooks/useIntroLrAttempts';
import type { FirstSentenceVsRebuttalSessionRecord } from '@/bootcamps/main-conclusion/data/reference-drills/firstSentenceVsRebuttalLabData';

export type TraitId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7';
export const TRAITS: TraitId[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export interface TraitStats {
  trait: TraitId;
  attempts: number;
  picked_when_wrong: number; // times the student picked a distractor with this tag
  correct: number;
  accuracy: number; // 0-1
}

export function aggregateTraitStats(tags: TrapsTag[]): TraitStats[] {
  const map = new Map<TraitId, { attempts: number; picked: number; correct: number }>();
  for (const t of TRAITS) map.set(t, { attempts: 0, picked: 0, correct: 0 });
  for (const tag of tags) {
    if (!tag.trait_id) continue;
    const id = tag.trait_id as TraitId;
    if (!TRAITS.includes(id)) continue;
    const cur = map.get(id)!;
    cur.attempts += 1;
    if (tag.picked && !tag.correct) cur.picked += 1;
    if (tag.correct) cur.correct += 1;
  }
  return TRAITS.map((trait) => {
    const cur = map.get(trait)!;
    return {
      trait,
      attempts: cur.attempts,
      picked_when_wrong: cur.picked,
      correct: cur.correct,
      accuracy: cur.attempts === 0 ? 0 : cur.correct / cur.attempts,
    };
  });
}

export interface ModuleProgressView {
  module: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6';
  total: number;
  completed: number;
  pct: number;
  label: string;
}

const LIVE_LESSON_IDS = INTRO_LR_PATH
  .filter((action) => action.type === 'note' && action.completionId)
  .map((action) => action.completionId!);
const LIVE_DRILL_IDS = INTRO_DRILLS.map((drill) => drill.id);

const MODULE_TOTALS: Record<ModuleProgressView['module'], { lessons?: number; drills?: number; label: string }> = {
  M1: { lessons: LIVE_LESSON_IDS.length, label: 'Lessons' },
  M2: { label: 'Reference' },
  M3: { drills: LIVE_DRILL_IDS.length, label: 'Drills' },
  M4: { label: 'Simulator' },
  M5: { label: 'Hard Sentences' },
  M6: { label: 'Diagnostics' },
};

export function moduleViews(progress: ModuleProgress | null): ModuleProgressView[] {
  return (Object.keys(MODULE_TOTALS) as Array<ModuleProgressView['module']>).map((m) => {
    const meta = MODULE_TOTALS[m];
    const total = (meta.lessons ?? 0) + (meta.drills ?? 0);
    let completed = 0;
    if (progress) {
      if (m === 'M1') completed = progress.completed_lessons.filter((l) => LIVE_LESSON_IDS.includes(l)).length;
      if (m === 'M3') completed = progress.completed_drills.filter((d) => LIVE_DRILL_IDS.includes(d)).length;
    }
    const pct = total === 0 ? 0 : completed / total;
    return { module: m, total, completed, pct, label: meta.label };
  });
}

export interface CalibrationSeed {
  attempted: boolean;
  m1: { attempts: number; correct: number };
  m5: { attempts: number; correct: number };
}

export function calibrationSeed(items: CalibrationAttempt[]): CalibrationSeed {
  const m1 = items.filter((i) => i.calibration_module === 'M1');
  const m5 = items.filter((i) => i.calibration_module === 'M5');
  return {
    attempted: items.length > 0,
    m1: { attempts: m1.length, correct: m1.filter((i) => i.correct).length },
    m5: { attempts: m5.length, correct: m5.filter((i) => i.correct).length },
  };
}

export interface Recommendation {
  id: string;
  kind: 'drill' | 'reference' | 'srs' | 'simulator';
  title: string;
  reason: string;
  href: string;
  priority: number; // 1 = highest
}

export interface SourceSummary {
  source: 'Calibration' | 'Simulator' | 'Drill';
  attempts: number;
  correct: number;
}

export interface RollingAccuracyPoint {
  label: string;
  source: string;
  rollingAccuracy: number;
}

export interface WeakSurface {
  surfaceId: string;
  wrongCount: number;
  dominantTrait: TraitId | null;
}

const drillRoute = (id: string) => {
  const drill = INTRO_DRILLS.find((item) => item.id === id);
  if (!drill) throw new Error(`Unknown Intro to LR drill id: ${id}`);
  return drill.route.replace('/bootcamp/intro-to-lr', '');
};

const TRAIT_TO_REMEDIATION: Record<TraitId, { drill: string; route: string; topic: string }> = {
  T1: { drill: 'MC-DRL-CT', route: drillRoute('MC-DRL-CT'), topic: 'Too-strong / scope-creep' },
  T2: { drill: 'MC-DRL-MCL', route: drillRoute('MC-DRL-MCL'), topic: 'Premise-as-conclusion' },
  T3: { drill: 'MC-DRL-CLS', route: drillRoute('MC-DRL-CLS'), topic: 'Concession-as-conclusion (Trojan horse)' },
  T4: { drill: 'MC-DRL-MCL', route: drillRoute('MC-DRL-MCL'), topic: 'Half-the-claim / dropped specifier' },
  T5: { drill: 'MC-DRL-MCL', route: drillRoute('MC-DRL-MCL'), topic: 'Restated-stimulus / failure to identify load-bearer' },
  T6: { drill: 'MC-DRL-CT', route: drillRoute('MC-DRL-CT'), topic: 'Out-of-scope / generalization' },
  T7: { drill: 'MC-DRL-CLS', route: drillRoute('MC-DRL-CLS'), topic: 'Intermediate vs main' },
};

export function buildRecommendations(
  traits: TraitStats[],
  srsDueCount: number,
  hasAttemptedCalibration: boolean,
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (!hasAttemptedCalibration) {
    recs.push({
      id: 'rec-calibration',
      kind: 'drill',
      title: 'Start the Drill Lab',
      reason: 'Your dashboard needs saved drill or simulator work before it can diagnose patterns.',
      href: '/bootcamp/intro-to-lr/drills',
      priority: 1,
    });
  }

  // Trait-based: surface up to 3 weakest traits with attempts.
  const weak = traits
    .filter((t) => t.attempts >= 2 && t.accuracy < 0.6)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);
  for (const t of weak) {
    const r = TRAIT_TO_REMEDIATION[t.trait];
    recs.push({
      id: `rec-${t.trait}`,
      kind: 'drill',
      title: `Drill ${r.drill.replace('MC-DRL-', '')} - ${r.topic}`,
      reason: `${t.trait} accuracy ${Math.round(t.accuracy * 100)}% across ${t.attempts} attempts. Below the 60% threshold.`,
      href: r.route,
      priority: 2,
    });
  }

  if (srsDueCount > 0) {
    recs.push({
      id: 'rec-srs',
      kind: 'srs',
      title: `Review ${srsDueCount} item${srsDueCount === 1 ? '' : 's'} in your SRS queue`,
      reason: 'Spaced-repetition items are due today.',
      href: '/diagnostics/srs',
      priority: 1,
    });
  }

  return recs.sort((a, b) => a.priority - b.priority);
}

export function strongestTraits(traits: TraitStats[]): TraitStats[] {
  return [...traits]
    .filter((trait) => trait.attempts >= 3 && trait.accuracy >= 0.75)
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts)
    .slice(0, 3);
}

export function weakestTraits(traits: TraitStats[]): TraitStats[] {
  return [...traits]
    .filter((trait) => trait.attempts >= 2)
    .sort((a, b) => a.accuracy - b.accuracy || b.picked_when_wrong - a.picked_when_wrong)
    .slice(0, 3);
}

export function buildSourceSummary(
  calibrationAttempts: CalibrationAttempt[],
  simulatorAttempts: SimulatorAttempt[],
  drillStageGates: DrillStageGate[],
): SourceSummary[] {
  return [
    {
      source: 'Calibration',
      attempts: calibrationAttempts.length,
      correct: calibrationAttempts.filter((attempt) => attempt.correct).length,
    },
    {
      source: 'Simulator',
      attempts: simulatorAttempts.length,
      correct: simulatorAttempts.filter((attempt) => attempt.correct).length,
    },
    {
      source: 'Drill',
      attempts: drillStageGates.reduce((sum, gate) => sum + gate.responses.length, 0),
      correct: drillStageGates.reduce(
        (sum, gate) => sum + gate.responses.filter((response) => response.correct).length,
        0,
      ),
    },
  ];
}

export function buildRollingAccuracySeries(
  calibrationAttempts: CalibrationAttempt[],
  simulatorAttempts: SimulatorAttempt[],
  drillStageGates: DrillStageGate[],
): RollingAccuracyPoint[] {
  const events = [
    ...calibrationAttempts.map((attempt) => ({
      when: attempt.attempted_at,
      source: 'Calibration',
      correctRate: attempt.correct ? 100 : 0,
    })),
    ...simulatorAttempts.map((attempt) => ({
      when: attempt.attempted_at,
      source: 'Simulator',
      correctRate: attempt.correct ? 100 : 0,
    })),
    ...drillStageGates.map((gate) => ({
      when: gate.completed_at,
      source: 'Drill',
      correctRate: Math.round((gate.score / 5) * 100),
    })),
  ]
    .sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime())
    .slice(-12);

  return events.map((event, index) => {
    const window = events.slice(Math.max(0, index - 3), index + 1);
    const average = Math.round(
      window.reduce((sum, item) => sum + item.correctRate, 0) / Math.max(window.length, 1),
    );
    return {
      label: new Date(event.when).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      source: event.source,
      rollingAccuracy: average,
    };
  });
}

export function buildSurfaceWeaknesses(tags: TrapsTag[]): WeakSurface[] {
  const wrongTags = tags.filter((tag) => tag.picked && !tag.correct);
  const bySurface = new Map<string, TrapsTag[]>();

  for (const tag of wrongTags) {
    const current = bySurface.get(tag.surface_id) ?? [];
    current.push(tag);
    bySurface.set(tag.surface_id, current);
  }

  return Array.from(bySurface.entries())
    .map(([surfaceId, surfaceTags]) => {
      const traitCounts = new Map<TraitId, number>();
      for (const tag of surfaceTags) {
        if (!tag.trait_id) continue;
        const trait = tag.trait_id as TraitId;
        traitCounts.set(trait, (traitCounts.get(trait) ?? 0) + 1);
      }
      const dominantTrait = Array.from(traitCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return {
        surfaceId,
        wrongCount: surfaceTags.length,
        dominantTrait,
      };
    })
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .slice(0, 4);
}

export function latestDiagnosticsActivityAt(
  calibrationAttempts: CalibrationAttempt[],
  simulatorAttempts: SimulatorAttempt[],
  drillStageGates: DrillStageGate[],
  rrRecordings: RrRecording[],
  srsItems: SrsQueueItem[],
  progress: ModuleProgress | null,
): string | null {
  const stamps = [
    ...calibrationAttempts.map((attempt) => attempt.attempted_at),
    ...simulatorAttempts.map((attempt) => attempt.attempted_at),
    ...drillStageGates.map((gate) => gate.completed_at),
    ...rrRecordings.map((recording) => recording.created_at),
    ...srsItems.flatMap((item) => [item.last_reviewed_at, item.due_at].filter(Boolean) as string[]),
    progress?.updated_at,
  ].filter(Boolean) as string[];

  if (stamps.length === 0) return null;

  return stamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

// ─── Live Intro to LR Diagnostic Profile model ──────────────────────────────

export interface LivePracticeSetDiagnostic {
  slug: string;
  completionId: string;
  title: string;
  featureLabel: string;
  route: string;
  linkState: unknown;
  state: 'not-started' | 'in-progress' | 'completed';
  answered: number;
  correct: number;
  total: number;
  accuracy: number | null;
  resumeIndex: number;
  questionOutcomes: Array<'unanswered' | 'correct' | 'incorrect'>;
}

export interface LiveDrillLabDiagnostic {
  id: string;
  slug: string;
  title: string;
  skill: string;
  route: string;
  runRoute: string;
  totalQuestions: number;
  state: 'not-started' | 'in-progress' | 'completed';
  attemptsCount: number;
  correctCount: number;
  accuracy: number | null;
  detailLabel: string;
}

export interface LivePathStepItem {
  index: number;
  id: string;
  completionId: string;
  type: PathAction['type'];
  typeLabel: 'Lesson' | 'Drill Lab' | 'Practice Set';
  title: string;
  route: string;
  linkState?: unknown;
  state: 'completed' | 'in-progress' | 'next' | 'upcoming';
  detail: string;
}

export interface LiveHardSentenceItem {
  id: string;
  kind: HardEntry['kind'];
  kindLabel: string;
  title: string;
  route: string;
  completed: boolean;
  isNext: boolean;
}

export interface LiveRecentAttemptItem {
  id: string;
  sourceLabel: string;
  questionLabel: string;
  answerLabel: string;
  correct: boolean;
  createdAt: string;
}

export interface LiveDiagnosticNextMove {
  eyebrow: string;
  title: string;
  reason: string;
  ctaLabel: string;
  href: string;
  linkState?: unknown;
}

export interface LiveIntroDiagnosticProfile {
  corePathCompleted: number;
  corePathTotal: number;
  corePathPct: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  drillsCompleted: number;
  drillsTotal: number;
  practiceSetsCompleted: number;
  practiceSetsTotal: number;
  practiceQuestionsAnswered: number;
  practiceQuestionsCorrect: number;
  practiceQuestionsTotal: number;
  hardSentencesCompleted: number;
  hardSentencesTotal: number;
  hardSentencesPct: number;
  totalScoredReps: number;
  totalCorrectReps: number;
  overallAccuracy: number | null;
  lastActivityAt: string | null;
  nextMove: LiveDiagnosticNextMove;
  practiceSets: LivePracticeSetDiagnostic[];
  drillLabs: LiveDrillLabDiagnostic[];
  pathSteps: LivePathStepItem[];
  hardEntries: LiveHardSentenceItem[];
  rollingSeries: RollingAccuracyPoint[];
  recentAttempts: LiveRecentAttemptItem[];
}

export interface BuildLiveIntroDiagnosticInput {
  progress: ModuleProgress | null;
  practiceStatuses: Record<string, PracticeDrillStatus>;
  introLrAttempts: IntroLrAttemptRow[];
  calibrationAttempts: CalibrationAttempt[];
  fsvrSession: FirstSentenceVsRebuttalSessionRecord | null;
  fsvrViewedAt: string | null;
}

function humanizeQuestionId(rawId: string): string {
  if (!rawId) return 'Question';
  if (/^PT\d+/i.test(rawId)) return rawId;
  const hsMatch = /^MC-HS-D-(\d+)$/i.exec(rawId);
  if (hsMatch) return `Sentence ${Number(hsMatch[1])}`;
  const calMatch = /^MC-CAL-5\.8\.(\d+)$/i.exec(rawId);
  if (calMatch) return `Capstone Q${Number(calMatch[1])}`;
  const numMatch = /(\d+)$/.exec(rawId);
  if (numMatch) return `Q${Number(numMatch[1])}`;
  return rawId;
}

export function buildLiveIntroDiagnosticProfile(
  input: BuildLiveIntroDiagnosticInput,
): LiveIntroDiagnosticProfile {
  const {
    progress,
    practiceStatuses,
    introLrAttempts,
    calibrationAttempts,
    fsvrSession,
    fsvrViewedAt,
  } = input;

  const completedLessons = new Set(progress?.completed_lessons ?? []);
  const completedDrills = new Set(progress?.completed_drills ?? []);
  const completedHardSections = new Set(progress?.completed_hard_sections ?? []);
  const completedCapstones = new Set(progress?.completed_capstones ?? []);

  // 1. Practice Sets (2 official LSAT Main Conclusion sets, 6 questions each)
  const practiceSets: LivePracticeSetDiagnostic[] = MAIN_CONCLUSION_PRACTICE_CARDS.map((card) => {
    const pool = card.pool;
    const status = practiceStatuses[pool.slug];
    const isCompletedInProgress = completedDrills.has(pool.completionId);
    const state: LivePracticeSetDiagnostic['state'] =
      status?.state === 'completed' || isCompletedInProgress
        ? 'completed'
        : status?.state === 'in-progress' || (status?.answered ?? 0) > 0
          ? 'in-progress'
          : 'not-started';
    const answered = status ? status.answered : isCompletedInProgress ? pool.count : 0;
    const correct = status ? status.correct : 0;
    const total = status ? status.total : pool.count;
    const hasRecordedOutcomes = status ? status.questionOutcomes.some((o) => o !== 'unanswered') : false;
    const accuracy = hasRecordedOutcomes && answered > 0 ? Math.round((correct / answered) * 100) : null;

    return {
      slug: pool.slug,
      completionId: pool.completionId,
      title: pool.title,
      featureLabel: card.featureLabel,
      route: `/guided-drills/${pool.slug}?returnTo=${encodeURIComponent('/bootcamp/intro-to-lr/diagnostics')}`,
      linkState: { bootcampOverride: { ...pool, returnTo: '/bootcamp/intro-to-lr/diagnostics' } },
      state,
      answered,
      correct,
      total,
      accuracy,
      resumeIndex: status?.resumeIndex ?? 0,
      questionOutcomes:
        status?.questionOutcomes ?? Array.from({ length: pool.count }, () => 'unanswered' as const),
    };
  });

  // 2. Group `intro_lr_attempts` by lab
  const mclRows = introLrAttempts.filter(
    (r) => classifyIntroLrAttempt(r).key === 'main-conclusion-lab',
  );
  const ctRows = introLrAttempts.filter(
    (r) => classifyIntroLrAttempt(r).key === 'conclusion-type-lab',
  );
  const clusterRows = introLrAttempts.filter(
    (r) => classifyIntroLrAttempt(r).key === 'cluster-drill',
  );
  const m5CapstoneRows = calibrationAttempts.filter((a) => a.calibration_module === 'M5');

  // FSVR Lab stats from lesson_progress session record
  const fsvrCompletedIds = fsvrSession?.completedQuestionIds ?? [];
  const fsvrAttemptEntries = Object.entries(fsvrSession?.attempts ?? {});
  const fsvrCleanCount = fsvrCompletedIds.filter((qId) => {
    const log = fsvrSession?.attempts?.[qId];
    if (!log) return true;
    const wrongSum =
      (log.indicators?.wrong ?? 0) +
      (log.conclusion?.wrong ?? 0) +
      (log.structure?.wrong ?? 0) +
      (log.support?.wrong ?? 0);
    return !log.usedIndicatorReveal && log.solvedClean && wrongSum === 0;
  }).length;
  const fsvrTotalMistakes = fsvrAttemptEntries.reduce((sum, [, log]) => {
    return (
      sum +
      (log.indicators?.wrong ?? 0) +
      (log.conclusion?.wrong ?? 0) +
      (log.structure?.wrong ?? 0) +
      (log.support?.wrong ?? 0)
    );
  }, 0);

  // 3. Drill Labs (3 core labs + 2 Hard Sentences graded surfaces)
  const drillLabs: LiveDrillLabDiagnostic[] = [
    ...INTRO_DRILLS.map((drill): LiveDrillLabDiagnostic => {
      const isMarkedComplete = completedDrills.has(drill.completionId);
      const totalQuestions = drill.questionCount ?? 20;

      if (drill.slug === 'main-conclusion-lab') {
        const attemptsCount = mclRows.length;
        const correctCount = mclRows.filter((r) => r.correct).length;
        const distinct = new Set(mclRows.map((r) => r.question_id)).size;
        const state: LiveDrillLabDiagnostic['state'] = isMarkedComplete
          ? 'completed'
          : attemptsCount > 0
            ? 'in-progress'
            : 'not-started';
        const accuracy = attemptsCount > 0 ? Math.round((correctCount / attemptsCount) * 100) : null;
        const detailLabel =
          attemptsCount > 0
            ? `${correctCount}/${attemptsCount} correct (${distinct}/${totalQuestions} stimuli seen)`
            : isMarkedComplete
              ? 'Completed'
              : `${totalQuestions} stimuli`;
        return {
          id: drill.id,
          slug: drill.slug,
          title: drill.title,
          skill: drill.skill,
          route: drill.route,
          runRoute: drill.runRoute,
          totalQuestions,
          state,
          attemptsCount,
          correctCount,
          accuracy,
          detailLabel,
        };
      }

      if (drill.slug === 'conclusion-type-lab') {
        const attemptsCount = ctRows.length;
        const correctCount = ctRows.filter((r) => r.correct).length;
        const distinct = new Set(ctRows.map((r) => r.question_id)).size;
        const state: LiveDrillLabDiagnostic['state'] = isMarkedComplete
          ? 'completed'
          : attemptsCount > 0
            ? 'in-progress'
            : 'not-started';
        const accuracy = attemptsCount > 0 ? Math.round((correctCount / attemptsCount) * 100) : null;
        const detailLabel =
          attemptsCount > 0
            ? `${correctCount}/${attemptsCount} correct (${distinct}/${totalQuestions} stimuli seen)`
            : isMarkedComplete
              ? 'Completed'
              : `${totalQuestions} stimuli`;
        return {
          id: drill.id,
          slug: drill.slug,
          title: drill.title,
          skill: drill.skill,
          route: drill.route,
          runRoute: drill.runRoute,
          totalQuestions,
          state,
          attemptsCount,
          correctCount,
          accuracy,
          detailLabel,
        };
      }

      // First-Sentence vs Rebuttal Lab
      const completedCount = fsvrCompletedIds.length;
      const hasStartedFsvr = completedCount > 0 || fsvrAttemptEntries.length > 0;
      const state: LiveDrillLabDiagnostic['state'] =
        isMarkedComplete || Boolean(fsvrSession?.completedAt)
          ? 'completed'
          : hasStartedFsvr
            ? 'in-progress'
            : 'not-started';
      const accuracy =
        completedCount > 0 ? Math.round((fsvrCleanCount / completedCount) * 100) : null;
      const detailLabel =
        completedCount > 0
          ? `${completedCount}/${totalQuestions} questions done · ${fsvrCleanCount} clean first-pass${fsvrTotalMistakes > 0 ? ` · ${fsvrTotalMistakes} step retry${fsvrTotalMistakes === 1 ? '' : 's'}` : ''}`
          : isMarkedComplete
            ? 'Completed'
            : `${totalQuestions} guided 4-step arguments`;

      return {
        id: drill.id,
        slug: drill.slug,
        title: drill.title,
        skill: drill.skill,
        route: drill.route,
        runRoute: drill.runRoute,
        totalQuestions,
        state,
        attemptsCount: completedCount,
        correctCount: fsvrCleanCount,
        accuracy,
        detailLabel,
      };
    }),
    // Hard Sentences 5.7 Cluster Drill
    {
      id: 'MC-DRL-HS-CLUSTER',
      slug: 'hard-sentences-cluster-drill',
      title: 'Hard Sentences: Cluster Drill',
      skill: 'Sentence Decomposition',
      route: '/bootcamp/intro-to-lr/hard-sentences/5.7',
      runRoute: '/bootcamp/intro-to-lr/hard-sentences/5.7',
      totalQuestions: 6,
      state: completedDrills.has('MC-DRL-HS-CLUSTER')
        ? 'completed'
        : clusterRows.length > 0
          ? 'in-progress'
          : 'not-started',
      attemptsCount: clusterRows.length,
      correctCount: clusterRows.filter((r) => r.correct).length,
      accuracy:
        clusterRows.length > 0
          ? Math.round((clusterRows.filter((r) => r.correct).length / clusterRows.length) * 100)
          : null,
      detailLabel:
        clusterRows.length > 0
          ? `${clusterRows.filter((r) => r.correct).length}/${clusterRows.length} clean decompositions`
          : completedDrills.has('MC-DRL-HS-CLUSTER')
            ? 'Completed'
            : '6 graded sentences',
    },
    // Hard Sentences 5.8 Capstone
    {
      id: 'M5.8',
      slug: 'hard-sentences-capstone',
      title: 'Hard Sentences: Capstone',
      skill: 'Exam-Style Application',
      route: '/bootcamp/intro-to-lr/hard-sentences/capstone',
      runRoute: '/bootcamp/intro-to-lr/hard-sentences/capstone',
      totalQuestions: 5,
      state: completedCapstones.has('M5.8')
        ? 'completed'
        : m5CapstoneRows.length > 0
          ? 'in-progress'
          : 'not-started',
      attemptsCount: m5CapstoneRows.length,
      correctCount: m5CapstoneRows.filter((r) => r.correct).length,
      accuracy:
        m5CapstoneRows.length > 0
          ? Math.round(
              (m5CapstoneRows.filter((r) => r.correct).length / m5CapstoneRows.length) * 100,
            )
          : null,
      detailLabel:
        m5CapstoneRows.length > 0
          ? `${m5CapstoneRows.filter((r) => r.correct).length}/${m5CapstoneRows.length} correct picks`
          : completedCapstones.has('M5.8')
            ? 'Completed'
            : '5 exam-style questions',
    },
  ];

  // 4. Integrated Path steps (13 steps: 8 lessons, 3 drill labs, 2 practice sets)
  const practiceByCompletionId = new Map(practiceSets.map((p) => [p.completionId, p]));
  const drillLabById = new Map(drillLabs.map((d) => [d.id, d]));

  let foundNextStep = false;
  const pathSteps: LivePathStepItem[] = INTRO_LR_PATH.map((action, idx) => {
    const completionId = action.completionId ?? action.id;
    let isDone = false;
    let isInProgress = false;
    let detail = action.estMinutes ? `${action.estMinutes} min` : 'Core step';

    if (action.type === 'note') {
      isDone = completedLessons.has(completionId);
      detail = isDone ? 'Completed' : `${action.estMinutes ?? 8} min read`;
    } else if (action.type === 'drill') {
      const lab = drillLabById.get(completionId);
      isDone = completedDrills.has(completionId) || lab?.state === 'completed';
      isInProgress = !isDone && lab?.state === 'in-progress';
      detail = lab?.detailLabel ?? (isDone ? 'Completed' : `${action.estMinutes ?? 10} min lab`);
    } else if (action.type === 'practice') {
      const ps = practiceByCompletionId.get(completionId);
      isDone = completedDrills.has(completionId) || ps?.state === 'completed';
      isInProgress = !isDone && ps?.state === 'in-progress';
      if (ps) {
        detail =
          ps.state === 'completed'
            ? ps.accuracy !== null
              ? `${ps.correct}/${ps.total} correct (${ps.accuracy}%)`
              : `${ps.total}/${ps.total} completed`
            : ps.state === 'in-progress'
              ? `${ps.answered}/${ps.total} answered (${ps.correct} correct)`
              : `${ps.total} LSAT questions`;
      }
    }

    let state: LivePathStepItem['state'];
    if (isDone) {
      state = 'completed';
    } else if (!foundNextStep) {
      foundNextStep = true;
      state = isInProgress ? 'in-progress' : 'next';
    } else {
      state = isInProgress ? 'in-progress' : 'upcoming';
    }

    const typeLabel: LivePathStepItem['typeLabel'] =
      action.type === 'note' ? 'Lesson' : action.type === 'drill' ? 'Drill Lab' : 'Practice Set';

    return {
      index: idx + 1,
      id: action.id,
      completionId,
      type: action.type,
      typeLabel,
      title: action.title,
      route: action.route,
      linkState: action.linkState,
      state,
      detail,
    };
  });

  // 5. Hard Sentences entries (8 entries: 5.1..5.7 + capstone)
  const hardSnap = {
    hardSections: Array.from(completedHardSections),
    drills: Array.from(completedDrills),
    capstones: Array.from(completedCapstones),
  };
  const nextHardEntry = firstIncompleteHardEntry(hardSnap);
  const allHardDone = HARD_ENTRIES.every((e) => isHardEntryComplete(e, hardSnap));

  const hardEntries: LiveHardSentenceItem[] = HARD_ENTRIES.map((entry) => {
    const completed = isHardEntryComplete(entry, hardSnap);
    const kindLabel =
      entry.kind === 'note'
        ? 'Lesson'
        : entry.kind === 'lab'
          ? 'Lab'
          : entry.kind === 'drill'
            ? 'Graded Drill'
            : 'Capstone';
    return {
      id: entry.id,
      kind: entry.kind,
      kindLabel,
      title: entry.title,
      route: entry.route,
      completed,
      isNext: !allHardDone && entry.id === nextHardEntry.id,
    };
  });

  // 6. Rollup counts
  const lessonsTotal = pathSteps.filter((s) => s.type === 'note').length;
  const lessonsCompleted = pathSteps.filter((s) => s.type === 'note' && s.state === 'completed').length;

  const drillsTotal = INTRO_DRILLS.length;
  const drillsCompleted = drillLabs
    .slice(0, INTRO_DRILLS.length)
    .filter((d) => d.state === 'completed').length;

  const practiceSetsTotal = practiceSets.length;
  const practiceSetsCompleted = practiceSets.filter((p) => p.state === 'completed').length;

  const corePathTotal = pathSteps.length;
  const corePathCompleted = pathSteps.filter((s) => s.state === 'completed').length;
  const corePathPct = corePathTotal === 0 ? 0 : Math.round((corePathCompleted / corePathTotal) * 100);

  const practiceQuestionsTotal = practiceSets.reduce((sum, p) => sum + p.total, 0);
  const practiceQuestionsAnswered = practiceSets.reduce((sum, p) => sum + p.answered, 0);
  const practiceQuestionsCorrect = practiceSets.reduce((sum, p) => sum + p.correct, 0);

  const hardSentencesTotal = hardEntries.length;
  const hardSentencesCompleted = hardEntries.filter((h) => h.completed).length;
  const hardSentencesPct =
    hardSentencesTotal === 0 ? 0 : Math.round((hardSentencesCompleted / hardSentencesTotal) * 100);

  // Unified scored question attempts:
  // - intro_lr_attempts (Main Conclusion Lab, Conclusion Type Lab, Cluster Drill, etc.)
  // - practiceSets recorded question outcomes (when session outcomes exist)
  // - First-Sentence vs Rebuttal completed questions (clean first-pass vs total completed)
  // - M5 Capstone calibration attempts
  const practiceScoredAnswered = practiceSets.reduce(
    (sum, p) => sum + p.questionOutcomes.filter((o) => o !== 'unanswered').length,
    0,
  );
  const practiceScoredCorrect = practiceSets.reduce(
    (sum, p) => sum + p.questionOutcomes.filter((o) => o === 'correct').length,
    0,
  );

  const totalScoredReps =
    introLrAttempts.length +
    practiceScoredAnswered +
    fsvrCompletedIds.length +
    m5CapstoneRows.length;
  const totalCorrectReps =
    introLrAttempts.filter((r) => r.correct).length +
    practiceScoredCorrect +
    fsvrCleanCount +
    m5CapstoneRows.filter((r) => r.correct).length;
  const overallAccuracy =
    totalScoredReps === 0 ? null : Math.round((totalCorrectReps / totalScoredReps) * 100);

  // 7. Chronological rolling accuracy series across timestamped attempts
  const timedEvents = [
    ...introLrAttempts.map((r) => ({
      when: r.created_at,
      source: classifyIntroLrAttempt(r).label,
      correctRate: r.correct ? 100 : 0,
    })),
    ...m5CapstoneRows.map((a) => ({
      when: a.attempted_at,
      source: 'Hard Sentences: Capstone',
      correctRate: a.correct ? 100 : 0,
    })),
  ]
    .filter((e) => Boolean(e.when))
    .sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime())
    .slice(-14);

  const rollingSeries: RollingAccuracyPoint[] = timedEvents.map((event, index) => {
    const window = timedEvents.slice(Math.max(0, index - 3), index + 1);
    const average = Math.round(
      window.reduce((sum, item) => sum + item.correctRate, 0) / Math.max(window.length, 1),
    );
    return {
      label: new Date(event.when).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      source: event.source,
      rollingAccuracy: average,
    };
  });

  // 8. Recent saved attempts list (top 6 most recent timestamped attempts)
  const recentAttempts: LiveRecentAttemptItem[] = [
    ...introLrAttempts.map((r): LiveRecentAttemptItem => {
      const { label } = classifyIntroLrAttempt(r);
      const decoded = decodeIntroLrSelectedAnswer(r.selected_answer);
      return {
        id: r.id,
        sourceLabel: label,
        questionLabel: humanizeQuestionId(r.question_id),
        answerLabel: decoded ? `Picked ${decoded}` : r.correct ? 'Correct' : 'Missed',
        correct: r.correct,
        createdAt: r.created_at,
      };
    }),
    ...m5CapstoneRows.map((a): LiveRecentAttemptItem => ({
      id: a.id,
      sourceLabel: 'Hard Sentences: Capstone',
      questionLabel: humanizeQuestionId(a.item_id),
      answerLabel: `Picked ${a.picked}`,
      correct: a.correct,
      createdAt: a.attempted_at,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  // 9. Latest activity timestamp
  const candidateStamps = [
    introLrAttempts[0]?.created_at,
    ...m5CapstoneRows.map((a) => a.attempted_at),
    fsvrSession?.completedAt,
    fsvrViewedAt,
    progress?.updated_at,
  ].filter(Boolean) as string[];
  const lastActivityAt =
    candidateStamps.length === 0
      ? null
      : candidateStamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]!;

  // 10. Compute single highest-leverage Next Move
  const inProgressPractice = practiceSets.find((p) => p.state === 'in-progress');
  const nextPathStep = pathSteps.find((s) => s.state === 'in-progress' || s.state === 'next');

  let nextMove: LiveDiagnosticNextMove;
  if (inProgressPractice) {
    nextMove = {
      eyebrow: 'Practice in progress',
      title: inProgressPractice.title,
      reason: `You have answered ${inProgressPractice.answered} of ${inProgressPractice.total} questions (${inProgressPractice.correct} correct). Pick up on Question ${inProgressPractice.resumeIndex + 1} to finish the set.`,
      ctaLabel: `Resume Question ${inProgressPractice.resumeIndex + 1}`,
      href: inProgressPractice.route,
      linkState: inProgressPractice.linkState,
    };
  } else if (nextPathStep) {
    const isStart = corePathCompleted === 0 && totalScoredReps === 0;
    const stepKindVerb =
      nextPathStep.type === 'note'
        ? isStart
          ? 'Start Lesson 1'
          : 'Continue Lesson'
        : nextPathStep.type === 'drill'
          ? nextPathStep.state === 'in-progress'
            ? 'Resume Drill Lab'
            : 'Open Drill Lab'
          : 'Start Practice Set';
    nextMove = {
      eyebrow: isStart
        ? 'Start your path'
        : `Step ${nextPathStep.index} of ${corePathTotal} · ${nextPathStep.typeLabel}`,
      title: nextPathStep.title,
      reason: isStart
        ? 'Begin with the three parts of a Logical Reasoning question, then work through the core lessons and drill labs in order.'
        : `${corePathCompleted} of ${corePathTotal} core path steps cleared. Complete this ${nextPathStep.typeLabel.toLowerCase()} next to keep your sequence moving.`,
      ctaLabel: stepKindVerb,
      href: nextPathStep.route,
      linkState: nextPathStep.linkState,
    };
  } else if (!allHardDone) {
    nextMove = {
      eyebrow: `Hard Sentences · ${nextHardEntry.id}`,
      title: nextHardEntry.title,
      reason: `Core path is complete (${corePathCompleted}/${corePathTotal}). Continue into Hard Sentences to train clause stripping and core-claim isolation.`,
      ctaLabel: `Open ${nextHardEntry.title}`,
      href: nextHardEntry.route,
    };
  } else {
    // Everything completed: check if any drill or practice set has < 80% accuracy
    const weakestLab = [...drillLabs]
      .filter((d) => d.accuracy !== null && d.accuracy < 80)
      .sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))[0];
    if (weakestLab) {
      nextMove = {
        eyebrow: 'Targeted review',
        title: weakestLab.title,
        reason: `You have cleared the full curriculum. Your accuracy on ${weakestLab.title} is ${weakestLab.accuracy}%, making a clean rerun your highest-value rep.`,
        ctaLabel: 'Rerun Drill Lab',
        href: weakestLab.route,
      };
    } else {
      nextMove = {
        eyebrow: 'Curriculum complete',
        title: 'Main Conclusion Practice Sets',
        reason: 'All 13 core path steps and 8 Hard Sentences sections are complete. Revisit the official LSAT practice sets to keep your read sharp.',
        ctaLabel: 'Open Practice Sets',
        href: '/bootcamp/intro-to-lr/practice-drills',
      };
    }
  }

  return {
    corePathCompleted,
    corePathTotal,
    corePathPct,
    lessonsCompleted,
    lessonsTotal,
    drillsCompleted,
    drillsTotal,
    practiceSetsCompleted,
    practiceSetsTotal,
    practiceQuestionsAnswered,
    practiceQuestionsCorrect,
    practiceQuestionsTotal,
    hardSentencesCompleted,
    hardSentencesTotal,
    hardSentencesPct,
    totalScoredReps,
    totalCorrectReps,
    overallAccuracy,
    lastActivityAt,
    nextMove,
    practiceSets,
    drillLabs,
    pathSteps,
    hardEntries,
    rollingSeries,
    recentAttempts,
  };
}
