import { isDeepStrictEqual } from 'node:util';

function isAllowed(path) {
  if (!Number.isInteger(path[1]) || path[1] < 0) return false;
  if (path[2] === 'questions' && (!Number.isInteger(path[3]) || path[3] < 0)) return false;
  if (path[4] === 'choices' && (!Number.isInteger(path[5]) || path[5] < 0)) return false;
  return path.length === 4 && path[0] === 'passages' && path[2] === 'summaries' && ['standard', 'brief', 'anotherWay'].includes(path[3])
    || path.length === 5 && path[0] === 'passages' && path[2] === 'questions' && ['explanationBlocks', 'hasWrittenExplanation'].includes(path[4])
    || path.length === 7 && path[0] === 'passages' && path[2] === 'questions' && path[4] === 'choices' && ['tag', 'explanation'].includes(path[6]);
}
function fail(message) { throw new Error(`RC authored correction: ${message}`); }
export function captureAuthoredCorrections(beforeBanks, afterBanks) {
  const changes = [];
  function walk(before, after, path, bank) {
    if (isDeepStrictEqual(before, after)) return;
    if (isAllowed(path)) {
      const passage = bank.passages[path[1]];
      const question = path[2] === 'questions' ? passage.questions[path[3]] : null;
      const choice = path[4] === 'choices' ? question.choices[path[5]] : null;
      changes.push({ preptest: bank.preptest, passageId: passage.passageId, ...(question ? { questionId: question.questionId } : {}),
        ...(choice ? { letter: choice.letter } : {}), path, before, after }); return;
    }
    if (Array.isArray(before) && Array.isArray(after) && before.length === after.length) { before.forEach((value, index) => walk(value, after[index], [...path, index], bank)); return; }
    if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) walk(before[key], after[key], [...path, key], bank); return;
    }
    fail(`protected source changed at PT${bank.preptest} ${path.join('.')}`);
  }
  if (beforeBanks.length !== afterBanks.length) fail('bank membership changed');
  for (const before of beforeBanks) {
    const after = afterBanks.find(bank => bank.preptest === before.preptest);
    if (!after) fail(`missing PT${before.preptest}`);
    walk(before, after, [], before);
  }
  return { version: 1, corrections: changes };
}
export function applyAuthoredCorrections(banks, document) {
  if (document?.version !== 1 || !Array.isArray(document.corrections)) fail('unsupported correction document');
  const updates = [];
  const seen = new Set();
  for (const correction of document.corrections) {
    const { preptest, passageId, questionId, letter, path, before, after } = correction;
    if (!Array.isArray(path) || !isAllowed(path) || path.some(key => ['__proto__', 'constructor', 'prototype'].includes(key))) fail('forbidden field');
    const key = `${preptest}:${JSON.stringify(path)}`;
    if (seen.has(key)) fail(`duplicate ${key}`); seen.add(key);
    const bank = banks.find(value => value.preptest === preptest);
    const passage = bank?.passages?.[path[1]];
    const question = path[2] === 'questions' ? passage?.questions?.[path[3]] : null;
    const choice = path[4] === 'choices' ? question?.choices?.[path[5]] : null;
    if (passage?.passageId !== passageId || (path[2] === 'questions' && question?.questionId !== questionId)
      || (path[4] === 'choices' && choice?.letter !== letter)) fail(`identity mismatch ${key}`);
    let target = bank;
    for (const part of path.slice(0, -1)) { target = target?.[part]; if (!target || typeof target !== 'object') fail(`missing path ${key}`); }
    const field = path.at(-1);
    if (!isDeepStrictEqual(target[field], before) && !isDeepStrictEqual(target[field], after)) fail(`unexpected authored base ${key}`);
    updates.push({ target, field, after });
  }
  // Validate the entire overlay before mutating any generated bank.
  for (const { target, field, after } of updates) target[field] = structuredClone(after);
  return banks;
}
