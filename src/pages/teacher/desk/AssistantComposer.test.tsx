import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssistantComposer } from './AssistantComposer';

vi.mock('@/lib/googleDrive', () => {
  const openPicker = vi.fn();
  return {
    loadGooglePickerApi: vi.fn(async () => {}),
    openPicker,
  };
});

import { openPicker as mockedOpenPicker } from '@/lib/googleDrive';
const openPickerMock = mockedOpenPicker as unknown as ReturnType<typeof vi.fn>;

function renderComposer(
  props: Partial<React.ComponentProps<typeof AssistantComposer>> = {},
) {
  const onChange = vi.fn();
  const onSubmit = vi.fn();

  render(
    <AssistantComposer
      value=""
      onChange={onChange}
      onSubmit={onSubmit}
      loading={false}
      disabled={false}
      placeholder="draft a reply..."
      seedAction={undefined}
      {...props}
    />,
  );

  return { onChange, onSubmit };
}

describe('AssistantComposer', () => {
  it('submits non-empty text with Enter', () => {
    const onSubmit = vi.fn();
    renderComposer({ value: 'Make this warmer', onSubmit });

    fireEvent.keyDown(screen.getByLabelText('Assistant instructions'), {
      key: 'Enter',
      shiftKey: false,
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('keeps Shift+Enter available for multiline instructions', () => {
    const onSubmit = vi.fn();
    renderComposer({ value: 'Line one', onSubmit });

    fireEvent.keyDown(screen.getByLabelText('Assistant instructions'), {
      key: 'Enter',
      shiftKey: true,
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables submit while empty, loading, or disabled', () => {
    const { rerender } = render(
      <AssistantComposer
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        loading={false}
        disabled={false}
        placeholder="draft a reply..."
      />,
    );

    expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();

    rerender(
      <AssistantComposer
        value="Draft this"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        loading
        disabled={false}
        placeholder="draft a reply..."
      />,
    );
    expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();

    rerender(
      <AssistantComposer
        value="Draft this"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        loading={false}
        disabled
        placeholder="draft a reply..."
      />,
    );
    expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();
  });

  it('does not render generic v0 product chips', () => {
    renderComposer({
      seedAction: { label: 'Draft with AI', onClick: vi.fn() },
    });

    expect(screen.queryByRole('button', { name: 'Draft with AI' })).not.toBeInTheDocument();
    expect(screen.queryByText('Project')).not.toBeInTheDocument();
    expect(screen.queryByText('Clone a Screenshot')).not.toBeInTheDocument();
    expect(screen.queryByText('Import from Figma')).not.toBeInTheDocument();
    expect(screen.queryByText('Landing Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Up Form')).not.toBeInTheDocument();
  });

  it('keeps the disabled composer shell visible in read-only preview', () => {
    renderComposer({
      disabled: true,
      readOnlyMessage: 'Assistant is read-only in local preview.',
    });

    expect(screen.getByLabelText('Assistant instructions')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();
    expect(screen.getByText('Assistant is read-only in local preview.')).toBeInTheDocument();
  });

  it('renders LSAT U teacher utility chips instead of generic v0 actions', () => {
    renderComposer({ placeholder: 'Ask Joshua a question...' });

    expect(screen.getByPlaceholderText('Ask Joshua a question...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open composer actions' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Attach material' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Google Drive' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Improve writing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Canvas Draft reply' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recommend next work' })).toBeInTheDocument();
  });

  it('opens a ChatGPT-style action menu with real teacher utilities', () => {
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));

    expect(screen.getByRole('menuitem', { name: /Google Drive/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Attach file' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Attach from Drive/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Attach material' })).toBeInTheDocument();
  });

  it('opens a material-type picker with real LSAT U material categories', () => {
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Attach material' }));

    expect(screen.getByRole('menuitem', { name: 'Guided drill' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Bootcamp lesson/module' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Practice set' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'PT / section assignment' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Reading or lesson page' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Homework/classroom item' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Recap or note' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Student upload/source material' })).toBeInTheDocument();
  });

  const fakeFile = {
    id: 'gdrive-abc-123',
    name: 'Lesson plan.pdf',
    mimeType: 'application/pdf',
    url: 'https://drive.google.com/file/d/gdrive-abc-123/view',
  };

  it('toggles a Google Drive connector chip without opening the picker', () => {
    openPickerMock.mockClear();
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Google Drive/ }));

    expect(openPickerMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Remove Google Drive' })).toBeInTheDocument();

    // Toggle off via the menu again.
    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Google Drive/ }));
    expect(screen.queryByRole('button', { name: 'Remove Google Drive' })).not.toBeInTheDocument();
  });

  it('forwards driveConnector=true to onSubmit when the chip is active', () => {
    const onSubmit = vi.fn();
    renderComposer({ value: 'Draft a reply', onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Google Drive/ }));
    fireEvent.keyDown(screen.getByLabelText('Assistant instructions'), { key: 'Enter', shiftKey: false });

    expect(onSubmit).toHaveBeenCalledWith({
      labels: [],
      drive: [],
      driveConnector: true,
    });
  });

  it('opens the Drive picker from "Attach from Drive" and drops a chip with the picked file name', async () => {
    openPickerMock.mockImplementationOnce((cb: (files: typeof fakeFile[]) => void) => {
      cb([fakeFile]);
    });
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Attach from Drive/ }));

    await waitFor(() => {
      expect(openPickerMock).toHaveBeenCalled();
    });
    expect(await screen.findByRole('button', { name: 'Remove Lesson plan.pdf' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Lesson plan.pdf' }));
    expect(screen.queryByRole('button', { name: 'Remove Lesson plan.pdf' })).not.toBeInTheDocument();
  });

  it('does not add a chip when the user cancels the Drive picker', async () => {
    openPickerMock.mockImplementationOnce(() => {
      // user closes the picker without selecting; callback is never invoked
    });
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Attach from Drive/ }));

    await waitFor(() => {
      expect(openPickerMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole('button', { name: /^Remove Lesson plan/ })).not.toBeInTheDocument();
  });

  it('forwards Drive file metadata to onSubmit and clears the chips', async () => {
    const onSubmit = vi.fn();
    openPickerMock.mockImplementationOnce((cb: (files: typeof fakeFile[]) => void) => cb([fakeFile]));
    renderComposer({ value: 'Draft a reply', onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Attach from Drive/ }));
    await screen.findByRole('button', { name: 'Remove Lesson plan.pdf' });
    fireEvent.keyDown(screen.getByLabelText('Assistant instructions'), { key: 'Enter', shiftKey: false });

    expect(onSubmit).toHaveBeenCalledWith({
      labels: [],
      drive: [
        {
          fileId: 'gdrive-abc-123',
          name: 'Lesson plan.pdf',
          mimeType: 'application/pdf',
          url: 'https://drive.google.com/file/d/gdrive-abc-123/view',
        },
      ],
      driveConnector: false,
    });
    expect(screen.queryByRole('button', { name: 'Remove Lesson plan.pdf' })).not.toBeInTheDocument();
  });


  it('picks a material type as a chip instead of firing a utility command', () => {
    const onUtilityCommand = vi.fn();
    renderComposer({ onUtilityCommand });

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Attach material' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Guided drill' }));

    expect(screen.getByRole('button', { name: 'Remove Guided drill' })).toBeInTheDocument();
    expect(onUtilityCommand).not.toHaveBeenCalled();
  });

  it('sends teacher utility commands through the provided command handler', () => {
    const onUtilityCommand = vi.fn();
    renderComposer({ onUtilityCommand });

    fireEvent.click(screen.getByRole('button', { name: 'Improve writing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Canvas Draft reply' }));
    fireEvent.click(screen.getByRole('button', { name: 'Recommend next work' }));

    expect(onUtilityCommand).toHaveBeenCalledTimes(3);
    expect(onUtilityCommand.mock.calls[0][0]).toContain('Improve the writing');
    expect(onUtilityCommand.mock.calls[1][0]).toContain('Canvas-style draft reply');
    expect(onUtilityCommand.mock.calls[2][0]).toContain('Recommend the next useful LSAT work');
  });
});
