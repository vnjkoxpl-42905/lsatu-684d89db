import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import BootcampGate from './BootcampGate';
vi.mock('@/hooks/useStudentWorkState',()=>({useLoadedStudentWorkAcknowledgment:vi.fn()}));
vi.mock('@/hooks/useClassroomItems',()=>({useClassroomItems:()=>{const result=query.getMockImplementation()?.();return {data:result?.data?[{id:'bootcamp-one',student_id:'student-1',type:'bootcamp_module',source_id:'/bootcamp/conditionals',created_at:'2026-10-28T12:00:00Z',metadata_json:{bootcamp_id:'conditionals'}}]:[],isLoading:result?.isLoading,isError:false};}}));

const { auth, permissions, query } = vi.hoisted(() => ({ auth: vi.fn(), permissions: vi.fn(), query: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth() }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => permissions() }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: unknown) => query(options) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  auth.mockReturnValue({ user: null, authReady: true });
  permissions.mockReturnValue({ is_admin: false, has_classroom_access: true, loading: false });
  query.mockReturnValue({ data: false, isLoading: false });
});

function AuthProbe() {
  const location = useLocation();
  return <div data-testid="auth-location">{location.pathname + location.search}</div>;
}
function mount() {
  return render(<MemoryRouter initialEntries={['/bootcamp/conditionals/lessons?unit=must-arrow&from=assignment#practice']}>
    <Routes>
      <Route path="/bootcamp/conditionals/*" element={<BootcampGate routePath="/bootcamp/conditionals"><div>Protected lesson</div></BootcampGate>}/>
      <Route path="/auth" element={<AuthProbe/>}/>
    </Routes>
  </MemoryRouter>);
}

it('takes signed-out visitors to sign-in with the exact lesson query and hash preserved', () => {
  mount();
  const destination = screen.getByTestId('auth-location').textContent!;
  expect(destination.split('?')[0]).toBe('/auth');
  expect(new URLSearchParams(destination.slice(destination.indexOf('?'))).get('returnTo')).toBe('/bootcamp/conditionals/lessons?unit=must-arrow&from=assignment#practice');
  expect(screen.queryByText('Not assigned yet')).toBeNull();
  expect(screen.queryByText('Protected lesson')).toBeNull();
  expect(query.mock.calls[0][0].enabled).toBe(false);
});

it('waits for authentication readiness and permission loading before deciding access', () => {
  auth.mockReturnValue({ user: null, authReady: false });
  const view = mount();
  expect(screen.queryByTestId('auth-location')).toBeNull();
  expect(screen.queryByText('Not assigned yet')).toBeNull();
  view.unmount();
  auth.mockReturnValue({ user: null, authReady: true });
  permissions.mockReturnValue({ is_admin: false, loading: true });
  mount();
  expect(screen.queryByTestId('auth-location')).toBeNull();
  expect(screen.queryByText('Protected lesson')).toBeNull();
});

it('keeps authenticated students without an assignment locked', () => {
  auth.mockReturnValue({ user: { id: 'student-1' }, authReady: true });
  mount();
  expect(screen.getByText('Not assigned yet')).toBeTruthy();
  expect(screen.queryByTestId('auth-location')).toBeNull();
  expect(screen.queryByText('Protected lesson')).toBeNull();
  expect(query.mock.calls[0][0].enabled).toBe(true);
});

it('keeps an assignment query pending and allows only assigned students or administrators through', () => {
  auth.mockReturnValue({ user: { id: 'student-1' }, authReady: true });
  query.mockReturnValue({ data: undefined, isLoading: true });
  const pending = mount();
  expect(screen.queryByText('Not assigned yet')).toBeNull();
  expect(screen.queryByText('Protected lesson')).toBeNull();
  pending.unmount();
  query.mockReturnValue({ data: true, isLoading: false });
  const assigned = mount();
  expect(screen.getByText('Protected lesson')).toBeTruthy();
  assigned.unmount();
  query.mockReturnValue({ data: false, isLoading: false });
  permissions.mockReturnValue({ is_admin: true, loading: false });
  mount();
  expect(screen.getByText('Protected lesson')).toBeTruthy();
});
