import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import QuestionFinder from './QuestionFinder';
const fixture=vi.hoisted(()=>({banks:null as any,index:null as any,navigate:vi.fn()}));
vi.mock('react-router-dom',async()=>({...await vi.importActual<typeof import('react-router-dom')>('react-router-dom'),useNavigate:()=>fixture.navigate}));
vi.mock('./useQuestionFinderBanks',()=>({useQuestionFinderBanks:()=>fixture.banks}));
vi.mock('./useFinderAddressIndex',()=>({useFinderAddressIndex:()=>fixture.index}));
const makePassage=(id:number,pt:number,position:number,title:string,count=1)=>({passageId:id,preptest:pt,section:4,setNumber:position,title,topic:'Science',questionCount:count,firstWords:'Synthetic opening'});
function open(bank:'rc'|'all'='rc'){
 render(<MemoryRouter><QuestionFinder returnTo='/practice/drills?section=rc' bank={bank==='all'?undefined:bank}/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Find a question'}));return screen.getByRole('dialog',{name:'Find a question'});
}
const type=(dialog:HTMLElement,value:string)=>fireEvent.change(within(dialog).getByRole('textbox'),{target:{value}});
describe('RC passage and question lookup',()=>{
 beforeEach(()=>{
  fixture.navigate.mockReset();
  fixture.banks={loading:false,error:null,lrFailed:false,rcFailed:false,retry:vi.fn(),lr:[],rcPassages:[makePassage(14,140,1,'Marine ecosystems'),makePassage(15,140,2,'Libraries'),makePassage(19,140,5,'Empty',0)],rcQuestions:[{questionId:1588,passageId:14,preptest:140,section:4,qnum:1,position:1,prompt:'Marine main point'},{questionId:1594,passageId:15,preptest:140,section:4,qnum:7,position:7,prompt:'Libraries main point'}]};
  fixture.index={loading:false,failed:false,retry:vi.fn(),tests:[{pt:140,sections:[{section:4,lr:[],rc:[{id:14,position:1,title:'Marine ecosystems',questions:[{id:1588,number:1}]},{id:15,position:2,title:'Libraries',questions:[{id:1594,number:7}]},{id:19,position:5,title:'Empty',questions:[]}]}]},{pt:141,sections:[{section:3,lr:[],rc:[{id:21,position:1,title:'New passage',questions:[{id:2001,number:1}]}]}]}]};
 });
 it('opens a title-matched passage immediately without an arbitrary question',async()=>{
  const d=open();type(d,'Marine ecosystems');fireEvent.click(await within(d).findByRole('button',{name:/PT 140 · S4 · P1/}));
  expect(fixture.navigate).toHaveBeenCalledWith('/rc/preview?passage=14&returnTo=%2Fpractice%2Fdrills%3Fsection%3Drc', { replace:false, state: { finderPreviewHistory: 'push' } });
 });
 it('offers an explicit passage selector and an optional question within that passage',async()=>{
  const d=open();fireEvent.change(within(d).getByLabelText('Test'),{target:{value:'140'}});await waitFor(()=>expect(within(d).getByLabelText('Section')).toHaveValue('4'));
  fireEvent.change(within(d).getByLabelText('Passage'),{target:{value:'2'}});expect(within(d).getByRole('textbox')).toHaveValue('PT140 S4 P2');expect(within(d).getByRole('button',{name:'Open preview'})).toBeEnabled();
  fireEvent.click(within(d).getByRole('combobox',{name:'Question'}));expect(screen.queryByRole('option',{name:/Question 1,/})).toBeNull();fireEvent.click(screen.getByText('Question 7'));
  expect(within(d).getByRole('textbox')).toHaveValue('PT140 S4 P2 Q7');fireEvent.click(within(d).getByRole('button',{name:'Open preview'}));expect(fixture.navigate).toHaveBeenCalledWith('/rc/preview?passage=15&q=1594&returnTo=%2Fpractice%2Fdrills%3Fsection%3Drc', { replace: false, state: { finderPreviewHistory: 'push' } });
 });
 it.each(['PT140 S4 P2 Q1','PT140 S4 P5','PT140 S4 P0','PT140 S3 P1','PT999 S4 P1','unrelated phrase'])('rejects invalid or stale passage targets after query %s',query=>{
  const d=open();type(d,'PT140 S4 P1');expect(within(d).getByRole('button',{name:'Open preview'})).toBeEnabled();type(d,query);expect(within(d).getByRole('button',{name:'Open preview'})).toBeDisabled();expect(within(d).getByRole('button',{name:'Open preview'})).toBeDisabled();expect(fixture.navigate).not.toHaveBeenCalled(); if(query==='PT140 S4 P2 Q1'){expect(within(d).getByRole('textbox')).toHaveValue(query);expect(within(d).getByRole('combobox',{name:'Question'})).not.toHaveTextContent('Question 1');}
 });
 it.each(['clear','escape','bank','test','section'])('clears retained passage identity on %s',async action=>{
  const d=open();type(d,'PT140 S4 P2');expect(within(d).getByRole('button',{name:'Open preview'})).toBeEnabled();
  if(action==='clear')fireEvent.click(within(d).getByRole('button',{name:'Clear search'}));
  if(action==='escape')fireEvent.keyDown(within(d).getByRole('textbox'),{key:'Escape'});
  if(action==='bank')fireEvent.click(within(d).getByRole('button',{name:'LR'}));
  if(action==='test')fireEvent.change(within(d).getByLabelText('Test'),{target:{value:'141'}});
  if(action==='section')fireEvent.change(within(d).getByLabelText('Section'),{target:{value:''}});
  await waitFor(()=>expect(within(d).getByRole('button',{name:'Open preview'})).toBeDisabled());expect(within(d).getByRole('button',{name:'Open preview'})).toBeDisabled();expect(fixture.navigate).not.toHaveBeenCalled();
 });
 it('omits empty passages from selection and query results',async()=>{
  const d=open();fireEvent.change(within(d).getByLabelText('Test'),{target:{value:'140'}});await waitFor(()=>expect(within(d).getByLabelText('Section')).toHaveValue('4'));expect(within(d).queryByRole('option',{name:'Passage 5 · Empty'})).toBeNull();type(d,'Empty');expect(within(d).queryByRole('button',{name:/PT 140 · S4 · P5/})).toBeNull();
 });
 it('adds RC results in sixes and resets keyboard position with a new query',()=>{
  fixture.banks.rcPassages=Array.from({length:15},(_,i)=>makePassage(100+i,140+i,1,'Marine study '+i));fixture.banks.rcQuestions=[];
  const d=open();type(d,'Marine');expect(within(d).getAllByRole('button',{name:/PT \d+ · S4 · P1/})).toHaveLength(6);fireEvent.click(within(d).getByRole('button',{name:'Show more RC results'}));expect(within(d).getAllByRole('button',{name:/PT \d+ · S4 · P1/})).toHaveLength(12);fireEvent.click(within(d).getByRole('button',{name:'Show more RC results'}));expect(within(d).getAllByRole('button',{name:/PT \d+ · S4 · P1/})).toHaveLength(15);expect(within(d).queryByRole('button',{name:'Show more RC results'})).toBeNull();
  fireEvent.keyDown(within(d).getByRole('textbox'),{key:'ArrowDown'});type(d,'Marine study 1');expect(d.querySelectorAll('.qf-row[data-active="true"]')).toHaveLength(1);expect(d.querySelector('.qf-row[data-active="true"]')).toBe(d.querySelector('.qf-row'));
 });
 it('bounds expansion at 60 and asks for refinement when more matches remain',()=>{
  fixture.banks.rcPassages=Array.from({length:65},(_,i)=>makePassage(100+i,100+i,1,'Marine study '+i));fixture.banks.rcQuestions=[];
  const d=open();type(d,'Marine');for(let i=0;i<9;i++)fireEvent.click(within(d).getByRole('button',{name:'Show more RC results'}));expect(within(d).getAllByRole('button',{name:/PT \d+ · S4 · P1/})).toHaveLength(60);expect(within(d).queryByRole('button',{name:'Show more RC results'})).toBeNull();expect(within(d).getByText(/Showing the first 60 results/)).toBeInTheDocument();
 });
 it('does not open an ambiguous mixed LR/RC exact question',()=>{
  fixture.banks.lr=[{qid:'PT140-S4-Q1',pt:140,section:4,qnum:1,qtype:'Flaw',questionStem:'Synthetic'}];const d=open('all');type(d,'PT140 S4 Q1');expect(within(d).getByRole('button',{name:'Open preview'})).toBeDisabled();expect(fixture.navigate).not.toHaveBeenCalled();
 });
});

describe('RC single-section address completion',()=>{
 beforeEach(()=>{
  fixture.navigate.mockReset();fixture.banks={loading:false,error:null,lrFailed:false,rcFailed:false,retry:vi.fn(),lr:[],rcPassages:[],rcQuestions:[]};
  fixture.index={loading:false,failed:false,retry:vi.fn(),tests:[{pt:140,sections:[{section:4,lr:[],rc:[{id:15,position:2,title:'Libraries',questions:[{id:1594,number:7}]}]}]}]};
 });
 it('keeps a typed question number when completing the only RC section',async()=>{
  const d=open();type(d,'PT140 Q7');await waitFor(()=>expect(within(d).getByRole('textbox')).toHaveValue('PT140 S4 Q7'));expect(within(d).getByRole('button',{name:'Open preview'})).toBeEnabled();fireEvent.click(within(d).getByRole('button',{name:'Open preview'}));expect(fixture.navigate).toHaveBeenCalledWith('/rc/preview?passage=15&q=1594&returnTo=%2Fpractice%2Fdrills%3Fsection%3Drc', { replace: false, state: { finderPreviewHistory: 'push' } });
 });
 it('does not guess a section when more than one RC section can contain the question',()=>{
  fixture.index.tests[0].sections.push({section:3,lr:[],rc:[{id:21,position:1,title:'Other',questions:[{id:2007,number:7}]}]});const d=open();type(d,'PT140 Q7');expect(within(d).getByRole('textbox')).toHaveValue('PT140 Q7');expect(within(d).getByRole('button',{name:'Open preview'})).toBeDisabled();expect(fixture.navigate).not.toHaveBeenCalled();
 });
});

describe('RC clicked-result provenance across separate indexes',()=>{
 beforeEach(()=>{
  fixture.navigate.mockReset();fixture.banks={loading:false,error:null,lrFailed:false,rcFailed:false,retry:vi.fn(),lr:[],rcPassages:[makePassage(14,140,1,'Marine ecosystems')],rcQuestions:[{questionId:1588,passageId:14,preptest:140,section:4,qnum:1,position:1,prompt:'Marine main point'}]};
  fixture.index={loading:false,failed:false,retry:vi.fn(),tests:[{pt:140,sections:[{section:4,lr:[],rc:[{id:999,position:1,title:'Different passage',questions:[{id:8888,number:1}]},{id:15,position:2,title:'Libraries',questions:[{id:1594,number:7}]}]}]},{pt:141,sections:[{section:3,lr:[],rc:[{id:21,position:1,title:'Other passage',questions:[{id:2001,number:1}]}]}]}]};
 });
 it('announces a loading block as status and an unavailable index as alert', async()=>{
  fixture.index.loading=true;
  const d=open();type(d,'Marine ecosystems');fireEvent.click(await within(d).findByRole('button',{name:/PT 140 · S4 · P1/}));
  expect(within(d).getByText(/Choose this result again/)).toHaveAttribute('role','status');
  fixture.index.loading=false;fixture.index.failed=true;
  type(d,'Marine ecosystems ');fireEvent.click(await within(d).findByRole('button',{name:/PT 140 · S4 · P1/}));
  expect(within(d).getByText(/Retry before opening a preview/)).toHaveAttribute('role','alert');
  expect(fixture.navigate).not.toHaveBeenCalled();
 });
 it('blocks a clicked passage when another index maps its address to a different passage id',async()=>{
  const d=open();type(d,'Marine ecosystems');fireEvent.click(await within(d).findByRole('button',{name:/PT 140 · S4 · P1/}));expect(within(d).getByRole('button',{name:'Open preview'})).toBeDisabled();expect(within(d).getByRole('alert')).toHaveTextContent(/no longer matches/i);expect(fixture.navigate).not.toHaveBeenCalled();
 });
 it('blocks a clicked exact question when its question id differs despite matching passage and question number',async()=>{
  fixture.index.tests[0].sections[0].rc[0].id=14;
  const d=open();type(d,'Marine main point');fireEvent.click(await within(d).findByRole('button',{name:/PT 140 · S4 · Q1/}));expect(within(d).getByRole('button',{name:'Open preview'})).toBeDisabled();expect(within(d).getByRole('alert')).toHaveTextContent(/no longer matches/i);expect(fixture.navigate).not.toHaveBeenCalled();
 });
 it('blocks a clicked passage when the same id has moved to another passage position',async()=>{
  fixture.index.tests[0].sections[0].rc[0].id=14;fixture.index.tests[0].sections[0].rc[0].position=3;
  const d=open();type(d,'Marine ecosystems');fireEvent.click(await within(d).findByRole('button',{name:/PT 140 · S4 · P1/}));expect(within(d).getByRole('button',{name:'Open preview'})).toBeDisabled();expect(within(d).getByRole('alert')).toHaveTextContent(/no longer matches/i);expect(fixture.navigate).not.toHaveBeenCalled();
 });
 it.each(['typing','clear','escape','bank','test','section'])('clears clicked provenance on explicit %s',async action=>{
  const d=open();type(d,'Marine ecosystems');fireEvent.click(await within(d).findByRole('button',{name:/PT 140 · S4 · P1/}));expect(within(d).getByRole('alert')).toHaveTextContent(/no longer matches/i);
  if(action==='typing')type(d,'PT140 S4 P2');
  if(action==='clear')fireEvent.click(within(d).getByRole('button',{name:'Clear search'}));
  if(action==='escape')fireEvent.keyDown(within(d).getByRole('textbox'),{key:'Escape'});
  if(action==='bank')fireEvent.click(within(d).getByRole('button',{name:'LR'}));
  if(action==='test')fireEvent.change(within(d).getByLabelText('Test'),{target:{value:'141'}});
  if(action==='section')fireEvent.change(within(d).getByLabelText('Section'),{target:{value:''}});
  await waitFor(()=>expect(within(d).queryByText(/no longer matches/i)).toBeNull());
  if(action==='typing')expect(within(d).getByRole('button',{name:'Open preview'})).toBeEnabled();
  else expect(within(d).getByRole('button',{name:'Open preview'})).toBeDisabled();
  expect(fixture.navigate).not.toHaveBeenCalled();
 });
});
