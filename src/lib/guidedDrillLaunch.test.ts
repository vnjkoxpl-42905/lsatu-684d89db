import { describe, expect, it } from 'vitest';
import { buildGuidedDrillLaunchHtml, splitInstructionColumns } from './guidedDrillLaunch';

/**
 * The launch template feeds every guided drill that has no hand-authored page,
 * and it had no coverage at all. These specs exist so the artifact work — which
 * adds placeholders to a 1,277-line file — cannot quietly break 108 pages.
 *
 * They pin structure and contract, not markup: asserting the whole file would
 * fail on any styling change and teach nobody anything.
 */

const BASE = {
  title: 'Necessary Assumption: First Taste',
  estimatedMinutes: 30,
  questionCount: 6,
};

describe('buildGuidedDrillLaunchHtml — the platform page', () => {
  const html = buildGuidedDrillLaunchHtml({
    ...BASE,
    leftMd: '# The idea\n\nSome briefing prose.\n\n- first point\n- second point',
    rightMd: 'How to read it.',
  });

  it('leaves no placeholder unfilled', () => {
    expect(html).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it('renders the drill identity and its metrics', () => {
    expect(html).toContain('Necessary Assumption: First Taste');
    expect(html).toContain('30 min');
    expect(html).toContain('>6<');
  });

  it('is a complete, self-contained document', () => {
    expect(html.trimStart().startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('</html>');
    expect((html.match(/<style/g) ?? []).length).toBeGreaterThan(0);
  });

  it('reaches for nothing off the machine', () => {
    // One stray font or CDN link turns a self-contained page into a request
    // the student's browser makes to a third party.
    const external = html.match(/(?:src|href)\s*=\s*["'](?:https?:)?\/\//gi) ?? [];
    expect(external).toEqual([]);
  });

  it('keeps the platform START contract', () => {
    // GuidedDrillLaunchFrame listens for this; changing it breaks every drill.
    expect(html).toContain('data-start-drill="true"');
    expect(html).toContain('lsatu:start-guided-drill');
  });

  it('builds a notes drawer with one section per column', () => {
    expect(html).toContain('id="notesDrawer"');
    expect(html).toContain('Briefing');
    expect(html).toContain('How to Read This Set');
    expect((html.match(/class="note-section"/g) ?? []).length).toBe(2);
  });

  it('drives the table of contents off the section titles', () => {
    expect(html).toContain('data-toc-title="Briefing"');
    expect(html).toContain('id="tocIsland"');
  });

  it('renders markdown structure rather than dumping it raw', () => {
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>first point</li>');
    expect(html).toContain('lead-line');
    expect(html).not.toContain('# The idea');
  });

  it('escapes a title that would otherwise close a tag', () => {
    const nasty = buildGuidedDrillLaunchHtml({ ...BASE, title: '</title><script>x()</script>' });
    expect(nasty).not.toContain('<script>x()</script>');
    expect(nasty).toContain('&lt;script&gt;');
  });

  it('drops the drawer and the scroll hint when a drill has no notes', () => {
    const bare = buildGuidedDrillLaunchHtml(BASE);
    expect(bare).not.toContain('id="notesDrawer"');
    expect(bare).not.toContain('Scroll down for notes');
    expect(bare).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it('estimates a time from the count when the drill has no minutes', () => {
    const html = buildGuidedDrillLaunchHtml({ title: 'x', questionCount: 8 });
    expect(html).toContain('~12 min');
  });

  it('shows an em dash rather than a zero when there is nothing to show', () => {
    const html = buildGuidedDrillLaunchHtml({ title: 'x' });
    expect(html).toContain('—');
  });

  it('is deterministic — the same input twice is byte-identical', () => {
    expect(buildGuidedDrillLaunchHtml({ ...BASE, leftMd: 'a' })).toBe(
      buildGuidedDrillLaunchHtml({ ...BASE, leftMd: 'a' }),
    );
  });
});

describe('splitInstructionColumns', () => {
  it('splits on the canonical column markers', () => {
    expect(splitInstructionColumns('### Left Column\nA\n\n### Right Column\nB')).toEqual({
      left: 'A',
      right: 'B',
    });
  });

  it('treats an unmarked body as the left column', () => {
    expect(splitInstructionColumns('just prose')).toEqual({ left: 'just prose', right: null });
  });

  it('handles nothing at all', () => {
    expect(splitInstructionColumns(null)).toEqual({ left: '', right: null });
  });
});
