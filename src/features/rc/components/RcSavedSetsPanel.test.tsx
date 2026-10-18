import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RcSavedPayload } from '../lib/rcSavedSetCodec';
const m = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), save: vi.fn(), rename: vi.fn(), navigate: vi.fn(), actor: 'owner' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: m.actor } }) }));
vi.mock('react-router-dom', async () => ({ ...await vi.importActual('react-router-dom'), useNavigate: () => m.navigate }));
vi.mock('../api/rcSavedSets', () => ({ listRcSavedSets: (...args: unknown[]) => m.list(...args), getRcSavedSet: (...args: unknown[]) => m.get(...args), saveRcSet: (...args: unknown[]) => m.save(...args), renameRcSet: (...args: unknown[]) => m.rename(...args) }));
import { RcSavedSetsPanel } from './RcSavedSetsPanel';
const recipe: RcSavedPayload = { kind: 'rc-builder', version: 1, mode: 'recipe', config: { reveal: 'end_of_set', timing: { mode: 'unlimited' } }, filters: { topics: [], formats: [], frameworks: [], families: [], difficulties: [], status: 'fresh', preptestMin: 101, preptestMax: 148 }, count: 1, passageIds: [], questionIds: [] };
const saved = { id: 'saved-1', userId: 'owner', name: 'Science practice', createdAt: '2026-10-17', payload: recipe, problem: null };
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); m.actor = 'owner'; m.list.mockResolvedValue([]); m.save.mockResolvedValue(saved); m.get.mockResolvedValue(saved); m.rename.mockResolvedValue(undefined); });
const mount = () => render(<MemoryRouter><RcSavedSetsPanel recipe={recipe} /></MemoryRouter>);
describe('saved RC controls', () => {
  it('retries a failed recipe save using the same durable command id', async () => {
    m.save.mockRejectedValueOnce(new Error('Reply lost'));
    mount(); await screen.findByText('No saved RC sets or recipes yet.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Saved RC name' }), { target: { value: 'Science practice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save RC recipe' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reply lost');
    const firstId = m.save.mock.calls[0][3];
    fireEvent.click(screen.getByRole('button', { name: 'Save RC recipe' }));
    await screen.findByText(/Saved to your account/);
    expect(m.save.mock.calls[1][3]).toBe(firstId);
  });
  it('opens a recipe in the builder and has no deletion action', async () => {
    m.list.mockResolvedValue([saved]); mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Open Science practice' }));
    await waitFor(() => expect(m.navigate).toHaveBeenCalledWith('/rc?saved=saved-1'));
    expect(m.save).not.toHaveBeenCalled(); expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });
  it('retains a saved definition when renaming fails', async () => {
    m.list.mockResolvedValue([saved]); m.rename.mockRejectedValue(new Error('Name did not save')); mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Rename Science practice' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'New name for Science practice' }), { target: { value: 'New name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save RC name' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Name did not save');
    expect(screen.getByRole('button', { name: 'Open Science practice' })).toBeInTheDocument();
  });
  it('can retry the original command after remount without restoring typed builder fields', async () => {
    m.save.mockRejectedValueOnce(new Error('Reply lost'));
    const view = mount(); await screen.findByText('No saved RC sets or recipes yet.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Saved RC name' }), { target: { value: 'Science practice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save RC recipe' }));
    await screen.findByRole('alert'); const id = m.save.mock.calls[0][3]; view.unmount();
    mount(); fireEvent.click(await screen.findByRole('button', { name: 'Retry original RC save' }));
    await screen.findByText(/Saved to your account/);
    expect(m.save.mock.calls[1]).toEqual(['owner', 'Science practice', recipe, id]);
  });

});
