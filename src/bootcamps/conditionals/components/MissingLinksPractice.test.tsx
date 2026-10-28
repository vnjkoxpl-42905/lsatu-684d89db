import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MissingLinksPractice } from './MissingLinksPractice';
import { MissingLinksLesson, MissingLinksEnglishTransfer } from './MissingLinksLesson';
import { FullCourseLesson } from './FullCourseLesson';
import { fullCourseLessons } from '../content/fullCourseContent';

vi.mock('./FullCourseDrill',()=>({FullCourseDrill:()=> <div>Required quiz unchanged</div>}));
beforeEach(()=>{cleanup();localStorage.clear();});
const click=(name: string|RegExp)=>fireEvent.click(screen.getByRole('button',{name}));
function build(left: string,right: string){click(left);click('Place selected idea on IF');click(right);click('Place selected idea on THEN');}
describe('Missing Links practice',()=>{
 it('keeps a wrong arrangement through the hint, then accepts a correct bridge and restores it',()=>{
  const {unmount}=render(<MissingLinksPractice storageScope="actor-A:edition-A"/>);
  build('C','B');click('Check connection');expect(screen.getByRole('status').textContent).toContain('still need not follow');
  expect(screen.getByRole('button',{name:'Place selected idea on IF'}).textContent).toBe('C');
  build('B','C');click('Check connection');expect(screen.getByRole('heading',{name:'The connection works'})).toBeTruthy();
  unmount();render(<MissingLinksPractice storageScope="actor-A:edition-A"/>);
  expect(screen.getByRole('heading',{name:'The connection works'})).toBeTruthy();
 });
 it('uses negatives and flipped premises without changing the original conclusion',()=>{
  render(<MissingLinksPractice storageScope="A" itemId="ml-source-03"/>);
  click('Show contrapositive');expect(screen.getByRole('button',{name:'Show original'})).toBeTruthy();
  build('C','B');click('Negate THEN');click('Check connection');expect(screen.getByRole('heading',{name:'The connection works'})).toBeTruthy();
  expect(screen.getByText(/proves exactly/).textContent).toContain('C');
 });
 it('separates actor and edition state and handles malformed storage',()=>{
  const {rerender}=render(<MissingLinksPractice storageScope="A:e1"/>);build('B','C');click('Check connection');
  rerender(<MissingLinksPractice storageScope="B:e1"/>);expect(screen.queryByRole('heading',{name:'The connection works'})).toBeNull();
  rerender(<MissingLinksPractice storageScope="A:e2"/>);expect(screen.queryByRole('heading',{name:'The connection works'})).toBeNull();
  localStorage.setItem('conditional-missing-links-v1:bad','{"revision":1,"current":"foreign","work":{}}');
  rerender(<MissingLinksPractice storageScope="bad"/>);expect(screen.getByText(/saved round could not be restored/)).toBeTruthy();
 });
 it('lets learners choose a round and restart only that round',()=>{
  render(<MissingLinksPractice storageScope="A" round={2}/>);expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('ml-source-05');
  build('B','C');click('Check connection');click('Restart round 2');expect(screen.queryByRole('heading',{name:'The connection works'})).toBeNull();
  click('Round 3: negative ends');expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('ml-source-09');
 });
 it('does not reveal the solution before a hint and reports off-task sufficiency honestly',()=>{
  render(<MissingLinksPractice storageScope="A"/>);expect(screen.queryByText(/highlighted arrow/)).toBeNull();
  build('A','C');click('Check connection');expect(screen.getByRole('status').textContent).toContain('can be sufficient');
  click('Show the connection and proof');expect(screen.getByRole('heading',{name:'The connection explained'})).toBeTruthy();
 });
});
it('teaches before the fresh check and keeps the old film out of lesson 5.6',()=>{
 const lesson=fullCourseLessons.find(l=>l.id==='missing-bridges')!;
 const {container}=render(<FullCourseLesson lesson={lesson} media={{src:'/old-film.mp4',poster:'',captions:'',transcript:[]}}/>);
 expect(container.querySelector('video')).toBeNull();expect(screen.getByText('Required quiz unchanged')).toBeTruthy();
 expect(screen.getByRole('heading',{name:'Try a fresh connection'})).toBeTruthy();
});
it('both English checks preserve the compound and named-subject conclusions',()=>{
 render(<MissingLinksEnglishTransfer/>);
 fireEvent.click(screen.getByLabelText('Every selected report is signed.'));fireEvent.click(screen.getAllByRole('button',{name:'Check added rule'})[0]);
 expect(screen.getByText(/Both requirements for storage are met/)).toBeTruthy();
 fireEvent.click(screen.getByLabelText('Every logged parcel is insured.'));fireEvent.click(screen.getAllByRole('button',{name:'Check added rule'})[1]);
 expect(screen.getByText(/does not prove that every parcel is insured/)).toBeTruthy();
});
