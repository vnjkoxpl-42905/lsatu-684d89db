// Local acceptance fixture. Real page, destination and reader; synthetic account/data only.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import MyWorkNotesPage from '../../src/pages/MyWorkNotesPage';
import { StudentDestination } from '../../src/pages/StudentDestination';
import { ClassroomItemView } from '../../src/components/classroom/ClassroomRouteViews';
import '../../src/index.css';
import '../../src/components/classroom/classroom.css';

const titles = ['Conditional logic: checking the rule', 'Reading flaw answer choices', 'What the argument needs', 'Keep the conclusion separate', 'Reading for the author’s position', 'Reviewing a timed section', 'Why the tempting answer fails', 'Finding the role of a sentence', 'Translate before you diagram', 'A plan for this week', 'Negating an answer choice', 'Evidence and explanation', 'Comparing two passages', 'Recognizing the gap', 'A method worth keeping', 'Your next practice session'];
const fixtureWindow = window as any;
fixtureWindow.__notesFixture = titles.map((title, i) => ({
  id: `fixture-note-${i}`, student_id: 'local-student', class_id: null, created_by: 'local-teacher',
  type: i % 3 === 0 ? 'session_recap' : 'note', title,
  description: i === 0 ? 'Start with what makes the rule apply. Then check what must follow. These are the steps to return to before your next set.' : null,
  content_html: `<h2>${title}</h2><p>Local verification content, not a published student note.</p><p>${i === 15 ? 'The older-body-search marker is here.' : 'Write the reasoning before choosing an answer. Keep the full condition and check the relationship carefully.'}</p>`,
  content_markdown: null, source_table: null, source_id: null, status: 'assigned', unlock_at: null,
  due_at: null, completed_at: null, priority: 0, visible_to_student: true,
  metadata_json: i < 3 ? {} : { read_at: '2026-10-25T12:00:00Z' },
  created_at: new Date(Date.UTC(2026, 9, 25 - i * 4, 12)).toISOString(), updated_at: '2026-10-25T12:00:00Z',
}));
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
        <Route path="/my-work/to-do" element={<section><h2>Assigned work</h2><p>Fixture destination reached. The production assignment feed is unchanged.</p><Link to="/my-work/notes">Back to notes</Link></section>} />
        <Route path="/my-work/completed" element={<section><h2>Completed</h2><Link to="/my-work/notes">Back to notes</Link></section>} />
      </Route>
      <Route path="/classroom/item/:itemId" element={<ClassroomItemView />} />
      <Route path="/classroom/recaps" element={<MyWorkNotesPage />} />
    </Routes><footer className="notes-fixture-disclaimer">Local preview · Synthetic student data · No production writes</footer></main>
  </div>;
}
const style = document.createElement('style');
style.textContent = `.notes-fixture-rail{position:fixed;inset:8px auto 8px 8px;width:208px;border:1px solid var(--classroom-line);border-radius:7px;padding:26px 18px;display:flex;flex-direction:column;gap:8px}.notes-fixture-rail>span{font-size:10px;letter-spacing:.08em;margin:24px 8px 4px;color:var(--classroom-meta-text)}.notes-fixture-rail a{padding:9px 10px;text-decoration:none;font-size:13px;border-radius:5px}.notes-fixture-rail .active{background:var(--classroom-ink);color:var(--classroom-surface)}.notes-fixture-logo{font-weight:700}.classroom-root.classroom-root-destination .notes-fixture-main{margin-left:240px;width:calc(100% - 240px);max-width:none;padding:48px clamp(24px,5vw,80px)}.notes-fixture-disclaimer{margin-top:50px;font-size:11px;color:var(--classroom-meta-text);border-top:1px solid var(--classroom-line);padding-top:16px}@media(max-width:767px){.notes-fixture-rail{display:none}.classroom-root.classroom-root-destination .notes-fixture-main{margin-left:0;width:100%;padding:28px 18px}}`;
document.head.append(style);
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={query}><MemoryRouter initialEntries={['/my-work/notes']}><Fixture /></MemoryRouter></QueryClientProvider>);
