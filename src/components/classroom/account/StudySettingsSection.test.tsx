import * as React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { settingsKeyFor } from '@/lib/studySettings';

const auth = vi.hoisted(() => ({ user: { id: 'a' } as { id: string } | null, authReady: true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {
  getUser: async () => ({ data: { user: { id: auth.user?.id } }, error: null }),
  updateUser: async ({ data }: { data: unknown }) => ({ data: { user: { id: auth.user?.id, user_metadata: data } }, error: null }),
} } }));
const resetPool = vi.hoisted(() => vi.fn());
vi.mock('@/lib/questionPoolService', () => ({ QuestionPoolService: { resetPool } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { UserSettingsProvider } from '@/contexts/UserSettingsContext';
import StudySettingsSection from './StudySettingsSection';

const ui = () => (
  <UserSettingsProvider>
    <StudySettingsSection />
  </UserSettingsProvider>
);
const stored = (id: string) => JSON.parse(window.localStorage.getItem(settingsKeyFor(id)) ?? 'null');

beforeEach(() => {
  window.localStorage.clear();
  auth.user = { id: 'a' };
  auth.authReady = true;
  resetPool.mockReset();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('StudySettingsSection', () => {
  it('offers only settings the app reads, with no AI or feedback switches', () => {
    render(ui());
    const switches = screen.getAllByRole('switch').map((s) => s.getAttribute('aria-label'));
    expect(switches).toEqual(['Allow repeats', 'New questions first']);
    expect(screen.queryByText(/AI tutor|Voice coach|Teach-back|transcript/i)).toBeNull();
  });

  it('explains the timing consequence and updates it only after an explicit profile save', async () => {
    render(ui());
    const select = screen.getByRole('combobox', { name: 'Profile time accommodation' });
    await waitFor(() => expect(select).not.toBeDisabled());
    expect(screen.getByText(/give you 35 minutes/)).toBeInTheDocument();
    fireEvent.change(select, { target: { value: '70' } });
    expect(stored('a')).toBeNull();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save to profile' })); });
    expect(screen.getByText(/give you 70 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/A section already running keeps its clock/)).toBeInTheDocument();
    expect(stored('a')).toMatchObject({ defaultTimingMode: '70' });
  });

  it('describes the next drill\'s pool and says history is untouched', () => {
    render(ui());
    expect(screen.getByText(/never answered while any are left. After that, a question comes back 30 days/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Allow repeats' }));
    expect(screen.getByText(/then draws from every question/)).toBeInTheDocument();
    expect(screen.getByText(/Your past answers, scores and history do not change/)).toBeInTheDocument();
  });

  it('can turn new-questions-first off while repeats are off, since the drill reads it then too', () => {
    render(ui());
    const unseen = screen.getByRole('switch', { name: 'New questions first' });
    expect(unseen).not.toBeDisabled();
    fireEvent.click(unseen);
    expect(stored('a')).toMatchObject({ preferUnseen: false });
    expect(screen.getByText(/mixes questions you have never answered with ones you last saw more than 30 days ago/)).toBeInTheDocument();
  });

  it('rejects an invalid recycle value without changing the saved one, and saves a valid one on Enter', () => {
    render(ui());
    const input = screen.getByRole('spinbutton', { name: 'Days before a seen question can come back' });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a whole number from 1 to 365. Still using 30.');
    expect(window.localStorage.getItem(settingsKeyFor('a'))).toBeNull();
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(stored('a')).toMatchObject({ recycleAfterDays: 12 });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says when a local pool change was not stored and recovers on retry', () => {
    render(ui());
    const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    fireEvent.click(screen.getByRole('switch', { name: 'Allow repeats' }));
    expect(screen.getAllByText(/would not store your last change/).length).toBeGreaterThan(0);
    spy.mockRestore();
    fireEvent.click(screen.getAllByRole('button', { name: 'Try saving again' })[0]);
    expect(stored('a')).toMatchObject({ defaultTimingMode: '35', allowRepeats: true });
    expect(screen.queryByText(/would not store your last change/)).toBeNull();
    expect(screen.getAllByText(/Saved in this browser for your account/).length).toBeGreaterThan(0);
  });

  it('drops an open draft and field error when the account changes', () => {
    const { rerender } = render(ui());
    const input = screen.getByRole('spinbutton', { name: 'Days before a seen question can come back' });
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    window.localStorage.setItem(settingsKeyFor('b'), JSON.stringify({ recycleAfterDays: 5 }));
    auth.user = { id: 'b' };
    rerender(ui());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('spinbutton', { name: 'Days before a seen question can come back' })).toHaveValue(5);
  });

  it('shows old device-wide settings as an offer, applying them only on an explicit choice', () => {
    window.localStorage.setItem('userSettings', JSON.stringify({ defaultTimingMode: '70' }));
    render(ui());
    expect(screen.getByRole('combobox', { name: 'Profile time accommodation' })).toHaveValue('35');
    expect(screen.getByTestId('legacy-offer')).toHaveTextContent('We cannot tell whose they are');
    fireEvent.click(screen.getByRole('button', { name: 'Use these settings for my account' }));
    expect(screen.getByRole('combobox', { name: 'Profile time accommodation' })).toHaveValue('70');
    expect(screen.queryByTestId('legacy-offer')).toBeNull();
    expect(stored('a')).toMatchObject({ defaultTimingMode: '70' });
  });

  it('keeps the reset dialog open with an honest message when the reset fails', async () => {
    resetPool.mockRejectedValueOnce(new Error('rls'));
    render(ui());
    fireEvent.click(screen.getByRole('button', { name: /Reset question pool/ }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Your past answers, scores and history stay exactly as they are.');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reset pool' }));
    });
    expect(resetPool).toHaveBeenCalledWith('a');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
