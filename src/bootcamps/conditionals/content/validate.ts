import { DIFFICULTIES, type ConditionalUnit } from './types';

/** Content checks enforce completeness and identity, not proof of logical correctness. */
export function validateConditionalContent(units: ConditionalUnit[]): string[] {
  const errors: string[] = [];
  const unitIds = new Set(units.map(unit => unit.id));
  const questionIds = new Set<string>();
  const practicePrompts = new Set<string>();
  if (units.length !== 30 || unitIds.size !== 30) errors.push('Expected 30 distinct learning units.');
  units.forEach(unit => {
    if (!unit.goal || unit.teaching.length < 2 || unit.method.length < 2 ||
        !unit.workedExample.statements.length || !unit.workedExample.reasoning.length || !unit.workedExample.conclusion ||
        !unit.commonMistake.mistake || !unit.commonMistake.repair) errors.push(`${unit.id}: incomplete teaching.`);
    unit.prerequisites.forEach(id => { if (!unitIds.has(id) || id === unit.id) errors.push(`${unit.id}: invalid prerequisite ${id}.`); });
    const questions = [unit.guidedExample, ...DIFFICULTIES.flatMap(level => unit.drills[level])];
    DIFFICULTIES.forEach(level => { if (unit.drills[level]?.length < 3) errors.push(`${unit.id}/${level}: fewer than three fresh practice items.`); });
    questions.forEach(question => {
      if (!question.id || questionIds.has(question.id)) errors.push(`${unit.id}: repeated or missing question ID ${question.id}.`);
      questionIds.add(question.id);
      if (question.options.length < 2 || new Set(question.options).size !== question.options.length ||
          !Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex >= question.options.length)
        errors.push(`${question.id}: invalid answer options.`);
      if (!question.prompt || !question.explanation || !question.hint || question.reasoningSteps.length < 2)
        errors.push(`${question.id}: missing teaching feedback.`);
      if (question !== unit.guidedExample) {
        const normalized = question.prompt.replace(/\s+/g, ' ').trim().toLowerCase();
        if (practicePrompts.has(normalized)) errors.push(`${question.id}: repeated practice prompt.`);
        practicePrompts.add(normalized);
      }
    });
    if (JSON.stringify(unit).includes('\u2014')) errors.push(`${unit.id}: prohibited em dash.`);
  });
  const firstQuantity = units.findIndex(unit => unit.phase === 'quantifier');
  if (firstQuantity !== 26 || units.slice(firstQuantity).some(unit => unit.phase !== 'quantifier')) errors.push('Quantifier phase must follow all 26 conditional units.');
  return errors;
}
