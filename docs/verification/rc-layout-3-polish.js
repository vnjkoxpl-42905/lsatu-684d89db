// Local visual study. Select composition informed by 21st.dev MCP demo14306.
// No sessions, exposure records, or student data are persisted.
import {addStudyPassage,studySelectionState,restoreStudySelection} from './rc-layout-studies.js';
const $=selector=>document.querySelector(selector);
const method=$('.method'),methodSelect=$('#method'),lookup=$('.lookup'),drawer=$('#drawer');
method.hidden=true;
document.querySelector('#reviewPanel').append(document.querySelector('#setup .foot'));
lookup.querySelector('h3').outerHTML=`<div class="lookup-heading"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><h3>Have a passage in mind?</h3></div>`;
lookup.querySelector('details').remove();
const lookupHelp=document.createElement('p');lookupHelp.className='lookup-help';lookupHelp.textContent='Optional. Leave blank for Tutor’s choice.';
lookup.querySelector('.lookup-heading').after(lookupHelp);
lookup.querySelector('#lookupOpen').remove();lookup.querySelector('p:not(.lookup-help)').remove();
const status=document.createElement('p');status.className='lookup-status';status.setAttribute('aria-live','polite');lookup.append(status);
const pt=$('#pt'),section=$('#sec'),passage=$('#pn'),review=$('#review');
const timing=$('#timing'),customTiming=document.createElement('div');customTiming.className='timing-custom';customTiming.hidden=true;
customTiming.innerHTML='<label for="minutesPerPassage">Minutes per passage</label><input id="minutesPerPassage" type="number" min="1" max="60" step="0.5" value="9" required><p class="timing-error" role="status" hidden>Enter 1–60 minutes in half-minute steps.</p>';timing.after(customTiming);
const minutes=$('#minutesPerPassage');
pt.innerHTML='<option value="">Select</option>'+[140,141,142,143].map(n=>`<option value="${n}">${n}</option>`).join('');
section.innerHTML='<option value="">Select</option><option value="3">3</option>';
passage.innerHTML='<option value="">Select</option>';
let selectionKey='[]',countBeforeLookup=null,lookupBaseline=null;
function updateLookup(){
 const ready=Boolean(pt.value&&section.value&&passage.value),selection=studySelectionState();
 const step=$('#countField .step');
 if(step){const output=step.querySelector('output');if(pt.value){if(countBeforeLookup===null)countBeforeLookup=output.textContent;output.textContent='1';}else if(countBeforeLookup!==null){output.textContent=countBeforeLookup;countBeforeLookup=null;}step.querySelectorAll('button').forEach(button=>button.disabled=Boolean(pt.value));}
 review.disabled=(pt.value?!ready:selection.mode==='manual'&&!selection.passageIds.length)||(timing.value==='Custom time'&&!minutes.checkValidity());
 customTiming.querySelector('.timing-error').hidden=timing.value!=='Custom time'||minutes.checkValidity();
 const amount=pt.value?1:selection.mode==='manual'?selection.passageIds.length:Number(step?.querySelector('output')?.textContent||1);
 $('#setup h1').textContent=amount>1?'Choose your next passages':'Choose your next passage';
 const previous=lookupBaseline||selection;
 lookupHelp.textContent=previous.mode==='manual'?previous.passageIds.length?`Optional. Leave blank to keep your ${previous.passageIds.length} selected passage${previous.passageIds.length===1?'':'s'}.`:'Choose a passage here or use Customize drill.':'Optional. Leave blank for Tutor’s choice.';
 const replaces=ready&&previous.mode==='manual'&&previous.passageIds.length&&(previous.passageIds.length!==1||previous.passageIds[0]!==Number(pt.value)-140);
 status.textContent=ready?`PT ${pt.value} · Section ${section.value} · Passage ${passage.value}${replaces?'. Replaces your '+previous.passageIds.length+' selected passage'+(previous.passageIds.length===1?'':'s')+'.':''}`:pt.value?'Choose a section and passage to continue.':selection.mode==='manual'&&!selection.passageIds.length?'Choose at least one passage to continue.':'';
}
function resetLookup(){lookupBaseline=null;pt.value='';section.value='';section.disabled=true;passage.innerHTML='<option value="">Select</option>';passage.disabled=true;updateLookup();}
pt.onchange=()=>{if(!pt.value&&lookupBaseline){restoreStudySelection(lookupBaseline);selectionKey=JSON.stringify(studySelectionState().passageIds);lookupBaseline=null;}section.value='';section.disabled=!pt.value;passage.value='';passage.disabled=true;updateLookup();};
section.onchange=()=>{passage.innerHTML='<option value="">Select</option>';if(section.value){const number=Number(pt.value)-139;passage.insertAdjacentHTML('beforeend',`<option value="${number}">${number}</option>`);}passage.disabled=!section.value;updateLookup();};
passage.onchange=updateLookup;
lookup.addEventListener('change',updateLookup);
$('#countField').addEventListener('click',updateLookup);
timing.addEventListener('change',()=>{customTiming.hidden=timing.value!=='Custom time';updateLookup();});minutes.addEventListener('input',updateLookup);
$('#apply').addEventListener('click',()=>{if($('#drawerTitle').textContent==='Pick passages')resetLookup();},true);
review.addEventListener('click',()=>{
 if(!pt.value||!section.value||!passage.value)return;
 const index=Number(pt.value)-140;
 if(!lookupBaseline)lookupBaseline=studySelectionState();
 addStudyPassage(index,{replace:true,quiet:true});selectionKey=JSON.stringify(studySelectionState().passageIds);
},true);
review.addEventListener('click',()=>{if(timing.value==='Custom time')$('#reviewMeta').textContent=$('#reviewMeta').textContent.replace('Custom time',`${minutes.value} min per passage`);});
const reviewHeading=$('#reviewPanel .reviewTitle'),setupHeading=$('#setup h1');reviewHeading.tabIndex=-1;setupHeading.tabIndex=-1;
review.addEventListener('click',()=>reviewHeading.focus());
$('#edit').addEventListener('click',()=>setupHeading.focus());$('#back').addEventListener('click',()=>setupHeading.focus());
new MutationObserver(()=>{
 if(!drawer.hidden&&$('#drawerTitle').textContent==='Customize drill'&&!$('#drawerMethod')){
  const group=document.createElement('section');group.className='group';group.innerHTML='<label for="drawerMethod" class="drawer-method-label">Passage selection</label><select id="drawerMethod"><option value="auto">Tutor’s choice</option><option value="manual">Pick specific passages</option></select>';
  $('#drawerBody').prepend(group);$('#drawerMethod').value=studySelectionState().mode;
  if(studySelectionState().mode==='manual'){const edit=document.createElement('button');edit.type='button';edit.className='drawer-edit-passages';edit.textContent='Edit selected passages';edit.onclick=()=>{methodSelect.value='manual';methodSelect.dispatchEvent(new Event('change',{bubbles:true}));};group.append(edit);}
  let stagedAuto=false;const originalApply=$('#apply').onclick;
  $('#drawerMethod').onchange=event=>{stagedAuto=event.target.value==='auto';if(!stagedAuto){methodSelect.value='manual';methodSelect.dispatchEvent(new Event('change',{bubbles:true}));}};
  $('#apply').onclick=()=>{originalApply();if(stagedAuto){methodSelect.value='auto';methodSelect.dispatchEvent(new Event('change',{bubbles:true}));resetLookup();}$('#toast').textContent='Design preview only. Filters do not change the sample passage pool.';};
 }
 if(drawer.hidden){const nextKey=JSON.stringify(studySelectionState().passageIds);if(nextKey!==selectionKey){selectionKey=nextKey;resetLookup();}updateLookup();}
}).observe(drawer,{attributes:true,attributeFilter:['hidden']});
document.querySelector('.compare>span').textContent='RC drill design preview · sample data';
document.querySelector('.intro>div>p').textContent='Whole passages, with every question.';
document.querySelector('.note').textContent='Local design preview. No sessions or student data are saved.';
review.textContent='Review passages';
document.querySelector('.next p').textContent='Review first. Start when you’re ready.';
updateLookup();

