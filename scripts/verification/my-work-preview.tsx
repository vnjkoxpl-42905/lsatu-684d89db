// Local acceptance fixture. Real page, destination and reader; synthetic account/data only.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import MyWorkNotesPage from '../../src/pages/MyWorkNotesPage';
import MyWorkPage from '../../src/pages/MyWorkPage';
import { StudentDestination } from '../../src/pages/StudentDestination';
import { ClassroomItemView } from '../../src/components/classroom/ClassroomRouteViews';
import '../../src/index.css';
import '../../src/components/classroom/classroom.css';

const titles = ['Conditional logic: session recap', 'Reading flaw answer choices', 'What the argument needs', 'Keep the conclusion separate', 'Reading for the author’s position', 'Timed section: session recap', 'Why the tempting answer fails', 'Finding the role of a sentence', 'Translate before you diagram', 'A plan for this week', 'Negating an answer choice', 'Evidence and explanation', 'Comparing two passages', 'Recognizing the gap', 'A method worth keeping', 'Your next practice session'];
const fixtureWindow = window as any;
const scenario = new URLSearchParams(window.location.search).get('scenario') ?? 'archive';
document.title = `LSAT U · My Work · ${scenario} · Local preview`;
fixtureWindow.__fixtureError = scenario === 'archive-error' || scenario === 'reader-error';
fixtureWindow.__fixtureLoading = scenario === 'archive-loading';
fixtureWindow.__personalLoadError = scenario === 'personal-error';
fixtureWindow.__personalLoading = scenario === 'personal-loading';
fixtureWindow.__personalSaveError = scenario === 'personal-save-error';
fixtureWindow.__personalConflict = scenario === 'personal-conflict';
fixtureWindow.__personalNotesFixture = scenario === 'personal-empty' ? [] : [
  { id: 'local-personal-1', user_id: 'local-student', type: 'doc', title: 'What to check before choosing an answer', body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Identify the conclusion first. Write what the argument needs before looking at the answer choices. Keep the full condition in view.' }] }] }, properties: {}, is_archived: false, parent_page_id: null, icon: null, sort_order: 0, created_at: '2026-10-20T12:00:00Z', updated_at: '2026-10-26T12:00:00Z' },
  { id: 'local-personal-2', user_id: 'local-student', type: 'doc', title: 'A question to bring to my next session', body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Why does this tempting answer fail to address the gap?' }] }] }, properties: {}, is_archived: false, parent_page_id: null, icon: null, sort_order: 1, created_at: '2026-10-19T12:00:00Z', updated_at: '2026-10-24T12:00:00Z' },
];
if (scenario === 'personal-storage-warning') {
  Object.defineProperty(window, 'sessionStorage', { configurable: true, value: { getItem() { throw new Error('Synthetic storage unavailable'); }, setItem() { throw new Error('Synthetic storage unavailable'); }, removeItem() {}, clear() {}, key() { return null; }, length: 0 } });
}

fixtureWindow.__workFixture = [
  ['rule', 'Conditional Indicators Refresher', 'bootcamp', 'lr', 'in_progress'],
  ['recall', 'Read, Recall, Colour · PT112 Section 4', 'activity', 'rc', 'assigned'],
  ['assumption', 'Necessary Assumption: First Taste', 'guided', 'lr', 'assigned'],
  ['saved', 'Review your reasoning', 'guided', 'lr', 'in_progress'],
  ['done-1', 'Read, Recall, Colour · PT134 Section 3', 'activity', 'rc', 'completed'],
  ['done-2', 'Read, Recall, Colour · PT134 Section 3', 'activity', 'rc', 'completed'],
].map(([id, title, kind, workSection, status], i) => ({ key: id, refId: id, sourceTable: kind === 'guided' ? 'guided_drill_assignments' : 'activities', title, kind, workSection, status, subtitle: kind === 'guided' ? '10 questions · 60 minutes' : 'Read the instructions and continue with your assigned practice.', route: kind === 'guided' ? `/guided/${id}` : `/activities/${id}`, createdAt: new Date(Date.UTC(2026, 9, 20 - i, 12)).toISOString(), dueAt: i === 1 ? '2026-10-30T19:00:00Z' : null, progressUnverified: id === 'saved' }));
fixtureWindow.__notesFixture = titles.map((title, i) => ({
  id: `fixture-note-${i}`, student_id: 'local-student', class_id: null, created_by: 'local-teacher',
  type: i === 0 || i === 5 ? 'session_recap' : 'note', title,
  description: i === 0 ? 'In this session, we practised checking when a rule applies and what must follow. Before your next set, write both conditions before choosing an answer.' : i === 5 ? 'A record of the timed section we reviewed, the mistakes we discussed and what to practise next.' : null,
  content_html: `<h2>${title}</h2><p>Local verification content, not a published student note.</p><p>${i === 15 ? 'The older-body-search marker is here.' : 'Write the reasoning before choosing an answer. Keep the full condition and check the relationship carefully.'}</p>`,
  content_markdown: null, source_table: null, source_id: null, status: 'assigned', unlock_at: null,
  due_at: null, completed_at: null, priority: 0, visible_to_student: true,
  metadata_json: i < 3 ? {} : { read_at: '2026-10-25T12:00:00Z' },
  created_at: new Date(Date.UTC(2026, 9, 25 - i * 4, 12)).toISOString(), updated_at: '2026-10-25T12:00:00Z',
}));
if (scenario === 'archive-empty') fixtureWindow.__notesFixture = [];
const query = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Fixture() {
  const location = useLocation();
  fixtureWindow.__fixtureLocation = location.pathname + location.search;
  fixtureWindow.__fixtureQuery = query;
  return <div className="classroom-root classroom-root-destination">
    <aside className="notes-fixture-rail"><Link to="/my-work/notes" className="notes-fixture-logo">LSAT U</Link><span>CLASSROOM</span>{['Home', 'My Work', 'Practice', 'Review', 'Progress', 'Library'].map(label => <Link key={label} to={label === 'My Work' ? '/my-work/notes' : '/my-work/to-do'} className={label === 'My Work' ? 'active' : ''}>{label}</Link>)}</aside>
    <main className="classroom-column notes-fixture-main"><Routes>
      <Route element={<StudentDestination destination="my-work" />}>
        <Route path="/my-work/notes" element={<MyWorkNotesPage />} />
        <Route path="/my-work/to-do" element={<MyWorkPage completed={false} />} />
        <Route path="/my-work/completed" element={<MyWorkPage completed />} />
      </Route>
      <Route path="/classroom/item/:itemId" element={<ClassroomItemView />} />
      <Route path="/classroom/recaps" element={<MyWorkNotesPage />} />
    </Routes><footer className="notes-fixture-disclaimer">Local preview · Synthetic student data · No production writes</footer></main>
  </div>;
}
const style = document.createElement('style');
style.textContent = `.notes-fixture-rail{position:fixed;inset:8px auto 8px 8px;width:208px;border:1px solid var(--classroom-line);border-radius:7px;padding:26px 18px;display:flex;flex-direction:column;gap:8px}.notes-fixture-rail>span{font-size:10px;letter-spacing:.08em;margin:24px 8px 4px;color:var(--classroom-meta-text)}.notes-fixture-rail a{padding:9px 10px;text-decoration:none;font-size:13px;border-radius:5px}.notes-fixture-rail .active{background:var(--classroom-ink);color:var(--classroom-surface)}.notes-fixture-logo{font-weight:700}.classroom-root.classroom-root-destination .notes-fixture-main{margin-left:240px;width:calc(100% - 240px);max-width:none;padding:48px clamp(24px,5vw,80px)}.notes-fixture-disclaimer{margin-top:50px;font-size:11px;color:var(--classroom-meta-text);border-top:1px solid var(--classroom-line);padding-top:16px}@media(max-width:767px){.notes-fixture-rail{display:none}.classroom-root.classroom-root-destination .notes-fixture-main{margin-left:0;width:100%;padding:28px 18px}}`;
document.head.append(style);
const personalScenario = scenario.startsWith('personal-');
const editorScenario = ['personal-editor', 'personal-save-error', 'personal-conflict', 'personal-storage-warning'].includes(scenario);
const initialRoute = scenario.startsWith('reader')
  ? `/classroom/item/${scenario === 'reader-missing' ? 'missing-fixture' : 'fixture-note-0'}?returnTo=%2Fmy-work%2Fnotes`
  : personalScenario ? `/my-work/notes?view=mine${scenario === 'personal-new' ? '&note=new' : editorScenario ? '&note=local-personal-1' : ''}` : '/my-work/notes';
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={query}><MemoryRouter initialEntries={[initialRoute]}><Fixture /></MemoryRouter></QueryClientProvider>);
