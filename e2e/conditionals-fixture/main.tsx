import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, Link } from 'react-router-dom';
import ConditionalBootcamp from '@/pages/ConditionalBootcamp';
import { ConditionalAssignmentFields } from '@/components/teacher/ConditionalAssignmentFields';
import { DEFAULT_CONDITIONAL_TARGET, type ConditionalAssignmentTarget, resolveConditionalAssignment } from '@/lib/conditionalBootcampAssignment';
import { FixtureActor } from './mockAuth';
import { setFailSaves } from './mockCloud';
import '@/index.css';
const queryClient = new QueryClient();
function Fixture() {
  const [actor, setActor] = useState('fixture-a');
  const [failed, setFailed] = useState(false);
  const [target, setTarget] = useState<ConditionalAssignmentTarget>(DEFAULT_CONDITIONAL_TARGET);
  const [resolved, setResolved] = useState('');
  return <FixtureActor.Provider value={actor}><BrowserRouter>
    <aside style={{ padding: 8, background: '#eff5ee', color: '#173622', display: 'flex', flexWrap: 'wrap', gap: 12 }} aria-label="Verification controls">
      <strong>Local test accounts only</strong><select aria-label="Test account" value={actor} onChange={event => setActor(event.target.value)}>{['fixture-a', 'fixture-b', 'fixture-c', 'fixture-none', 'fixture-admin'].map(value => <option key={value}>{value}</option>)}</select>
      <button onClick={() => { setFailSaves(!failed); setFailed(!failed); }}>{failed ? 'Restore cloud' : 'Fail cloud saves'}</button>
      <Link to="/fixture/assign">Teacher assignment controls</Link><Link to="/fixture/inline">Inline preview</Link><Link to="/bootcamp/conditionals">Full course</Link>
    </aside>
    <Routes><Route path="/bootcamp/conditionals/*" element={<ConditionalBootcamp />} /><Route path="/fixture/inline" element={<ConditionalBootcamp />} />
      <Route path="/fixture/assign" element={<div style={{ maxWidth: 600, padding: 24 }}><h1>Teacher targeting verification</h1><ConditionalAssignmentFields value={target} onChange={setTarget} /><button onClick={() => void resolveConditionalAssignment(target).then(value => setResolved(value.route))}>Preview assignment route</button><p role="status">{resolved}</p></div>} />
      <Route path="*" element={<Link to="/bootcamp/conditionals">Open the course</Link>} />
    </Routes>
  </BrowserRouter></FixtureActor.Provider>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><Fixture /></QueryClientProvider>);
