import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RcResults from '../../src/features/rc/pages/RcResults';
import RcSearch from '../../src/features/rc/pages/RcSearch';
import { RcHubSurface } from '../../src/features/rc/components/RcHubSurface';
import { RcSavedSetsPanel } from '../../src/features/rc/components/RcSavedSetsPanel';
import { TimedFixture, ChildTimedFixture } from './timed';
import { ReviewFixture, TrainingFixture } from './review';
import { ComposerFixture } from './composer';
import '../../src/index.css';
import '../../src/components/classroom/classroom.css';
import { savedFixtureState, seedFixtureSavedRows, setFixtureSavedFailure } from './mockSavedSets';
const mode = new URLSearchParams(location.search).get('fixture');
// Match the observed production document theme for these visual fixtures.
if (mode === 'builder' || mode === 'saved' || mode === 'manage') {
  document.documentElement.classList.remove('dark');
  document.documentElement.classList.add('light');
}
if (mode === 'manage') seedFixtureSavedRows();
/** The actual RC Create ancestors from AcademyMainhub, without a new theme. */
function BuilderFixture() {
  return <div className="classroom-root classroom-root-drill"><main className="classroom-stage"><div className="classroom-column"><div className="drill-observatory-root"><section className="rc-create-workspace drill-observatory-launcher relative overflow-hidden" aria-label="RC drill setup"><div className="relative z-10"><RcHubSurface embedded showHistory={false} /></div></section></div></div></main></div>;
}
function SavedFixtureControls() {
  const [state, setState] = React.useState(savedFixtureState());
  React.useEffect(() => { const timer = setInterval(() => setState(savedFixtureState()), 250); return () => clearInterval(timer); }, []);
  return <aside className="border p-3"><strong>Synthetic saved RC account. No live backend.</strong>
    <button className="ml-3 rounded border px-3 py-2" onClick={() => { setFixtureSavedFailure(!state.failWrites); setState(savedFixtureState()); }}>{state.failWrites ? 'Allow synthetic RC saves' : 'Fail synthetic RC saves'}</button>
    <output className="ml-3">{state.count} synthetic RC definitions · last command {state.lastCommand || 'none'}</output>
  </aside>;
}
createRoot(document.getElementById('root')!).render(mode === 'composer' ? <ComposerFixture /> : mode === 'child' ? <ChildTimedFixture /> : mode === 'timed' ? <div style={new URLSearchParams(location.search).has('sidecar') ? { width: 'min(100%, 650px)' } : undefined}><TimedFixture /></div> : mode === 'training' ? <TrainingFixture /> : mode === 'review' ? <ReviewFixture /> :
  <MemoryRouter initialEntries={[mode === 'manage' ? '/manage' : mode === 'saved' ? '/rc' : mode === 'search' ? '/rc/search' : mode === 'builder' ? '/rc' : '/rc/results/fixture-session']}>
    {(mode === 'saved' || mode === 'manage') && <SavedFixtureControls />}
    <Routes><Route path="/rc" element={mode === 'builder' || mode === 'saved' ? <BuilderFixture /> : <RcHubSurface embedded />} /><Route path="/manage" element={<main className="mx-auto max-w-5xl px-4 sm:px-6 py-8"><RcSavedSetsPanel /></main>} /><Route path="/rc/search" element={<RcSearch />} /><Route path="/rc/results/:sessionId" element={<RcResults />} />
      <Route path="*" element={<p>Fixture navigation completed. No account work was created.</p>} /></Routes>
  </MemoryRouter>);
