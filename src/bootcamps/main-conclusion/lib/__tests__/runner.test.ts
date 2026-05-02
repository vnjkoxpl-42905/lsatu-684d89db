import { describe, it, expect } from 'vitest';
import {
  nextTrainingStep,
  buildLessonPath,
  nextDrillStep,
  type LessonRow,
  type ProgressLike,
  type DrillRow,
} from '@/bootcamps/main-conclusion/lib/runner';

const LESSONS: LessonRow[] = Array.from({ length: 13 }, (_, i) => ({
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

  it('teaching lessons (1.1–1.12) done, capstone not attempted → push to calibration', () => {
    // 1.1 through 1.12 complete; capstone (1.13) NOT done.
    const completed_lessons = LESSONS.filter((l) => l.id !== 'MC-LSN-1.13').map((l) => l.id);
    const progress: ProgressLike = { completed_lessons, completed_drills: [] };
    const step = nextTrainingStep(progress, LESSONS);
    expect(step.kind).toBe('capstone');
    expect(step.href).toBe('/bootcamp/intro-to-lr/lessons/1.13');

    // Capstone done, Drill 3.4 not done → unlock-drill branch.
    const withCapstone: ProgressLike = {
      completed_lessons: LESSONS.map((l) => l.id),
      completed_drills: [],
    };
    const step2 = nextTrainingStep(withCapstone, LESSONS);
    expect(step2.kind).toBe('unlock-drill');
    expect(step2.href).toBe('/bootcamp/intro-to-lr/drills/3.4');
  });

  it('mid-teaching with stray capstone attempt does NOT short-circuit to drill', () => {
    // Edge case: capstone marked done but teaching not finished → still continue teaching.
    const progress: ProgressLike = {
      completed_lessons: ['MC-LSN-1.1', 'MC-LSN-1.2', 'MC-LSN-1.13'],
      completed_drills: [],
    };
    const step = nextTrainingStep(progress, LESSONS);
    expect(step.kind).toBe('continue-lesson');
    expect(step.href).toBe('/bootcamp/intro-to-lr/lessons/1.3');
  });

  it('capstone + Drill 3.4 done → simulator-ready', () => {
    const progress: ProgressLike = {
      completed_lessons: LESSONS.map((l) => l.id),
      completed_drills: ['MC-DRL-3.4'],
    };
    const step = nextTrainingStep(progress, LESSONS);
    expect(step.kind).toBe('simulator-ready');
    expect(step.href).toBe('/bootcamp/intro-to-lr/simulator/bank');
    expect(step.secondary?.href).toBe('/bootcamp/intro-to-lr/diagnostics/dashboard');
  });

  it('never leaks internal IDs into student-visible strings', () => {
    const cases: ProgressLike[] = [
      empty,
      { completed_lessons: ['MC-LSN-1.1'], completed_drills: [] },
      { completed_lessons: LESSONS.map((l) => l.id), completed_drills: [] },
      { completed_lessons: LESSONS.map((l) => l.id), completed_drills: ['MC-DRL-3.4'] },
    ];
    for (const p of cases) {
      const s = nextTrainingStep(p, LESSONS);
      const visible = [s.title, s.subtitle, s.cta, s.eyebrow, s.secondary?.label ?? ''].join(' ');
      expect(visible).not.toMatch(/MC-LSN|MC-DRL|MC-DIA|MC-HS|MC-REF|NT-/);
    }
  });
});

const DRILLS: DrillRow[] = [
  { id: 'MC-DRL-3.1', number: '3.1', title: 'Indicator Word ID' },
  { id: 'MC-DRL-3.2', number: '3.2', title: 'X-Ray Drill' },
  { id: 'MC-DRL-3.3', number: '3.3', title: 'First-Sentence Reading' },
  { id: 'MC-DRL-3.4', number: '3.4', title: 'Rebuttal vs First-Sentence', gates_simulator: true },
  { id: 'MC-DRL-3.5', number: '3.5', title: 'Chain Mapping' },
];

describe('nextDrillStep', () => {
  it('points at the gate drill (3.4) when not yet cleared, even if 3.1–3.3 are done', () => {
    const progress: ProgressLike = {
      completed_lessons: [],
      completed_drills: ['MC-DRL-3.1', 'MC-DRL-3.2', 'MC-DRL-3.3'],
    };
    const step = nextDrillStep(progress, DRILLS);
    expect(step.isGate).toBe(true);
    expect(step.href).toBe('/bootcamp/intro-to-lr/drills/3.4');
  });

  it('points at the next non-gate drill when the gate is done', () => {
    const progress: ProgressLike = {
      completed_lessons: [],
      completed_drills: ['MC-DRL-3.1', 'MC-DRL-3.4'],
    };
    const step = nextDrillStep(progress, DRILLS);
    expect(step.isGate).toBe(false);
    expect(step.href).toBe('/bootcamp/intro-to-lr/drills/3.2');
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
    expect(path[12].capstone).toBe(true);
  });

  it('returns 13 dots for the canonical lesson list', () => {
    const path = buildLessonPath(null, LESSONS);
    expect(path).toHaveLength(13);
    expect(path[0].status).toBe('active');
  });
});
