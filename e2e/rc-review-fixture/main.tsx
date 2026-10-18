import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RcResults from '../../src/features/rc/pages/RcResults';
import RcSearch from '../../src/features/rc/pages/RcSearch';
import { RcHubSurface } from '../../src/features/rc/components/RcHubSurface';
import { TimedFixture, ChildTimedFixture } from './timed';
import { ReviewFixture } from './review';
import { ComposerFixture } from './composer';
import '../../src/index.css';
const mode = new URLSearchParams(location.search).get('fixture');
createRoot(document.getElementById('root')!).render(mode === 'composer' ? <ComposerFixture /> : mode === 'child' ? <ChildTimedFixture /> : mode === 'timed' ? <div style={new URLSearchParams(location.search).has('sidecar') ? { width: 'min(100%, 650px)' } : undefined}><TimedFixture /></div> : mode === 'review' ? <ReviewFixture /> :
  <MemoryRouter initialEntries={[mode === 'search' ? '/rc/search' : mode === 'builder' ? '/rc' : '/rc/results/fixture-session']}>
    <Routes><Route path="/rc" element={<RcHubSurface embedded />} /><Route path="/rc/search" element={<RcSearch />} /><Route path="/rc/results/:sessionId" element={<RcResults />} />
      <Route path="*" element={<p>Fixture navigation completed. No account work was created.</p>} /></Routes>
  </MemoryRouter>);
