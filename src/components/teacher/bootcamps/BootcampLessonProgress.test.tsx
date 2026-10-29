import * as React from 'react';
import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {BootcampLessonProgress} from './BootcampLessonProgress';
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:mock.actorId}})}));

const mock=vi.hoisted(()=>({actorId:'teacher-a',results:{} as Record<string,{data:unknown;error:unknown}>, calls:[] as string[]}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:()=>{mock.calls.push('students');const result=mock.results.students;return Promise.resolve({...result,data:(result.data as {user_id?:string}|null)?.user_id??null});},from:(table:string)=>{
  const query={select:()=>query,eq:()=>query,maybeSingle:()=>read(),then:(resolve:(value:unknown)=>unknown,reject:(error:unknown)=>unknown)=>read().then(resolve,reject)};
  const read=()=>{mock.calls.push(table);return Promise.resolve(mock.results[table]);};
  return query;
}}}));
const failed={data:null,error:{message:'Read denied'}};
const client=()=>new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
function mount(qc=client(),classId='class-a'){
  return {qc,...render(<QueryClientProvider client={qc}><BootcampLessonProgress studentClassId={classId}/></QueryClientProvider>)};
}
beforeEach(()=>{
  mock.actorId='teacher-a';
  mock.calls=[];mock.results={students:{data:{user_id:'student-a'},error:null},rc_lesson_progress:{data:[],error:null},abstract_lesson_progress:{data:[],error:null}};
});
afterEach(cleanup);
describe('bootcamp progress source disclosure',()=>{
  it('shows identity read failure and retries without claiming empty progress',async()=>{
    mock.results.students=failed;mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not confirm the student account');
    expect(mock.calls).not.toContain('rc_lesson_progress');
    mock.results.students={data:{user_id:'student-a'},error:null};fireEvent.click(screen.getByText('Retry bootcamp progress'));
    await waitFor(()=>expect(mock.calls).toContain('rc_lesson_progress'));
    await waitFor(()=>expect(screen.queryByText('Bootcamp lessons')).toBeNull());
  });
  it('distinguishes a missing linked identity from successful empty progress',async()=>{
    mock.results.students={data:null,error:null};mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('No linked student account was found');
    expect(mock.calls).not.toContain('abstract_lesson_progress');
  });
  it('names a failed source while retaining independent valid rows and supports retry',async()=>{
    mock.results.rc_lesson_progress=failed;
    mock.results.abstract_lesson_progress={data:[{lesson_id:'Lesson A',completed_at:'2026-09-30T08:00:00Z'}],error:null};mount();
    expect(await screen.findByText('Lesson A')).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent('RC Bootcamp: Engaging With The Passage');
    mock.results.rc_lesson_progress={data:[{lesson_id:'rc-engaging-with-the-passage',data:{__furthest:0}}],error:null};
    fireEvent.click(screen.getByText('Retry bootcamp progress'));
    expect(await screen.findByText('Engaging With The Passage')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();expect(screen.getByText('Lesson A')).toBeTruthy();
  });
  it('keeps cached source progress visible after a failed refresh and clears the warning on retry',async()=>{
    mock.results.abstract_lesson_progress={data:[{lesson_id:'Saved lesson'}],error:null};const {qc}=mount();
    expect(await screen.findByText('Saved lesson')).toBeTruthy();mock.results.abstract_lesson_progress=failed;
    await act(async()=>{await qc.invalidateQueries({queryKey:['dossier-lesson-progress','student-a','abstract']});});
    expect(screen.getByText('Saved lesson')).toBeTruthy();expect(await screen.findByRole('alert')).toHaveTextContent('Earlier saved progress');
    mock.results.abstract_lesson_progress={data:[{lesson_id:'Saved lesson'}],error:null};fireEvent.click(screen.getByText('Retry bootcamp progress'));
    await waitFor(()=>expect(screen.queryByRole('alert')).toBeNull());
  });
  it('treats an invalid source response as unconfirmed rather than empty',async()=>{
    mock.results.rc_lesson_progress={data:null,error:null};mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not confirm RC Bootcamp');
  });
  it('discloses malformed lesson rows without crashing or presenting empty progress',async()=>{
    mock.results.abstract_lesson_progress={data:[null],error:null};mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not confirm Abstract Answers');
  });
  it('does not show cached progress from the previously selected student on identity failure',async()=>{
    mock.results.abstract_lesson_progress={data:[{lesson_id:'Previous student lesson'}],error:null};const {qc,rerender}=mount();
    expect(await screen.findByText('Previous student lesson')).toBeTruthy();mock.results.students=failed;
    rerender(<QueryClientProvider client={qc}><BootcampLessonProgress studentClassId="class-b"/></QueryClientProvider>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not confirm the student account');expect(screen.queryByText('Previous student lesson')).toBeNull();
  });
  it('withholds earlier actor progress while the new actor identity cannot be verified',async()=>{
    mock.results.abstract_lesson_progress={data:[{lesson_id:'Earlier teacher view'}],error:null};const {qc,rerender}=mount();
    expect(await screen.findByText('Earlier teacher view')).toBeTruthy();
    mock.actorId='teacher-b';mock.results.students=failed;
    rerender(<QueryClientProvider client={qc}><BootcampLessonProgress studentClassId="class-a"/></QueryClientProvider>);
    expect(screen.queryByText('Earlier teacher view')).toBeNull();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not confirm the student account');
  });
});
