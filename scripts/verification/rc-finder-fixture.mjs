// Shared synthetic-only finder adapters for the preview server and HTML exporter.
export const finderFixtureModules = {
  finderBanks: `import * as React from 'react'; import {passages} from 'rc-preview:shared';
export function useQuestionFinderBanks(enabled, view='all') {
  const [attempt, setAttempt] = React.useState(0);
  const failed = enabled && new URLSearchParams(location.search).get('fail') === 'finder' && attempt === 0;
  const rcRequested = enabled && view !== 'lr'; const lrRequested = enabled && view !== 'rc';
  return { loading:false, error:failed?'Synthetic search could not load. Retry to recover.':null,
    lrFailed:failed && lrRequested, rcFailed:failed && rcRequested,
    lr:!failed && lrRequested ? [{qid:'synthetic-lr-1',pt:139,section:1,qnum:1,qtype:'Main Point',stimulus:'Synthetic LR example for finder navigation.',questionStem:'Which choice expresses the main point?'}] : [],
    rcPassages:!failed && rcRequested ? passages.map(p=>({passageId:p.passageId,preptest:p.preptest,section:p.section,setNumber:p.setNumber,title:p.title,topic:p.topic,questionCount:p.questions.length,firstWords:p.firstWords})) : [],
    rcQuestions:!failed && rcRequested ? passages.flatMap(p=>p.questions.map(q=>({questionId:q.questionId,passageId:p.passageId,preptest:p.preptest,section:p.section,qnum:q.position,position:q.position,prompt:q.prompt}))) : [],
    retry:()=>setAttempt(n=>n+1) };
}`,
  finderAddress: `import * as React from 'react'; import {passages} from 'rc-preview:shared';
export function useFinderAddressIndex(enabled=true) {
  const [attempt,setAttempt]=React.useState(0);
  const failed=enabled && new URLSearchParams(location.search).get('fail')==='finder-address' && attempt===0;
  return {loading:false,failed,tests:enabled && !failed ? [{pt:139,sections:[{section:1,lr:[1],rc:[]}]},...passages.map(p=>({pt:p.preptest,sections:[{section:p.section,lr:[],rc:[{id:p.passageId,position:p.setNumber,title:p.title,questions:p.questions.map(q=>({id:q.questionId,number:q.position}))}]}]}))] : [], retry:()=>setAttempt(n=>n+1)};
}`,
};
