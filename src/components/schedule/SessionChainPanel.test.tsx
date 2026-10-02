import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { SessionChainState } from '@/hooks/useSessionChain';
import { projectSessionChain, type SessionBooking } from '@/lib/sessionChain';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { BOOKING_B, STUDENT, booking, item, link } from '@/test/sessionChainFixtures';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import SessionChainPanel, { type SessionLinkWriter } from './SessionChainPanel';

function makeState(opts: {
  audience?: 'student' | 'teacher';
  bookings?: SessionBooking[];
  items?: ClassroomItem[];
  partial?: Partial<SessionChainState>;
} = {}): SessionChainState {
  const audience = opts.audience ?? 'student';
  const bookings = opts.bookings ?? [booking()];
  const items = opts.items ?? [];
  return {
    audience,
    subjectId: STUDENT,
    bookings,
    items: audience === 'teacher' ? items : [],
    projection: projectSessionChain({ items, bookings, subjectId: STUDENT, audience, now: new Date('2026-10-02T12:00:00Z') }),
    bookingsLoading: false,
    itemsLoading: false,
    bookingsFailed: false,
    itemsFailed: false,
    stale: false,
    retry: vi.fn(),
    ...opts.partial,
  };
}

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}{location.search}</p>;
}

type PanelProps = Partial<React.ComponentProps<typeof SessionChainPanel>> & { state: SessionChainState };

function tree(props: PanelProps) {
  return (
    <MemoryRouter initialEntries={['/schedule']}>
      <Routes>
        <Route path="*" element={<><SessionChainPanel selected={{ source: 'redemption', id: booking().id }} onBack={vi.fn()} {...props} /><Where /></>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderPanel(props: PanelProps) {
  return render(tree(props));
}

const prep = item({ title: 'Flaw drill', type: 'drill', metadata_json: { session_chain: link() } });
const recap = item({ title: 'Oct 5 recap', type: 'session_recap', metadata_json: { session_chain: link({ phase: 'recap' }) } });
const follow = item({ title: 'Flaw homework', metadata_json: { session_chain: link({ phase: 'follow_up' }) } });

describe('SessionChainPanel (student)', () => {
  it('shows the three groups in order and opens the exact record', () => {
    renderPanel({ state: makeState({ items: [prep, recap, follow] }) });
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Preparation', 'Recap', 'Follow-up']);
    fireEvent.click(screen.getByRole('button', { name: 'Open recap: Oct 5 recap' }));
    expect(screen.getByTestId('where')).toHaveTextContent(`/classroom/item/${recap.id}`);
  });

  it('shows honest absence with no completion claim', () => {
    renderPanel({ state: makeState() });
    expect(screen.getByText('No preparation linked')).toBeInTheDocument();
    expect(screen.getByText('No recap linked')).toBeInTheDocument();
    expect(screen.getByText('No follow-up linked')).toBeInTheDocument();
    expect(screen.queryByText(/completed/i)).not.toBeInTheDocument();
  });

  it('shows item-source failure as unknown, never empty', () => {
    const state = makeState({ partial: { itemsFailed: true } });
    renderPanel({ state });
    expect(screen.getByRole('alert')).toHaveTextContent('could not load');
    expect(screen.queryByText('No recap linked')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(state.retry).toHaveBeenCalled();
  });

  it('shows booking failure with retry rather than an empty appointment', () => {
    renderPanel({ state: makeState({ bookings: [], partial: { bookingsFailed: true } }) });
    expect(screen.getByRole('alert')).toHaveTextContent('Appointments could not load');
    expect(screen.queryByText('Appointment unavailable')).not.toBeInTheDocument();
  });

  it('keeps rows during a failed refresh with a freshness notice', () => {
    renderPanel({ state: makeState({ items: [prep], partial: { stale: true } }) });
    expect(screen.getByText(/Could not refresh/)).toBeInTheDocument();
    expect(screen.getByText('Flaw drill')).toBeInTheDocument();
  });

  it('shows a neutral unavailable state for a foreign or unknown selection, without picking another', () => {
    const onBack = vi.fn();
    renderPanel({ state: makeState({ items: [prep] }), selected: { source: 'redemption', id: BOOKING_B }, onBack });
    expect(screen.getByRole('heading', { name: 'Appointment unavailable' })).toBeInTheDocument();
    expect(screen.queryByText('Flaw drill')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to schedule' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('labels a canceled appointment and keeps its historical links', () => {
    renderPanel({ state: makeState({ bookings: [booking({ status: 'cancelled' })], items: [prep] }) });
    expect(screen.getByText('Canceled')).toBeInTheDocument();
    expect(screen.getByText('Flaw drill')).toBeInTheDocument();
  });

  it('has no teacher controls for a student', () => {
    renderPanel({ state: makeState({ items: [prep] }) });
    expect(screen.queryByRole('button', { name: /Link existing work/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove link/ })).not.toBeInTheDocument();
  });
});

describe('SessionChainPanel (teacher)', () => {
  const candidate = item({ title: 'Assumption drill', type: 'drill' });
  const elsewhere = item({ title: 'Linked elsewhere', type: 'drill', metadata_json: { session_chain: link({ booking_id: BOOKING_B }) } });
  const hidden = item({ title: 'Hidden prep', visible_to_student: false, metadata_json: { session_chain: link() } });
  const bookings = [booking(), booking({ id: BOOKING_B, startAt: '2026-10-08T15:00:00Z' })];

  function writer(result: Awaited<ReturnType<SessionLinkWriter['save']>>): SessionLinkWriter {
    return { save: vi.fn().mockResolvedValue(result), pending: false };
  }

  it('labels teacher-only links', () => {
    renderPanel({ state: makeState({ audience: 'teacher', items: [hidden], bookings }), writer: writer(null) });
    expect(screen.getByText('Teacher only: Hidden from student')).toBeInTheDocument();
  });

  it('requires a deliberate phase and record, then claims success only after acknowledgment', async () => {
    const w = writer({ kind: 'saved', item: candidate });
    renderPanel({ state: makeState({ audience: 'teacher', items: [candidate], bookings }), writer: w, studentName: 'Ada' });
    fireEvent.click(screen.getByRole('button', { name: /Link existing work/ }));
    const dialog = await screen.findByRole('dialog');
    const save = within(dialog).getByRole('button', { name: 'Save link' });
    expect(save).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Phase'), { target: { value: 'preparation' } });
    expect(save).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Record'), { target: { value: candidate.id } });
    expect(within(dialog).getByText('Visible to student')).toBeInTheDocument();
    fireEvent.click(save);
    await waitFor(() => expect(w.save).toHaveBeenCalledWith(candidate.id, null, link()));
    expect(await screen.findByText('Saved: the record is linked.')).toBeInTheDocument();
  });

  it('requires explicit Move link confirmation naming both appointments', async () => {
    const w = writer({ kind: 'saved', item: elsewhere });
    renderPanel({ state: makeState({ audience: 'teacher', items: [elsewhere], bookings }), writer: w });
    fireEvent.click(screen.getByRole('button', { name: /Link existing work/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Phase'), { target: { value: 'preparation' } });
    fireEvent.change(within(dialog).getByLabelText('Record'), { target: { value: elsewhere.id } });
    const move = within(dialog).getByRole('button', { name: 'Move link' });
    expect(move).toBeDisabled();
    const confirm = within(dialog).getByRole('checkbox');
    expect(confirm.closest('label')).toHaveTextContent(/Move link from Preparation for .*Oct 8.* to Preparation for .*Oct 5/);
    fireEvent.click(confirm);
    fireEvent.click(move);
    await waitFor(() => expect(w.save).toHaveBeenCalledWith(elsewhere.id, link({ booking_id: BOOKING_B }), link()));
  });

  it('keeps the selection and explains a failed save', async () => {
    const w = writer({ kind: 'not_saved', message: 'permission denied' });
    renderPanel({ state: makeState({ audience: 'teacher', items: [candidate], bookings }), writer: w });
    fireEvent.click(screen.getByRole('button', { name: /Link existing work/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Phase'), { target: { value: 'preparation' } });
    fireEvent.change(within(dialog).getByLabelText('Record'), { target: { value: candidate.id } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save link' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Not saved: permission denied');
    expect(within(dialog).getByLabelText('Record')).toHaveValue(candidate.id);
  });

  it('separates an acknowledged save from a failed refresh', async () => {
    const w = writer({ kind: 'saved', item: candidate, refreshFailed: true });
    renderPanel({ state: makeState({ audience: 'teacher', items: [candidate], bookings }), writer: w });
    fireEvent.click(screen.getByRole('button', { name: /Link existing work/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Phase'), { target: { value: 'preparation' } });
    fireEvent.change(within(dialog).getByLabelText('Record'), { target: { value: candidate.id } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save link' }));
    expect(await screen.findByText(/Saved: the record is linked\. The list could not refresh/)).toBeInTheDocument();
  });

  it('does not offer a drill under Recap', async () => {
    renderPanel({ state: makeState({ audience: 'teacher', items: [candidate], bookings }), writer: writer(null) });
    fireEvent.click(screen.getByRole('button', { name: /Link existing work/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Phase'), { target: { value: 'recap' } });
    expect(within(dialog).queryByRole('option', { name: /Assumption drill/ })).not.toBeInTheDocument();
  });

  it('removes a link after confirmation that the record stays', async () => {
    const w = writer({ kind: 'saved', item: prep });
    renderPanel({ state: makeState({ audience: 'teacher', items: [prep], bookings }), writer: w });
    fireEvent.click(screen.getByRole('button', { name: 'Remove link: Flaw drill' }));
    const alert = await screen.findByRole('alertdialog');
    expect(alert).toHaveTextContent('stays available in My Work');
    fireEvent.click(within(alert).getByRole('button', { name: 'Remove link' }));
    await waitFor(() => expect(w.save).toHaveBeenCalledWith(prep.id, link(), null));
    expect(await screen.findByText(/link is removed\. The record is still in My Work/)).toBeInTheDocument();
  });

  it('disables new links on a canceled appointment', () => {
    renderPanel({ state: makeState({ audience: 'teacher', items: [candidate], bookings: [booking({ status: 'cancelled' })] }), writer: writer(null) });
    expect(screen.getByRole('button', { name: /Link existing work/ })).toBeDisabled();
  });

  it('closes the dialog when the subject changes', async () => {
    const state = makeState({ audience: 'teacher', items: [candidate], bookings });
    const view = renderPanel({ state, writer: writer(null) });
    fireEvent.click(screen.getByRole('button', { name: /Link existing work/ }));
    await screen.findByRole('dialog');
    view.rerender(tree({ state: { ...state, subjectId: 'someone-else' }, writer: writer(null) }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
