// Local acceptance fixture. Real page, destination and reader; synthetic account/data only.
import '../../src/index.css';
import '../../src/components/classroom/classroom.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import MyWorkNotesPage from '../../src/pages/MyWorkNotesPage';
import MyWorkPage from '../../src/pages/MyWorkPage';
import { StudentDestination } from '../../src/pages/StudentDestination';
import { ClassroomItemView } from '../../src/components/classroom/ClassroomRouteViews';
import { ClassroomSectionList } from '../../src/components/classroom/shell/ClassroomLayout';
import { useNoteReaderTransition } from '../../src/hooks/useNoteReaderTransition';
import { ClassroomMotionContent } from '../../src/components/classroom/shell/ClassroomMotionContent';

const titles = ['Conditional logic: session recap', 'Reading flaw answer choices', 'What the argument needs', 'Keep the conclusion separate', 'Reading for the author’s position', 'Timed section: session recap', 'Why the tempting answer fails', 'Finding the role of a sentence', 'Translate before you diagram', 'A plan for this week', 'Negating an answer choice', 'Evidence and explanation', 'Comparing two passages', 'Recognizing the gap', 'A method worth keeping', 'Your next practice session'];
const fixtureWindow = window as any;
const scenario = new URLSearchParams(window.location.search).get('scenario') ?? 'archive';
const readerShell = scenario.startsWith('reader-shell');
document.title = `LSAT U · My Work · ${scenario} · Local preview`;
fixtureWindow.__fixtureError = scenario === 'archive-error' || scenario === 'reader-error';
fixtureWindow.__fixtureLoading = scenario === 'archive-loading';
fixtureWindow.__fixtureDelayMs = scenario === 'reader-shell-delayed' ? 400 : 0;
fixtureWindow.__personalLoadError = scenario === 'personal-error';
fixtureWindow.__personalLoading = scenario === 'personal-loading';
fixtureWindow.__personalSaveError = scenario === 'personal-save-error';
fixtureWindow.__personalConflict = scenario === 'personal-conflict';
fixtureWindow.__workLoading = scenario === 'work-loading';
fixtureWindow.__workError = scenario === 'work-error';
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
].map(([id, title, kind, workSection, status], i) => ({ key: id, refId: id, sourceTable: kind === 'guided' ? 'guided_drill_assignments' : 'activities', title, kind, workSection, status, subtitle: kind === 'guided' ? '10 questions · 60 minutes' : 'Read the instructions and continue with your assigned practice.', route: kind === 'guided' ? `/guided/${id}` : `/activities/${id}`, createdAt: new Date(Date.UTC(2026, 9, 20 - i, 12)).toISOString(), dueAt: i === 1 ? '2026-10-30T19:00:00Z' : null, isUnread: status === 'assigned', openedAt: status === 'assigned' ? null : '2026-10-27T12:00:00Z', progressUnverified: id === 'saved' }));
if (scenario === 'work-empty-kind') fixtureWindow.__workFixture = fixtureWindow.__workFixture.filter(row => row.kind !== 'guided');
if (scenario === 'work-empty-subject') fixtureWindow.__workFixture = fixtureWindow.__workFixture.filter(row => row.workSection !== 'rc');
if (['work-no-rows', 'work-empty', 'work-loading', 'work-error'].includes(scenario)) fixtureWindow.__workFixture = [];
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
if (readerShell) fixtureWindow.__notesFixture.forEach(note => { note.content_html += Array.from({ length: 18 }, (_, i) => `<h2>Reading section ${i + 1}</h2><p>This is synthetic long-form teaching material for layout verification. Identify the conclusion, check the evidence and keep the complete condition in view. Explain why the answer meets the requirement before moving to the next question.</p>`).join(''); });
if (scenario === 'reader-shell-interactive') fixtureWindow.__notesFixture[10].content_html = '<meta name="lsatu-interactive-lesson"><style>body{margin:0;padding:24px;color:#242b26;background:#fffdf8;font-family:system-ui;line-height:1.6;min-height:1200px}button{padding:12px 18px;border:1px solid #777;border-radius:8px;background:#242b26;color:#fffdf8}</style><h1>Negating an answer choice</h1><p>Synthetic interactive lesson for local layout verification. The iframe keeps its own content and controls.</p><button onclick="document.getElementById(\'feedback\').textContent=\'The interactive control works.\'">Check this example</button><p id="feedback" aria-live="polite"></p>';
if (scenario === 'archive-empty') fixtureWindow.__notesFixture = [];
if (scenario === 'archive-many-unread') fixtureWindow.__notesFixture.forEach(note => { note.metadata_json = {}; });
const query = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Fixture() {
  const location = useLocation();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const readerId = /^\/classroom\/item\/([^/]+)/.exec(location.pathname)?.[1];
  useNoteReaderTransition(rootRef, readerShell ? location.pathname : '', location.key);
  fixtureWindow.__fixtureNavigate = useNavigate();
  fixtureWindow.__fixtureLocation = location.pathname + location.search;
  fixtureWindow.__fixtureQuery = query;
  const primaryRail = <><Link to="/my-work/notes" className="notes-fixture-logo">LSAT U</Link><span>CLASSROOM</span>{['Home', 'My Work', 'Practice', 'Review', 'Progress', 'Library'].map(label => <Link key={label} to={label === 'My Work' ? '/my-work/notes' : '/my-work/to-do'} className={label === 'My Work' ? 'active' : ''}>{label}</Link>)}</>;
  return <div data-note-transition-mode={readerShell ? readerId ? "reader" : location.pathname === "/my-work/notes" ? "archive" : undefined : undefined} ref={rootRef} className={`classroom-root${readerShell && readerId ? "" : " classroom-root-destination"}${readerShell ? " notes-fixture-production-shell" : ""}`}>
    <aside className={readerShell ? "classroom-sidebar" : "notes-fixture-rail"}>{readerShell ? <div className="notes-fixture-rail">{primaryRail}</div> : primaryRail}</aside>
    {readerShell && readerId ? <aside className="classroom-section-list" data-note-transition-rail><ClassroomSectionList section="notes" activeId={decodeURIComponent(readerId)} /></aside> : null}
    <main className={readerShell ? "classroom-stage" : "notes-fixture-stage"} data-note-transition-stage={readerShell ? "" : undefined}><div className={readerShell ? "classroom-column" : "classroom-column notes-fixture-main"}><ClassroomMotionContent><Routes>
      <Route element={<StudentDestination destination="my-work" />}>
        <Route path="/my-work/notes" element={<MyWorkNotesPage />} />
        <Route path="/my-work/to-do" element={<MyWorkPage completed={false} />} />
        <Route path="/my-work/completed" element={<MyWorkPage completed />} />
      </Route>
      <Route path="/classroom/item/:itemId" element={<ClassroomItemView />} />
      <Route path="/classroom/recaps" element={<MyWorkNotesPage />} />
    </Routes></ClassroomMotionContent><footer className="notes-fixture-disclaimer">Local preview · Synthetic student data · No production writes</footer></div></main>
  </div>;
}
const style = document.createElement('style');
style.textContent = `.notes-fixture-stage{width:100%}.notes-fixture-rail{position:fixed;inset:8px auto 8px 8px;width:208px;border:1px solid var(--classroom-line);border-radius:7px;padding:26px 18px;display:flex;flex-direction:column;gap:8px}.notes-fixture-rail>span{font-size:10px;letter-spacing:.08em;margin:24px 8px 4px;color:var(--classroom-meta-text)}.notes-fixture-rail a{padding:9px 10px;text-decoration:none;font-size:13px;border-radius:5px}.notes-fixture-rail .active{background:var(--classroom-ink);color:var(--classroom-surface)}.notes-fixture-logo{font-weight:700}.classroom-root.classroom-root-destination .notes-fixture-main{margin-left:240px;width:calc(100% - 240px);max-width:none;padding:48px clamp(24px,5vw,80px)}.notes-fixture-disclaimer{margin-top:50px;font-size:11px;color:var(--classroom-meta-text);border-top:1px solid var(--classroom-line);padding-top:16px}@media(max-width:767px){.notes-fixture-rail{display:none}.classroom-root.classroom-root-destination .notes-fixture-main{margin-left:0;width:100%;padding:28px 18px}}`;
if (readerShell) style.textContent += `.classroom-root.notes-fixture-production-shell .notes-fixture-rail{position:static;inset:auto;width:100%;min-height:calc(100dvh - 16px)}.notes-fixture-stage{width:100%}`;
document.head.append(style);
// Opt-in initial-frame evidence for this synthetic harness, never the production app.
if (new URLSearchParams(window.location.search).has('audit')) {
  const audit = fixtureWindow.__contentMotionAudit = { done: false, contentFrames: 0, moving: [] as any[] };
  const started = performance.now();
  const frame = () => {
    const content = document.querySelector('.student-destination-content');
    if (content) {
      audit.contentFrames++;
      for (const node of [content, ...content.querySelectorAll('*')]) {
        const computed = getComputedStyle(node);
        if ((computed.filter !== 'none' && computed.filter !== 'blur(0px)') || computed.transform !== 'none') {
          audit.moving.push({ t: Math.round(performance.now() - started), className: node.className, filter: computed.filter, transform: computed.transform });
        }
      }
    }
    if (performance.now() - started < 1800) requestAnimationFrame(frame); else audit.done = true;
  };
  requestAnimationFrame(frame);
}
const personalScenario = scenario.startsWith('personal-');
const editorScenario = ['personal-editor', 'personal-save-error', 'personal-conflict', 'personal-storage-warning'].includes(scenario);
const initialRoute = (scenario === 'reader-shell' || scenario === 'reader-shell-interactive') ? '/my-work/notes' : scenario.startsWith('reader')
  ? `/classroom/item/${scenario === 'reader-missing' ? 'missing-fixture' : 'fixture-note-0'}?returnTo=%2Fmy-work%2Fnotes`
  : personalScenario ? `/my-work/notes?view=mine${scenario === 'personal-new' ? '&note=new' : editorScenario ? '&note=local-personal-1' : ''}`
  : scenario.startsWith('work-') ? `/my-work/to-do${scenario === 'work-update' ? '?workGroup=00000000-0000-4000-8000-000000000001' : scenario === 'work-empty-kind' || scenario === 'work-no-rows' ? '?kind=Guided+drill' : scenario === 'work-empty-subject' ? '?subject=rc' : scenario === 'work-no-match' ? '?q=not-present' : ''}` : '/my-work/notes';
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={query}><MemoryRouter initialEntries={[initialRoute]}><Fixture /></MemoryRouter></QueryClientProvider>);
