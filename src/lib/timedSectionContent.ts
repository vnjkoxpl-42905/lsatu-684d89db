import { normalizeQuestionTextFields, normalizeQType, type LRQuestion } from './questionLoader';
import { frozenClassification, type TimedLrRawQuestion } from './timedLrAdapter';
import { TimedSectionError, type TimedSectionSitting } from './timedSectionClient';
import type { TimedObject } from './timedWorkClient';
import type { RcPassage } from '@/features/rc/lib/rcTypes';

const object = (value: unknown): value is TimedObject => !!value && typeof value === 'object' && !Array.isArray(value);
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function invalid(): never { throw new TimedSectionError('contract', 'The loaded section differs from its frozen account source.'); }
async function digest(text: string): Promise<string> {
  try { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))).map(byte => byte.toString(16).padStart(2, '0')).join(''); }
  catch { throw new TimedSectionError('contract', 'This browser cannot verify the frozen section content.'); }
}
export async function verifyStandaloneLrContent(sitting: TimedSectionSitting, rows: TimedLrRawQuestion[]): Promise<LRQuestion[]> {
  const source = sitting.frozen_source;
  if (sitting.kind !== 'lr' || source.kind !== 'lr' || source.section !== sitting.section || !Array.isArray(source.questions)) invalid();
  const qid = (row: TimedLrRawQuestion) => `PT${sitting.pt}-S${sitting.section}-Q${row.questionNumber}`;
  const raw = rows.filter(row => row.status !== 'removed').sort((a, b) => a.questionNumber - b.questionNumber);
  if (new Set(rows.map(row => row.questionNumber)).size !== rows.length || canonical(raw.map(qid)) !== canonical(sitting.frozen_qids)) invalid();
  for (const [index, row] of raw.entries()) {
    const expected = source.questions[index];
    if (!object(expected) || expected.qid !== qid(row) || expected.qnum !== row.questionNumber
      || row.practiceTest !== `PT${sitting.pt}` || row.sectionNumber !== sitting.section || !/^[A-E]$/.test(row.correctAnswer)
      || expected.contentSha256 !== await digest(canonical({ stimulus: row.stimulus ?? '', stem: row.questionStem, choices: row.answerChoices }))) invalid();
  }
  const questions = normalizeQuestionTextFields(rows).filter(row => row.status !== 'removed').sort((a, b) => a.questionNumber - b.questionNumber).map(row => ({
    qid: qid(row), pt: sitting.pt, section: sitting.section, qnum: row.questionNumber, stimulus: row.stimulus,
    questionStem: row.questionStem, answerChoices: { ...row.answerChoices }, correctAnswer: row.correctAnswer,
    qtype: normalizeQType(row.questionType || '', row.questionStem), difficulty: row.questionDifficulty || row.Question_Difficulty || 3,
  }));
  // A later bank relabel must never lock a student out of a sealed sitting.
  return questions.map((question, index) => {
    const expected = source.questions[index];
    if (!object(expected) || !frozenClassification(expected)) invalid();
    return { ...question, qtype: expected.qtype as string, difficulty: expected.level as number };
  });
}
export async function verifyStandaloneRcContent(sitting: TimedSectionSitting, bank: RcPassage[]): Promise<RcPassage[]> {
  const source = sitting.frozen_source;
  if (sitting.kind !== 'rc' || source.kind !== 'rc' || source.section !== sitting.section || !Array.isArray(source.passageIds)
    || !Array.isArray(source.passages) || !Array.isArray(source.questions)) invalid();
  const passages = source.passageIds.map(id => bank.find(passage => passage.passageId === id));
  if (passages.some(value => !value) || canonical(passages.flatMap(passage => passage!.questions.map(question => String(question.questionId)))) !== canonical(sitting.frozen_qids)) invalid();
  for (const passage of passages as RcPassage[]) {
    const frozen = source.passages.find(value => object(value) && value.passageId === passage.passageId);
    if (passage.preptest !== sitting.pt || passage.section !== sitting.section || !object(frozen)
      || frozen.section !== passage.section || frozen.setNumber !== passage.setNumber || frozen.contentSha256 !== await digest(passage.text)) invalid();
    for (const question of passage.questions) {
      const expected = source.questions.find(value => object(value) && value.questionId === question.questionId);
      if (!object(expected) || expected.qid !== String(question.questionId) || expected.passageId !== passage.passageId || expected.qnum !== question.position
        || !/^[A-E]$/.test(question.correctAnswer) || expected.contentSha256 !== await digest(canonical({ text: passage.text, prompt: question.prompt,
          choices: question.choices.map(choice => ({ letter: choice.letter, text: choice.text })).sort((a, b) => a.letter.localeCompare(b.letter)) }))) invalid();
    }
  }
  return passages as RcPassage[];
}
