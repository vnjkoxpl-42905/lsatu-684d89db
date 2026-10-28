import type { LRQuestion } from '@/lib/questionLoader';
import type { FinderHit, FinderLrSource, QuestionAddress, QuestionFinderBank } from './questionFinderSearch';
import type { FinderAddressTest } from './useFinderAddressIndex';

export type FinderTarget = { bank: 'lr'; question: LRQuestion } | { bank: 'rc'; passageId: number; questionId: number | null };
export type FinderResolution = { status: 'ready'; target: FinderTarget } | { status: 'loading' | 'missing' | 'mismatch' | 'ambiguous'; message: string };
interface Input { tests: FinderAddressTest[]; loading: boolean; failed: boolean; lr: FinderLrSource[]; getQuestion: (qid: string) => LRQuestion | undefined; }
const unavailable = (): FinderResolution => ({ status: 'missing', message: 'This question is unavailable in the loaded bank. Choose another result or try loading again. Some sections may still be unavailable.' });

/** Resolve clicked identities directly, independently of the panel's pending React state. */
export function resolveFinderHit(hit: FinderHit, input: Input): FinderResolution {
  if (hit.bank === 'lr') {
    const question = input.getQuestion(hit.qid);
    if (!question) return unavailable();
    if (question.qid !== hit.qid || question.pt !== hit.pt || question.section !== hit.section || question.qnum !== hit.qnum) return { status: 'mismatch', message: 'The question no longer matches this address. Search again before opening it.' };
    return { status: 'ready', target: { bank: 'lr', question } };
  }
  if (input.loading) return { status: 'loading', message: 'Question addresses are loading. Choose this result again when loading finishes.' };
  if (input.failed) return { status: 'missing', message: 'Question addresses could not be loaded. Retry before opening a preview.' };
  const passages = input.tests.filter(test => test.pt === hit.preptest).flatMap(test => test.sections.filter(section => section.section === hit.section).flatMap(section => section.rc.filter(p => p.id === hit.passageId && p.position === hit.setNumber && p.questions.length > 0)));
  if (passages.length !== 1) return { status: 'mismatch', message: 'The passage address no longer matches this result. Search again or use the selectors.' };
  if (hit.questionId !== undefined && passages[0].questions.filter(q => q.id === hit.questionId && q.number === hit.qnum).length !== 1) return { status: 'mismatch', message: 'The question address no longer matches this result. Search again or use the selectors.' };
  if ((hit.questionId === undefined) !== (hit.qnum === undefined)) return { status: 'mismatch', message: 'The question address is incomplete. Search again.' };
  return { status: 'ready', target: { bank: 'rc', passageId: hit.passageId, questionId: hit.questionId ?? null } };
}

export function resolveFinderAddress(address: QuestionAddress | null, view: QuestionFinderBank | 'all', input: Input): FinderResolution {
  if (!address?.section || (address.qnum === undefined && address.pnum === undefined)) return { status: 'missing', message: 'Choose an exact question or passage address.' };
  if (view !== 'lr' && input.loading) return { status: 'loading', message: 'Question addresses are loading. Choose LR to open a known LR question while the RC index loads.' };
  if (view !== 'lr' && input.failed) return { status: 'missing', message: 'Question addresses could not be loaded. Retry or choose LR to open a known LR question.' };
  const candidates: FinderResolution[] = [];
  if (view !== 'rc' && address.pnum === undefined && address.qnum !== undefined) {
    const matches = input.lr.filter(q => q.pt === address.pt && q.section === address.section && q.qnum === address.qnum);
    if (matches.length > 1) return { status: 'ambiguous', message: 'More than one question matches. Choose a result.' };
    if (matches.length === 1) candidates.push(resolveFinderHit({ ...matches[0], bank: 'lr', key: '', stem: matches[0].questionStem, snippet: null }, input));
  }
  if (view !== 'lr') {
    const passages = input.tests.filter(t => t.pt === address.pt).flatMap(t => t.sections.filter(s => s.section === address.section).flatMap(s => s.rc.filter(p => p.questions.length > 0 && (address.pnum === undefined || p.position === address.pnum))));
    for (const passage of passages) {
      const questions = address.qnum === undefined ? [null] : passage.questions.filter(q => q.number === address.qnum);
      for (const question of questions) candidates.push({ status: 'ready', target: { bank: 'rc', passageId: passage.id, questionId: question?.id ?? null } });
    }
  }
  if (candidates.length > 1) return { status: 'ambiguous', message: 'This address matches more than one bank or question. Choose LR, RC, or a specific result.' };
  return candidates[0] ?? unavailable();
}
