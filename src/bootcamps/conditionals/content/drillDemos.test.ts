import { describe, expect, it } from 'vitest';
import { OPENING_COURSE_PATH } from '../openingCoursePath';
import { drillDemos } from './drillDemos';
import { getSourceWorksheetDrill } from './sourceWorksheetDrills';

const stagesFor: Record<string, number> = { identify: 1, roles: 1, forward: 2, rephrase: 3, contrapositive: 6 };

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
