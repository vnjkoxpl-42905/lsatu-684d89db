import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Runner from '@/components/timed/TimedStandaloneSectionRunner';
import { sittingId, syntheticTimedController } from './mockTimed';
const factory = () => syntheticTimedController;
export function TimedFixture() {
  return <MemoryRouter initialEntries={[`/testing/sections/${sittingId}`]}><Routes>
    <Route path="/testing/sections/:sittingId" element={<Runner controllerFactory={factory} />} />
    <Route path="/testing" element={<p>Synthetic Testing destination</p>} />
    <Route path="/timed-fixture-report" element={<p>Synthetic section complete</p>} />
  </Routes></MemoryRouter>;
}
