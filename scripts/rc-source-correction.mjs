import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

// A reviewed exception for one recovered official quotation, not an extensible
// protected-field allowlist. Any additional correction requires code review.
export const sourceCorrection = Object.freeze(JSON.parse(readFileSync(new URL('./rc-source-correction.json', import.meta.url), 'utf8')));
const expectedBefore = "Which one of the following most accurately expresses the message the author intends to convey in using the phrase in the final sentence of the passage?";
const expectedAfter = "Which one of the following most accurately expresses the message the author intends to convey in using the phrase \u201cmisguided project\u201d in the final sentence of the passage?";
function fail(message) { throw new Error(`RC official source correction: ${message}`); }
export function validateSourceCorrection(document = sourceCorrection) {
  if (document.preptest !== 156 || document.passageId !== 1752 || document.questionId !== 10655
    || !isDeepStrictEqual(document.path, ['passages', 4, 'questions', 1, 'prompt'])
    || document.before !== expectedBefore || document.after !== expectedAfter || document.correctAnswer !== 'E'
    || document.sourceUrl !== 'https://www.lsac.org/document-library/810'
    || document.sourceSha256 !== '95b5c8e8595148d045175935adb02264546a3e10145f5855ca39962bafccecdf'
    || document.sourcePage !== 20 || document.baselineCommit !== '94e76565b7b7c7c3924d2caa4a0dd8cdf94271d2'
    || Object.keys(document).sort().join(',') !== 'after,baselineCommit,before,correctAnswer,passageId,path,preptest,questionId,sourcePage,sourceSha256,sourceUrl') fail('unreviewed manifest');
  return document;
}
export function applySourceCorrection(banks, document = sourceCorrection) {
  const c = validateSourceCorrection(document);
  const bank = banks.find(bank => bank.preptest === c.preptest);
  const passage = bank?.passages?.[4]; const question = passage?.questions?.[1];
  if (passage?.passageId !== c.passageId || question?.questionId !== c.questionId
    || question.correctAnswer !== 'E' || question.choices?.filter(choice => choice.correct).length !== 1
    || question.choices.find(choice => choice.correct)?.letter !== 'E') fail('identity or key mismatch');
  if (question.prompt !== c.before && question.prompt !== c.after) fail('unexpected prompt');
  question.prompt = c.after;
  return banks;
}
export function isReviewedSourceChange(file, path, before, after) {
  validateSourceCorrection();
  return file === 'public/data/rc/RC-PT156.json' && path === 'passages[4].questions[1].prompt'
    && before === sourceCorrection.before && after === sourceCorrection.after;
}

// Bind the restored prompt to the retained provider audit without rewriting its
// immutable historical receipt. Every other identity input remains unchanged.
export function questionForOriginalAuthority(preptest, passage, question) {
  validateSourceCorrection();
  if (preptest === 156 && passage.passageId === 1752 && question.questionId === 10655
    && passage.section === 3 && passage.setNumber === 1 && question.position === 2
    && question.prompt === sourceCorrection.after && question.correctAnswer === 'E'
    && question.choices?.filter(choice => choice.correct).length === 1
    && question.choices.find(choice => choice.correct)?.letter === 'E') {
    return { ...question, prompt: sourceCorrection.before };
  }
  return question;
}
