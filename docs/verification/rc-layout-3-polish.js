// Local visual study. Select composition informed by HeroUI Select from 21st.dev,
// fetched via MCP (demo 14306). Native controls retain keyboard/typeahead semantics.
// This prototype neither creates sessions nor persists student data.
import './rc-layout-studies.js';
const intro=document.querySelector('.intro>div');
const method=document.querySelector('.method');
const lookup=document.querySelector('.lookup');
intro.insertBefore(method,lookup);
lookup.querySelector('h3').outerHTML=`<div class="lookup-heading"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><h3>Have a passage in mind?</h3></div>`;
lookup.querySelector('details').classList.add('question-toggle');
const action=document.createElement('div');action.className='lookup-action';
const helper=lookup.querySelector('p');helper.textContent='Text stays hidden until you reveal it.';
action.append(helper,lookup.querySelector('#lookupOpen'));lookup.append(action);
const status=document.createElement('p');status.className='lookup-status';status.setAttribute('aria-live','polite');lookup.append(status);
const pt=lookup.querySelector('#pt'),section=lookup.querySelector('#sec'),passage=lookup.querySelector('#pn'),question=lookup.querySelector('[aria-label="Optional question"]');
pt.options[0].textContent='Select';section.options[0].textContent='Select';passage.options[0].textContent='Select';
function updateLookup(){status.textContent=passage.value?`PT ${pt.value} · Section ${section.value} · Passage ${passage.value}`:'';question.disabled=!passage.value;}
lookup.addEventListener('change',updateLookup);updateLookup();
document.querySelector('.note').textContent='Refined 03: passage selection on the left, practice conditions on the right. Local design study.';
