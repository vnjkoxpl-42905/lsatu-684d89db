/**
 * Diagnostics aggregations.
 * Pure functions over persistence records → derived view models for the M6 surfaces.
 */

import type { CalibrationAttempt, TrapsTag, ModuleProgress } from '@/bootcamps/main-conclusion/persistence/records';

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

const MODULE_TOTALS: Record<ModuleProgressView['module'], { lessons?: number; drills?: number; label: string }> = {
  M1: { lessons: 13, label: 'Lessons' },
  M2: { label: 'Reference' },
  M3: { drills: 9, label: 'Drills' },
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
      if (m === 'M1') completed = progress.completed_lessons.filter((l) => l.startsWith('1.')).length;
      if (m === 'M3') completed = progress.completed_drills.filter((d) => d.startsWith('MC-DRL-3.')).length;
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

const TRAIT_TO_REMEDIATION: Record<TraitId, { drill: string; route: string; topic: string }> = {
  T1: { drill: 'MC-DRL-3.5', route: '/drills/3.5', topic: 'Too-strong / scope-creep' },
  T2: { drill: 'MC-DRL-3.2', route: '/drills/3.2', topic: 'Premise-as-conclusion' },
  T3: { drill: 'MC-DRL-3.4', route: '/drills/3.4', topic: 'Concession-as-conclusion (Trojan horse)' },
  T4: { drill: 'MC-DRL-3.7', route: '/drills/3.7', topic: 'Half-the-claim / dropped specifier' },
  T5: { drill: 'MC-DRL-3.3', route: '/drills/3.3', topic: 'Restated-stimulus / failure to identify load-bearer' },
  T6: { drill: 'MC-DRL-3.5', route: '/drills/3.5', topic: 'Out-of-scope / generalization' },
  T7: { drill: 'MC-DRL-3.9', route: '/drills/3.9', topic: 'Intermediate vs main' },
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
      title: 'Take the M1.13 calibration',
      reason: 'Your dashboard shows nothing until the first calibration attempt seeds it.',
      href: '/bootcamp/structure/lessons/1.13',
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
      title: `Drill ${r.drill.replace('MC-DRL-', '')} — ${r.topic}`,
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
