import { describe, expect, it } from 'vitest';
import { OPENING_COURSE_PATH } from '../openingCoursePath';
import { demoAction, drillDemos } from './drillDemos';
import { getSourceWorksheetDrill } from './sourceWorksheetDrills';

const stagesFor: Record<string, number> = { identify: 2, roles: 2, forward: 3, rephrase: 3, contrapositive: 7 };

describe('drill instruction walkthroughs', () => {
  const drills = OPENING_COURSE_PATH.filter(step => step.type === 'drill');

  it('gives every drill on the path its own walkthrough with a distinct example', () => {
    for (const drill of drills) expect(drillDemos[drill.id], drill.id).toBeDefined();
    const examples = drills.map(drill => drillDemos[drill.id].sentence).filter(Boolean);
    expect(new Set(examples).size).toBe(examples.length);
  });

  it('matches each worksheet drill step for step, without using one of its own sentences', () => {
    for (const drill of drills) {
      const set = getSourceWorksheetDrill(drill.id);
      if (!set) continue;
      const demo = drillDemos[drill.id];
      expect(demo.steps, drill.id).toHaveLength(stagesFor[set.taskKind]);
      expect(set.items.map(item => item.statement), drill.id).not.toContain(demo.sentence);
    }
  });
});

describe('walkthrough wording', () => {
  const demos = Object.entries(drillDemos);

  it('never reuses an example sentence across drills, or a rule from any worksheet drill', () => {
    const sentences = demos.map(([, demo]) => demo.sentence).filter(Boolean);
    expect(new Set(sentences).size).toBe(sentences.length);
    const ruleSets = ['source-intro-identify', 'source-intro-diagrams', 'source-roles', 'source-rephrase', 'source-full-translation', 'source-independent'];
    const rules = ruleSets.flatMap(id => getSourceWorksheetDrill(id)!.items.map(item => item.statement));
    for (const sentence of sentences) expect(rules).not.toContain(sentence);
  });

  it('keeps may and required to in every readback of a rule that has them', () => {
    for (const [id, demo] of demos) {
      if (!demo.sentence) continue;
      const lines = demo.steps.flatMap(step => step.frame.kind === 'type' ? step.frame.lines.map(line => line.text) : []).filter(text => text.startsWith('If '));
      if (/\bmay\b/.test(demo.sentence)) for (const line of lines) expect(line, id).toMatch(/\bmay\b/);
      if (/\bmust\b/.test(demo.sentence)) for (const line of lines) expect(line, id).toMatch(/required to/);
    }
  });

  it('names every step as something the student clicks to see, with no retired words', () => {
    for (const [id, demo] of demos) for (const step of demo.steps) {
      expect(demoAction(step), id).toMatch(/^[a-z]/);
      expect(`${step.title} ${step.caption}`, id).not.toMatch(/\b(?:revers\w*|trigger|raffle|coffee|door)\b|[–—]/i);
    }
  });
});

it('highlights valid tokens and separates adjacent conditions', () => {
  for (const demo of Object.values(drillDemos)) for (const step of demo.steps) {
    if (step.frame.kind !== 'pick') continue;
    const frame = step.frame;
    expect(frame.picks.every(index => index >= 0 && index < frame.words.length)).toBe(true);
    if (step.title === 'Highlight both conditions') {
      expect(frame.spans).toHaveLength(2);
      for (const [from, to] of frame.spans!) expect(from >= 0 && to < frame.words.length && from <= to).toBe(true);
      expect(frame.spans![0][1]).toBeLessThan(frame.spans![1][0]);
    }
  }
});
