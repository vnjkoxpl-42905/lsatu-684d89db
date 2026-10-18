import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RcPlayer from '../../src/features/rc/pages/RcPlayer';
import { allowFixtureLearningSave } from './mockLearning';
import { allowFixtureAnswerSave } from './mockProgress';

/** The fixture's Vite aliases replace every account writer with synthetic data. */
export function ReviewFixture() {
  return <><div className="p-2 border-b bg-amber-50">Synthetic review fixture. <button className="underline" onClick={allowFixtureAnswerSave}>Allow fixture account save</button></div>
  <MemoryRouter initialEntries={['/rc/drill?sessionId=fixture-session&review=1&q=1']}>
    <Routes>
      <Route path="/rc/drill" element={<RcPlayer />} />
      <Route path="*" element={<p>Review fixture exited. No student work was changed.</p>} />
    </Routes>
  </MemoryRouter></>;
}

export function TrainingFixture() {
  return <><div className="border-b bg-amber-50 p-2 text-slate-900">Synthetic ordinary practice. No live account writes.
    <button className="ml-2 underline" onClick={allowFixtureAnswerSave}>Allow fixture answer save</button>
    <button className="ml-2 underline" onClick={allowFixtureLearningSave}>Allow fixture learning save</button>
  </div><MemoryRouter initialEntries={['/rc/drill?sessionId=fixture-session']}><Routes>
    <Route path="/rc/drill" element={<RcPlayer />} />
    <Route path="*" element={<p>Synthetic training exited. No student work was changed.</p>} />
  </Routes></MemoryRouter></>;
}
