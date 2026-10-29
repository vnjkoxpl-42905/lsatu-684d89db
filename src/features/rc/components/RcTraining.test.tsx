import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RcTrainingState } from '../hooks/useRcTraining';
import { RcEvidenceNotes, RcParagraphTrainingControls } from './RcTraining';
import { rcEvidenceFingerprint } from '../lib/rcEvidenceFingerprint';
describe('evidence notes preserve source identity', () => {
  it('does not advance paragraph progress while account learning records are loading', () => {
    const training = { enabled: true, segmented: true, loaded: false, pending: null, paragraphLimit: 2, paragraphCount: 3 } as RcTrainingState;
    render(<RcParagraphTrainingControls training={training} findActive={false} />);
    expect(screen.getByRole('button', { name: 'Previous paragraph' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next paragraph' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Show entire passage' })).not.toBeDisabled();
  });
  it('saves an exact source span and fingerprint and clears unsaved drafts when the source changes', async () => {
    const sourceFingerprint = await rcEvidenceFingerprint('Original evidence text.');
    const save = vi.fn();
    const training = { enabled: true, open: true, loaded: true, pending: null, latest: () => undefined, save } as unknown as RcTrainingState;
    const view = render(<RcEvidenceNotes training={training} source="Original evidence text." />);
    fireEvent.click(screen.getByText('Evidence note'));
    fireEvent.change(screen.getByLabelText('Evidence quote'), { target: { value: 'evidence' } });
    fireEvent.change(screen.getByLabelText('Evidence note'), { target: { value: 'Supports the claim.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save evidence note' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('evidence-note', JSON.stringify({ target: 'passage', sourceAlgorithm: 'sha256', sourceFingerprint, start: 9, end: 17, quote: 'evidence', note: 'Supports the claim.' })));
    view.rerender(<RcEvidenceNotes training={training} source="Different evidence text." />);
    expect(screen.getByLabelText('Evidence quote')).toHaveValue('');
    expect(screen.getByLabelText('Evidence note')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Save evidence note' })).toBeDisabled();
  });
});
