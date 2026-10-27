import { useEffect, useId, useState } from 'react';
import { formulaAtoms, equivalent, ruleFormula } from '../content/fullCourseLogic';
import type { Formula, Rule } from '../content/fullCourseTypes';
import { checkMissingLink, contrapose, literalFormula, missingLinks, readFormula, type Literal, type MissingLink } from '../content/missingLinks';
import './missing-links.css';

export function LinkFormula({ value }: { value: Formula }) {
 if ('atom' in value) return <span>{value.atom}</span>;
 if ('not' in value) return <span className="ml-negative" aria-label={readFormula(value)}><span aria-hidden="true"><LinkFormula value={value.not}/></span></span>;
 return <span>{('and' in value ? value.and : value.or).map((part,index)=><span key={index}>{index>0 && ('and' in value ? ' AND ' : ' OR ')}<LinkFormula value={part}/></span>)}</span>;
}
export function LinkRule({ value }: { value: Rule }) { return <span className="ml-rule"><LinkFormula value={value.if}/><span aria-label="implies"> → </span><LinkFormula value={value.then}/></span>; }
type Work = { left: Literal | null; right: Literal | null; flips: boolean[]; attempts: number; status: 'editing'|'hint'|'match'|'revealed' };
type Saved = { revision: 1; current: string; work: Record<string,Work> };
const blank = (item: MissingLink): Work => ({left:null,right:null,flips:item.premises.map(()=>false),attempts:0,status:'editing'});
const candidate = (work: Work): Rule | null => work.left && work.right ? {if:literalFormula(work.left),then:literalFormula(work.right)} : null;
const keyFor = (scope: string) => `conditional-missing-links-v1:${scope}`;
function validWork(raw: unknown,item: MissingLink): raw is Work {
 const w = raw as Work;
 const ids = [...new Set([...item.premises,item.conclusion].flatMap(p=>formulaAtoms(ruleFormula(p))))];
 const validLiteral = (v: Literal|null) => v===null || (v && ids.includes(v.atom) && typeof v.negative==='boolean');
 return !!w && validLiteral(w.left) && validLiteral(w.right) && Array.isArray(w.flips) && w.flips.length===item.premises.length && w.flips.every(v=>typeof v==='boolean') && Number.isInteger(w.attempts) && w.attempts>=0 && ['editing','hint','match','revealed'].includes(w.status) && (!(w.status==='match'||w.status==='revealed') || !!candidate(w) && equivalent(ruleFormula(candidate(w)!),ruleFormula(item.bridge)).correct);
}
function load(scope: string): { saved: Saved; notice: string } {
 const fresh: Saved = {revision:1,current:missingLinks[0].id,work:{}};
 try {
  const raw=JSON.parse(localStorage.getItem(keyFor(scope))??'null');
  if (!raw) return {saved:fresh,notice:''};
  if (raw.revision!==1 || !missingLinks.some(i=>i.id===raw.current) || !raw.work || typeof raw.work!=='object' || Object.entries(raw.work).some(([id,w])=>!missingLinks.some(i=>i.id===id && validWork(w,i)))) return {saved:fresh,notice:'The saved round could not be restored. Start a fresh round here.'};
  return {saved:raw,notice:''};
 } catch { return {saved:fresh,notice:'Saved work could not be read. You can still practice here.'}; }
}
export type MissingLinksPracticeProps = { storageScope: string; itemId?: string; round?: number };
export function MissingLinksPractice(props: MissingLinksPracticeProps) { return <MissingLinksRun key={props.storageScope} {...props}/>; }
function MissingLinksRun({storageScope,itemId,round}: MissingLinksPracticeProps) {
 const [initial]=useState(()=>load(storageScope));
 const [saved,setSaved]=useState(initial.saved);
 const [saveMessage,setSaveMessage]=useState(initial.notice);
 const [selection,setSelection]=useState<string|null>(null);
 const heading=useId();
 const requested=missingLinks.find(i=>i.id===itemId) ?? missingLinks.find(i=>i.round===round);
 useEffect(()=>{if(requested)setSaved(s=>({...s,current:requested.id}));},[requested?.id]);
 useEffect(()=>{try{localStorage.setItem(keyFor(storageScope),JSON.stringify(saved));}catch{setSaveMessage('Your work is available here, but this browser could not save it.');}},[saved,storageScope]);
 const item=missingLinks.find(i=>i.id===saved.current)!;
 const work=saved.work[item.id]??blank(item);
 const built=candidate(work);
 const checked=built?checkMissingLink(item,built):null;
 const resolved=work.status==='match'||work.status==='revealed';
 const update=(change: Partial<Work>)=>setSaved(s=>({...s,work:{...s.work,[item.id]:{...work,...change}}}));
 const choose=(id: string)=>{setSaved(s=>({...s,current:id}));setSelection(null);};
 const atoms=[...new Set([...item.premises,item.conclusion].flatMap(p=>formulaAtoms(ruleFormula(p))))];
 return <section className="missing-links" aria-labelledby={heading}>
  <h2 id={heading}>Missing Links practice</h2><p>Fill the gap between two parts of a chain. These optional rounds are saved in this browser. They do not complete a course lesson.</p>
  {saveMessage && <p role="status">{saveMessage}</p>}
  <div className="ml-rounds" aria-label="Choose a round">{[1,2,3].map(n=><button key={n} aria-pressed={item.round===n} onClick={()=>choose(missingLinks.find(i=>i.round===n)!.id)}>Round {n}: {n===1?'one given rule':n===2?'two given rules':'negative ends'}</button>)}</div>
  <label>Choose an exercise <select value={item.id} onChange={e=>choose(e.target.value)}>{missingLinks.map(i=><option key={i.id} value={i.id}>Exercise {i.ordinal} · Round {i.round}{saved.work[i.id]?.status==='match'?' · solved':saved.work[i.id]?.status==='revealed'?' · answer viewed':''}</option>)}</select></label>
  <div className="ml-problem"><p className="ml-label">Given rules</p>{item.premises.map((p,index)=><div className="ml-premise" key={index}><LinkRule value={work.flips[index]?contrapose(p):p}/><button onClick={()=>update({flips:work.flips.map((v,i)=>i===index?!v:v)})}>{work.flips[index]?'Show original':'Show contrapositive'}</button></div>)}
   <p className="ml-label">Conclusion to prove</p><LinkRule value={item.conclusion}/>
  </div>
  <p>Start at the conclusion’s IF side. Follow the given rules. Add the connection that lets the chain reach its THEN side.</p>
  <fieldset disabled={resolved}><legend>Your added rule</legend>
   <div className="ml-palette" aria-label="Choose an idea">{atoms.map(name=><button aria-pressed={selection===name} key={name} onClick={()=>setSelection(name)}>{name}</button>)}</div>
   <div className="ml-builder">{(['left','right'] as const).map((side,index)=><div key={side}><span>{index===0?'IF':'THEN'}</span><button aria-label={`Place selected idea on ${index===0?'IF':'THEN'}`} disabled={!selection} onClick={()=>update({[side]:{atom:selection!,negative:false},status:'editing'})}>{work[side]?<LinkFormula value={literalFormula(work[side]!)}/>:'Choose an idea above, then place it here'}</button><button disabled={!work[side]} aria-pressed={!!work[side]?.negative} onClick={()=>update({[side]:{...work[side]!,negative:!work[side]!.negative},status:'editing'})}>Negate {index===0?'IF':'THEN'}</button></div>)}</div>
   <button className="fc-primary" disabled={!built} onClick={()=>update({attempts:work.attempts+1,status:checked?.kind==='match'?'match':'hint'})}>Check connection</button>
  </fieldset>
  {work.status==='hint' && <p role="status">{checked?.message}</p>}
  {work.status==='hint' && checked?.counterexample && <details><summary>Show a case where this rule falls short</summary><p>All given rules and your added rule hold in this case, but the conclusion does not: {Object.entries(checked.counterexample).map(([name,value])=>`${name} is ${value?'true':'false'}`).join('; ')}.</p></details>}
  {!resolved && <button onClick={()=>{if(work.status==='hint')update({left:toLiteral(item.bridge.if),right:toLiteral(item.bridge.then),status:'revealed'});else update({status:'hint'});}}>{work.status==='hint'?'Show the connection and proof':'Get a hint'}</button>}
  {work.status==='hint' && !built && <p>Follow a given arrow from the conclusion’s starting idea. You may need its contrapositive. Keep the conclusion as the goal, not another given rule.</p>}
  {resolved && <div className="ml-proof" role="status"><h3>{work.status==='match'?'The connection works':'The connection explained'}</h3><p>{item.explanation}</p><p className="ml-chain">{item.chain.map((f,index)=><span key={index}>{index>0 && <span className={equivalent(ruleFormula({if:item.chain[index-1],then:f}),ruleFormula(item.bridge)).correct?'ml-new-arrow':''} aria-label={equivalent(ruleFormula({if:item.chain[index-1],then:f}),ruleFormula(item.bridge)).correct?'new connection':'given connection'}> → </span>}<LinkFormula value={f}/></span>)}</p><p>The highlighted arrow is the added rule. The connected chain proves exactly: <LinkRule value={item.conclusion}/>.</p><p>The same added rule in contrapositive form: <LinkRule value={contrapose(item.bridge)}/>.</p></div>}
  <div className="ml-actions"><button onClick={()=>update(blank(item))}>Restart this exercise</button>{item.ordinal<12 && <button onClick={()=>choose(missingLinks[item.ordinal].id)}>Next exercise</button>}<button onClick={()=>{setSaved({revision:1,current:missingLinks.find(i=>i.round===item.round)!.id,work:Object.fromEntries(Object.entries(saved.work).filter(([id])=>missingLinks.find(i=>i.id===id)?.round!==item.round))});setSelection(null);}}>Restart round {item.round}</button></div>
 </section>;
}
function toLiteral(formula: Formula): Literal { return 'atom' in formula ? {atom:formula.atom,negative:false} : 'not' in formula && 'atom' in formula.not ? {atom:formula.not.atom,negative:true} : {atom:'A',negative:false}; }
