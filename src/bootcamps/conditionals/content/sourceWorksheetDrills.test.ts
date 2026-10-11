import { describe, expect, it } from 'vitest';
import { checkIndicatorSelection, getSourceWorksheetDrill, sourceWorksheetDrills } from './sourceWorksheetDrills';

describe('reviewed worksheet source bank', () => {
  const items = sourceWorksheetDrills.flatMap((set) => set.items);

  it('includes all six source sets and all 133 distinct task instances', () => {
    // The indicator set (13 sentences) is folded into the intro identification set, keeping its item ids.
    expect(sourceWorksheetDrills.map((set) => set.items.length)).toEqual([28, 15, 10, 25, 20, 35]);
    expect(items).toHaveLength(133);
    expect(new Set(items.map((item) => item.id)).size).toBe(133);
    expect(new Set(items.map((item) => item.sourceId)).size).toBe(133);
    for (const set of sourceWorksheetDrills) {
      const parts = [...new Set(set.items.map((item) => `${item.source.file}|${item.source.part}`))];
      for (const part of parts) {
        const numbers = set.items.filter((item) => `${item.source.file}|${item.source.part}` === part).map((item) => item.source.item);
        expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, index) => index + 1));
      }
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

  it('keeps complete propositions when reversing and negating', () => {
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
    diagrams.forEach((item, index) => {
      expect(recognition[index].originalStatement).toBe(item.originalStatement);
      expect(recognition[index].statement).toBe(item.statement);
      expect(recognition[index].diagram).toBe(item.diagram);
      expect(recognition[index].id).not.toBe(item.id);
    });
  });

  it('repairs flagged key errors without silently replacing source evidence', () => {
    const independent = getSourceWorksheetDrill('source-independent')!.items;
    expect(independent[19].necessary).not.toBe('Always');
    expect(independent[27].sufficient).toContain('good');
    expect(independent[27].necessary).toContain('pleasure');
    expect(independent[30].originalStatement).toContain('plant soil decreases');
    expect(independent[30].statement).toContain('holds water longer');
    expect(independent[32].indicators).toEqual([{ text: 'anyone', group: 1 }]);
    expect(independent[32].necessary).toContain('after a week');
    const rephrase = getSourceWorksheetDrill('source-rephrase')!.items;
    expect(rephrase[7].sufficient).toContain('can apply');
    expect(rephrase[17].necessary).toContain('currently active');
    expect(getSourceWorksheetDrill('source-intro-identify')!.items[3].necessary).toContain('required');
  });

  it('keeps modal claims and corrects reviewed indicator classifications', () => {
    for (const id of ['source-intro-identify', 'source-intro-diagrams']) {
      expect(getSourceWorksheetDrill(id)!.items[8].necessary).toBe('the building should be evacuated immediately');
    }
    const rephrase = getSourceWorksheetDrill('source-rephrase')!.items;
    expect(rephrase[3].indicators).toEqual([{ text: 'The only', group: 1 }]);
    // "Every" does not mark the sufficient side here (legally binding does), so only "must" is keyed.
    expect(rephrase[10].indicators).toEqual([{ text: 'must', group: 2 }]);
    expect(rephrase[10].sufficient).toBe('an agreement is legally binding');
    expect(rephrase[6].necessary).toBe('that project involves effective teamwork');
    expect(rephrase[19].necessary).toContain('is required to be recalibrated under the maintenance policy');
    expect(rephrase[19].contrapositiveWords).toContain('is not required to be recalibrated');
    expect(rephrase[19].statement).not.toBe(rephrase[19].originalStatement);
    expect(getSourceWorksheetDrill('source-full-translation')!.items[8].necessary).toBe('system maintenance is performed');
  });

  it('reads simple and negative contrapositives naturally without losing scope', () => {
    const full = getSourceWorksheetDrill('source-full-translation')!.items;
    expect(full[0].contrapositiveWords).toBe('If that intern is not offered a full-time position, then that person is not an intern who completes the program.');
    expect(full[12].contrapositiveWords).toBe('If alarms deactivate on their own, then the emergency protocol initiates within one minute.');
    expect(full[15].contrapositiveWords).toContain('not verified by both authorities');
    const independent = getSourceWorksheetDrill('source-independent')!.items;
    expect(independent[20].contrapositiveWords).toBe('If Rufus is around, then food is not in the fridge.');
    expect(independent[22].contrapositiveWords).toBe('If I can see Arun, then Arun is not in the next room.');
    expect(independent[24].contrapositiveWords).toContain('do not both buy less and use less');
    expect(independent[19].statement).not.toContain('every moment');
  });

  it('binds both sides of each contrapositive to the same case', () => {
    const location = getSourceWorksheetDrill('source-intro-identify')!.items.find((item) => item.id === 'source-indicators-12')!;
    expect(location.contrapositiveWords).toBe('If pathways do not lead to that location, then the park is not accessible at that location.');
    const independent = getSourceWorksheetDrill('source-independent')!.items;
    expect(independent[25].contrapositiveWords).toBe('If a place does not have a good legal system, then that place does not have independent judges.');
    expect(independent[27].contrapositiveWords).toBe('If it is not pleasure, then it is not good under the stated theory.');
  });

  it('restores later contrapositive operations without duplicating canonical source items', () => {
    for (const sourceId of ['source-intro-diagrams', 'source-rephrase']) {
      const source = getSourceWorksheetDrill(sourceId)!;
      const revisit = getSourceWorksheetDrill(`${sourceId}-contrapositive`)!;
      expect(revisit.id).toBe(`${sourceId}-contrapositive`);
      expect(revisit.taskKind).toBe('contrapositive');
      expect(revisit.stage).toBe('After contraposition');
      expect(revisit.items).toBe(source.items);
      expect(revisit.items.map((item) => item.sourceId)).toEqual(source.items.map((item) => item.sourceId));
      expect(source.taskKind).not.toBe('contrapositive');
    }
    expect(sourceWorksheetDrills).toHaveLength(6);
    expect(getSourceWorksheetDrill('source-indicators')).toBeUndefined();
    expect(sourceWorksheetDrills.flatMap((set) => set.items)).toHaveLength(133);
    expect(getSourceWorksheetDrill('unknown')).toBeUndefined();
  });
});

describe('indicator check', () => {
  const find = (setId: string, id: string) => getSourceWorksheetDrill(setId)!.items.find((item) => item.id === id)!;
  const check = (item: Parameters<typeof checkIndicatorSelection>[0], ...selections: [string, string][]) =>
    checkIndicatorSelection(item, selections.map(([text, group]) => ({ text, group })));

  it('accepts who, or a group plus who, where who introduces the condition', () => {
    const members = find('source-intro-identify', 'source-intro-identify-08');
    expect(check(members, ['who', '1']).correct).toBe(true);
    expect(check(members, ['Members who', '1']).correct).toBe(true);
    const applicant = find('source-intro-identify', 'source-intro-identify-13');
    expect(check(applicant, ['Every', '1']).correct).toBe(true);
    expect(check(applicant, ['Every', '1'], ['who', '1']).correct).toBe(true);
    expect(check(applicant, ['Every', '1'], ['applicant who', '1']).correct).toBe(true);
    expect(check(applicant, ['Every applicant who', '1']).correct).toBe(true);
    expect(check(applicant, ['who', '1']).correct).toBe(false);
    const student = find('source-intro-identify', 'source-intro-identify-05');
    expect(check(student, ['any', '1'], ['who', '1']).correct).toBe(true);
    expect(check(student, ['any', '1'], ['who', '2']).correct).toBe(false);
  });

  it('accepts the taught head word of a multi-word indicator', () => {
    const rebate = find('source-rephrase', 'source-rephrase-03');
    expect(check(rebate, ['Only', '2']).correct).toBe(true);
    expect(check(rebate, ['Only those', '2']).correct).toBe(true);
    expect(check(rebate, ['Only those who', '2']).correct).toBe(true);
    const training = find('source-intro-identify', 'source-indicators-01');
    expect(check(training, ['Only', '2']).correct).toBe(false);
    expect(check(training, ['Only if', '2']).correct).toBe(true);
    const q = find('source-independent', 'source-independent-02');
    expect(check(q, ['every', '1']).correct).toBe(true);
    expect(check(q, ['Each and every', '1']).correct).toBe(true);
    const errors = find('source-intro-identify', 'source-indicators-11');
    expect(check(errors, ['must always', '2']).correct).toBe(true);
  });

  it('gives a hint about the chosen words without naming the answer', () => {
    const training = find('source-intro-identify', 'source-indicators-01');
    expect(check(training, ['Only', '2']).hint).toBe('“Only” is only part of an indicator. Select every word of the phrase.');
    expect(check(training, ['Only if', '1']).hint).toMatch(/^Check the group for “Only if”/);
    expect(check(training, ['employees', '1']).hint).toBe('“employees” is not an indicator in this rule.');
    const errors = find('source-intro-identify', 'source-indicators-11');
    expect(check(errors, ['must', '2']).hint).toBe('One indicator is still unselected. Read the whole rule again.');
  });
});
