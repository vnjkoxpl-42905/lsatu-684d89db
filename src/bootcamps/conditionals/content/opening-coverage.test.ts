import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { conditionalUnits } from './index';
import { foundationUnits } from './foundations.source';
import { findLegacyConditionalQuestion } from './legacyQuestions';
import type { ConditionalDifficulty } from './types';

const levels: ConditionalDifficulty[] = ['beginner', 'medium', 'advanced'];
const openingIds = ['orientation', 'sufficient-necessary', 'group-1', 'group-2'];
const opening = conditionalUnits.filter(unit => openingIds.includes(unit.id));
const historicalIds = ['group-1-a3', 'group-2-m2', 'group-2-a3', 'group-2-a1'];
const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

describe('the opening curriculum teaching contract', () => {
  it('introduces the relationship before its two indicator groups', () => {
    expect(conditionalUnits.slice(0, 4).map(unit => unit.id)).toEqual(openingIds);
    expect(opening.map(unit => unit.prerequisites)).toEqual([
      [], ['orientation'], ['sufficient-necessary'], ['group-1'],
    ]);
  });

  it('keeps new explanations and practice in the shipped reference bundle', () => {
    for (const unit of opening) {
      expect(unit).toEqual(foundationUnits.find(source => source.id === unit.id));
      expect(JSON.stringify(unit)).not.toMatch(/\b(?:dogs?|mammals?)\b/i);
      if (unit.id !== 'orientation') {
        expect(unit.method.join(' ')).not.toMatch(/contrapositive|contraposition|chain|quantity/i);
        expect(unit.teaching.join(' ')).not.toMatch(/\b(?:contrapositive|contraposition|chains?|quantifiers?|quantities)\b/i);
      } else {
        // The approved reference-ordered opening develops contraposition before
        // notation. Independently assigned group notes keep their narrow scope.
        expect(unit.teaching.findIndex(text => /This is the contrapositive/.test(text))).toBeLessThan(
          unit.teaching.findIndex(text => /Write the relationship/.test(text)),
        );
        expect(unit.method).toHaveLength(5);
        expect(unit.method[3]).toMatch(/contrapositive/);
        expect(unit.method[4]).toMatch(/English/);
        expect(unit.teaching.join(' ')).not.toMatch(/\bunless\b|quantifiers?|quantities/i);
      }
    }
  });

  it('preserves the 62-question answer contract used by saved choices and diagrams', () => {
    // The pre-voice baseline preserves 61 current answer contracts after the
    // original three -v2 mappings. Actual inspection also replaces group-2-a1
    // with direct translation under its own -v2 ID, retaining the HEAD original.
    // Earlier group-2-b3 Every -> A wording preserves its universal always claim;
    // that cosmetic change and group-2-a2's obligation wording keep their keys.
    // orientation-m1 now uses the taught "usually" rather than "most". Normalize
    // that one deliberate wording edit for this baseline comparison, and check
    // its current wording explicitly below. Its ID, options and key stay intact.
    const contract = openingIds.flatMap(unitId => {
      const unit = opening.find(item => item.id === unitId)!;
      return levels.flatMap(level => unit.drills[level].map(question => [
        unit.id, level, question.id,
        question.id === 'orientation-m1'
          ? 'Most inspected lifts operate quietly. Lift 2 was inspected. Is quiet operation guaranteed?'
          : question.prompt,
        question.options, question.answerIndex,
      ]));
    });
    expect(contract).toHaveLength(62);
    expect(fingerprint(contract)).toBe('2cc25820135dd0c10ccfcd629a68758d4d924a9a3a3545df857dfbca1fc0f534');
    expect(fingerprint(contract.filter(item => item[2] !== 'group-2-a1-v2'))).toBe('e4f9a1577a66ac70ca1e0fc26b6b96b6bb561e8160c00bf052517c3a4417a5f9');
    const newPracticeIds = opening.flatMap(unit => levels.flatMap(level => unit.drills[level].map(question => question.id)));
    for (const id of historicalIds) {
      expect(newPracticeIds).not.toContain(id);
      expect(newPracticeIds).toContain(`${id}-v2`);
    }
  });

  it('makes feedback answer the displayed question without depending on its hidden hint', () => {
    const authoredOpening = foundationUnits.filter(unit => openingIds.includes(unit.id));
    const questions = authoredOpening.flatMap(unit => [
      unit.guidedExample, ...levels.flatMap(level => unit.drills[level]),
    ]);
    expect(questions).toHaveLength(66);
    for (const question of questions) {
      expect(question.reasoningSteps[0], question.id).not.toMatch(/^(?:Yes|No)\b[.,]/i);
      expect(question.explanation, question.id).toBe(question.reasoningSteps.join(' '));
    }
    const byId = (id: string) => questions.find(question => question.id === id)!;
    expect(byId('orientation-m1').prompt).toBe('Inspected lifts usually operate quietly. Lift 2 was inspected. Is quiet operation guaranteed?');
    expect(byId('orientation-m1').reasoningSteps[0]).toMatch(/^Quiet operation isn't guaranteed\./);
    expect(byId('orientation-m1').reasoningSteps[0]).toMatch(/could be noisy/);
    expect(byId('sufficient-necessary-m2').reasoningSteps[0]).toMatch(/^F's tagged status is unknown\./);
    expect(byId('group-1-m5').reasoningSteps[0]).toMatch(/^The rehearsal's ending is not established\./);
    expect(byId('group-2-m1').reasoningSteps[0]).toMatch(/^Mira's entry is not established\./);
  });

  it('uses concept titles and the taught clause-order anchor for Group 1 repair', () => {
    const authoredOpening = openingIds.map(id => foundationUnits.find(unit => unit.id === id)!);
    expect(authoredOpening.map(unit => unit.title)).toEqual([
      'What Are Conditionals?', 'What is enough? What is required?',
      'Group 1: what is enough?', 'Group 2: what is required?',
    ]);
    const group1 = authoredOpening[2];
    expect(group1.commonMistake.repair).toContain('“A report is reviewed if it is submitted before noon,”');
    expect(group1.commonMistake.repair).toContain('submission before noon is what guarantees it');
    expect(group1.commonMistake.repair).not.toMatch(/rover|ridge/);
  });

  it('retains the exact historical questions for old saved work without offering them in new practice', () => {
    const originals = historicalIds.map(id => findLegacyConditionalQuestion(id));
    expect(originals.every(Boolean)).toBe(true);
    // Includes historical hint and worked reasoning, as well as each original
    // prompt and numeric answer contract. No machine-specific fixture is needed.
    expect(fingerprint(originals)).toBe('0d0ff240d9b0597515efb0b02f50f62e1af234cb1d12027d419f37ea5e76a6aa');
    expect(findLegacyConditionalQuestion('group-1-a3-v2')).toBeUndefined();
    expect(findLegacyConditionalQuestion('group-2-a1-v2')).toBeUndefined();
    expect(findLegacyConditionalQuestion('orientation-b1')).toBeUndefined();
  });

  it('keeps new opening assessments within the taught direction and complete conditions', () => {
    const authoredOpening = foundationUnits.filter(unit => openingIds.includes(unit.id));
    const current = authoredOpening.flatMap(unit => levels.flatMap(level => unit.drills[level]));
    for (const question of current) {
      expect(question.options[question.answerIndex]).not.toMatch(/\bunless\b|contrapositiv|contraposition/i);
      expect(question.hint + question.reasoningSteps.join(' ')).not.toMatch(/\bunless\b|contrapositiv|contraposition/i);
    }
    const permission = foundationUnits.find(unit => unit.id === 'group-2')!.drills.advanced.find(question => question.id === 'group-2-a1-v2')!;
    expect(permission.options[permission.answerIndex]).toMatch(/^May inspect these records → reviewer appointed for emergency panel\.$/);
    expect(permission.explanation).toMatch(/permission/i);
    expect(permission.explanation).toMatch(/complete reviewer appointment/i);
  });

  const families = [
    {
      unitId: 'group-1',
      indicators: [/\bif\b/i, /\bwhen(?:ever)?\b/i, /\bwhere\b/i, /\ball\b/i, /\bthe only\b/i, /\bevery\b/i, /\bany\b/i],
    },
    {
      unitId: 'group-2',
      indicators: [/\bonly (?!if\b|when\b|where\b)/i, /\bonly if\b/i, /\bonly when\b/i, /\bonly where\b/i, /\balways\b/i, /\brequires?\b|\brequired\b/i, /\bmust\b/i],
    },
  ];

  for (const { unitId, indicators } of families) {
    for (const level of levels) {
      it(`${unitId} ${level} practices every core indicator in a conditional claim`, () => {
        const unit = opening.find(item => item.id === unitId)!;
        // Inquiry/event discrimination is useful, but cannot replace practicing a rule.
        const rulePractice = unit.drills[level].filter(item =>
          !/reports an inquiry|reports one visit/i.test(item.options[item.answerIndex])
        );
        for (const indicator of indicators) {
          expect(rulePractice.some(item => indicator.test(item.prompt)), `${indicator} has no conditional practice`).toBe(true);
        }
      });
    }
  }

  it('teaches must as an obligation at every level without asserting compliance', () => {
    const unit = opening.find(item => item.id === 'group-2')!;
    for (const level of levels) {
      const mustPractice = unit.drills[level].filter(item => /\bmust\b/i.test(item.prompt));
      expect(mustPractice.length).toBeGreaterThan(0);
      for (const item of mustPractice) {
        expect(item.explanation).toMatch(/obligation|requirement|required/i);
        expect(item.options[item.answerIndex]).not.toMatch(/actually submitted|captain attended/i);
      }
    }
  });
});
