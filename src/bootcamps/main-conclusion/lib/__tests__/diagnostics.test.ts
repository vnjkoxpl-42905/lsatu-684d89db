import { describe, expect, it } from 'vitest';

import {
  aggregateTraitStats,
  buildLiveIntroDiagnosticProfile,
  buildRecommendations,
  moduleViews,
  type TraitId,
} from '@/bootcamps/main-conclusion/lib/diagnostics';
import {
  classifyIntroLrAttempt,
  decodeIntroLrSelectedAnswer,
  summarizeIntroLrAttempts,
} from '@/bootcamps/main-conclusion/hooks/useIntroLrAttempts';
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

  it('classifies and decodes intro_lr_attempts human-readably without raw native_lab_v1 strings', () => {
    expect(
      classifyIntroLrAttempt({
        drill_id: 'native-lab:main-conclusion:123',
        mode: 'native_lab_v1',
      }),
    ).toEqual({
      key: 'main-conclusion-lab',
      label: 'Main Conclusion Lab',
    });

    expect(
      classifyIntroLrAttempt({
        drill_id: 'native-lab:conclusion-type:456',
        mode: 'native_lab_v1',
      }),
    ).toEqual({
      key: 'conclusion-type-lab',
      label: 'Conclusion Type Lab',
    });

    expect(
      decodeIntroLrSelectedAnswer('{"answer":"recommendation","ordinal":1,"run_id":"abc"}'),
    ).toBe('recommendation');

    const summary = summarizeIntroLrAttempts([
      {
        id: '1',
        drill_id: 'native-lab:conclusion-type:run-1',
        question_id: 'ct-1',
        mode: 'native_lab_v1',
        selected_answer: '{"answer":"causal","ordinal":1}',
        correct: true,
        time_ms: null,
        created_at: '2026-10-01T10:00:00.000Z',
      },
      {
        id: '2',
        drill_id: 'MC-DRL-HS-CLUSTER',
        question_id: 'MC-HS-D-01',
        mode: 'cluster_decomposition',
        selected_answer: 'S1',
        correct: false,
        time_ms: 4200,
        created_at: '2026-10-02T10:00:00.000Z',
      },
    ]);

    expect(summary.total).toBe(2);
    expect(summary.correct).toBe(1);
    expect(summary.accuracy).toBe(50);
    expect(summary.byMode.map((m) => m.mode)).toEqual([
      'Conclusion Type Lab',
      'Hard Sentences: Cluster Drill',
    ]);
  });

  it('computes unified live Intro to LR diagnostic profile across path, labs, practice sets, and hard sentences', () => {
    const profile = buildLiveIntroDiagnosticProfile({
      progress: {
        ...progressBase,
        completed_lessons: ['MC-LSN-1.1', 'MC-LSN-1.3'],
        completed_drills: ['MC-DRL-CT'],
        completed_hard_sections: ['5.1', '5.2'],
        completed_capstones: [],
      },
      practiceStatuses: {
        'first-sentence-conclusions': {
          slug: 'first-sentence-conclusions',
          state: 'in-progress',
          answered: 3,
          total: 6,
          correct: 2,
          resumeIndex: 3,
          questionOutcomes: ['correct', 'incorrect', 'correct', 'unanswered', 'unanswered', 'unanswered'],
        },
      },
      introLrAttempts: [
        {
          id: 'a1',
          drill_id: 'native-lab:conclusion-type:r1',
          question_id: 'q1',
          mode: 'native_lab_v1',
          selected_answer: '{"answer":"recommendation"}',
          correct: true,
          time_ms: null,
          created_at: '2026-10-05T12:00:00.000Z',
        },
      ],
      calibrationAttempts: [],
      fsvrSession: {
        questionOrder: [1, 2],
        completedQuestionIds: [1, 2],
        currentQuestionIndex: 1,
        attempts: {
          1: {
            indicators: { wrong: 0 },
            conclusion: { wrong: 0 },
            structure: { wrong: 0 },
            support: { wrong: 0 },
            usedIndicatorReveal: false,
            solvedClean: true,
            completionStatus: 'clean',
          },
          2: {
            indicators: { wrong: 1 },
            conclusion: { wrong: 0 },
            structure: { wrong: 0 },
            support: { wrong: 0 },
            usedIndicatorReveal: false,
            solvedClean: false,
            completionStatus: 'recovered',
          },
        },
        completedAt: null,
      },
      fsvrViewedAt: '2026-10-06T12:00:00.000Z',
    });

    expect(profile.lessonsCompleted).toBe(2);
    expect(profile.lessonsTotal).toBe(8);
    expect(profile.drillsCompleted).toBe(1);
    expect(profile.corePathCompleted).toBe(3);
    expect(profile.corePathTotal).toBe(13);
    expect(profile.hardSentencesCompleted).toBe(2);
    expect(profile.hardSentencesTotal).toBe(8);
    expect(profile.practiceQuestionsAnswered).toBe(3);
    expect(profile.practiceQuestionsCorrect).toBe(2);
    // 1 introLrAttempt (1 correct) + 3 practice outcomes (2 correct) + 2 FSVR completed (1 clean) = 6 total, 4 correct (67%)
    expect(profile.totalScoredReps).toBe(6);
    expect(profile.totalCorrectReps).toBe(4);
    expect(profile.overallAccuracy).toBe(67);
    // In-progress practice set takes priority as the next move
    expect(profile.nextMove.title).toBe('First-Sentence Main Conclusion');
    expect(profile.nextMove.ctaLabel).toBe('Resume Question 4');
  });
});
