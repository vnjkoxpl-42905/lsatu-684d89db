import { useState, type ReactNode } from 'react';
import { englishTransfers } from '../content/missingLinks';
import './missing-links.css';

export function MissingLinksLesson({quiz}: {quiz: ReactNode}) {
 return <article className="fc-lesson missing-links">
  <section><h2>Add the rule that makes the conclusion follow</h2><p>A sufficient assumption is an added statement that makes the conclusion follow from the premises. We treat that statement as true, put it beside the given information, and check whether the conclusion now has to be true.</p><p>Here we will practice one common job: connecting two parts of a conditional chain. The conclusion tells us where the chain needs to start and end. It is the goal. We do not get to use it as another premise.</p></section>
  <section className="ml-problem"><h2>Find the missing connection</h2><p><strong>Given rule:</strong> Every archived photograph is catalogued.</p><p><strong>Conclusion to prove:</strong> Every archived photograph is searchable.</p><p>Start with an archived photograph. The given rule gets us to catalogued. But nothing yet gets us from catalogued to searchable.</p><p><strong>Add:</strong> Every catalogued photograph is searchable.</p><p>Now follow the same photograph: archived → catalogued → searchable. The added rule fills the gap. Every archived photograph must now be searchable, which is exactly the conclusion.</p><p>This does not mean the added rule was already true. We are asking what follows <em>if we add it</em>.</p></section>
  <MissingLinkWarmup/>
  <section><h2>Keep the task straight</h2><p>A necessary assumption must be true for the argument to work. A sufficient assumption does a different job: once added, it makes the conclusion follow. Do not switch to asking what the argument needs to assume.</p><p>In Missing Links, compare each proposed rule with the conclusion you need to prove. Add the rule to the given premises and check whether the conclusion follows.</p><p>A rule and its contrapositive say the same thing. If a premise faces the wrong way for your chain, turn it around and negate both sides. Keep every negative when you check the conclusion.</p></section>
  {quiz}
 </article>;
}
function MissingLinkWarmup() {
 const [answer,setAnswer]=useState<number|null>(null);
 const [status,setStatus]=useState<'editing'|'hint'|'correct'|'revealed'>('editing');
 return <section className="ml-formative"><h2>Try a fresh connection</h2><p>Every inspected crate is sealed. We want to prove that every inspected crate is tracked. Which added rule fills the gap?</p>{['Every sealed crate is tracked.','Every tracked crate is sealed.','Every tracked crate is inspected.'].map((text,index)=><label key={text}><input type="radio" name="missing-links-warmup" checked={answer===index} onChange={()=>{setAnswer(index);setStatus('editing');}}/>{text}</label>)}<button disabled={answer===null} onClick={()=>setStatus(answer===0?'correct':'hint')}>Check connection</button>{status==='hint' && <><p role="status">Inspection already gives sealing. Look for a rule that starts with sealing and reaches tracking.</p><button onClick={()=>setStatus('revealed')}>Show the connection</button></>}{(status==='correct'||status==='revealed') && <p role="status">Add: Every sealed crate is tracked. An inspected crate is sealed under the given rule, then tracked under the added rule. So every inspected crate is tracked.</p>}</section>;
}
export function MissingLinksEnglishTransfer() {
 return <section className="missing-links"><h2>Try the connection in English</h2><p>These optional checks do not change your course completion.</p>{englishTransfers.map(item=><EnglishTransfer key={item.id} item={item}/>)}</section>;
}
function EnglishTransfer({item}: {item: typeof englishTransfers[number]}) {
 const [selected,setSelected]=useState<number|null>(null);
 const [status,setStatus]=useState<'editing'|'hint'|'correct'|'revealed'>('editing');
 return <section className="ml-formative"><p>{item.prompt}</p>{item.choices.map((text,index)=><label key={text}><input name={item.id} type="radio" checked={selected===index} onChange={()=>{setSelected(index);setStatus('editing');}}/>{text}</label>)}<button disabled={selected===null} onClick={()=>setStatus(selected===item.correct?'correct':'hint')}>Check added rule</button>{status==='hint' && <><p role="status">{item.hint}</p><button onClick={()=>setStatus('revealed')}>Show the reasoning</button></>}{(status==='correct'||status==='revealed') && <p role="status">{item.explanation}</p>}</section>;
}
