import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RcPassage } from '../lib/rcTypes';
const mocks = vi.hoisted(() => ({ exposure: vi.fn(), load: vi.fn(), get: vi.fn(), create: vi.fn(), navigate: vi.fn(), query: null as string | null, user: { id: 'actor' } as { id: string } | null }));
vi.mock('../api/rcExposure', async () => ({ ...(await vi.importActual('../api/rcExposure')), recordRcPassageExposure: mocks.exposure }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../lib/rcBank', () => ({ loadPassage: mocks.load }));
vi.mock('../api/rcProgress', () => ({ getSession: mocks.get, createSession: mocks.create }));
vi.mock('react-router-dom', async () => { const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom'); return { ...actual, useNavigate: () => mocks.navigate, useSearchParams: () => { const params = actual.useSearchParams(); return mocks.query ? [new URLSearchParams(mocks.query), params[1]] : params; } }; });
import RcQuestionPreview from './RcQuestionPreview';
const passage: RcPassage = {
  passageId: 10, preptest: 140, section: 4, setNumber: 1, title: 'Reading', topic: null, format: null, frameworks: [], difficulty: null, text: 'Passage body',
  summaries: { standard: 'Hidden summary', brief: null, anotherWay: null },
  questions: [3, 4].map((id) => ({ questionId: id, position: id, questionType: 'Main point', questionTypeFamily: 'Main point', difficulty: null, prompt: `Question stem ${id}`, correctAnswer: 'A' as const, hasWrittenExplanation: true, explanationBlocks: [{ heading: 'Answer', body: 'Hidden explanation' }], totalResponses: null, features: [], choices: [{ letter: 'A' as const, text: 'Choice text', correct: true, tag: 'Correct', explanation: 'Hidden choice explanation', percent: null, responseCount: null }] })),
};
const mount = (query = 'passage=10&q=3&returnTo=%2Fpractice%2Fdrills%3Fsection%3Drc', state?: {finderPreviewHistory: 'push' | 'replace'}) => render(<MemoryRouter initialEntries={[{pathname: '/rc/preview', search: `?${query}`, state}]}><RcQuestionPreview /></MemoryRouter>);
const session = (id: string) => ({ id, userId: 'actor', passageIds: [10], config: { source: 'manual', timing: { mode: 'unlimited' }, reveal: 'per_passage' } });
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); mocks.exposure.mockResolvedValue(undefined); mocks.user = { id: 'actor' }; mocks.query = null; mocks.load.mockResolvedValue(passage); mocks.get.mockResolvedValue(null); mocks.create.mockImplementation(async (_c, _ids, req) => session(req.id)); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('read-only RC question lookup', () => {
  it('opens passage-only metadata without selecting a question, revealing text or writing progress', async () => {
    const storageSet = vi.spyOn(Object.getPrototypeOf(sessionStorage), 'setItem');
    mount('passage=10');
    await screen.findByRole('button', { name: 'Reveal passage' });
    expect(screen.getByRole('heading', { name: 'Passage preview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'PT 140 · Section 4 · Passage 1' })).toBeInTheDocument();
    expect(screen.queryByText('Passage body')).not.toBeInTheDocument();
    expect(screen.queryByText('Question stem 3')).not.toBeInTheDocument();
    expect(mocks.exposure).not.toHaveBeenCalled(); expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled(); expect(storageSet).not.toHaveBeenCalled();
  });
  it.each(['', '0', '-1', 'not-a-question', '1.5', '9007199254740992'])('rejects explicitly invalid q=%s instead of treating it as passage-only', async (q) => {
    mount(`passage=10&q=${q}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('question address is invalid');
    expect(mocks.load).not.toHaveBeenCalled(); expect(screen.queryByRole('button', { name: 'Start passage drill' })).toBeNull();
  });
  it('rejects passage-only metadata when the passage has no drillable questions', async () => {
    mocks.load.mockResolvedValue({ ...passage, questions: [] });
    mount('passage=10');
    expect(await screen.findByRole('alert')).toHaveTextContent('no available questions');
    expect(screen.queryByRole('button', { name: 'Start passage drill' })).toBeNull();
  });
  it('reveals only passage text after an acknowledged passage-only exposure', async () => {
    let acknowledge!: () => void;
    mocks.exposure.mockImplementation(() => new Promise<void>((resolve) => { acknowledge = resolve; }));
    mount('passage=10');
    fireEvent.click(await screen.findByRole('button', { name: 'Reveal passage' }));
    await screen.findByRole('button', { name: 'Recording exposure…' });
    expect(screen.queryByText('Passage body')).not.toBeInTheDocument();
    acknowledge(); await screen.findByText('Passage body');
    expect(mocks.exposure.mock.calls[0][0]).toMatchObject({ actorId: 'actor', passageId: 10, source: 'preview' });
    expect(screen.queryByText('Question stem 3')).not.toBeInTheDocument(); expect(screen.queryByText('Choice text')).not.toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('starts the whole passage without an arbitrary question-focus parameter', async () => {
    mount('passage=10'); fireEvent.click(await screen.findByRole('button', { name: 'Start passage drill' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalled());
    expect(mocks.create).toHaveBeenCalledTimes(1); expect(mocks.create.mock.calls[0][1]).toEqual([10]);
    const target = new URL(mocks.navigate.mock.calls[0][0], 'https://example.test');
    expect(target.pathname).toBe('/rc/drill'); expect(target.searchParams.has('q')).toBe(false); expect(target.searchParams.get('returnTo')).toBe('/practice/drills?section=rc');
  });
  it('recovers the same passage-only request after refresh', async () => {
    mocks.get.mockRejectedValueOnce(new Error('Offline'));
    const first = mount('passage=10'); fireEvent.click(await screen.findByRole('button', { name: 'Start passage drill' })); await screen.findByRole('alert');
    const id = mocks.get.mock.calls[0][0];
    expect(JSON.parse(sessionStorage.getItem('lsatu:rc-preview-launch:v1:actor')!)).toMatchObject({ id, questionId: null });
    first.unmount(); mount('passage=10'); fireEvent.click(await screen.findByRole('button', { name: 'Start passage drill' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalled()); expect(mocks.create.mock.calls[0][2].id).toBe(id);
  });
  it.each([[null, 3], [3, null]])('rejects retained launch focus %s for current focus %s', async (savedFocus, currentFocus) => {
    sessionStorage.setItem('lsatu:rc-preview-launch:v1:actor', JSON.stringify({ id: 'original', actorId: 'actor', passageId: 10, questionId: savedFocus, back: '/practice/drills?section=rc' }));
    mount(`passage=10${currentFocus === null ? '' : `&q=${currentFocus}`}`);
    fireEvent.click(await screen.findByRole('button', { name: 'Start passage drill' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('different passage launch'); expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('lsatu:rc-preview-launch:v1:actor')).toContain('original');
  });
  it('does not conflate missing q and malformed q while a passage-only launch is pending', async () => {
    let resolve!: (value: null) => void;
    mocks.get.mockImplementation(() => new Promise<null>((done) => { resolve = done; }));
    const view = mount('passage=10'); fireEvent.click(await screen.findByRole('button', { name: 'Start passage drill' }));
    await waitFor(() => expect(mocks.get).toHaveBeenCalled());
    const id = mocks.get.mock.calls[0][0];
    mocks.query = 'passage=10&q=invalid';
    view.rerender(<MemoryRouter initialEntries={['/rc/preview?passage=10']}><RcQuestionPreview /></MemoryRouter>);
    await screen.findByText('That question address is invalid.'); resolve(null);
    expect(await screen.findByRole('alert')).toHaveTextContent('preview changed');
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled(); expect(sessionStorage.getItem('lsatu:rc-preview-launch:v1:actor')).toContain(id);
  });
  it('does not navigate or clear a passage-only launch when its account changes during creation', async () => {
    let resolve!: (value: unknown) => void;
    mocks.create.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const view = mount('passage=10'); fireEvent.click(await screen.findByRole('button', { name: 'Start passage drill' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    const id = mocks.create.mock.calls[0][2].id;
    mocks.user = { id: 'other-actor' };
    view.rerender(<MemoryRouter initialEntries={['/rc/preview?passage=10']}><RcQuestionPreview /></MemoryRouter>);
    resolve(session(id));
    expect(await screen.findByRole('alert')).toHaveTextContent('account changed'); expect(mocks.navigate).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem('lsatu:rc-preview-launch:v1:actor')!)).toMatchObject({ id, questionId: null });
  });
  it('does not reveal passage-only text when a supplied question address replaces it during exposure recording', async () => {
    let resolve!: () => void;
    mocks.exposure.mockImplementation(() => new Promise<void>((done) => { resolve = done; }));
    const view = mount('passage=10'); fireEvent.click(await screen.findByRole('button', { name: 'Reveal passage' }));
    await waitFor(() => expect(mocks.exposure).toHaveBeenCalledTimes(1));
    mocks.query = 'passage=10&q=3';
    view.rerender(<MemoryRouter initialEntries={['/rc/preview?passage=10']}><RcQuestionPreview /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Recording exposure…' }); resolve();
    await screen.findByRole('button', { name: 'Reveal passage and question' });
    expect(screen.queryByText('Passage body')).not.toBeInTheDocument(); expect(screen.queryByText('Question stem 3')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('lsatu:rc-preview-exposure:v1:actor:10')).not.toBeNull();
  });
  it('reveals text only after exact exposure acknowledgment and retries the same event after refresh', async () => {
    mocks.exposure.mockRejectedValueOnce(new Error('Exposure offline'));
    const first = mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Reveal passage and question' }));
    await screen.findByRole('button', { name: 'Retry text reveal' });
    expect(screen.queryByText('Passage body')).not.toBeInTheDocument();
    const command = mocks.exposure.mock.calls[0][0];
    first.unmount(); mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Reveal passage and question' }));
    await screen.findByText('Passage body');
    expect(mocks.exposure.mock.calls[1][0]).toEqual(command);
    expect(screen.getByText('Question stem 3')).toBeInTheDocument();
    expect(screen.queryByText('Hidden explanation')).not.toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('returns to a retained non-practice origin without mislabelling the destination', async () => {
    mount('passage=10&q=3&returnTo=%2Fmy-work%3Ftab%3Dassigned');
    await screen.findByRole('button', { name: 'Reveal passage and question' });
    fireEvent.click(screen.getByRole('button', { name: /^Back$/ }));
    expect(mocks.navigate).toHaveBeenCalledWith('/my-work?tab=assigned', { replace: true });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('loads, refreshes and closes without backend or device writes or answer leakage', async () => {
    localStorage.setItem('existing-marks', 'unchanged'); sessionStorage.setItem('existing-backup', 'unchanged');
    const localSet = vi.spyOn(localStorage, 'setItem'); const localRemove = vi.spyOn(localStorage, 'removeItem');
    const sessionSet = vi.spyOn(Object.getPrototypeOf(sessionStorage), 'setItem'); const sessionRemove = vi.spyOn(Object.getPrototypeOf(sessionStorage), 'removeItem');
    const view = mount(); await screen.findByRole('button', { name: 'Reveal passage and question' });
    expect(screen.queryByText('Question stem 3')).not.toBeInTheDocument();
    expect(screen.queryByText(/Hidden/)).not.toBeInTheDocument();
    expect(screen.getByText(/PT 140.*Question 3/)).toBeInTheDocument();
    view.unmount(); mount(); await screen.findByRole('button', { name: 'Reveal passage and question' });
    fireEvent.click(screen.getByRole('button', { name: 'Back to Practice' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/practice/drills?section=rc', { replace: true });
    expect(localSet).not.toHaveBeenCalled(); expect(localRemove).not.toHaveBeenCalled(); expect(sessionSet).not.toHaveBeenCalled(); expect(sessionRemove).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.get).not.toHaveBeenCalled();
    expect(localStorage.getItem('existing-marks')).toBe('unchanged'); expect(sessionStorage.getItem('existing-backup')).toBe('unchanged');
  });
  it('rejects a mismatched question instead of showing another', async () => { mount('passage=10&q=99'); expect(await screen.findByRole('alert')).toHaveTextContent('not in this passage'); expect(screen.queryByRole('button', { name: 'Start passage drill' })).toBeNull(); });
  it('retries failed static content without creating a session', async () => { mocks.load.mockRejectedValueOnce(new Error('Offline')); mount(); await screen.findByText('Offline'); fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await screen.findByRole('button', { name: 'Reveal passage and question' }); expect(mocks.create).not.toHaveBeenCalled(); });
  it('starts one complete passage with exact focus and return location despite duplicate clicks', async () => {
    mount(); const start = await screen.findByRole('button', { name: 'Start passage drill' }); fireEvent.click(start); fireEvent.click(start);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalled());
    expect(mocks.create).toHaveBeenCalledTimes(1); expect(mocks.create.mock.calls[0][1]).toEqual([10]);
    expect(mocks.navigate.mock.calls[0][0]).toMatch(/\/rc\/drill\?sessionId=.*&q=3&returnTo=/);
  });
  it('recovers a lost creation reply by looking up the same UUID', async () => {
    mocks.create.mockRejectedValueOnce(new Error('Reply lost')); mocks.get.mockImplementation(async (id) => mocks.get.mock.calls.length === 1 ? null : session(id));
    mount(); fireEvent.click(await screen.findByRole('button', { name: 'Start passage drill' })); await waitFor(() => expect(mocks.navigate).toHaveBeenCalled()); expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.get.mock.calls[0][0]).toBe(mocks.get.mock.calls[1][0]);
  });
  it('cannot create when pending launch storage fails', async () => { mount(); const start = await screen.findByRole('button', { name: 'Start passage drill' }); vi.spyOn(Object.getPrototypeOf(sessionStorage), 'setItem').mockImplementation(() => { throw new Error('Storage unavailable'); }); fireEvent.click(start); expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable'); expect(mocks.create).not.toHaveBeenCalled(); });
  it('does not navigate or clear actor A recovery when the account changes during creation', async () => {
    let resolve!: (value: unknown) => void;
    mocks.create.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const view = mount(); fireEvent.click(await screen.findByRole('button', { name: 'Start passage drill' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    const id = mocks.create.mock.calls[0][2].id;
    mocks.user = { id: 'other-actor' };
    view.rerender(<MemoryRouter initialEntries={['/rc/preview?passage=10&q=3']}><RcQuestionPreview /></MemoryRouter>);
    resolve(session(id));
    expect(await screen.findByRole('alert')).toHaveTextContent('account changed');
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('lsatu:rc-preview-launch:v1:actor')).toContain(id);
    mocks.create.mockImplementationOnce(async (_config, _ids, request) => ({ ...session(request.id), userId: request.actorId }));
    fireEvent.click(screen.getByRole('button', { name: 'Start passage drill' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalled());
    expect(mocks.create.mock.calls[1][2].actorId).toBe('other-actor');
    expect(mocks.create.mock.calls[1][2].id).not.toBe(id);
    expect(sessionStorage.getItem('lsatu:rc-preview-launch:v1:actor')).toContain(id);
  });
  it('retains the original launch without navigating when the preview address changes during lookup', async () => {
    let resolve!: (value: null) => void;
    mocks.get.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const view = mount(); fireEvent.click(await screen.findByRole('button', { name: 'Start passage drill' }));
    await waitFor(() => expect(mocks.get).toHaveBeenCalled());
    const id = mocks.get.mock.calls[0][0];
    mocks.query = 'passage=10&q=4';
    view.rerender(<MemoryRouter initialEntries={['/rc/preview?passage=10&q=3']}><RcQuestionPreview /></MemoryRouter>);
    await screen.findByText(/PT 140.*Question 4/); resolve(null);
    expect(await screen.findByRole('alert')).toHaveTextContent('preview changed');
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('lsatu:rc-preview-launch:v1:actor')).toContain(id);
  });
  it('retries uncertain creation using the persisted request after refresh', async () => {
    mocks.get.mockRejectedValueOnce(new Error('Offline')); const view = mount(); fireEvent.click(await screen.findByRole('button', { name: 'Start passage drill' })); await screen.findByRole('alert');
    const firstId = mocks.get.mock.calls[0][0]; view.unmount(); mount(); fireEvent.click(await screen.findByRole('button', { name: 'Start passage drill' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalled()); expect(mocks.create.mock.calls[0][2].id).toBe(firstId);
  });
});


describe('finder preview history', () => {
  it('uses the previous entry for a finder-pushed preview', async () => {
    mount(undefined, {finderPreviewHistory: 'push'});
    await screen.findByRole('button', {name: 'Reveal passage and question'});
    fireEvent.click(screen.getByRole('button', {name: 'Back to Practice'}));
    expect(mocks.navigate).toHaveBeenCalledWith(-1);
  });
  it('replaces a finder-replaced preview with its explicit origin', async () => {
    mount(undefined, {finderPreviewHistory: 'replace'});
    await screen.findByRole('button', {name: 'Reveal passage and question'});
    fireEvent.click(screen.getByRole('button', {name: 'Back to Practice'}));
    expect(mocks.navigate).toHaveBeenCalledWith('/practice/drills?section=rc', {replace: true});
  });
});
