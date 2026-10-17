import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RcResults from '../../src/features/rc/pages/RcResults';
import RcSearch from '../../src/features/rc/pages/RcSearch';
import { TimedFixture } from './timed';
import '../../src/index.css';
const mode = new URLSearchParams(location.search).get('fixture');
createRoot(document.getElementById('root')!).render(mode === 'timed' ? <TimedFixture /> :
  <MemoryRouter initialEntries={[mode === 'search' ? '/rc/search' : '/rc/results/fixture-session']}>
    <Routes><Route path="/rc/search" element={<RcSearch />} /><Route path="/rc/results/:sessionId" element={<RcResults />} />
      <Route path="*" element={<p>Fixture navigation completed. No account work was created.</p>} /></Routes>
  </MemoryRouter>);
