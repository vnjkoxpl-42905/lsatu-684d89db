import { describe, expect, it } from 'vitest';
import { getSourceWorksheetDrill, sourceWorksheetDrills } from './sourceWorksheetDrills';

describe('reviewed worksheet source bank', () => {
  const items = sourceWorksheetDrills.flatMap((set) => set.items);

  it('includes all seven source sets and all 133 distinct task instances', () => {
    expect(sourceWorksheetDrills.map((set) => set.items.length)).toEqual([15, 13, 15, 10, 25, 20, 35]);
    expect(items).toHaveLength(133);
    expect(new Set(items.map((item) => item.id)).size).toBe(133);
    expect(new Set(items.map((item) => item.sourceId)).size).toBe(133);
    for (const set of sourceWorksheetDrills) {
      expect(set.items.map((item) => item.source.item)).toEqual(Array.from({ length: set.items.length }, (_, index) => index + 1));
    }
  });

  it('retains source text and provenance for every reviewed derivative', () => {
    for (const item of items) {
      expect(item.originalStatement.length).toBeGreaterThan(10);
      expect(item.source.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(item.source.file).toMatch(/\.(pdf|docx)$/);
      expect(item.explanation.length).toBeGreaterThan(30);
      if (item.statement !== item.originalStatement) {
        expect(item.correctionNotes.some((note) => note.startsWith('Reviewed derivative:'))).toBe(true);
      }
    }
  });

  it('preserves complete propositions when reversing and negating', () => {
    for (const item of items) {
      expect(item.diagram).toBe(`${item.sufficient} → ${item.necessary}`);
      expect(item.contrapositive).toBe(`NOT (${item.necessary}) → NOT (${item.sufficient})`);
    }
    const compound = getSourceWorksheetDrill('source-independent')!.items[24];
    expect(compound.contrapositive).toContain('NOT (people both buy less and use less');
  });

  it('keeps repeated intro sources aligned while giving each task its own identity', () => {
    const recognition = getSourceWorksheetDrill('source-intro-identify')!.items;
    const diagrams = getSourceWorksheetDrill('source-intro-diagrams')!.items;
    recognition.forEach((item, index) => {
      expect(diagrams[index].originalStatement).toBe(item.originalStatement);
      expect(diagrams[index].statement).toBe(item.statement);
      expect(diagrams[index].diagram).toBe(item.diagram);
      expect(diagrams[index].id).not.toBe(item.id);
    });
  });

  it('repairs flagged key errors without silently replacing source evidence', () => {
    const independent = getSourceWorksheetDrill('source-independent')!.items;
    expect(independent[19].necessary).not.toBe('Always');
    expect(independent[27].sufficient).toContain('good');
    expect(independent[27].necessary).toContain('pleasure');
    expect(independent[30].originalStatement).toContain('plant soil decreases');
    expect(independent[30].statement).toContain('moisture loss');
    expect(independent[32].indicators).toEqual([{ text: 'anyone', group: 1 }]);
    expect(independent[32].necessary).toContain('after a week');
    const rephrase = getSourceWorksheetDrill('source-rephrase')!.items;
    expect(rephrase[7].sufficient).toContain('can apply');
    expect(rephrase[17].necessary).toContain('currently active');
    expect(getSourceWorksheetDrill('source-intro-identify')!.items[3].necessary).toContain('required');
  });
});
