import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistantComposer } from './AssistantComposer';

const invokeMock = vi.fn();

vi.mock('@/lib/googleDrive', () => {
  const openPicker = vi.fn();
  return {
    loadGooglePickerApi: vi.fn(async () => {}),
    openPicker,
  };
});

// The in-app Drive picker (GoogleDrivePicker) calls the `gdrive` edge function
// with a Supabase session, so stub the auth client to hand back a token.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'test-token' } } })) },
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

import { openPicker as mockedOpenPicker } from '@/lib/googleDrive';
const openPickerMock = mockedOpenPicker as unknown as ReturnType<typeof vi.fn>;

// A Drive file as the `gdrive` list action returns it (webViewLink, not url).
const driveListFile = {
  id: 'gdrive-abc-123',
  name: 'Lesson plan.pdf',
  mimeType: 'application/pdf',
  webViewLink: 'https://drive.google.com/file/d/gdrive-abc-123/view',
};

function mockDriveList(files: Array<Record<string, unknown>>) {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, files, nextPageToken: null }),
  } as unknown as Response);
}

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
  beforeEach(() => {
    // GoogleDrivePicker builds request URLs with `new URL()`, which needs a real base.
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');
    invokeMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

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
    expect(screen.getByRole('button', { name: 'Canvas' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Canvas Draft reply' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recommend next work' })).toBeInTheDocument();
  });

  it('opens a ChatGPT-style action menu with real teacher utilities', () => {
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));

    expect(screen.getByRole('menuitem', { name: /Canvas/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Google Drive/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Attach screenshot/ })).toBeInTheDocument();
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
      images: [],
      driveConnector: true,
      gmailConnector: false,
      calendarConnector: false,
      model: 'auto',
    });
  });

  it('opens the Drive picker from "Attach from Drive" and drops a chip with the picked file name', async () => {
    mockDriveList([driveListFile]);
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Attach from Drive/ }));

    // Pick the file in the Google-style picker, then confirm.
    fireEvent.click(await screen.findByRole('button', { name: 'Lesson plan.pdf' }, { timeout: 5_000 }));
    fireEvent.click(screen.getByRole('button', { name: 'Attach' }));

    expect(await screen.findByRole('button', { name: 'Remove Lesson plan.pdf' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Lesson plan.pdf' }));
    expect(screen.queryByRole('button', { name: 'Remove Lesson plan.pdf' })).not.toBeInTheDocument();
  });

  it('does not add a chip when the user cancels the Drive picker', async () => {
    mockDriveList([driveListFile]);
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Attach from Drive/ }));

    // Cancel without selecting anything.
    await screen.findByRole('button', { name: 'Lesson plan.pdf' }, { timeout: 5_000 });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('button', { name: /^Remove Lesson plan/ })).not.toBeInTheDocument();
  });

  it('forwards Drive file metadata to onSubmit and clears the chips', async () => {
    const onSubmit = vi.fn();
    mockDriveList([driveListFile]);
    renderComposer({ value: 'Draft a reply', onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Attach from Drive/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Lesson plan.pdf' }, { timeout: 5_000 }));
    fireEvent.click(screen.getByRole('button', { name: 'Attach' }));
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
      images: [],
      driveConnector: false,
      gmailConnector: false,
      calendarConnector: false,
      model: 'auto',
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

  it('opens Canvas without sending a utility command or submitting the composer', () => {
    const onUtilityCommand = vi.fn();
    const onOpenCanvas = vi.fn();
    const onSubmit = vi.fn();
    renderComposer({ onUtilityCommand, onOpenCanvas, onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Canvas' }));

    expect(onOpenCanvas).toHaveBeenCalledTimes(1);
    expect(onUtilityCommand).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('improves the current textbox prompt through a preview before replacing it', async () => {
    invokeMock.mockResolvedValue({ data: { polished: 'Please make this paragraph clearer.' }, error: null });
    const onChange = vi.fn();
    const onUtilityCommand = vi.fn();
    const onSubmit = vi.fn();
    renderComposer({
      value: 'plz fix this para make more clear',
      onChange,
      onUtilityCommand,
      onSubmit,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Improve writing' }));

    expect(await screen.findByRole('heading', { name: 'Review improved prompt' })).toBeInTheDocument();
    expect(screen.getAllByText('plz fix this para make more clear')).toHaveLength(2);
    expect(screen.getByText('Please make this paragraph clearer.')).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith('polish-message', {
      body: {
        text: 'plz fix this para make more clear',
        instruction: expect.stringContaining('Clean up this prompt only'),
      },
    });
    expect(onUtilityCommand).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('Please make this paragraph clearer.'));
  });

  it('opens a prompt helper flow when Improve writing is clicked with an empty textbox', async () => {
    invokeMock.mockResolvedValue({ data: { polished: 'Please summarize this email and suggest a concise reply.' }, error: null });
    const onChange = vi.fn();
    renderComposer({ value: '', onChange });

    fireEvent.click(screen.getByRole('button', { name: 'Improve writing' }));

    expect(await screen.findByRole('heading', { name: 'Improve a prompt' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Rough prompt'), {
      target: { value: 'summarize email and write short reply' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Improve prompt' }));

    expect(await screen.findByRole('heading', { name: 'Review improved prompt' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders an open Canvas chip with a removable close control', () => {
    const onOpenCanvas = vi.fn();
    const onCloseCanvas = vi.fn();
    renderComposer({ canvasOpen: true, onOpenCanvas, onCloseCanvas });

    fireEvent.click(screen.getByRole('button', { name: 'Open canvas' }));
    expect(onOpenCanvas).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Canvas' }));
    expect(onCloseCanvas).toHaveBeenCalledTimes(1);
  });

  it('opens Canvas from the composer action picker', () => {
    const onOpenCanvas = vi.fn();
    const onUtilityCommand = vi.fn();
    renderComposer({ onOpenCanvas, onUtilityCommand });

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Canvas/ }));

    expect(onOpenCanvas).toHaveBeenCalledTimes(1);
    expect(onUtilityCommand).not.toHaveBeenCalled();
  });

  it('keeps Canvas available when the assistant composer is read-only', () => {
    const onOpenCanvas = vi.fn();
    renderComposer({ disabled: true, onOpenCanvas });

    fireEvent.click(screen.getByRole('button', { name: 'Canvas' }));

    expect(onOpenCanvas).toHaveBeenCalledTimes(1);
  });

  it('sends only non-polish teacher utility commands through the provided command handler', () => {
    const onUtilityCommand = vi.fn();
    const onOpenCanvas = vi.fn();
    renderComposer({ onUtilityCommand, onOpenCanvas });

    fireEvent.click(screen.getByRole('button', { name: 'Canvas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Recommend next work' }));

    expect(onUtilityCommand).toHaveBeenCalledTimes(1);
    expect(onUtilityCommand.mock.calls[0][0]).toContain('Recommend the next useful LSAT work');
    expect(onOpenCanvas).toHaveBeenCalledTimes(1);
  });

  it('attaches a screenshot via the file input and forwards it (image-only, no text) to onSubmit', async () => {
    const { onSubmit } = renderComposer();

    const file = new File(['fake-bytes'], 'shot.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Attach screenshot'), { target: { files: [file] } });

    // A preview thumbnail with a remove control appears once the file is read.
    await screen.findByRole('button', { name: 'Remove shot.png' });

    fireEvent.click(screen.getByRole('button', { name: 'Send command' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.images).toHaveLength(1);
    expect(payload.images[0].name).toBe('shot.png');
    expect(payload.images[0].dataUrl).toMatch(/^data:/);
    // Chips clear after send.
    expect(screen.queryByRole('button', { name: 'Remove shot.png' })).not.toBeInTheDocument();
  });

  it('opens a preview popup when an attached thumbnail is clicked', async () => {
    renderComposer();

    const file = new File(['fake-bytes'], 'shot.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Attach screenshot'), { target: { files: [file] } });

    fireEvent.click(await screen.findByRole('button', { name: 'Preview shot.png' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
