import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOOKING_A, BOOKING_B, STUDENT, item, link } from '@/test/sessionChainFixtures';
import type { ClassroomItem } from '@/hooks/useClassroomItems';

const state = vi.hoisted(() => ({
  user: { id: 'aaaaaaaa-0000-4000-8000-000000000001' } as { id: string } | null,
  bookings: [] as unknown[],
  items: [] as unknown[],
  itemsError: false,
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/components/booking/BookingView', () => ({ default: () => <p>Booking view</p> }));
vi.mock('@/hooks/useStudentTodo', () => ({
  useStudentTodo: () => ({ items: [], loading: false, error: null, refresh: vi.fn(), toggleComplete: vi.fn(), moveToDay: vi.fn(), addTask: vi.fn(), deleteTask: vi.fn() }),
}));
vi.mock('@/hooks/useStudentBooking', () => ({
  useStudentBooking: () => ({ data: { pass: null, bookings: state.bookings }, isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useClassroomItems', () => ({
  useClassroomItems: () => ({ data: state.itemsError ? undefined : state.items, isLoading: false, isError: state.itemsError, refetch: vi.fn() }),
  useStudentClassroomItems: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
}));

import Schedule from './Schedule';

function Where() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><p data-testid="where">{location.pathname}{location.search}</p><button type="button" onClick={() => navigate(-1)}>Browser back</button></>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/schedule" element={<><Schedule /><Where /></>} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const soon = new Date(Date.now() + 60 * 60 * 1000);
const raw = (id: string, overrides: Record<string, unknown> = {}) => ({
  source: 'redemption', id, start_at: soon.toISOString(), end_at: new Date(soon.getTime() + 70 * 60000).toISOString(),
  status: 'booked', meet_url: null, calendar_status: 'synced', reschedule_count: 0, google_event_id: null, can_reschedule: true, ...overrides,
});

let prep: ClassroomItem;
let recap: ClassroomItem;
let unrelated: ClassroomItem;

beforeEach(() => {
  state.user = { id: STUDENT };
  state.bookings = [raw(BOOKING_A), raw(BOOKING_B)];
  prep = item({ title: 'Prep drill', type: 'drill', metadata_json: { session_chain: link() } });
  recap = item({ title: 'Session recap', type: 'session_recap', metadata_json: { session_chain: link({ phase: 'recap' }) } });
  unrelated = item({ title: 'Other appointment work', metadata_json: { session_chain: link({ booking_id: BOOKING_B }) } });
  state.items = [prep, recap, unrelated];
  state.itemsError = false;
});

describe('Schedule session work', () => {
  it('selects an appointment from the agenda, and keeps other query params', () => {
    renderAt('/schedule?ref=email');
    const buttons = screen.getAllByRole('button', { name: 'Session work' });
    fireEvent.click(buttons[0]);
    const where = screen.getByTestId('where').textContent ?? '';
    expect(where).toContain('ref=email');
    expect(where).toMatch(/session=v1\.redemption\./);
    expect(screen.getAllByRole('heading', { name: '1:1 LSAT session' }).length).toBeGreaterThan(0);
  });

  it('restores the same appointment from a deep link and returns to it with Back', () => {
    renderAt(`/schedule?session=v1.redemption.${BOOKING_A}&ref=email`);
    expect(screen.getByText('Prep drill')).toBeInTheDocument();
    expect(screen.getByText('Session recap')).toBeInTheDocument();
    expect(screen.queryByText('Other appointment work')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open recap: Session recap' }));
    expect(screen.getByTestId('where')).toHaveTextContent(`/classroom/item/${recap.id}`);
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    expect(screen.getByTestId('where')).toHaveTextContent(`session=v1.redemption.${BOOKING_A}&ref=email`);
    expect(screen.getByText('Prep drill')).toBeInTheDocument();
  });

  it('shows an invalid selection as unavailable and does not pick a nearby appointment', () => {
    renderAt(`/schedule?session=booking-redemption-${BOOKING_A}`);
    expect(screen.getByRole('heading', { name: 'Appointment unavailable' })).toBeInTheDocument();
    expect(screen.queryByText('Prep drill')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to schedule' }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/schedule$/);
  });

  it('treats a booking the student does not own as unavailable', () => {
    renderAt('/schedule?session=v1.redemption.99999999-9999-4999-8999-999999999999');
    expect(screen.getByRole('heading', { name: 'Appointment unavailable' })).toBeInTheDocument();
  });

  it('does not show a previous account’s appointment after the account changes', () => {
    const view = renderAt(`/schedule?session=v1.redemption.${BOOKING_A}`);
    expect(screen.getByText('Prep drill')).toBeInTheDocument();
    state.user = { id: 'aaaaaaaa-0000-4000-8000-000000000009' };
    view.rerender(
      <MemoryRouter initialEntries={[`/schedule?session=v1.redemption.${BOOKING_A}`]}>
        <Routes><Route path="/schedule" element={<Schedule />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByText('Prep drill')).not.toBeInTheDocument();
  });

  it('lists canceled and past sessions for discovery and selects the exact one, surviving reload and Back', () => {
    const canceledId = '55555555-5555-4555-8555-555555555555';
    state.bookings = [
      raw(BOOKING_A),
      raw(canceledId, { status: 'cancelled', start_at: '2026-09-20T15:00:00Z', end_at: '2026-09-20T16:10:00Z', can_reschedule: false }),
    ];
    const prepOnCanceled = item({ title: 'Canceled-day drill', type: 'drill', metadata_json: { session_chain: link({ booking_id: canceledId }) } });
    state.items = [prep, prepOnCanceled];
    const view = renderAt('/schedule?ref=email');
    const history = screen.getByRole('region', { name: 'Past and canceled sessions' });
    expect(history).toHaveTextContent('Canceled');
    // The upcoming booked session stays on the calendar, not in history.
    expect(history.querySelectorAll('li')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Session work: .*Canceled/ }));
    const url = screen.getByTestId('where').textContent ?? '';
    expect(url).toContain(`session=v1.redemption.${canceledId}`);
    expect(url).toContain('ref=email');
    expect(screen.getByText('Canceled-day drill')).toBeInTheDocument();
    expect(screen.queryByText('Prep drill')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Link existing work/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/schedule\?ref=email$/);
    expect(screen.queryByText('Canceled-day drill')).not.toBeInTheDocument();

    view.unmount();
    renderAt(url);
    expect(screen.getByText('Canceled-day drill')).toBeInTheDocument();
    expect(screen.getAllByText('Canceled').length).toBeGreaterThan(0);
  });

  it('never lists checkout holds or failed bookings as sessions', () => {
    state.bookings = [
      raw(BOOKING_A),
      raw('66666666-6666-4666-8666-666666666666', { source: 'single_session', status: 'draft', start_at: '2026-09-10T15:00:00Z' }),
      raw('77777777-7777-4777-8777-777777777777', { source: 'single_session', status: 'expired', start_at: '2026-09-11T15:00:00Z' }),
      raw('88888888-8888-4888-8888-888888888888', { status: 'failed', start_at: '2026-09-12T15:00:00Z' }),
    ];
    renderAt('/schedule');
    expect(screen.queryByRole('region', { name: 'Past and canceled sessions' })).not.toBeInTheDocument();
  });

  it('says single-session history may be incomplete at the 30-row cap instead of claiming a session does not exist', () => {
    state.bookings = Array.from({ length: 30 }, (_, i) => raw(`99999999-0000-4000-8000-${String(i).padStart(12, '0')}`, {
      source: 'single_session', status: 'booked', start_at: `2026-08-${String((i % 28) + 1).padStart(2, '0')}T15:00:00Z`, end_at: `2026-08-${String((i % 28) + 1).padStart(2, '0')}T16:00:00Z`,
    }));
    renderAt('/schedule?session=v1.single_session.aaaaaaaa-1111-4111-8111-111111111111');
    expect(screen.getByRole('heading', { name: 'Appointment unavailable' })).toBeInTheDocument();
    expect(screen.getByText(/may be older than the latest 30 single sessions/)).toBeInTheDocument();
    expect(screen.getByText(/Only your latest 30 single sessions can be listed here/)).toBeInTheDocument();
  });
});
