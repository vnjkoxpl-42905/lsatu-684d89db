import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuestionFinderBanks } from './useQuestionFinderBanks';
const mocks=vi.hoisted(()=>({loadLr:vi.fn(),readyLr:vi.fn(),getLr:vi.fn(),loadRc:vi.fn(),loadQuestions:vi.fn()}));
vi.mock('@/lib/questionLoader',()=>({questionBank:{load:mocks.loadLr,isReady:mocks.readyLr,getAllQuestions:mocks.getLr}}));
vi.mock('@/features/rc/lib/rcBank',()=>({loadRcIndex:mocks.loadRc,loadRcQuestionIndex:mocks.loadQuestions}));
const rcIndex={preptests:[{preptest:140,passages:[{passageId:14,section:4,setNumber:1,title:'Marine ecosystems',topic:'Science',questionCount:1,firstWords:'The ocean'},{passageId:15,section:4,setNumber:2,title:'Empty passage',topic:'Science',questionCount:0,firstWords:''}]}]};
const qIndex={questions:[{questionId:1588,passageId:14,preptest:140,section:4,position:1,prompt:'Main point'},{questionId:1590,passageId:15,preptest:140,section:4,position:2,prompt:'Orphaned'}]};
describe('live-bank finder loading',()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.readyLr.mockReturnValue(false);mocks.loadLr.mockResolvedValue(undefined);mocks.getLr.mockReturnValue([]);mocks.loadRc.mockResolvedValue(rcIndex);mocks.loadQuestions.mockResolvedValue(qIndex);});
 it('does not load or wait for LR on the RC view',async()=>{
  mocks.loadLr.mockImplementation(()=>new Promise(()=>{}));
  const {result}=renderHook(()=>useQuestionFinderBanks(true,'rc'));
  await waitFor(()=>expect(result.current.loading).toBe(false));
  expect(mocks.loadLr).not.toHaveBeenCalled(); expect(mocks.readyLr).not.toHaveBeenCalled();
  expect(result.current.rcPassages.map(p=>p.passageId)).toEqual([14]);expect(result.current.rcQuestions.map(q=>q.questionId)).toEqual([1588]);
 });
 it('loads the newly selected bank and retains the ready RC indexes',async()=>{
  const {result,rerender}=renderHook(({view}:{view:'rc'|'lr'|'all'})=>useQuestionFinderBanks(true,view),{initialProps:{view:'rc'}});
  await waitFor(()=>expect(result.current.loading).toBe(false));
  rerender({view:'lr'}); await waitFor(()=>expect(mocks.loadLr).toHaveBeenCalledTimes(1));await waitFor(()=>expect(result.current.loading).toBe(false));
  rerender({view:'all'});expect(result.current.loading).toBe(false);expect(result.current.rcPassages).toHaveLength(1);expect(mocks.loadRc).toHaveBeenCalledTimes(1);expect(mocks.loadQuestions).toHaveBeenCalledTimes(1);
 });
 it('reports and retries only the requested RC bank',async()=>{
  mocks.loadRc.mockRejectedValueOnce(new Error('offline'));
  const {result}=renderHook(()=>useQuestionFinderBanks(true,'rc'));
  await waitFor(()=>expect(result.current.rcFailed).toBe(true));expect(result.current.error).toMatch(/Reading Comprehension/);expect(result.current.lrFailed).toBe(false);
  act(()=>result.current.retry());await waitFor(()=>expect(result.current.error).toBeNull());await waitFor(()=>expect(result.current.loading).toBe(false));expect(result.current.rcPassages).toHaveLength(1);expect(mocks.loadLr).not.toHaveBeenCalled();
 });
 it('keeps a partial mixed-bank failure separate from valid RC results',async()=>{
  mocks.loadLr.mockRejectedValueOnce(new Error('LR offline'));
  const {result}=renderHook(()=>useQuestionFinderBanks(true,'all'));
  await waitFor(()=>expect(result.current.loading).toBe(false));expect(result.current.lrFailed).toBe(true);expect(result.current.rcFailed).toBe(false);expect(result.current.error).toBeNull();expect(result.current.rcPassages).toHaveLength(1);
 });
 it('does not load until opened and does not request RC for LR-only view',async()=>{
  const {result,rerender}=renderHook(({enabled})=>useQuestionFinderBanks(enabled,'lr'),{initialProps:{enabled:false}});
  expect(mocks.loadLr).not.toHaveBeenCalled();rerender({enabled:true});await waitFor(()=>expect(result.current.loading).toBe(false));expect(mocks.loadLr).toHaveBeenCalledTimes(1);expect(mocks.loadRc).not.toHaveBeenCalled();expect(mocks.loadQuestions).not.toHaveBeenCalled();
 });
});
