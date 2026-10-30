import { createHash } from 'node:crypto';
export const LETTERS = ['A', 'B', 'C', 'D', 'E'];
export function questionIdentity(preptest, passage, question) {
  return createHash('sha256').update(JSON.stringify({ preptest, passageId: passage.passageId, section: passage.section,
    setNumber: passage.setNumber, position: question.position, text: passage.text, prompt: question.prompt,
    choices: [...question.choices].sort((a, b) => a.letter.localeCompare(b.letter)).map(({ letter, text }) => ({ letter, text })) })).digest('hex');
}
export function resolveCredit(questionId, choices, authored, recovered) {
  if (choices.length !== 5 || new Set(choices.map(c => c.letter)).size !== 5 || choices.some(c => !LETTERS.includes(c.letter) || typeof c.text !== 'string' || !c.text.trim())) throw new Error(`RC question ${questionId}: five unique nonempty A–E choices are required`);
  const flags = choices.filter(c => c.correct).map(c => c.letter);
  const fields = [authored, recovered].filter(k => k !== null && k !== undefined && k !== '');
  if (fields.some(k => !LETTERS.includes(k)) || new Set(fields).size > 1) throw new Error(`RC question ${questionId}: conflicting/invalid explicit answer keys ${JSON.stringify(fields)}`);
  if (flags.length !== 1 || !LETTERS.includes(flags[0])) throw new Error(`RC question ${questionId}: expected exactly one credited choice, found ${flags.join(',') || 'none'}`);
  const credit = fields[0] ?? flags[0];
  if (credit !== flags[0]) throw new Error(`RC question ${questionId}: explicit key ${credit} disagrees with choice flag ${flags[0]}; adjudicate the source before generating`);
  return credit;
}
export function applyCorrections(banks, manifest, { checkOnly = false } = {}) {
  const entries = new Map();
  for (const c of manifest.corrections) {
    if (entries.has(c.questionId) || !LETTERS.includes(c.previousAnswer) || !LETTERS.includes(c.correctAnswer) || c.previousAnswer === c.correctAnswer || c.sources.length < 1) throw new Error(`Invalid/duplicate RC correction ${c.questionId}`);
    entries.set(c.questionId, c);
  }
  const changed = [];
  const seen = new Set();
  for (const bank of banks) for (const p of bank.passages) for (const q of p.questions) {
    resolveCredit(q.questionId, q.choices, q.correctAnswer);
    const c = entries.get(q.questionId);
    if (!c) continue;
    if (seen.has(q.questionId)) throw new Error(`Duplicate corrected question ${q.questionId}`);
    seen.add(q.questionId);
    if (bank.preptest !== c.preptest || p.section !== c.section || p.setNumber !== c.setNumber || q.position !== c.position || questionIdentity(bank.preptest, p, q) !== c.identitySha256) throw new Error(`RC correction ${q.questionId}: official address/text changed; reverify its authority`);
    if (![c.previousAnswer, c.correctAnswer].includes(q.correctAnswer)) throw new Error(`RC correction ${q.questionId}: unexpected existing key ${q.correctAnswer}`);
    if (q.correctAnswer === c.correctAnswer) continue;
    if (checkOnly) throw new Error(`RC question ${q.questionId}: verified correction ${c.previousAnswer}→${c.correctAnswer} has not been applied`);
    q.correctAnswer = c.correctAnswer;
    for (const choice of q.choices) choice.correct = choice.letter === c.correctAnswer;
    changed.push(q.questionId);
  }
  for (const id of entries.keys()) if (!seen.has(id)) throw new Error(`RC correction ${id}: bank question is missing`);
  return changed;
}
