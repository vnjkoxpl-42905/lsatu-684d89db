import { describe, it, expect } from 'vitest';
import {
  PHASED_LESSONS,
  getPhasedLesson,
  type Phase,
} from '@/bootcamps/main-conclusion/content/lessons-phased.source';

describe('phased lessons', () => {
  it('lesson 1.1 is registered', () => {
    const l = getPhasedLesson('1.1');
    expect(l).not.toBeNull();
    expect(l?.title).toMatch(/argument/i);
  });

  it('every phased lesson has the canonical phase order', () => {
    const order: Phase['kind'][] = [
      'briefing',
      'demo',
      'attempt',
      'reveal',
      'coach',
      'checkpoint',
    ];
    for (const lesson of Object.values(PHASED_LESSONS)) {
      const kinds = lesson.phases.map((p) => p.kind);
      expect(kinds).toEqual(order);
    }
  });

  it('every attempt phase has rationale for every segment', () => {
    for (const lesson of Object.values(PHASED_LESSONS)) {
      const attempt = lesson.phases.find((p): p is Extract<Phase, { kind: 'attempt' }> => p.kind === 'attempt');
      expect(attempt).toBeDefined();
      if (!attempt) continue;
      for (const seg of attempt.task.segments) {
        expect(attempt.task.rationale[seg.id]).toBeTruthy();
        expect(attempt.task.allowedRoles).toContain(seg.correct);
      }
    }
  });

  it('checkpoint has exactly one correct option', () => {
    for (const lesson of Object.values(PHASED_LESSONS)) {
      const cp = lesson.phases.find((p): p is Extract<Phase, { kind: 'checkpoint' }> => p.kind === 'checkpoint');
      expect(cp).toBeDefined();
      const correctCount = cp!.options.filter((o) => o.correct).length;
      expect(correctCount).toBe(1);
    }
  });

  it('student-facing copy contains no internal IDs', () => {
    const idPattern = /MC-LSN|MC-DRL|MC-DIA|MC-HS|MC-REF|NT-/;
    for (const lesson of Object.values(PHASED_LESSONS)) {
      const visible: string[] = [lesson.studentEyebrow, lesson.title, lesson.hook];
      for (const p of lesson.phases) {
        if (p.kind === 'briefing') visible.push(p.goal, p.body, p.primer ?? '');
        if (p.kind === 'demo') {
          visible.push(p.title, p.body);
          for (const s of p.exampleSegments ?? []) visible.push(s.text, s.whisper ?? '');
        }
        if (p.kind === 'attempt') {
          visible.push(p.title, p.prompt);
          for (const s of p.task.segments) visible.push(s.text);
          for (const r of Object.values(p.task.rationale)) visible.push(r);
        }
        if (p.kind === 'reveal') visible.push(p.title, p.body);
        if (p.kind === 'coach') {
          visible.push(p.title, p.structure_map, p.core_move, p.why_it_matters);
        }
        if (p.kind === 'checkpoint') {
          visible.push(p.prompt);
          for (const o of p.options) visible.push(o.text, o.reveal);
        }
      }
      for (const v of visible) expect(v).not.toMatch(idPattern);
    }
  });
});
