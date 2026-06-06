import { describe, it, expect } from 'vitest';
import {
  nextTrainingStep,
  buildLessonPath,
  nextDrillStep,
  type LessonRow,
  type ProgressLike,
  type DrillRow,
} from '@/bootcamps/main-conclusion/lib/runner';

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
    expect(step.href).toBe('/bootcamp/intro-to-lr/lessons/1.1');
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
    expect(step.href).toBe('/bootcamp/intro-to-lr/lessons/1.5');
    expect(step.title).toContain('Lesson 5');
    expect(step.subtitle).toContain('4 of 12');
  });

  it('teaching lessons done → simulator-ready (no gate drill required)', () => {
    const progress: ProgressLike = { completed_lessons: LESSONS.map((l) => l.id), completed_drills: [] };
    const step = nextTrainingStep(progress, LESSONS);
    expect(step.kind).toBe('simulator-ready');
    expect(step.href).toBe('/bootcamp/intro-to-lr/simulator/bank');
  });

  it('mid-teaching with stray legacy lesson 13 completion does NOT short-circuit to simulator', () => {
    const progress: ProgressLike = {
      completed_lessons: ['MC-LSN-1.1', 'MC-LSN-1.2', 'MC-LSN-1.13'],
      completed_drills: [],
    };
    const step = nextTrainingStep(progress, LESSONS);
    expect(step.kind).toBe('continue-lesson');
    expect(step.href).toBe('/bootcamp/intro-to-lr/lessons/1.3');
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
