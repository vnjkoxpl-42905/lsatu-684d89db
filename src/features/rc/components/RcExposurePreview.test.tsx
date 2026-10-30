import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RcExposurePreview } from './RcExposurePreview';
import type { RcPassage } from '../lib/rcTypes';

const api = vi.hoisted(() => ({ record: vi.fn(), create: vi.fn() }));
vi.mock('../api/rcExposure', () => ({ recordRcPassageExposure: api.record, createRcExposureRequest: api.create,
  isRcExposureRequest: (value: { id?: string }) => typeof value?.id === 'string' }));
const passage = { passageId: 17, preptest: 101, section: 2, setNumber: 1, title: 'Marine ecosystems', topic: 'Science', format: 'Standard', difficulty: 2,
  text: 'A distinctive hidden passage.', questions: [{ questionId: 41, position: 1, prompt: 'A hidden question?', correctAnswer: 'A', choices: [{ letter: 'A', text: 'A hidden choice.', explanation: 'Never show this explanation', correct: true }] }] } as RcPassage;
const request = { id: 'request-one', actorId: 'owner', passageId: 17, source: 'builder-preview' };
beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); api.create.mockReturnValue(request); api.record.mockResolvedValue(undefined); });
const mount = (onExposed = vi.fn(), actorId: string | null = 'owner') => render(<RcExposurePreview actorId={actorId} passage={passage} index={0} presentation="folio" onExposed={onExposed} />);

describe('RC folio exposure preview', () => {
  it('waits for acknowledgement, locks duplicate clicks and keeps answer keys hidden', async () => {
    let acknowledge!: () => void;
    api.record.mockImplementationOnce(() => new Promise<void>(resolve => { acknowledge = resolve; }));
    const onExposed = vi.fn(); mount(onExposed);
    const reveal = screen.getByRole('button', { name: /Reveal passage and questions/ });
    fireEvent.click(reveal); fireEvent.click(reveal);
    expect(screen.queryByText(passage.text)).not.toBeInTheDocument();
    expect(api.record).toHaveBeenCalledTimes(1);
    acknowledge();
    await screen.findByText(passage.text);
    expect(onExposed).toHaveBeenCalledWith(17);
    expect(screen.getByRole('region', { name: 'Passage 1 questions' })).toBeInTheDocument();
    expect(screen.queryByText('Never show this explanation')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Preview passage 1' })).not.toHaveClass('rc-review-passage');
  });
  it('retries the same durable request after a failed acknowledgement', async () => {
    api.record.mockRejectedValueOnce(new Error('Exposure save failed'));
    mount(); fireEvent.click(screen.getByRole('button', { name: /Reveal passage and questions/ }));
    await screen.findByRole('alert');
    expect(screen.queryByText(passage.text)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry passage text reveal' }));
    await screen.findByText(passage.text);
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.record.mock.calls.map(call => call[0].id)).toEqual(['request-one', 'request-one']);
  });
  it('collapses and expands acknowledged text without recording exposure again', async () => {
    mount(); fireEvent.click(screen.getByRole('button', { name: /Reveal passage and questions/ }));
    await screen.findByText(passage.text);
    const hide = screen.getByRole('button', { name: 'Hide passage preview' });
    const controlled = hide.getAttribute('aria-controls');
    expect(document.getElementById(controlled!)).not.toBeNull();
    fireEvent.click(hide);
    expect(screen.queryByText(passage.text)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show passage preview' }));
    expect(screen.getByText(passage.text)).toBeInTheDocument(); expect(api.record).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Hide passage preview' })).toHaveAttribute('aria-controls', controlled);
  });
  it('resets acknowledged text when the actor or passage scope changes without a parent remount', async () => {
    const onExposed = vi.fn(); const view = mount(onExposed);
    fireEvent.click(screen.getByRole('button', { name: /Reveal passage and questions/ })); await screen.findByText(passage.text);
    view.rerender(<RcExposurePreview actorId="other" passage={passage} index={0} presentation="folio" onExposed={onExposed} />);
    expect(screen.queryByText(passage.text)).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: /Reveal passage and questions/ })).toBeEnabled();
    view.rerender(<RcExposurePreview actorId="other" passage={{ ...passage, passageId: 18, text: 'Second hidden passage.' }} index={0} presentation="folio" onExposed={onExposed} />);
    expect(screen.queryByText('Second hidden passage.')).not.toBeInTheDocument(); expect(onExposed).toHaveBeenCalledTimes(1);
  });
  it.each(['actor', 'passage'] as const)('ignores an old pending response after the %s scope changes', async changed => {
    let acknowledge!: () => void;
    api.record.mockImplementationOnce(() => new Promise<void>(resolve => { acknowledge = resolve; }));
    const oldCallback = vi.fn(); const nextCallback = vi.fn(); const view = mount(oldCallback);
    fireEvent.click(screen.getByRole('button', { name: /Reveal passage and questions/ }));
    view.rerender(<RcExposurePreview actorId={changed === 'actor' ? 'other' : 'owner'} passage={changed === 'passage' ? { ...passage, passageId: 18, text: 'Second hidden passage.' } : passage} index={0} presentation="folio" onExposed={nextCallback} />);
    await act(async () => { acknowledge(); });
    expect(oldCallback).not.toHaveBeenCalled(); expect(nextCallback).not.toHaveBeenCalled();
    expect(screen.queryByText(passage.text)).not.toBeInTheDocument(); expect(screen.queryByText('Second hidden passage.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reveal passage and questions/ })).toBeEnabled();
    expect(sessionStorage.getItem('lsatu:rc-builder-exposure:v1:owner:17')).toContain('request-one');
  });
  it('rejects retained requests belonging to another owner before revealing', async () => {
    sessionStorage.setItem('lsatu:rc-builder-exposure:v1:owner:17', JSON.stringify({ ...request, actorId: 'other' }));
    mount(); fireEvent.click(screen.getByRole('button', { name: /Reveal passage and questions/ }));
    await screen.findByRole('alert'); expect(api.record).not.toHaveBeenCalled(); expect(screen.queryByText(passage.text)).not.toBeInTheDocument();
  });
  it('ignores a completed acknowledgement after unmount', async () => {
    let acknowledge!: () => void;
    api.record.mockImplementationOnce(() => new Promise<void>(resolve => { acknowledge = resolve; }));
    const onExposed = vi.fn(); const view = mount(onExposed);
    fireEvent.click(screen.getByRole('button', { name: /Reveal passage and questions/ })); view.unmount(); acknowledge();
    await waitFor(() => expect(api.record).toHaveBeenCalledTimes(1)); expect(onExposed).not.toHaveBeenCalled();
  });
  it('disables reveal without an owner and retains the default presentation for callers', () => {
    const view = mount(vi.fn(), null); expect(screen.getByRole('button', { name: /Reveal passage and questions/ })).toBeDisabled();
    view.unmount(); render(<RcExposurePreview actorId="owner" passage={passage} index={0} onExposed={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Preview passage 1' })).toHaveClass('rc-review-passage');
  });
});
