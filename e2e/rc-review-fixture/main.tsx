import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RcResults from '../../src/features/rc/pages/RcResults';
import RcSearch from '../../src/features/rc/pages/RcSearch';
import { RcHubSurface } from '../../src/features/rc/components/RcHubSurface';
import { TimedFixture, ChildTimedFixture } from './timed';
import { ReviewFixture, TrainingFixture } from './review';
import { ComposerFixture } from './composer';
import '../../src/index.css';
import { savedFixtureState, setFixtureSavedFailure } from './mockSavedSets';
const mode = new URLSearchParams(location.search).get('fixture');
function SavedFixtureControls() {
  const [state, setState] = React.useState(savedFixtureState());
  React.useEffect(() => { const timer = setInterval(() => setState(savedFixtureState()), 250); return () => clearInterval(timer); }, []);
  return <aside className="border p-3"><strong>Synthetic saved RC account. No live backend.</strong>
    <button className="ml-3 rounded border px-3 py-2" onClick={() => { setFixtureSavedFailure(!state.failWrites); setState(savedFixtureState()); }}>{state.failWrites ? 'Allow synthetic RC saves' : 'Fail synthetic RC saves'}</button>
    <output className="ml-3">{state.count} synthetic RC definitions · last command {state.lastCommand || 'none'}</output>
  </aside>;
}
createRoot(document.getElementById('root')!).render(mode === 'composer' ? <ComposerFixture /> : mode === 'child' ? <ChildTimedFixture /> : mode === 'timed' ? <div style={new URLSearchParams(location.search).has('sidecar') ? { width: 'min(100%, 650px)' } : undefined}><TimedFixture /></div> : mode === 'training' ? <TrainingFixture /> : mode === 'review' ? <ReviewFixture /> :
  <MemoryRouter initialEntries={[mode === 'saved' ? '/rc' : mode === 'search' ? '/rc/search' : mode === 'builder' ? '/rc' : '/rc/results/fixture-session']}>
    {mode === 'saved' && <SavedFixtureControls />}
    <Routes><Route path="/rc" element={<RcHubSurface embedded />} /><Route path="/rc/search" element={<RcSearch />} /><Route path="/rc/results/:sessionId" element={<RcResults />} />
      <Route path="*" element={<p>Fixture navigation completed. No account work was created.</p>} /></Routes>
  </MemoryRouter>);
