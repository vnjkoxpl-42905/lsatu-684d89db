/** Development-only visual fixture. Uses the production Home and finder with real static banks.
 * No live account, assignments, attempts or exposure mutations. Not an entry in the production build. */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClassroomHomeView } from '@/components/classroom/home/ClassroomHomeView';
import { buildWeek, weekDates, type ClassroomHomeModel } from '@/components/classroom/home/homeModel';
import QuestionFinder from '@/components/questionfinder/QuestionFinder';
import '@/index.css';
import '@/components/classroom/classroom.css';
import '@/components/classroom/home/home.css';

document.documentElement.classList.remove('dark');
document.documentElement.classList.add('light');

const params = new URLSearchParams(location.search);
const denied = params.get('access') === 'denied';
const now = new Date(2026, 9, 28);
const model: ClassroomHomeModel = {
  greeting: 'Good morning', displayName: 'Ada', isAdmin: false,
  access: { messages: true, schedule: true, activities: true, drill: !denied },
  dateline: 'Wednesday · October 28 · 2026', subtitle: 'Your assigned work and practice, in one place.',
  daysToTest: null, dueTodayCount: 0, hero: null, rows: [], newCount: 0,
  message: null, messages: [], unreadMessages: 0, homeBooking: { state: 'none' },
  week: buildWeek(weekDates(now), [], now), weekLabel: 'October 28 to November 3',
};

function Fixture() {
  const [home, setHome] = React.useState(true);
  return <div className="classroom-root classroom-root-home" style={{ minHeight: '100vh' }}>
    <aside className="classroom-sidebar" style={{ width: 240, padding: 20 }}>
      <p style={{ fontWeight: 700, marginBottom: 24 }}>LSAT U</p>
      <nav aria-label="Verification navigation"><button className="classroom-nav" onClick={() => setHome(true)}>Home</button><button className="classroom-nav" onClick={() => setHome(false)}>Practice</button></nav>
      <p style={{ marginTop: 32, fontSize: 12 }}>Development fixture. Fictional learner.</p>
    </aside>
    <main className="classroom-stage" style={{ flex: 1, minWidth: 0 }}>
      <div className="classroom-column">
        {home ? <ClassroomHomeView model={model} actorId="fixture-student" permissionsResolved loading={false} onOpen={() => {}} /> : <section style={{ padding: 24 }}><h1 style={{ fontSize: 30, marginBottom: 20 }}>Practice</h1><QuestionFinder returnTo="/practice/drills" actorId="fixture-student" enabled={!denied}/></section>}
      </div>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<BrowserRouter><Fixture/></BrowserRouter>);
