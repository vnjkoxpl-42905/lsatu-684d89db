import { describe, expect, it } from 'vitest';

import {
  aggregateTraitStats,
  buildRecommendations,
  moduleViews,
  type TraitId,
} from '@/bootcamps/main-conclusion/lib/diagnostics';
import type { ModuleProgress, TrapsTag } from '@/bootcamps/main-conclusion/persistence/records';
import { INTRO_DRILLS } from '@/bootcamps/main-conclusion/modules/drills/introDrills';

const progressBase: ModuleProgress = {
  id: 'progress-1',
  user_id: 'user-1',
  unlocked_modules: ['M1', 'M2', 'M3', 'M5', 'M6'],
  unlocked_routes: [],
  completed_lessons: [],
  completed_drills: [],
  completed_milestones: [],
  completed_hard_sections: [],
  completed_capstones: [],
  updated_at: '2026-07-06T00:00:00.000Z',
};

function traitTag(trait_id: TraitId, correct: boolean): TrapsTag {
  return {
    id: `tag-${trait_id}-${correct ? 'right' : 'wrong'}-${Math.random()}`,
    user_id: 'user-1',
    surface_id: 'MC-SIM-Q1',
    letter: 'A',
    trait_id,
    picked: true,
    correct,
    recorded_at: '2026-07-06T00:00:00.000Z',
  };
}

describe('diagnostics', () => {
  it('counts live lesson and drill completion ids in module progress', () => {
    const views = moduleViews({
      ...progressBase,
      completed_lessons: ['MC-LSN-1.1', 'MC-LSN-1.3', '1.legacy'],
      completed_drills: ['MC-DRL-MCL', 'MC-DRL-CLS', 'MC-DRL-3.4'],
    });

    expect(views.find((view) => view.module === 'M1')).toMatchObject({
      total: 8,
      completed: 2,
    });
    expect(views.find((view) => view.module === 'M3')).toMatchObject({
      total: INTRO_DRILLS.length,
      completed: 2,
    });
  });

  it('builds recommendations only to live Intro drill routes', () => {
    const tags = [
      traitTag('T3', false),
      traitTag('T3', false),
      traitTag('T4', false),
      traitTag('T4', false),
      traitTag('T7', false),
      traitTag('T7', false),
    ];
    const hrefs = buildRecommendations(aggregateTraitStats(tags), 0, true)
      .filter((rec) => rec.kind === 'drill')
      .map((rec) => rec.href);
    const liveRoutes = new Set(INTRO_DRILLS.map((drill) => drill.route.replace('/bootcamp/intro-to-lr', '')));

    expect(hrefs).toHaveLength(3);
    for (const href of hrefs) {
      expect(liveRoutes.has(href)).toBe(true);
    }
  });
});
