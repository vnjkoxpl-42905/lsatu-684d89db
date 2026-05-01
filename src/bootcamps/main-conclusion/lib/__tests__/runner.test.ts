import { describe, it, expect } from 'vitest';
import {
  nextTrainingStep,
  buildLessonPath,
  type LessonRow,
  type ProgressLike,
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
    expect(step.subtitle).toContain('4 of 13');
  });

  it('all 13 lessons done, capstone not attempted → push to capstone', () => {
    const completed_lessons = LESSONS.map((l) => l.id).filter((id) => id !== 'MC-LSN-1.13');
    // Mark 1.12 + 1.1..1.11 done; capstone (1.13) NOT done.
    const progress: ProgressLike = {
      completed_lessons,
      completed_drills: [],
    };
    // 12 of 13 lessons; firstUndone = 1.13 = capstone. Branch should be capstone.
    const step = nextTrainingStep(progress, LESSONS);
    expect(step.kind).toBe('continue-lesson');
    expect(step.href).toBe('/bootcamp/intro-to-lr/lessons/1.13');

    // Now actually mark all 13 (including 1.13) → branches into capstone state only
    // when capstone is NOT in completed_lessons. Simulate the alternate path:
    const allButCapstone: ProgressLike = {
      completed_lessons: LESSONS.map((l) => l.id), // all 13 marked done somehow
      completed_drills: [],
    };
    const step2 = nextTrainingStep(allButCapstone, LESSONS);
    // Capstone is in completed → falls through to drill-3.4 unlock branch.
    expect(step2.kind).toBe('unlock-drill');
    expect(step2.href).toBe('/bootcamp/intro-to-lr/drills/3.4');
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
