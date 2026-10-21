import * as React from "react";
import { questionBank } from "@/lib/questionLoader";
import { loadRcIndex, loadRcQuestionIndex } from "@/features/rc/lib/rcBank";
import type { FinderLrSource, FinderRcPassageSource, FinderRcQuestionSource, QuestionFinderBank } from "./questionFinderSearch";

interface FinderBanks { lr: FinderLrSource[]; rcPassages: FinderRcPassageSource[]; rcQuestions: FinderRcQuestionSource[]; }
export interface FinderBanksState extends FinderBanks {
  loading: boolean;
  error: string | null;
  lrFailed: boolean;
  rcFailed: boolean;
  retry: () => void;
}
type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed';

/** Load only the live bank view; switching banks retains already loaded indexes. */
export function useQuestionFinderBanks(enabled: boolean, view: QuestionFinderBank | 'all' = 'all'): FinderBanksState {
  const cache = React.useRef<{ lr: FinderLrSource[]; rcPassages: FinderRcPassageSource[]; rcQuestions: FinderRcQuestionSource[]; lrStatus: LoadStatus; rcStatus: LoadStatus }>({lr:[],rcPassages:[],rcQuestions:[],lrStatus:'idle',rcStatus:'idle'});
  const mounted = React.useRef(true);
  const [, refresh] = React.useReducer(value => value + 1, 0);
  const [attempt, setAttempt] = React.useState(0);
  const wantsLr = view !== 'rc';
  const wantsRc = view !== 'lr';
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  React.useEffect(() => {
    if (!enabled) return;
    const changed = () => { if (mounted.current) refresh(); };
    if (wantsLr && cache.current.lrStatus === 'idle') {
      cache.current.lrStatus = 'loading';
      void (async () => {
        if (!questionBank.isReady()) await questionBank.load();
        cache.current.lr = questionBank.getAllQuestions().map(question => ({qid:question.qid,pt:question.pt,section:question.section,qnum:question.qnum,qtype:question.qtype,stimulus:question.stimulus,questionStem:question.questionStem}));
        cache.current.lrStatus = 'ready';
      })().catch(() => { cache.current.lrStatus = 'failed'; }).finally(changed);
      changed();
    }
    if (wantsRc && cache.current.rcStatus === 'idle') {
      cache.current.rcStatus = 'loading';
      void (async () => {
        const [index, questionIndex] = await Promise.all([loadRcIndex(),loadRcQuestionIndex()]);
        const passages: FinderRcPassageSource[] = [];
        for (const test of index.preptests) for (const passage of test.passages) {
          if (passage.questionCount <= 0) continue;
          passages.push({passageId:passage.passageId,preptest:test.preptest,section:passage.section,setNumber:passage.setNumber,title:passage.title,topic:passage.topic,questionCount:passage.questionCount,firstWords:passage.firstWords});
        }
        const passageIds = new Set(passages.map(passage => passage.passageId));
        cache.current.rcPassages = passages;
        cache.current.rcQuestions = questionIndex.questions.filter(question => passageIds.has(question.passageId)).map(question => ({questionId:question.questionId,passageId:question.passageId,preptest:question.preptest,section:question.section,qnum:question.position,position:question.position,prompt:question.prompt}));
        cache.current.rcStatus = 'ready';
      })().catch(() => { cache.current.rcStatus = 'failed'; }).finally(changed);
      changed();
    }
  }, [enabled, wantsLr, wantsRc, attempt]);
  const lrFailed = wantsLr && cache.current.lrStatus === 'failed';
  const rcFailed = wantsRc && cache.current.rcStatus === 'failed';
  const requested = [wantsLr ? cache.current.lrStatus : null, wantsRc ? cache.current.rcStatus : null].filter(Boolean);
  const loading = enabled && requested.some(status => status === 'idle' || status === 'loading');
  const allFailed = requested.length > 0 && requested.every(status => status === 'failed');
  return {
    lr:cache.current.lr,rcPassages:cache.current.rcPassages,rcQuestions:cache.current.rcQuestions,
    loading,lrFailed,rcFailed,error:allFailed ? view === 'rc' ? 'Reading Comprehension passages could not be loaded.' : view === 'lr' ? 'Logical Reasoning questions could not be loaded.' : 'Questions could not be loaded.' : null,
    retry:() => { if(wantsLr && cache.current.lrStatus === 'failed') cache.current.lrStatus='idle'; if(wantsRc && cache.current.rcStatus === 'failed') cache.current.rcStatus='idle'; setAttempt(value=>value+1); },
  };
}
