import { describe, expect, it } from 'vitest';
import { andOrDrills, andOrQuizzes, negationExamples, placementExamples } from './andOrItems';
import {
  allAssignments, atomIdsOf, contrapositive, converse, inverse, literalText, negateSide, ruleHolds, ruleMistakes, rulesEquivalent, ruleSentence, settle, sideMistakes,
  sidesEquivalent, sidesOpposite, sideText, sideValue,
} from './andOrLogic';
import { allRules, blankBuilder, checkBuild, choiceStep, itemAtomIds, settleAnswer, statusAnswer, type AndOrItem } from './andOrTasks';
import { OPENING_COURSE_PATH } from '../openingCoursePath';

const everyItem: AndOrItem[] = [...andOrDrills.flatMap(set => set.items), ...Object.values(andOrQuizzes).flat(), ...placementExamples.map(entry => entry.item), ...negationExamples.map(entry => entry.item)];

describe('And/Or logic', () => {
  it('derives every contrapositive from the real item data and matches the original on all eight assignments', () => {
    const triples = everyItem.filter(item => atomIdsOf([item.rule]).length === 3);
    expect(triples.length).toBeGreaterThan(8);
    for (const item of everyItem) {
      const ids = atomIdsOf([item.rule]);
      for (const assignment of allAssignments(ids)) expect(ruleHolds(contrapositive(item.rule), assignment), item.id).toBe(ruleHolds(item.rule, assignment));
    }
  });

  it('covers all four placements, each with the contrapositive the lesson teaches', () => {
    const [bothTrigger, eitherTrigger, bothRequired, oneRequired] = placementExamples.map(entry => entry.item);
    const text = (item: AndOrItem) => ruleSentence(item.atoms, contrapositive(item.rule));
    expect(text(bothTrigger)).toBe('If the team is not in the regional round, then the team does not submit a project or the team does not pass inspection.');
    expect(text(eitherTrigger)).toBe('If the team is not in the regional round, then the team does not win its local round and the team gets no judge’s invitation.');
    expect(text(bothRequired)).toBe('If the team has no signed safety form or the team has no registered coach, then the team is not in the regional round.');
    expect(text(oneRequired)).toBe('If the team has no laptop and the team has no tablet, then the team is not in the regional round.');
  });

  it('distinguishes not both from neither, and keeps OR inclusive', () => {
    const and = { op: 'and' as const, members: [{ atom: 'a' }, { atom: 'b' }] };
    const or = { op: 'or' as const, members: and.members };
    const neither = { op: 'and' as const, members: [{ atom: 'a', negated: true }, { atom: 'b', negated: true }] };
    expect(sidesOpposite(and, negateSide(and))).toBe(true);
    expect(sidesOpposite(or, negateSide(or))).toBe(true);
    expect(sidesEquivalent(negateSide(and), neither)).toBe(false);
    expect(sideValue(or, { a: true, b: true })).toBe(true);
    expect(sideValue(and, { a: true, b: false })).toBe(false);
    expect(sideValue(negateSide(and), { a: true, b: false })).toBe(true);
    expect(sideValue(neither, { a: true, b: false })).toBe(false);
  });

  it('cancels a negation that is already on a member', () => {
    const pool = negationExamples[1].item;
    expect(sideText(pool.atoms, contrapositive(pool.rule).sufficient)).toBe('the lifeguard is not on duty and the pool is crowded');
    const parcel = andOrDrills[2].items[2];
    expect(sideText(parcel.atoms, negateSide(parcel.rule.sufficient))).toBe('the label is not printed or the address is missing');
  });

  it('does not accept the converse, inverse, or other look-alikes as the original or its contrapositive', () => {
    for (const item of everyItem) {
      const ids = atomIdsOf([item.rule]);
      // A connector-only mistake is a genuine contrapositive error whenever a side has two or more members.
      const compound = [item.rule.sufficient, item.rule.necessary].some(side => side.members.length > 1);
      const keeps = ruleMistakes(item.rule).find(mistake => mistake.kind === 'keeps-connector')!;
      if (compound) expect(rulesEquivalent(keeps.rule, item.rule, ids), item.id).toBe(false);
    }
    const float = negationExamples[0].item.rule;
    expect(rulesEquivalent(converse(float), float)).toBe(false);
    expect(rulesEquivalent(inverse(float), float)).toBe(false);
    expect(rulesEquivalent(contrapositive(float), float)).toBe(true);
  });

  it('does not let a split AND trigger or a chosen OR branch add a guarantee', () => {
    const [project] = placementExamples.map(entry => entry.item);
    expect(settle([project.rule], { project: true }, { atom: 'regional' }, atomIdsOf([project.rule]))).toBe('open');
    const devices = placementExamples[3].item;
    expect(settle([devices.rule], { regional: true }, { atom: 'tablet' }, atomIdsOf([devices.rule]))).toBe('open');
    expect(settle([devices.rule], { regional: true, laptop: false }, { atom: 'tablet' }, atomIdsOf([devices.rule]))).toBe('must');
  });

  it('keeps the other conjunct needed when another rule reaches only one conjunct', () => {
    const trip = andOrDrills[1].items[5];
    expect(allRules(trip)).toHaveLength(2);
    expect(settleAnswer(trip)).toBe('open');
    const ids = itemAtomIds(trip);
    expect(settle(allRules(trip), { waiver: true, deposit: true }, { atom: 'booked' }, ids)).toBe('must');
    expect(() => settle(allRules(trip), { waiver: true, form: false }, { atom: 'booked' }, ids)).toThrow();
  });
});

describe('Chapter 2 authored items', () => {
  it('has typed items with full canonical labels and unique ids', () => {
    expect(new Set(everyItem.map(item => item.id)).size).toBe(everyItem.length);
    for (const item of everyItem) {
      for (const rule of allRules(item)) for (const side of [rule.sufficient, rule.necessary]) for (const member of side.members) {
        const label = literalText(item.atoms, member);
        expect(label.length, `${item.id}: ${member.atom}`).toBeGreaterThan(8);
        expect(label, item.id).not.toMatch(/^[A-Z]$/);
      }
      expect(item.atoms.length).toBe(itemAtomIds(item).length);
    }
  });

  it('keeps each practice set to a transfer-sized, unpadded run and requires an explanation on graded items', () => {
    for (const set of andOrDrills) {
      expect(set.items.length, set.id).toBeGreaterThanOrEqual(6);
      expect(set.items.length, set.id).toBeLessThanOrEqual(8);
      for (const item of set.items) expect(item.why.length, item.id).toBeGreaterThan(30);
    }
    for (const quiz of Object.values(andOrQuizzes)) expect(quiz).toHaveLength(4);
  });

  it('never reuses a worked example in practice or the Pop Quizzes', () => {
    const worked = [...placementExamples.map(entry => entry.item), ...negationExamples.map(entry => entry.item)];
    const graded = [...andOrDrills.flatMap(set => set.items), ...Object.values(andOrQuizzes).flat()];
    for (const example of worked) for (const item of graded) {
      expect(item.statement, item.id).not.toBe(example.statement);
      expect(item.atoms.map(atom => atom.short), item.id).not.toEqual(expect.arrayContaining(example.atoms.map(atom => atom.short)));
    }
  });

  it('derives exactly one correct choice per choice item, and every wrong choice is logically wrong', () => {
    for (const item of [...andOrDrills.flatMap(set => set.items), ...Object.values(andOrQuizzes).flat()]) {
      const step = choiceStep(item);
      if (!step) { expect(item.task.kind).toBe('build'); continue; }
      expect(step.options.filter(option => option.correct), item.id).toHaveLength(1);
      expect(step.options.length, item.id).toBeGreaterThanOrEqual(3);
      expect(new Set(step.options.map(option => option.text)).size, item.id).toBe(step.options.length);
      for (const option of step.options.filter(entry => !entry.correct)) expect(option.hint.length, `${item.id}: ${option.text}`).toBeGreaterThan(20);
      if (item.task.kind === 'contrapositive') {
        for (const option of step.options) expect(rulesEquivalent(option.rule!, item.rule), `${item.id}: ${option.text}`).toBe(option.correct);
      }
      if (item.task.kind === 'negate') {
        const side = item.task.side === 'sufficient' ? item.rule.sufficient : item.rule.necessary;
        const ids = itemAtomIds(item);
        for (const option of step.options) expect(sidesOpposite(option.side!, side, ids), `${item.id}: ${option.text}`).toBe(option.correct);
      }
    }
  });

  it('gives hints that respond to the chosen wrong answer without stating the answer', () => {
    const meaning = andOrDrills[0].items[0];
    const step = choiceStep(meaning)!;
    expect(statusAnswer(meaning)).toBe('open');
    const asMet = step.options.find(option => option.text.startsWith('Yes'))!;
    const asRuledOut = step.options.find(option => option.text.startsWith('No'))!;
    expect(asMet.hint).not.toBe(asRuledOut.hint);
    expect(asMet.hint).toMatch(/AND needs every member/);
    expect(asRuledOut.hint).toMatch(/never mention|denies/);
    for (const hint of [asMet.hint, asRuledOut.hint]) expect(hint).not.toMatch(/not settled/i);
    const split = choiceStep(andOrDrills[1].items[0])!.options.find(option => option.text.startsWith('It must be true'))!;
    expect(split.hint).toMatch(/whole sufficient side/);
  });

  it('checks a learner-built diagram structurally and points at the mistake without giving the arrangement', () => {
    const item = andOrDrills[3].items[2];
    const swapped = { ...blankBuilder(), place: { slip: 'right' as const, parent: 'right' as const, seat: 'left' as const }, leftOp: 'and' as const, rightOp: 'or' as const };
    const wrong = checkBuild(item, swapped, 'diagram');
    expect(wrong.correct).toBe(false);
    expect(wrong.hint).toMatch(/sides are swapped/i);
    const right = { ...blankBuilder(), place: { slip: 'left' as const, parent: 'left' as const, seat: 'right' as const }, leftOp: 'or' as const };
    expect(checkBuild(item, right, 'diagram').correct).toBe(true);
    const wrongConnector = { ...right, leftOp: 'and' as const };
    expect(checkBuild(item, wrongConnector, 'diagram').hint).toMatch(/connector on the left/);
    expect(checkBuild(item, blankBuilder(), 'diagram').ready).toBe(false);
    const contra = { ...blankBuilder(), place: { slip: 'right' as const, parent: 'right' as const, seat: 'left' as const }, negated: { slip: true, parent: true, seat: true }, rightOp: 'and' as const };
    expect(checkBuild(item, contra, 'contra').correct).toBe(true);
    expect(checkBuild(item, { ...contra, rightOp: 'or' }, 'contra').hint).toMatch(/connector on the right/);
  });

  it('builds a contrapositive whose existing negative member flips back to positive', () => {
    const swimmer = andOrDrills[3].items[4];
    const built = { ...blankBuilder(), place: { deep: 'right' as const, test: 'left' as const, floaties: 'left' as const }, negated: { deep: true, test: true }, leftOp: 'or' as const };
    expect(checkBuild(swimmer, built, 'contra').correct).toBe(true);
    expect(checkBuild(swimmer, { ...built, negated: { deep: true, test: true, floaties: true } }, 'contra').hint).toMatch(/NOT on/);
  });

  it('names every item type the path sends to a drill', () => {
    const ids = OPENING_COURSE_PATH.filter(step => step.part === 2 && step.type === 'drill').map(step => step.id);
    expect(ids).toEqual(andOrDrills.map(set => set.id));
  });
});

describe('side mistakes', () => {
  it('produce statements that are not the opposite of a group of two or more', () => {
    for (const set of andOrDrills.slice(2, 3)) for (const item of set.items) {
      const side = (item.task as { side: 'sufficient' | 'necessary' }).side === 'sufficient' ? item.rule.sufficient : item.rule.necessary;
      const ids = itemAtomIds(item);
      const correct = negateSide(side);
      const wrong = sideMistakes(side).filter(mistake => !sidesEquivalent(mistake.side, correct, ids));
      expect(wrong.length, item.id).toBeGreaterThanOrEqual(2);
      for (const mistake of wrong) expect(sidesOpposite(mistake.side, side, ids), item.id).toBe(false);
    }
  });
});
