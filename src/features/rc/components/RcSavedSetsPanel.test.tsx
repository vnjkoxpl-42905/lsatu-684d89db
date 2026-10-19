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
  it('keeps save presentation quiet and does not query management data before a preview', () => {
    render(<MemoryRouter><RcSavedSetsPanel presentation="save" recipe={recipe} fixed={null} /></MemoryRouter>);
    expect(m.list).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Save RC set' })).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Saved RC name' })).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByText(/Loading saved/)).toBeNull();
  });
  it('keeps original-save recovery available after the preview is cleared without fetching a list', async () => {
    const fixed: RcSavedPayload = { ...recipe, mode: 'fixed', passageIds: [218], questionIds: [1458] };
    m.save.mockRejectedValueOnce(new Error('Reply lost'));
    const view = render(<MemoryRouter><RcSavedSetsPanel presentation="save" recipe={recipe} fixed={fixed} /></MemoryRouter>);
    fireEvent.change(screen.getByRole('textbox', { name: 'Saved RC name' }), { target: { value: 'Science practice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save passages' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reply lost');
    const id = m.save.mock.calls[0][3];
    view.rerender(<MemoryRouter><RcSavedSetsPanel presentation="save" recipe={recipe} fixed={null} /></MemoryRouter>);
    expect(screen.queryByRole('textbox', { name: 'Saved RC name' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry original RC save' }));
    await screen.findByText('Saved.');
    expect(m.save.mock.calls[1]).toEqual(['owner', 'Science practice', fixed, id]);
    expect(m.list).not.toHaveBeenCalled();
  });
  it('shows durable recovery problems in save presentation without an active preview', async () => {
    localStorage.setItem('lsatu:rc-saved-definition:v1:owner', '{broken');
    render(<MemoryRouter><RcSavedSetsPanel presentation="save" fixed={null} /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('pending RC save could not be restored');
    expect(screen.queryByRole('button', { name: 'Retry loading RC sets' })).toBeNull();
    expect(m.list).not.toHaveBeenCalled();
  });
  it('uses compact visible management actions with descriptive accessible names', async () => {
    m.list.mockResolvedValue([saved]); mount();
    const open = await screen.findByRole('button', { name: 'Open Science practice' });
    expect(open).toHaveTextContent(/^Open$/);
    expect(screen.getByRole('button', { name: 'Rename Science practice' })).toHaveTextContent(/^Rename$/);
    expect(screen.getByRole('button', { name: 'Duplicate Science practice' })).toHaveTextContent(/^Duplicate$/);
    expect(screen.getByRole('heading', { name: 'Saved RC sets' })).toBeInTheDocument();
    expect(screen.getByText('Saved settings · 1 passage')).toBeInTheDocument();
  });

  it('retries a failed recipe save using the same durable command id', async () => {
    m.save.mockRejectedValueOnce(new Error('Reply lost'));
    mount(); await screen.findByText('No saved RC sets yet.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Saved RC name' }), { target: { value: 'Science practice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reply lost');
    const firstId = m.save.mock.calls[0][3];
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry original RC save' }));
    await screen.findByText(/Saved\./);
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
    fireEvent.click(screen.getByRole('button', { name: 'Save name for Science practice' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Name did not save');
    expect(screen.getByRole('button', { name: 'Open Science practice' })).toBeInTheDocument();
  });
  it('can retry the original command after remount without restoring typed builder fields', async () => {
    m.save.mockRejectedValueOnce(new Error('Reply lost'));
    const view = mount(); await screen.findByText('No saved RC sets yet.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Saved RC name' }), { target: { value: 'Science practice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await screen.findByRole('alert'); const id = m.save.mock.calls[0][3]; view.unmount();
    mount(); fireEvent.click(await screen.findByRole('button', { name: 'Retry original RC save' }));
    await screen.findByText(/Saved\./);
    expect(m.save.mock.calls[1]).toEqual(['owner', 'Science practice', recipe, id]);
  });

  it('blocks rename and duplicate while recovering an unconfirmed original save', async () => {
    m.save.mockRejectedValueOnce(new Error('Reply lost'));
    const view = mount(); await screen.findByText('No saved RC sets yet.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Saved RC name' }), { target: { value: saved.name } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await screen.findByRole('alert'); view.unmount(); m.list.mockResolvedValue([saved]); mount();
    const rename = await screen.findByRole('button', { name: 'Rename Science practice' });
    expect(rename).toBeDisabled(); expect(screen.getByRole('button', { name: 'Duplicate Science practice' })).toBeDisabled();
    fireEvent.click(rename); expect(screen.queryByRole('textbox', { name: 'New name for Science practice' })).toBeNull();
    expect(m.rename).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Retry original RC save' })).toBeEnabled();
  });

});
