import { describe, expect, it } from 'vitest';
import { fullCourseDrillSets, fullCourseLessons } from './fullCourseContent';
import { validateItem } from './fullCourseLogic';
import { fullCourseQuiz, negativeSentence } from './fullCourseItems';
describe('the actual authored expanded course', () => {
  it('uses ordinary grammatical negation in actual generated quiz options',()=>{
    const options=Object.values(fullCourseQuiz).flatMap(items=>items.flatMap(item=>item.options.map(option=>option.text)));
    expect(options).toHaveLength(300);
    expect(options.filter(text=>/it is not the case that|does not have frozen|does not starts|does not contains/.test(text))).toEqual([]);
    expect(fullCourseQuiz['exception-language'][2].options.map(o=>o.text)).toContain('If the river has not frozen, then the ferry operates.');
    expect(fullCourseQuiz['exclusion-language'][2].options.map(o=>o.text)).toContain('If this is a reserve tank, then this does not contain drinking water.');
    expect(fullCourseQuiz['negative-translation'][2].options.map(o=>o.text)).toContain('If the machine does not start, then the guard is not lowered.');
    expect(fullCourseQuiz['implicit-guarantees'][3].options.map(o=>o.text)).toContain('If a person does not hold the certificate, then that person is not authorized to request a transcript.');
  });
  it.each([
    ['the river has frozen','the river has not frozen'],
    ['they have arrived','they have not arrived'],
    ['the drone has a radio','the drone does not have a radio'],
    ['this contains drinking water','this does not contain drinking water'],
    ['the machine starts','the machine does not start'],
    ['the machine does not start','the machine starts'],
    ['that person is authorized to request a transcript','that person is not authorized to request a transcript'],
    ['a visitor can enter','a visitor cannot enter'],
  ])('preserves the English predicate when negating %s',(positive,negative)=>expect(negativeSentence(positive)).toBe(negative));
  for (const lesson of fullCourseLessons) {
    it(`${lesson.id}: four fresh quiz checks have one supported semantic key`, () => {
      expect(lesson.quiz).toHaveLength(4);
      expect(lesson.quiz.flatMap(item => validateItem(item).map(error => `${item.id}: ${error}`))).toEqual([]);
    });
  }
  for (const drill of fullCourseDrillSets) {
    it(`${drill.id}: every productive task and distractor has checked semantics`, () => {
      expect(drill.items.length).toBeGreaterThan(0);
      expect(drill.items.flatMap(item => validateItem(item).map(error => `${item.id}: ${error}`))).toEqual([]);
    });
  }
  it('has unique persistent item IDs and preserves distinct productive operations', () => {
    const items = [...fullCourseLessons.flatMap(l => l.quiz), ...fullCourseDrillSets.flatMap(d => d.items)];
    expect(new Set(items.map(i => i.id)).size).toBe(items.length);
    const kinds = new Set(fullCourseDrillSets.flatMap(d => d.items.map(i => i.kind)));
    for (const kind of ['build-rule', 'case', 'chain', 'argument', 'quantity-case']) expect(kinds.has(kind as any), kind).toBe(true);
  });
});
