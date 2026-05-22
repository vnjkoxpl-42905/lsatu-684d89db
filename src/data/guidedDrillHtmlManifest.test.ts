import { describe, expect, it } from 'vitest';
import {
  guidedDrillHtmlManifest,
  findGuidedDrillHtmlByDrill,
} from './guidedDrillHtmlManifest';

describe('guidedDrillHtmlManifest', () => {
  it('contains one entry for each approved guided drill HTML file', () => {
    expect(guidedDrillHtmlManifest).toHaveLength(108);
    expect(guidedDrillHtmlManifest[0]).toMatchObject({
      order: 1,
      title: 'First Sentence Conclusions',
      slug: 'first-sentence-conclusions',
      htmlPath: '/guided-drill-html/01_first_sentence_conclusions_drill.html',
      sourceFile: '01_first_sentence_conclusions_drill.html',
      time: '30 min',
      questions: 6,
    });
    expect(guidedDrillHtmlManifest[107]).toMatchObject({
      order: 108,
      title: 'Speedwalking LR Drill Two',
      slug: 'speedwalking-lr-drill-two',
      htmlPath: '/guided-drill-html/108_speedwalking_lr_drill_two.html',
      sourceFile: '108_speedwalking_lr_drill_two.html',
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

    expect(orders.size).toBe(108);
    expect(slugs.size).toBe(108);
    expect(sourceFiles.size).toBe(108);
  });

  it('can resolve live guided drill records by slug, title, or source filename', () => {
    expect(findGuidedDrillHtmlByDrill({ slug: 'first-sentence-conclusions' })?.order).toBe(1);
    expect(findGuidedDrillHtmlByDrill({ title: 'First Sentence Conclusions' })?.order).toBe(1);
    expect(
      findGuidedDrillHtmlByDrill({ source_file: '01_first_sentence_conclusions_drill.html' })?.order,
    ).toBe(1);
  });
});
