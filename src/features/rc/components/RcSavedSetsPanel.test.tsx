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
  it('offers named contextual saving without loading or duplicating saved management', async () => {
    m.list.mockResolvedValue([saved]);
    render(<MemoryRouter><RcSavedSetsPanel variant="contextual" recipe={recipe} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Save this drill' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save these settings' })).toBeDisabled();
    expect(m.list).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Open Science practice' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Saved RC name' }), { target: { value: 'My settings' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save these settings' }));
    await screen.findByText('Saved to your account. Find it in Saved sets.');
    expect(m.save).toHaveBeenCalledWith('owner', 'My settings', recipe, expect.any(String));
    expect(m.list).not.toHaveBeenCalled();
  });
  it('explains exact-passage availability before Preview without hiding the save choices', () => {
    render(<MemoryRouter><RcSavedSetsPanel variant="contextual" /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Save these passages' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save these settings' })).toBeDisabled();
    expect(screen.getByText(/Preview your selection to save these exact passages/)).toBeInTheDocument();
    expect(screen.getByText(/Reusable settings are available with Choose for me/)).toBeInTheDocument();
    expect(m.list).not.toHaveBeenCalled();
  });
  it('reports explicit demo success only after the adapter completes', async () => {
    let complete!: (value: unknown) => void;
    m.save.mockReturnValue(new Promise(resolve => { complete = resolve; }));
    render(<MemoryRouter><RcSavedSetsPanel variant="contextual" recipe={recipe} saveSuccessMessage="Saved in this demo only. Reload resets it." /></MemoryRouter>);
    fireEvent.change(screen.getByRole('textbox', { name: 'Saved RC name' }), { target: { value: 'Demo settings' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save these settings' }));
    expect(screen.queryByText('Saved in this demo only. Reload resets it.')).toBeNull();
    expect(screen.queryByText(/Saved to your account/)).toBeNull();
    complete(saved);
    await screen.findByText('Saved in this demo only. Reload resets it.');
    expect(screen.queryByText(/Saved to your account/)).toBeNull();
  });
  it('recovers the original save in contextual mode without requiring the original setup', async () => {
    const id = 'original-save-id';
    localStorage.setItem('lsatu:rc-saved-definition:v1:owner', JSON.stringify({ id, key: JSON.stringify({ name: saved.name, payload: recipe }) }));
    render(<MemoryRouter><RcSavedSetsPanel variant="contextual" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry original RC save' }));
    await screen.findByText('Saved to your account. Find it in Saved sets.');
    expect(m.save).toHaveBeenCalledWith('owner', saved.name, recipe, id);
    expect(localStorage.getItem('lsatu:rc-saved-definition:v1:owner')).toBeNull();
    expect(m.list).not.toHaveBeenCalled();
  });
  it('retries a failed recipe save using the same durable command id', async () => {
    m.save.mockRejectedValueOnce(new Error('Reply lost'));
    mount(); await screen.findByText('No saved passages or settings yet.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Saved RC name' }), { target: { value: 'Science practice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save these settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reply lost');
    const firstId = m.save.mock.calls[0][3];
    expect(screen.getByRole('button', { name: 'Save these settings' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry original RC save' }));
    await screen.findByText(/Saved to your account/);
    expect(m.save.mock.calls[1][3]).toBe(firstId);
  });
  it('opens a recipe in the builder and has no deletion action', async () => {
    m.list.mockResolvedValue([saved]); mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Open Science practice' }));
    await waitFor(() => expect(m.navigate).toHaveBeenCalledWith('/practice/drills?section=rc&view=create&saved=saved-1'));
    expect(m.save).not.toHaveBeenCalled(); expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });
  it('distinguishes exact passages from reusable settings when saving', async () => {
    const fixed: RcSavedPayload = { ...recipe, mode: 'fixed', passageIds: [1188], questionIds: [1, 2] };
    render(<MemoryRouter><RcSavedSetsPanel recipe={recipe} fixed={fixed} /></MemoryRouter>);
    fireEvent.change(screen.getByRole('textbox', { name: 'Saved RC name' }), { target: { value: 'Exact practice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save these passages' }));
    await waitFor(() => expect(m.save).toHaveBeenCalledWith('owner', 'Exact practice', fixed, expect.any(String)));
    expect(screen.getByRole('button', { name: 'Save these settings' })).toBeInTheDocument();
  });
  it('keeps failed saved-item verification in place without navigating', async () => {
    m.list.mockResolvedValue([saved]); m.get.mockRejectedValue(new Error('Could not verify saved work')); mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Open Science practice' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not verify saved work');
    expect(m.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open Science practice' })).toBeEnabled();
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
    const view = mount(); await screen.findByText('No saved passages or settings yet.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Saved RC name' }), { target: { value: 'Science practice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save these settings' }));
    await screen.findByRole('alert'); const id = m.save.mock.calls[0][3]; view.unmount();
    mount(); fireEvent.click(await screen.findByRole('button', { name: 'Retry original RC save' }));
    await screen.findByText(/Saved to your account/);
    expect(m.save.mock.calls[1]).toEqual(['owner', 'Science practice', recipe, id]);
  });

  it('blocks rename and duplicate while recovering an unconfirmed original save', async () => {
    m.save.mockRejectedValueOnce(new Error('Reply lost'));
    const view = mount(); await screen.findByText('No saved passages or settings yet.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Saved RC name' }), { target: { value: saved.name } });
    fireEvent.click(screen.getByRole('button', { name: 'Save these settings' }));
    await screen.findByRole('alert'); view.unmount(); m.list.mockResolvedValue([saved]); mount();
    const rename = await screen.findByRole('button', { name: 'Rename Science practice' });
    expect(rename).toBeDisabled(); expect(screen.getByRole('button', { name: 'Duplicate Science practice' })).toBeDisabled();
    fireEvent.click(rename); expect(screen.queryByRole('textbox', { name: 'New name for Science practice' })).toBeNull();
    expect(m.rename).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Retry original RC save' })).toBeEnabled();
  });

});
