import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { OpeningCourseScreen } from './OpeningCourse';
import { COURSE_STEP_REGISTRY } from '../openingCoursePath';
import { courseUrl, conditionalCentreUrl } from '../routes';
import type { CourseProgressStore } from '../courseProgress';
import { courseChapterProgress } from '../courseNavigation';
import { applyConditionalRequirements, PRE_SPLIT_REQUIRED_STEP_IDS } from '../courseRequirements';

const base='/bootcamp/conditionals';
const identity='assignment=owned-row&edition=full-conditionals-v3';
const NAV_STEPS=applyConditionalRequirements(COURSE_STEP_REGISTRY,{source:'pre-split-default',revision:'pre-split-default',requiredStepIds:[...PRE_SPLIT_REQUIRED_STEP_IDS]});
afterEach(cleanup);
function mount(view='home', query='', saved:CourseProgressStore['steps']={}, steps=NAV_STEPS) {
  const save=vi.fn(), resume=vi.fn();
  let currentSearch='';
  function Harness(){const location=useLocation();currentSearch=location.search;const name=location.pathname.split('/').pop()!;return <OpeningCourseScreen view={name === 'opening-practice' ? 'practice' : name === 'opening-tools' ? 'tools' : name} steps={steps} progressStore={{steps:saved,save,resume}} url={courseUrl(location.search)}/>;}
  const result=render(<MemoryRouter initialEntries={[`${base}/opening/${view}?${identity}${query}`]}><Harness/></MemoryRouter>);
  return {...result,save,resume,getSearch:()=>currentSearch};
}
it('links every actual chapter to its lessons and drills without nested controls',()=>{
  const {container,save,resume}=mount();
  const parts=[...new Set(NAV_STEPS.map(step=>step.part??1))];
  expect(container.querySelectorAll('.oc-topic-card')).toHaveLength(parts.length);
  for(const part of parts){
    const card=container.querySelectorAll('.oc-topic-card')[parts.indexOf(part)];
    const main=card.querySelector('.oc-vol') as HTMLAnchorElement;
    expect(main.href).toContain(`/opening/chapter-${part}`);
    for(const link of card.querySelectorAll('a')){
      const target=new URL((link as HTMLAnchorElement).href);
      expect(target.searchParams.get('assignment')).toBe('owned-row');
      expect(target.searchParams.get('edition')).toBe('full-conditionals-v3');
    }
    const lessonLinks=card.querySelectorAll('.oc-topic-lessons li a');
    const notes=NAV_STEPS.filter(step=>(step.part??1)===part&&step.type==='note');
    expect(lessonLinks).toHaveLength(notes.length);
    notes.forEach((note,index)=>expect(lessonLinks[index].getAttribute('href')).toContain(`/opening/${note.id}?`));
    expect(card.querySelector('a a,a button,button a,button button')).toBeNull();
    if(part>=4) expect(card.querySelector('[aria-label$=" flashcards"]')).toBeNull();
  }
  expect(save).not.toHaveBeenCalled();expect(resume).not.toHaveBeenCalled();
});
it('filters home chapter status without changing completion or saving progress',()=>{
  const saved={meaning:{status:'done' as const,updatedAt:'2026-10-27'},sufficient:{status:'started' as const,updatedAt:'2026-10-27'}};
  const {container,save,resume}=mount('home','',saved);
  const before=screen.getByRole('progressbar',{name:'Course completion'}).getAttribute('aria-valuenow');
  fireEvent.click(screen.getByRole('button',{name:'Filters'}));
  fireEvent.change(screen.getByRole('combobox',{name:'Progress'}),{target:{value:'in-progress'}});
  expect(container.querySelectorAll('.oc-topic-card')).toHaveLength(1);
  expect(screen.getByRole('progressbar',{name:'Course completion'})).toHaveAttribute('aria-valuenow',before);
  fireEvent.change(screen.getByRole('combobox',{name:'Progress'}),{target:{value:'completed'}});
  expect(screen.getByText('No work matches these filters.')).toBeVisible();
  expect(container.querySelectorAll('.oc-topic-card')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button',{name:'Reset filters'}));
  expect(container.querySelectorAll('.oc-topic-card')).toHaveLength(7);
  expect(save).not.toHaveBeenCalled();expect(resume).not.toHaveBeenCalled();
});
it('chapter lesson and drill filters keep the unfiltered required count',()=>{
  const saved={meaning:{status:'done' as const,updatedAt:'2026-10-27'}};
  const {container,save,resume}=mount('chapter-1','&courseContent=lessons',saved);
  expect(container.querySelectorAll('.oc-path-step[data-kind=drill]')).toHaveLength(0);
  expect(container.querySelectorAll('.oc-path-step[data-kind=note]')).toHaveLength(5);
  const expected=courseChapterProgress(NAV_STEPS.filter(step=>(step.part??1)===1),saved);
  expect(screen.getByRole('progressbar',{name:'Chapter 1 completion'})).toHaveAttribute('aria-valuetext',`${expected.percent}% complete, 1 of ${expected.requiredTotal} steps done`);
  fireEvent.click(within(screen.getByRole('navigation',{name:'Choose work'})).getByRole('link',{name:'Drills'}));
  expect(container.querySelectorAll('.oc-path-step[data-kind=note]')).toHaveLength(0);
  expect(container.querySelectorAll('.oc-path-step[data-kind=drill]').length).toBeGreaterThan(0);
  expect(screen.getByRole('progressbar',{name:'Chapter 1 completion'})).toHaveAttribute('aria-valuetext',`${expected.percent}% complete, 1 of ${expected.requiredTotal} steps done`);
  expect(save).not.toHaveBeenCalled();expect(resume).not.toHaveBeenCalled();
});
it('direct drill links resume only started work',()=>{
  mount('chapter-1','&courseContent=drills',{'foundation-practice':{status:'started',updatedAt:'2026-10-27'},'sufficient-practice':{status:'done',updatedAt:'2026-10-27'}});
  const drills=NAV_STEPS.filter(step=>(step.part??1)===1&&step.type==='drill');
  for(const drill of drills){const link=screen.getByRole('link',{name:new RegExp(`(?:Start|Continue|Review) drill: ${drill.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`)});const query=new URL(link.getAttribute('href')!,'https://local.test').searchParams;expect(query.get('run')).toBe(drill.id==='foundation-practice'?'1':null);}
});
it('removes list filters from lesson, drill, centre and flashcard destinations',()=>{
  const search=`?${identity}&courseChapter=3&courseContent=drills&courseStatus=completed`;
  for(const destination of ['sufficient','sufficient-practice','centre','tools','practice']){const target=new URL(courseUrl(search)(destination),'https://local.test');for(const key of ['courseChapter','courseContent','courseStatus'])expect(target.searchParams.has(key)).toBe(false);expect(target.searchParams.get('assignment')).toBe('owned-row');}
  const target=new URL(conditionalCentreUrl(search),'https://local.test');expect(target.searchParams.has('courseStatus')).toBe(false);
});

it('never labels optional-only chapter or course work completed',()=>{
  const optional=applyConditionalRequirements(COURSE_STEP_REGISTRY.filter(step=>step.part===2),{source:'snapshot',revision:'fixture',requiredStepIds:[]});
  for(const saved of [{},Object.fromEntries(optional.map(step=>[step.id,{status:'done' as const,updatedAt:'2026-10-27'}]))]){
    const chapter=mount('chapter-2','',saved,optional);
    expect(chapter.container.querySelector('.oc-browse-summary')).toHaveTextContent('Optional · No required steps');
    expect(screen.queryByText('Every lesson and drill done')).toBeNull();
    expect(chapter.save).not.toHaveBeenCalled();expect(chapter.resume).not.toHaveBeenCalled();
    cleanup();
    const home=mount('home','',saved,optional);
    expect(screen.getByRole('region',{name:'Optional course work'})).toBeVisible();
    expect(screen.getByRole('heading',{name:'Choose what to work on.'})).toBeVisible();
    expect(screen.queryByText('Every step is done.')).toBeNull();
    expect(screen.queryByRole('progressbar',{name:'Course completion'})).toBeNull();
    expect(home.save).not.toHaveBeenCalled();expect(home.resume).not.toHaveBeenCalled();
    cleanup();
  }
});

it('announces optional status, saved status and descriptions on direct course links',()=>{
  const optional=NAV_STEPS.find(step=>step.id==='and-or-negate-conditions')!;
  expect(optional.requiredForEditionCompletion).toBe(false);
  mount('chapter-2','',{[optional.id]:{status:'started',updatedAt:'2026-10-27'}});
  const link=screen.getByRole('link',{name:`Continue lesson ${optional.lessonNumber}: ${optional.title}`});
  expect(link).toHaveAccessibleDescription(expect.stringContaining('Optional'));
  expect(link).toHaveAccessibleDescription(expect.stringContaining('In progress'));
  expect(link).toHaveAccessibleDescription(expect.stringContaining(optional.description));
  const expected=courseChapterProgress(NAV_STEPS.filter(step=>step.part===2),{});
  expect(screen.getByRole('progressbar',{name:'Chapter 2 completion'})).toHaveAttribute('aria-valuetext',`0% complete, 0 of ${expected.requiredTotal} steps done`);
});

it('keeps an unscoped course-screen term deck in memory when moving cards',()=>{
  localStorage.clear();
  const write=vi.spyOn(Storage.prototype,'setItem');
  render(<MemoryRouter initialEntries={['/tools?deck=foundation']}><OpeningCourseScreen view="tools" steps={NAV_STEPS} progressStore={{steps:{},save:vi.fn()}} url={courseUrl('')}/></MemoryRouter>);
  expect(screen.getByText('Card 1 of 4')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Next'}));
  expect(screen.getByText('Card 2 of 4')).toBeVisible();
  expect(write).not.toHaveBeenCalled();
  expect(localStorage.getItem('conditional-term-cards-v2:anonymous')).toBeNull();
  write.mockRestore();
});

it('does not offer reset as a fix for an assignment with no available work',()=>{
  mount('lessons','',{},[]);
  expect(screen.getByText('No work is available in this assignment.')).toBeVisible();
  expect(screen.queryByRole('link',{name:'Reset filters'})).toBeNull();
  expect(screen.queryByRole('button',{name:'Reset filters'})).toBeNull();
  expect(screen.queryByText('No work matches these filters.')).toBeNull();
});

it('offers only chapters with drills and omits hidden content filters from practice URLs',()=>{
  const steps=NAV_STEPS.filter(step=>step.part===1&&step.type==='note'||step.part===3);
  const result=mount('practice','',{},steps);
  fireEvent.click(screen.getAllByRole('button',{name:'Filters'})[0]);
  const chapters=screen.getByRole('combobox',{name:'Chapter'});
  expect(chapters.querySelector('option[value="1"]')).toBeNull();
  expect(chapters.querySelector('option[value="3"]')).toBeTruthy();
  fireEvent.change(chapters,{target:{value:'3'}});
  fireEvent.click(screen.getByRole('button',{name:'Filters'}));
  expect(screen.getByRole('combobox',{name:'Chapter'})).toHaveValue('3');
  expect(new URLSearchParams(result.getSearch()).get('courseContent')).toBe('drills');
  // The next status change uses the same explicitly drill-only list, with no invisible content setting.
  fireEvent.change(screen.getByRole('combobox',{name:'Progress'}),{target:{value:'completed'}});
  expect(screen.getByText('No work matches these filters.')).toBeVisible();
  expect(new URLSearchParams(result.getSearch()).get('courseContent')).toBe('drills');
});

it('switches a chapter between Lessons, Drills and the complete Flashcards chooser without saving',()=>{
  const result=mount('chapter-1');
  expect(result.container.querySelectorAll('[data-kind="note"]')).toHaveLength(5);
  expect(result.container.querySelector('[data-kind="drill"]')).toBeNull();
  const choose=()=>within(screen.getByRole('navigation',{name:'Choose work'}));
  fireEvent.click(choose().getByRole('link',{name:'Drills'}));
  expect(result.container.querySelectorAll('[data-kind="drill"]')).toHaveLength(11);
  expect(result.container.querySelector('[data-kind="note"]')).toBeNull();
  fireEvent.click(choose().getByRole('link',{name:'Flashcards'}));
  expect(screen.getByRole('heading',{level:1,name:'Read a conditional'})).toBeVisible();
  expect(choose().getByRole('link',{name:'Flashcards'})).toHaveAttribute('aria-current','page');
  expect(result.container.querySelector('a[href*="deck=foundation"]')).not.toBeNull();
  expect(result.container.querySelector('a[href*="deck=group-1"]')).not.toBeNull();
  const mixed=screen.getByRole('link',{name:'Open Mixed sentence flashcards'});
  expect(new URL(mixed.getAttribute('href')!,'https://local.test').searchParams.get('groups')).toBe('g1,g2');
  const params=new URLSearchParams(result.getSearch());
  expect(params.get('assignment')).toBe('owned-row');expect(params.get('edition')).toBe('full-conditionals-v3');expect(params.get('courseChapter')).toBe('1');
  expect(result.save).not.toHaveBeenCalled();expect(result.resume).not.toHaveBeenCalled();
});

it('scopes the next action to content and chapter before applying the saved-status filter',()=>{
  const result=mount('chapter-3','&courseContent=drills&courseStatus=completed');
  const next=result.container.querySelector('.oc-browse-continue')!;
  const expected=NAV_STEPS.find(step=>step.part===3&&step.type==='drill'&&step.requiredForEditionCompletion!==false)!;
  expect(next).toHaveAttribute('href',expect.stringContaining(`/opening/${expected.id}?`));
  expect(next).toHaveTextContent('Start drill');
  expect(result.container.querySelector('.oc-path-step')).toBeNull();
  expect(screen.getByText('No work matches these filters.')).toBeVisible();
  expect(result.save).not.toHaveBeenCalled();expect(result.resume).not.toHaveBeenCalled();
});

it('preserves the explicit legacy mixed chapter while global Lessons defaults to notes',()=>{
  const result=mount('chapter-1','&courseContent=all');
  expect(result.container.querySelectorAll('[data-kind="note"]')).toHaveLength(5);
  expect(result.container.querySelectorAll('[data-kind="drill"]')).toHaveLength(11);
  expect(screen.getByRole('navigation',{name:'Choose work'}).querySelector('[aria-current]')).toBeNull();
  cleanup();
  const global=mount('lessons');
  expect(screen.getByRole('heading',{level:1,name:'Lessons'})).toBeVisible();
  expect(global.container.querySelector('[data-kind="drill"]')).toBeNull();
});

it('keeps explicit mixed chapter work when resetting or changing the chapter filter',()=>{
  const result=mount('chapter-1','&courseContent=all&courseStatus=completed');
  fireEvent.click(screen.getByRole('button',{name:'Filters'}));
  fireEvent.click(screen.getByRole('button',{name:'Reset filters'}));
  expect(new URLSearchParams(result.getSearch()).get('courseContent')).toBe('all');
  expect(result.container.querySelectorAll('[data-kind="drill"]')).toHaveLength(11);
  fireEvent.change(screen.getByRole('combobox',{name:'Chapter'}),{target:{value:'3'}});
  expect(new URLSearchParams(result.getSearch()).get('courseContent')).toBe('all');
  expect(result.container.querySelector('[data-kind="note"]')).not.toBeNull();
  expect(result.container.querySelector('[data-kind="drill"]')).not.toBeNull();
  expect(result.save).not.toHaveBeenCalled();expect(result.resume).not.toHaveBeenCalled();
});
it.each(['sufficient-practice','contrapositive-practice'])('opens the preserved instruction lookup for %s',id=>{
  mount(id);
  const instructions=screen.getByRole('region',{name:'Practice instructions'});
  expect(instructions.querySelectorAll('li').length).toBeGreaterThan(2);
  expect(screen.getByRole('link',{name:'Start practice'})).toHaveAttribute('href',expect.stringContaining('run=1'));
});

it('leaves a mixed chapter for global Lessons with no stale mixed marker',()=>{
  const result=mount('chapter-1','&courseContent=all');
  fireEvent.click(screen.getByRole('button',{name:'Filters'}));
  fireEvent.change(screen.getByRole('combobox',{name:'Chapter'}),{target:{value:''}});
  expect(new URLSearchParams(result.getSearch()).has('courseContent')).toBe(false);
  expect(screen.getByRole('heading',{level:1,name:'Lessons'})).toBeVisible();
  expect(result.container.querySelector('[data-kind="drill"]')).toBeNull();
  expect(result.save).not.toHaveBeenCalled();expect(result.resume).not.toHaveBeenCalled();
});
it('keeps card discovery in Flashcards and related navigation outside an active drill attempt',()=>{
  mount('practice');
  expect(screen.queryByRole('link',{name:'Open Translate and recall'})).toBeNull();
  cleanup();
  render(<MemoryRouter><OpeningCourseScreen view="sufficient-practice" run steps={NAV_STEPS} url={courseUrl(identity)}/></MemoryRouter>);
  expect(screen.queryByRole('navigation',{name:'This topic'})).toBeNull();
});
