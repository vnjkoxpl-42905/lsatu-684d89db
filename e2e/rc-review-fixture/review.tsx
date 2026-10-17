import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RcPlayer from '../../src/features/rc/pages/RcPlayer';

/** The fixture's Vite aliases replace every account writer with synthetic data. */
export function ReviewFixture() {
  return <MemoryRouter initialEntries={['/rc/drill?sessionId=fixture-session&review=1&q=1']}>
    <Routes>
      <Route path="/rc/drill" element={<RcPlayer />} />
      <Route path="*" element={<p>Review fixture exited. No student work was changed.</p>} />
    </Routes>
  </MemoryRouter>;
}
