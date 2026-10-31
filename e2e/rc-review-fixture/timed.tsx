import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ChildRunner from '@/components/testing/TimedOfficialChildRunner';
import Runner from '@/components/timed/TimedStandaloneSectionRunner';
import { sittingId, syntheticTimedController, syntheticChildController, syntheticLrChildController } from './mockTimed';
const factory = () => syntheticTimedController;
export function TimedFixture() {
  return <MemoryRouter initialEntries={[`/testing/sections/${sittingId}`]}><Routes>
    <Route path="/testing/sections/:sittingId" element={<Runner controllerFactory={factory} />} />
    <Route path="/testing" element={<p>Synthetic Testing destination</p>} />
    <Route path="/timed-fixture-report" element={<p>Synthetic section complete</p>} />
  </Routes></MemoryRouter>;
}

const childFactory = () => syntheticChildController;
export function ChildTimedFixture() {
  return <MemoryRouter initialEntries={['/testing/test/synthetic-run/rc/0']}><Routes>
    <Route path="/testing/test/:runId/rc/:legIndex" element={<ChildRunner kind="rc" controllerFactory={childFactory} />} />
    <Route path="/testing/test/synthetic-run" element={<p>Synthetic PrepTest destination</p>} />
  </Routes></MemoryRouter>;
}

const lrChildFactory = () => syntheticLrChildController;
export function LrChildTimedFixture() {
  return <MemoryRouter initialEntries={['/testing/test/synthetic-run/lr/0']}><Routes>
    <Route path="/testing/test/:runId/lr/:legIndex" element={<ChildRunner kind="lr" controllerFactory={lrChildFactory} />} />
    <Route path="/testing/test/synthetic-run" element={<p>Synthetic PrepTest destination</p>} />
  </Routes></MemoryRouter>;
}
