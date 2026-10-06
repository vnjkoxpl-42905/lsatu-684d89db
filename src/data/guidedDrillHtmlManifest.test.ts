import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  guidedDrillHtmlManifest,
  findGuidedDrillHtmlByDrill,
} from './guidedDrillHtmlManifest';
import { MAIN_CONCLUSION_PRACTICE_POOLS } from '@/bootcamps/main-conclusion/data/practiceDrillPools';

describe('guidedDrillHtmlManifest', () => {
  it('contains one entry for each approved guided drill HTML file', () => {
    expect(guidedDrillHtmlManifest).toHaveLength(109);
    expect(guidedDrillHtmlManifest[0]).toMatchObject({
      order: 1,
      title: 'First Sentence Conclusions',
      slug: 'first-sentence-conclusions',
      htmlPath: '/guided-drill-html/01_first_sentence_conclusions_drill.html',
      sourceFile: '01_first_sentence_conclusions_drill.html',
      time: '30 min',
      questions: 6,
    });
    expect(guidedDrillHtmlManifest[108]).toMatchObject({
      order: 109,
      slug: 'missing-links-sufficient-assumption-mastery',
      mode: 'interactive',
    });
  });

  it('keeps stable order, slugs, source filenames, and public html paths', () => {
    const orders = new Set<number>();
    const slugs = new Set<string>();
    const sourceFiles = new Set<string>();

    for (const entry of guidedDrillHtmlManifest) {
      orders.add(entry.order);
      slugs.add(entry.slug);
      sourceFiles.add(entry.sourceFile);
      expect(entry.htmlPath).toBe(`/guided-drill-html/${entry.sourceFile}`);
      expect(entry.sourceFile).toMatch(
        new RegExp(`^${String(entry.order).padStart(entry.order >= 100 ? 3 : 2, '0')}_.*\\.html$`),
      );
    }

    expect(orders.size).toBe(109);
    expect(slugs.size).toBe(109);
    expect(sourceFiles.size).toBe(109);
  });

  it('can resolve live guided drill records by slug, title, or source filename', () => {
    expect(findGuidedDrillHtmlByDrill({ slug: 'first-sentence-conclusions' })?.order).toBe(1);
    expect(findGuidedDrillHtmlByDrill({ title: 'First Sentence Conclusions' })?.order).toBe(1);
    expect(
      findGuidedDrillHtmlByDrill({ source_file: '01_first_sentence_conclusions_drill.html' })?.order,
    ).toBe(1);
  });

  it('keeps the rebuttal conclusions launch page aligned with the practice pool count', () => {
    const pool = MAIN_CONCLUSION_PRACTICE_POOLS['rebuttal-conclusions'];
    const manifestEntry = findGuidedDrillHtmlByDrill({ slug: pool.slug });

    expect(manifestEntry?.questions).toBe(pool.count);

    const html = readFileSync(
      path.join(process.cwd(), 'public', 'guided-drill-html', '29_rebuttal_conclusions_drill.html'),
      'utf8',
    );

    expect(html).toContain('<div class="summary-metric-value">6</div>');
    expect(html).toContain('Try these six <strong>Main Conclusion</strong> questions');
    expect(html).not.toContain('Try these four <strong>Main Conclusion</strong> questions');
  });
});
