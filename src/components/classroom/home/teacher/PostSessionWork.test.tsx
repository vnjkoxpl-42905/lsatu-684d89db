import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PostSessionWork } from './PostSessionWork';
import { calendarCheckIsStale, postSessionLede, safeDriveFolderUrl, transcriptIdFromUrl, type PostSessionTask } from './postSessionModel';
export const task: PostSessionTask = { id:'one',revision:3,student_id:'student',student_name:'Ada',source_title:'Session',starts_at:'2026-10-26T15:00:00Z',ends_at:'2026-10-26T16:00:00Z',source_state:'ended',match_state:'matched',transcript_doc_id:null,transcript_source:null,transcript_status:'waiting',drive_folder_url:null,local_slug:null,recap_done:false,notes_done:false,work_assigned:false,handled_at:null };
const settings = { enabled:true,activation_cutoff:'2026-10-25T00:00:00Z',last_success_at:null,last_error:null,drive_root_url:null,catching_up:false };
describe('After-session work', () => {
 it('does not claim a stale or never-checked calendar is up to date', () => {
  const old = {...settings,last_success_at:'2020-01-01T00:00:00Z'};
  expect(calendarCheckIsStale(old)).toBe(true);
  expect(calendarCheckIsStale(settings)).toBe(true);
  expect(calendarCheckIsStale({...settings,last_success_at:new Date().toISOString()})).toBe(false);
  expect(postSessionLede({state:'ready',data:{settings:old,tasks:[],handled:[]}})).toMatch(/delayed/);
  const {rerender}=render(<PostSessionWork work={{state:'ready',data:{settings:old,tasks:[],handled:[]}}} students={[]} onOpen={vi.fn()} />);
  expect(screen.getByText(/Calendar updates are delayed/)).toBeInTheDocument();
  expect(screen.queryByText('No after-session tasks are waiting.')).not.toBeInTheDocument();
  rerender(<PostSessionWork work={{state:'ready',data:{settings,tasks:[],handled:[]}}} students={[]} onOpen={vi.fn()} />);
  expect(screen.queryByText('No after-session tasks are waiting.')).not.toBeInTheDocument();
 });
 it('marks a conflicting automatic transcript for review', () => {
  render(<PostSessionWork work={{state:'ready',data:{settings,tasks:[{...task,transcript_doc_id:'earlier_document_123',transcript_source:'auto',transcript_status:'needs_review'}],handled:[]}}} students={[]} onOpen={vi.fn()} />);
  expect(screen.getByRole('link',{name:/Review earlier transcript link/})).toHaveAttribute('href','https://docs.google.com/document/d/earlier_document_123/edit');
  expect(screen.queryByRole('link',{name:'Open transcript'})).not.toBeInTheDocument();
 });
 it('does not turn missing setup or a failed load into no tasks', () => {
  const { rerender }=render(<PostSessionWork students={[]} onOpen={vi.fn()} />);
  expect(screen.getByText(/not connected yet/)).toBeInTheDocument();
  expect(screen.queryByText(/No after-session tasks/)).not.toBeInTheDocument();
  rerender(<PostSessionWork work={{state:'error'}} students={[]} onOpen={vi.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent('unknown');
 });
 it('sends a revisioned change without pretending the checkbox saved', () => {
  const update=vi.fn().mockResolvedValue(undefined);
  render(<PostSessionWork work={{state:'ready',data:{settings,tasks:[task],handled:[]},update}} students={[]} onOpen={vi.fn()} />);
  fireEvent.click(screen.getByRole('checkbox',{name:'Recap ready'}));
  expect(update).toHaveBeenCalledWith(task,{action:'checklist',field:'recap_done',value:true});
  expect(screen.getByRole('checkbox',{name:'Recap ready'})).not.toBeChecked();
  expect(screen.getByText('Waiting for transcript')).toBeInTheDocument();
 });
 it('keeps handled work out of the active list and supports reopen', () => {
  const update=vi.fn().mockResolvedValue(undefined); const handled={...task,handled_at:'2026-10-27T00:00:00Z'};
  render(<PostSessionWork work={{state:'ready',data:{settings,tasks:[],handled:[handled]},update}} students={[]} onOpen={vi.fn()} />);
  expect(screen.queryByText('Ada')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Handled work (1)'}));
  fireEvent.click(within(screen.getByRole('list',{name:'Handled sessions'})).getByRole('button',{name:'Reopen'}));
  expect(update).toHaveBeenCalledWith(handled,{action:'reopen'});
 });
 it('shows source changes and failure while preserving cached work', () => {
  render(<PostSessionWork work={{state:'ready',refreshFailed:true,error:'Could not save',data:{settings,tasks:[{...task,source_state:'rescheduled'}],handled:[]}}} students={[]} onOpen={vi.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
  expect(screen.getByText(/Session rescheduled/)).toBeInTheDocument();
  expect(screen.getByText(/last saved work list/)).toBeInTheDocument();
 });
 it('accepts only native document links and rebuilds trusted folder URLs', () => {
  expect(transcriptIdFromUrl('https://docs.google.com/document/d/valid_document_123/edit?usp=sharing')).toBe('valid_document_123');
  for(const url of ['javascript:alert(1)','https://evil.example/document/d/valid_document_123','https://docs.google.com.evil.example/document/d/valid_document_123','https://user@docs.google.com/document/d/valid_document_123','https://docs.google.com/document/d/valid_document_123/edit/extra']) expect(transcriptIdFromUrl(url)).toBeNull();
  expect(safeDriveFolderUrl('https://drive.google.com/drive/u/0/folders/folder_example_123?usp=sharing')).toBe('https://drive.google.com/drive/folders/folder_example_123');
  expect(safeDriveFolderUrl('https://evil.example/drive/folders/folder_example_123')).toBeNull();
 });
 it('shows saved work and allows manual handling while automatic updates are paused',()=>{
  const update=vi.fn().mockResolvedValue(undefined);
  render(<PostSessionWork work={{state:'ready',data:{settings:{...settings,enabled:false},tasks:[task],handled:[]},update}} students={[]} onOpen={vi.fn()} />);
  expect(screen.getByText('Automatic updates are paused. Showing saved work.')).toBeInTheDocument();
  expect(screen.getByText('Ada')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Mark handled'}));expect(update).toHaveBeenCalledWith(task,{action:'handle'});
 });
});
