import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveFinderAddress, resolveFinderHit } from './resolveFinderTarget';
import { questionBank, type LRQuestion } from '@/lib/questionLoader';
import type { FinderHit } from './questionFinderSearch';

const question = { qid: 'PT101-S2-Q1', pt: 101, section: 2, qnum: 1 } as LRQuestion;
const hit = { bank: 'lr', key: 'lr', qid: question.qid, pt: 101, section: 2, qnum: 1 } as FinderHit;
const input = { tests: [], loading: false, failed: false, lr: [question], getQuestion: () => question };
describe('finder target identity', () => {
 it('uses the complete question and rejects a stale row identity', () => {
  expect(resolveFinderHit(hit, input)).toEqual({ status: 'ready', target: { bank: 'lr', question } });
  expect(resolveFinderHit({ ...hit, qnum: 2 } as FinderHit, input).status).toBe('mismatch');
  expect(resolveFinderHit(hit, { ...input, getQuestion: () => undefined }).status).toBe('missing');
 });
 it('rejects duplicate addresses instead of choosing one', () => {
  expect(resolveFinderAddress({ pt: 101, section: 2, qnum: 1 }, 'lr', { ...input, lr: [question, question] }).status).toBe('ambiguous');
 });
 it.each([{loading:true,failed:false},{loading:false,failed:true}])('keeps exact LR addresses available when RC index is unavailable: %j', state => {
  expect(resolveFinderAddress({ pt:101, section:2, qnum:1 }, 'lr', {...input,...state}).status).toBe('ready');
  expect(resolveFinderAddress({ pt:101, section:2, qnum:1 }, 'all', {...input,...state}).status).not.toBe('ready');
 });
 it('validates generated LR identities through the actual loader', async () => {
  const files = JSON.parse(readFileSync('public/data/_bank.generated.json', 'utf8'));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok:true, json:async()=>files }));
  try {
   await questionBank.load();
   const loaded = questionBank.getAllQuestions().find(q => q.pt === 101 && q.section === 2 && q.qnum === 1)!;
   expect(loaded).toBeDefined();
   const result = resolveFinderAddress({ pt:101, section:2, qnum:1 }, 'lr', { ...input, lr:questionBank.getAllQuestions(), getQuestion:qid=>questionBank.getQuestion(qid) });
   expect(result.status).toBe('ready');
   if(result.status === 'ready' && result.target.bank === 'lr') {
    expect(result.target.question).toBe(loaded);
    expect(result.target.question.answerChoices.B).toContain('health of the heart');
    expect(result.target.question.correctAnswer).toBe('B');
   }
  } finally { vi.unstubAllGlobals(); }
 });
 it('validates RC passage and question IDs against the index, including moved positions', () => {
  const rcHit = { bank: 'rc', preptest: 140, section: 4, setNumber: 2, passageId: 15, questionId: 1594, qnum: 7 } as FinderHit;
  const rc = { ...input, tests: [{ pt: 140, sections: [{ section: 4, lr: [], rc: [{ id: 15, position: 2, title: 'Libraries', questions: [{ id: 1594, number: 7 }] }] }] }] };
  expect(resolveFinderHit(rcHit, rc)).toEqual({ status: 'ready', target: { bank: 'rc', passageId: 15, questionId: 1594 } });
  expect(resolveFinderHit({ ...rcHit, setNumber: 3 } as FinderHit, rc).status).toBe('mismatch');
  expect(resolveFinderHit({ ...rcHit, questionId: 999 } as FinderHit, rc).status).toBe('mismatch');
  expect(resolveFinderHit(rcHit, { ...rc, loading: true }).status).toBe('loading');
  expect(resolveFinderHit(rcHit, { ...rc, failed: true }).status).toBe('missing');
 });
});
