import { describe, it, expect } from 'vitest';
import {
  nextTrainingStep,
  buildLessonPath,
  nextDrillStep,
  type LessonRow,
  type ProgressLike,
  type DrillRow,
} from '@/bootcamps/main-conclusion/lib/runner';
import { INTRO_LR_PATH } from '@/bootcamps/main-conclusion/content/introToLrPath';

const LESSONS: LessonRow[] = Array.from({ length: 12 }, (_, i) => ({
  id: `MC-LSN-1.${i + 1}`,
  number: `1.${i + 1}`,
  title: `Lesson ${i + 1}`,
}));

const empty: ProgressLike = { completed_lessons: [], completed_drills: [] };

describe('nextTrainingStep', () => {
  it('fresh student → start at Lesson 1', () => {
    const step = nextTrainingStep(null, LESSONS);
    expect(step.kind).toBe('start');
    expect(step.href).toBe('/bootcamp/intro-to-lr/lessons/notes/three-parts-lr-question');
    expect(step.cta).toMatch(/Begin/i);
    // No internal IDs in any visible string.
    expect(step.title + step.subtitle + step.cta + step.eyebrow).not.toMatch(/MC-|NT-|M1\b/);
  });

  it('mid-lessons (4 done) → continue at Lesson 5', () => {
    const progress: ProgressLike = {
      completed_lessons: ['MC-LSN-1.1', 'MC-LSN-1.2', 'MC-LSN-1.3', 'MC-LSN-1.4'],
      completed_drills: [],
    };
    const step = nextTrainingStep(progress, LESSONS);
    expect(step.kind).toBe('continue-lesson');
    expect(step.href).toBe('/bootcamp/intro-to-lr/lessons/notes/conclusions');
    expect(step.title).toContain('Conclusions');
    // 13 tracked path steps now: 11 lessons/labs + the two final practice sets.
    expect(step.subtitle).toContain('3 of 13');
  });

  it('canonical note lessons done → next integrated drill', () => {
    const progress: ProgressLike = { completed_lessons: LESSONS.map((l) => l.id), completed_drills: [] };
    const step = nextTrainingStep(progress, LESSONS);
    expect(step.kind).toBe('unlock-drill');
    expect(step.href).toBe('/bootcamp/intro-to-lr/drills/conclusion-type-lab');
  });

  it('mid-teaching with stray legacy lesson 13 completion does NOT short-circuit to simulator', () => {
    const progress: ProgressLike = {
      completed_lessons: ['MC-LSN-1.1', 'MC-LSN-1.2', 'MC-LSN-1.13'],
      completed_drills: [],
    };
    const step = nextTrainingStep(progress, LESSONS);
    expect(step.kind).toBe('continue-lesson');
    expect(step.href).toBe('/bootcamp/intro-to-lr/lessons/notes/so-an-argument');
  });

  it('never leaks internal IDs into student-visible strings', () => {
    const cases: ProgressLike[] = [
      empty,
      { completed_lessons: ['MC-LSN-1.1'], completed_drills: [] },
      { completed_lessons: LESSONS.map((l) => l.id), completed_drills: [] },
    ];
    for (const p of cases) {
      const s = nextTrainingStep(p, LESSONS);
      const visible = [s.title, s.subtitle, s.cta, s.eyebrow, s.secondary?.label ?? ''].join(' ');
      expect(visible).not.toMatch(/MC-LSN|MC-DRL|MC-DIA|MC-HS|MC-REF|NT-/);
    }
  });
});

// Regression: the two final practice sets must be required for path completion.
// Before they had no completionId, so nextTrainingStep reported "simulator-ready"
// while the student had never touched final practice.
describe('nextTrainingStep — final practice sets gate completion', () => {
  const tracked = INTRO_LR_PATH.filter((a) => a.completionId);
  const lessonIds = tracked.filter((a) => a.type === 'note').map((a) => a.completionId!);
  const drillIds = tracked
    .filter((a) => a.type === 'drill' || a.type === 'practice')
    .map((a) => a.completionId!);
  const practiceIds = tracked
    .filter((a) => a.type === 'practice')
    .map((a) => a.completionId!);

  it('has two tracked practice sets', () => {
    expect(practiceIds.length).toBe(2);
  });

  it('everything except final practice → NOT simulator-ready', () => {
    const drillsMinusPractice = drillIds.filter((id) => !practiceIds.includes(id));
    const step = nextTrainingStep(
      { completed_lessons: lessonIds, completed_drills: drillsMinusPractice },
      LESSONS,
    );
    expect(step.kind).not.toBe('simulator-ready');
    // The next step should be one of the unfinished practice sets.
    expect(practiceIds.some((id) => step.title.length > 0)).toBe(true);
  });

  it('only one of two practice sets done → still NOT simulator-ready', () => {
    const drillsMinusOne = drillIds.filter((id) => id !== practiceIds[1]);
    const step = nextTrainingStep(
      { completed_lessons: lessonIds, completed_drills: drillsMinusOne },
      LESSONS,
    );
    expect(step.kind).not.toBe('simulator-ready');
  });

  it('all lessons + drills + both practice sets done → simulator-ready', () => {
    const step = nextTrainingStep(
      { completed_lessons: lessonIds, completed_drills: drillIds },
      LESSONS,
    );
    expect(step.kind).toBe('simulator-ready');
  });
});

const DRILLS: DrillRow[] = [
  { id: 'MC-DRL-MCL', number: '1', slug: 'main-conclusion-lab', title: 'Main Conclusion Lab' },
  { id: 'MC-DRL-CLS', number: '2', slug: 'first-sentence-vs-rebuttal-lab', title: 'First Sentence vs Rebuttal' },
];

describe('nextDrillStep', () => {
  it('fresh student (0 drills) → start at the first drill', () => {
    const step = nextDrillStep(empty, DRILLS);
    expect(step.href).toBe('/bootcamp/intro-to-lr/drills/main-conclusion-lab');
    expect(step.isGate).toBe(false);
  });

  it('first drill done → point to second drill', () => {
    const progress: ProgressLike = {
      completed_lessons: [],
      completed_drills: ['MC-DRL-MCL'],
    };
    const step = nextDrillStep(progress, DRILLS);
    expect(step.href).toBe('/bootcamp/intro-to-lr/drills/first-sentence-vs-rebuttal-lab');
    expect(step.isGate).toBe(false);
  });

  it('all drills cleared → simulator', () => {
    const progress: ProgressLike = {
      completed_lessons: [],
      completed_drills: DRILLS.map((d) => d.id),
    };
    const step = nextDrillStep(progress, DRILLS);
    expect(step.href).toBe('/bootcamp/intro-to-lr/simulator/bank');
  });
});

describe('buildLessonPath', () => {
  it('marks first uncompleted as active and prior as done', () => {
    const progress: ProgressLike = {
      completed_lessons: ['MC-LSN-1.1', 'MC-LSN-1.2'],
      completed_drills: [],
    };
    const path = buildLessonPath(progress, LESSONS);
    expect(path[0].status).toBe('done');
    expect(path[1].status).toBe('done');
    expect(path[2].status).toBe('active');
    expect(path[3].status).toBe('upcoming');
    expect(path.every((dot) => !dot.capstone)).toBe(true);
  });

  it('returns 12 dots for the active lesson list', () => {
    const path = buildLessonPath(null, LESSONS);
    expect(path).toHaveLength(12);
    expect(path[0].status).toBe('active');
  });
});
