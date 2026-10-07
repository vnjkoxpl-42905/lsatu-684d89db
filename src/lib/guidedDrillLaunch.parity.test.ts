import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildGuidedDrillLaunchHtml as appBuild } from './guidedDrillLaunch';
import { buildGuidedDrillLaunchHtml as nodeBuild } from '../../scripts/lib/drill-launch.mjs';

/**
 * The offline artifact generator cannot import guidedDrillLaunch.ts — it reads
 * the template through Vite's `?raw`, which Node cannot resolve — so
 * scripts/lib/drill-launch.mjs is a hand port.
 *
 * A port that drifts is worse than no port: the student's emailed file would
 * quietly stop matching the page they see on the platform. This spec is the
 * thing that stops that, by rendering every real drill through both.
 */

interface SeedDrill {
  slug: string;
  title: string;
  estimated_minutes?: number | null;
  question_count?: number | null;
  instruction_card?: { left_md?: string | null; right_md?: string | null } | null;
}

const seed: SeedDrill[] = JSON.parse(
  fs.readFileSync(path.resolve('data/guided-drills/_seed.json'), 'utf8'),
);

describe('drill-launch.mjs is a faithful port of guidedDrillLaunch.ts', () => {
  it('has real drills to compare', () => {
    expect(seed.length).toBeGreaterThan(100);
  });

  it('agrees byte for byte on every seeded drill', () => {
    const diverged: string[] = [];
    for (const drill of seed) {
      const input = {
        title: drill.title,
        estimatedMinutes: drill.estimated_minutes ?? null,
        questionCount: drill.question_count ?? null,
        leftMd: drill.instruction_card?.left_md ?? null,
        rightMd: drill.instruction_card?.right_md ?? null,
      };
      if (appBuild(input) !== nodeBuild(input)) diverged.push(drill.slug);
    }
    expect(diverged).toEqual([]);
  });

  it('agrees on the artifact-mode arguments too', () => {
    const input = {
      title: 'Parity',
      estimatedMinutes: 30,
      questionCount: 5,
      leftMd: '# Lead\n\nProse.\n\n- a\n- b',
      rightMd: 'Right **bold** and _italic_.',
      questionsHtml: '<section class="questions">x</section>',
      mode: 'artifact' as const,
    };
    expect(appBuild(input)).toBe(nodeBuild(input));
  });

  it('agrees on the edge cases that differ from the happy path', () => {
    for (const input of [
      { title: 'no notes' },
      { title: 'count only', questionCount: 8 },
      { title: '</title><script>x()</script>' },
      { title: 'empty notes', leftMd: '   ', rightMd: '' },
    ]) {
      expect(appBuild(input), input.title).toBe(nodeBuild(input));
    }
  });
});
